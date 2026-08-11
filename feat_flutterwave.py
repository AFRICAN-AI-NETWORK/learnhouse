from fastapi import APIRouter, Depends, Request, HTTPException
from sqlmodel import Session, select
from src.core.events.database import get_db_session
from src.db.users import User
from src.db.courses.courses import Course
from src.services.trail.trail import add_course_to_trail
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/flutterwave")
async def flutterwave_webhook(
    request: Request,
    db_session: Session = Depends(get_db_session),
):
    # Verify the webhook signature
    expected_hash = os.getenv("FLUTTERWAVE_WEBHOOK_HASH")
    signature = request.headers.get("verif-hash")

    if not expected_hash:
        raise HTTPException(status_code=500, detail="Webhook hash not configured")

    if not signature or signature != expected_hash:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Only process completed charges
    if (
        payload.get("event") == "charge.completed"
        and payload.get("data", {}).get("status") == "successful"
    ):
        data = payload.get("data", {})
        meta = data.get("meta", {})

        user_email = data.get("customer", {}).get("email")
        course_uuid = meta.get("course_uuid")

        if not user_email or not course_uuid:
            # Maybe not an enrollment transaction, skip
            return {"status": "ok"}

        # Find user by email
        statement = select(User).where(User.email == user_email)
        user = db_session.exec(statement).first()

        if not user:
            # User not found, perhaps they haven't been created yet.
            # Usually they are created before checkout, but if not, we can't enroll them.
            return {"status": "user_not_found"}

        # Find course by uuid
        statement = select(Course).where(Course.course_uuid == course_uuid)
        course = db_session.exec(statement).first()

        if not course:
            return {"status": "course_not_found"}

        # Enroll the user (this simulates the backend enrollment logic)
        try:
            # add_course_to_trail requires a PublicUser object and request. We might need to bypass request
            # since it's a webhook. `add_course_to_trail` signature:
            # async def add_course_to_trail(request: Request, user: PublicUser, course_uuid: str, db_session: Session)
            # We can mock PublicUser
            from src.db.users import PublicUser

            public_user = PublicUser(**user.model_dump())
            await add_course_to_trail(request, public_user, course_uuid, db_session)
        except HTTPException as e:
            # If already exists, we can ignore 400
            if e.status_code == 400 and "already exists" in str(e.detail):
                pass
            else:
                # Other error
                pass

        # REFERRAL SYSTEM: Create commission if the payer used a referral code.
        # Mirrors the Paystack webhook — the unique index on
        # (payment_user_id, referral_code_id) guarantees idempotency even if
        # both providers fire for the same payment.
        try:
            await _create_referral_commission_for_flutterwave(
                user=user, course=course, meta=meta, db_session=db_session
            )
        except Exception as e:
            # Never fail the webhook — payment and enrollment succeeded
            logger.error(f"Error creating Flutterwave referral commission: {e}")

    return {"status": "ok"}


async def _create_referral_commission_for_flutterwave(
    user: User, course: Course, meta: dict, db_session: Session
) -> None:
    """
    Create a referral commission for a completed Flutterwave charge.
    Referral attribution comes from the payer's PaymentsUser record (set at
    checkout) or from webhook metadata as a fallback.
    """
    from datetime import datetime
    from src.db.payments.payments_users import PaymentsUser
    from src.db.referrals.referral_tracking import ReferralTracking
    from src.services.referrals.referral_commissions import (
        create_commission_for_payment,
    )
    from sqlmodel import and_

    # Find the payment user record for this payer (most recent for this org)
    payment_user_statement = (
        select(PaymentsUser)
        .where(PaymentsUser.user_id == user.id)
        .order_by(PaymentsUser.creation_date.desc())
    )
    payment_user = db_session.exec(payment_user_statement).first()

    referral_code_id = None
    if payment_user and payment_user.referral_code_id:
        referral_code_id = payment_user.referral_code_id
    elif meta.get("referral_code_id"):
        referral_code_id = int(meta["referral_code_id"])

    if not payment_user or not referral_code_id:
        return

    # Find the tracking record linking this student to a referrer
    tracking = db_session.exec(
        select(ReferralTracking).where(
            and_(
                ReferralTracking.referred_user_id == user.id,
                ReferralTracking.referral_code_id == referral_code_id,
            )
        )
    ).first()

    if not tracking:
        logger.warning(
            f"No referral tracking found for Flutterwave payment by user {user.id} "
            f"with referral_code_id {referral_code_id}"
        )
        return

    commission = await create_commission_for_payment(
        org_id=payment_user.org_id,
        referrer_user_id=tracking.referrer_user_id,
        referred_user_id=user.id,
        payment_user_id=payment_user.id,
        course_id=course.id,
        referral_code_id=referral_code_id,
        payment_completion_date=datetime.now(),
        db_session=db_session,
    )
    if commission:
        logger.info(
            f"Created referral commission ${commission.commission_amount} "
            f"(Flutterwave) for referrer {tracking.referrer_user_id}"
        )
