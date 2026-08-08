import json
import logging
from datetime import UTC

from fastapi import HTTPException, Request
from sqlmodel import Session, select

from config.config import get_learnhouse_config
from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser
from src.db.users import InternalUser
from src.services.payments.discount_codes import (
    increment_discount_usage_atomic,
    record_discount_usage,
)
from src.services.payments.payments_flutterwave import verify_transaction
from src.services.payments.payments_users import update_payment_user_status

logger = logging.getLogger(__name__)


async def verify_flutterwave_webhook_signature(
    request: Request,
    secret: str,
) -> bool:
    """Verify Flutterwave webhook signature"""
    signature = request.headers.get("verif-hash")
    return not (not signature or signature != secret)


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
            if status != "successful":
                return {"status": "ignored", "message": "Transaction not successful"}

            transaction_reference = data.get("tx_ref")
            data.get("id")  # The FW transaction ID
            metadata = data.get("meta", {})
            payment_user_id = metadata.get("payment_user_id")

            if not payment_user_id:
                logger.warning("No payment_user_id in webhook metadata")
                return {
                    "status": "ignored",
                    "message": "No payment_user_id in metadata",
                }

            try:
                # We can verify by tx_ref
                transaction_data = await verify_transaction(transaction_reference)

                if transaction_data.get("status") == "success":
                    org_id = int(metadata.get("org_id"))

                    await update_payment_user_status(
                        request=request,
                        org_id=org_id,
                        payment_user_id=int(payment_user_id),
                        status=PaymentStatusEnum.COMPLETED,
                        current_user=InternalUser(),
                        db_session=db_session,
                    )

                    discount_code_id = metadata.get("discount_code_id")
                    course_id = metadata.get("course_id")
                    product_id = metadata.get("product_id")

                    if discount_code_id and (course_id or product_id):
                        payment_user = db_session.exec(
                            select(PaymentsUser).where(
                                PaymentsUser.id == int(payment_user_id)
                            )
                        ).first()

                        if payment_user and payment_user.discount_code_id:
                            try:
                                increment_success = (
                                    await increment_discount_usage_atomic(
                                        int(discount_code_id), db_session
                                    )
                                )
                                if increment_success:
                                    await record_discount_usage(
                                        discount_code_id=int(discount_code_id),
                                        user_id=int(metadata.get("user_id")),
                                        course_id=int(course_id) if course_id else None,
                                        product_id=int(product_id)
                                        if product_id
                                        else None,
                                        payment_user_id=int(payment_user_id),
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

                    # Referral processing
                    payment_user = db_session.exec(
                        select(PaymentsUser).where(
                            PaymentsUser.id == int(payment_user_id)
                        )
                    ).first()

                    if payment_user and payment_user.referral_code_id:
                        try:
                            from datetime import datetime

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
                                    org_id=payment_user.org_id,
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

        elif (
            event_type == "subscription.created" or event_type == "subscription.renewed"
        ):
            # We might have separate subscription logic, similar to paystack
            pass
        else:
            return {
                "status": "ignored",
                "message": f"Unhandled event type: {event_type}",
            }

        return {"status": "ok"}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in webhook payload: {e!s}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:  # noqa: BLE001
        logger.error(f"Error processing Flutterwave webhook: {e!s}")
        raise HTTPException(status_code=400, detail=f"Error processing webhook: {e!s}")
