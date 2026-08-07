
import logging

from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select

from src.core.events.database import get_db_session
from src.db.courses.courses import Course
from src.db.users import User
from src.services.payments.webhooks.payments_flutterwave_webhooks import (
    handle_flutterwave_webhook,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/flutterwave")
async def flutterwave_webhook(
    request: Request,
    db_session: Session = Depends(get_db_session),
):
    """Webhook endpoint for Flutterwave"""
    return await handle_flutterwave_webhook(request, db_session)


async def _create_referral_commission_for_flutterwave(
    user: User, course: Course, meta: dict, db_session: Session
) -> None:
    """
    Create a referral commission for a completed Flutterwave charge.
    Referral attribution comes from the payer's PaymentsUser record (set at
    checkout) or from webhook metadata as a fallback.
    """
    from datetime import datetime, timezone

    from src.db.payments.payments_users import PaymentsUser
    from src.db.referrals.referral_tracking import ReferralTracking
    from src.services.referrals.referral_commissions import (
        create_commission_for_payment,
    )

    # Find the payment user record for this payer (most recent for this org)
    payment_user = db_session.exec(
        select(PaymentsUser)
        .where(
            PaymentsUser.user_id == user.id,
            PaymentsUser.org_id == course.org_id,
        )
        .order_by(PaymentsUser.id.desc())
    ).first()

    if not payment_user:
        logger.warning(
            f"No payment user record found for user {user.id} in org {course.org_id}"
        )
        return

    # Lookup referral tracking for this referred student
    tracking = db_session.exec(
        select(ReferralTracking).where(
            ReferralTracking.referred_user_id == user.id,
        )
    ).first()

    if not tracking:
        logger.info(f"No referral tracking found for Flutterwave payment by user {user.id}")
        return

    referral_code_id = tracking.referral_code_id
    if not referral_code_id:
        logger.info(
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
        payment_completion_date=datetime.now(timezone.utc),
        db_session=db_session,
    )
    if commission:
        logger.info(
            f"Created referral commission ${commission.commission_amount} "
            f"(Flutterwave) for referrer {tracking.referrer_user_id}"
        )
