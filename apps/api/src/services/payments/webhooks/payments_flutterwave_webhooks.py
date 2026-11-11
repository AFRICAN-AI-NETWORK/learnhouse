import json
import logging
from datetime import UTC, datetime

from fastapi import HTTPException, Request
from sqlmodel import Session, select

from config.config import get_learnhouse_config
from src.db.payments.payments_products import (
    PaymentProductTypeEnum,
    PaymentsProduct,
)
from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser
from src.services.payments.discount_codes import (
    increment_discount_usage_atomic,
    record_discount_usage,
)
from src.services.payments.payments_cycles import (
    extend_payment_period,
    notify_subscription_lifecycle,
)
from src.services.payments.payments_flutterwave import verify_transaction

logger = logging.getLogger(__name__)


async def verify_flutterwave_webhook_signature(
    request: Request,
    secret: str,
) -> bool:
    """Verify Flutterwave webhook signature"""
    signature = request.headers.get("verif-hash")
    return not (not signature or signature != secret)


def _find_payment_user_for_webhook(
    db_session: Session,
    data: dict,
    meta: dict,
) -> PaymentsUser | None:
    """
    Resolve the matching ``PaymentsUser`` from webhook metadata first, then by
    ``LH_<id>_...`` reference, then by customer email + subscription plan.
    """
    payment_user_id = meta.get("payment_user_id")
    if payment_user_id and str(payment_user_id).isdigit():
        pu = db_session.exec(
            select(PaymentsUser).where(PaymentsUser.id == int(payment_user_id))
        ).first()
        if pu:
            return pu

    tx_ref = data.get("tx_ref") or ""
    if isinstance(tx_ref, str) and tx_ref.startswith("LH_"):
        parts = tx_ref.split("_")
        if len(parts) >= 2 and parts[1].isdigit():
            pu = db_session.exec(
                select(PaymentsUser).where(PaymentsUser.id == int(parts[1]))
            ).first()
            if pu:
                return pu

    customer = data.get("customer") or {}
    customer_email = customer.get("email") or customer.get("customer_email")
    if customer_email:
        from src.db.users import User

        user = db_session.exec(select(User).where(User.email == customer_email)).first()
        if user:
            plan_id = data.get("plan")
            rows = db_session.exec(
                select(PaymentsUser, PaymentsProduct)
                .join(
                    PaymentsProduct,
                    PaymentsUser.payment_product_id == PaymentsProduct.id,
                )
                .where(
                    PaymentsUser.user_id == user.id,
                    PaymentsProduct.product_type == PaymentProductTypeEnum.SUBSCRIPTION,
                    PaymentsUser.status.in_(
                        [PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED]
                    ),
                )
                .order_by(PaymentsUser.id.desc())
            ).all()
            if plan_id:
                for pu, prod in rows:
                    if str(prod.provider_product_id) == str(plan_id):
                        return pu
            if rows:
                return rows[0][0]

    return None


async def handle_flutterwave_webhook(
    request: Request,
    db_session: Session,
) -> dict:
    """Handle Flutterwave webhook events"""
    learnhouse_config = get_learnhouse_config()
    webhook_secret = (
        learnhouse_config.payments_config.flutterwave.flutterwave_webhook_secret
    )

    if not webhook_secret:
        logger.error("Flutterwave webhook secret not configured")
        raise HTTPException(
            status_code=400, detail="Flutterwave webhook secret not configured"
        )

    if not await verify_flutterwave_webhook_signature(request, webhook_secret):
        logger.error("Invalid Flutterwave webhook signature")
        raise HTTPException(status_code=401, detail="Unauthorized webhook signature")

    payload = await request.body()
    try:
        event_data = json.loads(payload.decode("utf-8"))

        event_type = event_data.get("event")
        data = event_data.get("data", {})

        logger.info(f"Processing Flutterwave webhook event: {event_type}")

        if event_type == "charge.completed":
            status = data.get("status")
            transaction_reference = data.get("tx_ref")
            metadata = data.get("meta") or {}
            payment_user = _find_payment_user_for_webhook(db_session, data, metadata)

            if status != "successful":
                # Handle failed charges (e.g. recurring subscription charge failure)
                if payment_user and payment_user.status in [
                    PaymentStatusEnum.ACTIVE,
                    PaymentStatusEnum.COMPLETED,
                ]:
                    now_utc = datetime.now(UTC)
                    updated = False
                    if not payment_user.grace_period_start_date:
                        payment_user.grace_period_start_date = now_utc
                        updated = True
                        logger.info(
                            f"Started 7-day grace period for payment_user_id {payment_user.id}"
                        )
                    should_notify = payment_user.grace_notice_sent_at is None
                    if should_notify:
                        payment_user.grace_notice_sent_at = now_utc
                        updated = True
                    if updated:
                        db_session.add(payment_user)
                        db_session.commit()
                    if should_notify:
                        notice_kind = (
                            "card_failed"
                            if getattr(payment_user, "auto_renew", False)
                            else "grace_started"
                        )
                        await notify_subscription_lifecycle(
                            db_session, payment_user, None, notice_kind
                        )
                return {"status": "ignored", "message": "Transaction not successful"}

            if not payment_user:
                logger.warning(
                    "No matching PaymentsUser found for charge.completed webhook"
                )
                return {
                    "status": "ignored",
                    "message": "No payment_user_id in metadata",
                }

            try:
                if transaction_reference:
                    transaction_data = await verify_transaction(transaction_reference)
                    verified_payload = transaction_data.get("data", {}) or {}
                    verified_ok = (
                        transaction_data.get("status") == "success"
                        and (verified_payload.get("status") or "successful")
                        == "successful"
                    )
                else:
                    # Recurring charges from Flutterwave without tx_ref
                    verified_ok = status == "successful"
                    verified_payload = data

                if verified_ok:
                    org_id = int(metadata.get("org_id") or payment_user.org_id)
                    meta_auto_renew = metadata.get("auto_renew")
                    if str(meta_auto_renew).lower() == "true":
                        resolved_auto_renew: bool | None = True
                    elif str(meta_auto_renew).lower() == "false":
                        resolved_auto_renew = False
                    elif data.get("plan") is not None:
                        resolved_auto_renew = True
                    else:
                        resolved_auto_renew = None

                    tx_key = (
                        verified_payload.get("tx_ref")
                        or transaction_reference
                        or (f"fw_id:{data.get('id')}" if data.get("id") else None)
                    )

                    payment_user, did_extend = extend_payment_period(
                        db_session,
                        payment_user,
                        tx_ref=tx_key,
                        auto_renew=resolved_auto_renew,
                    )

                    upsell_payment_user_id = metadata.get("upsell_payment_user_id")
                    if upsell_payment_user_id and str(upsell_payment_user_id).isdigit():
                        upsell_pu = db_session.exec(
                            select(PaymentsUser).where(
                                PaymentsUser.id == int(upsell_payment_user_id)
                            )
                        ).first()
                        if upsell_pu:
                            extend_payment_period(
                                db_session,
                                upsell_pu,
                                tx_ref=f"{tx_key}:upsell" if tx_key else None,
                            )

                    discount_code_id = metadata.get("discount_code_id")
                    course_id = metadata.get("course_id")
                    product_id = (
                        metadata.get("product_id") or payment_user.payment_product_id
                    )

                    if (
                        did_extend
                        and discount_code_id
                        and (course_id or product_id)
                        and payment_user.discount_code_id
                    ):
                        try:
                            increment_success = await increment_discount_usage_atomic(
                                int(discount_code_id), db_session
                            )
                            if increment_success:
                                await record_discount_usage(
                                    discount_code_id=int(discount_code_id),
                                    user_id=int(
                                        metadata.get("user_id") or payment_user.user_id
                                    ),
                                    course_id=int(course_id) if course_id else None,
                                    product_id=int(product_id) if product_id else None,
                                    payment_user_id=payment_user.id,
                                    original_amount=payment_user.original_amount,
                                    discount_amount=payment_user.discount_amount,
                                    final_amount=payment_user.final_amount,
                                    db_session=db_session,
                                )
                            else:
                                logger.warning(
                                    f"Failed to increment discount usage for {discount_code_id}"
                                )
                        except Exception as e:  # noqa: BLE001
                            logger.error(f"Error recording discount usage: {e!s}")

                    # Referral processing (idempotent via create_commission_for_payment)
                    if payment_user and payment_user.referral_code_id:
                        try:
                            from sqlmodel import and_

                            from src.db.referrals.referral_tracking import (
                                ReferralTracking,
                            )
                            from src.services.referrals.referral_commissions import (
                                create_commission_for_payment,
                            )

                            tracking = db_session.exec(
                                select(ReferralTracking).where(
                                    and_(
                                        ReferralTracking.referred_user_id
                                        == payment_user.user_id,
                                        ReferralTracking.referral_code_id
                                        == payment_user.referral_code_id,
                                    )
                                )
                            ).first()

                            if tracking:
                                await create_commission_for_payment(
                                    org_id=org_id,
                                    referrer_user_id=tracking.referrer_user_id,
                                    referred_user_id=payment_user.user_id,
                                    payment_user_id=payment_user.id,
                                    course_id=int(course_id) if course_id else None,
                                    referral_code_id=payment_user.referral_code_id,
                                    payment_completion_date=datetime.now(UTC),
                                    db_session=db_session,
                                )
                        except Exception as e:  # noqa: BLE001
                            logger.error(f"Error creating referral commission: {e!s}")

                    return {
                        "status": "success",
                        "message": "Payment processed successfully",
                    }
                else:
                    return {
                        "status": "ignored",
                        "message": "Transaction verification failed",
                    }
            except Exception as e:  # noqa: BLE001
                logger.error(f"Error verifying transaction: {e!s}")
                raise HTTPException(
                    status_code=400, detail=f"Error verifying transaction: {e!s}"
                )

        elif event_type == "subscription.cancelled":
            customer = data.get("customer") or {}
            customer_email = customer.get("customer_email") or customer.get("email")
            if customer_email:
                from src.db.users import User

                user = db_session.exec(
                    select(User).where(User.email == customer_email)
                ).first()
                if user:
                    payment_users = db_session.exec(
                        select(PaymentsUser).where(
                            PaymentsUser.user_id == user.id,
                            PaymentsUser.status.in_(
                                [PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED]
                            ),
                        )
                    ).all()
                    for pu in payment_users:
                        pu.status = PaymentStatusEnum.CANCELLED
                        pu.auto_renew = False
                        pu.grace_period_start_date = None
                        db_session.add(pu)
                    db_session.commit()
                    logger.info(f"Cancelled subscriptions for user {customer_email}")
            return {"status": "ok", "message": "Subscription cancelled handled"}

        elif event_type in ("subscription.created", "subscription.renewed"):
            customer = data.get("customer") or {}
            customer_email = customer.get("customer_email") or customer.get("email")
            plan_id = data.get("plan")
            if customer_email:
                from src.db.users import User

                user = db_session.exec(
                    select(User).where(User.email == customer_email)
                ).first()
                if user:
                    rows = db_session.exec(
                        select(PaymentsUser, PaymentsProduct)
                        .join(
                            PaymentsProduct,
                            PaymentsUser.payment_product_id == PaymentsProduct.id,
                        )
                        .where(
                            PaymentsUser.user_id == user.id,
                            PaymentsProduct.product_type
                            == PaymentProductTypeEnum.SUBSCRIPTION,
                            PaymentsUser.status.in_(
                                [PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED]
                            ),
                        )
                    ).all()

                    matched = [
                        (pu, prod)
                        for pu, prod in rows
                        if not plan_id or str(prod.provider_product_id) == str(plan_id)
                    ] or rows

                    for pu, prod in matched:
                        if event_type == "subscription.renewed":
                            sub_id = data.get("id") or pu.id
                            created_stamp = data.get("created_at") or datetime.now(
                                UTC
                            ).strftime("%Y-%m-%d")
                            cycle_key = f"sub_renew:{sub_id}:{created_stamp}"
                            extend_payment_period(
                                db_session,
                                pu,
                                prod,
                                tx_ref=cycle_key,
                                auto_renew=True,
                            )
                        else:
                            pu.grace_period_start_date = None
                            pu.grace_notice_sent_at = None
                            pu.auto_renew = True
                            db_session.add(pu)
                            db_session.commit()
                    logger.info(
                        f"Handled {event_type} for subscription user {customer_email}"
                    )
            return {"status": "ok", "message": "Subscription renewed handled"}

        else:
            return {
                "status": "ignored",
                "message": f"Unhandled event type: {event_type}",
            }

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in webhook payload: {e!s}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Error processing Flutterwave webhook: {e!s}")
        raise HTTPException(status_code=400, detail=f"Error processing webhook: {e!s}")
