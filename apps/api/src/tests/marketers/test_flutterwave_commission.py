"""
Flutterwave webhook commission tests (bug fix 3.2.6)
The Flutterwave handler must create commissions like the Paystack handler,
with idempotency guaranteed by the (payment_user_id, referral_code_id) rule.
"""

from datetime import UTC, datetime

import pytest
from sqlmodel import select

from src.db.courses.courses import Course
from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser
from src.db.referrals.referral_commissions import (
    CommissionType,
    ReferralCommission,
)
from src.db.referrals.referral_tracking import ReferralTracking
from src.routers.webhooks.flutterwave import (
    _create_referral_commission_for_flutterwave,
)
from src.tests.marketers.conftest import make_marketer, make_user


def _setup_payment_flow(db, with_referral=True):
    """Marketer + student + course + payment record (+ tracking)"""
    marketer_user = make_user(db)
    _marketer, code = make_marketer(db, marketer_user)
    student = make_user(db)

    course = Course(
        name="Test Course",
        description="",
        course_uuid=f"course_{student.id}",
        org_id=1,
        public=True,
        open_to_contributors=False,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    payment_user = PaymentsUser(
        user_id=student.id,
        org_id=1,
        payment_product_id=1,
        status=PaymentStatusEnum.COMPLETED,
        referral_code_id=code.id if with_referral else None,
    )
    db.add(payment_user)
    db.commit()
    db.refresh(payment_user)

    if with_referral:
        tracking = ReferralTracking(
            referred_user_id=student.id,
            referral_code_id=code.id,
            referrer_user_id=marketer_user.id,
            ip_address="1.2.3.4",
        )
        db.add(tracking)
        db.commit()

    return marketer_user, code, student, course, payment_user


@pytest.mark.asyncio
async def test_flutterwave_creates_marketer_commission(test_db_session):
    marketer_user, _code, student, course, payment_user = _setup_payment_flow(
        test_db_session
    )

    await _create_referral_commission_for_flutterwave(
        user=student, course=course, meta={}, db_session=test_db_session
    )

    commission = test_db_session.exec(
        select(ReferralCommission).where(
            ReferralCommission.payment_user_id == payment_user.id
        )
    ).first()

    assert commission is not None
    assert commission.commission_amount == 7.70
    assert commission.commission_type == CommissionType.MARKETER
    assert commission.referrer_user_id == marketer_user.id
    assert commission.course_id == course.id


@pytest.mark.asyncio
async def test_flutterwave_no_referral_code_no_commission(test_db_session):
    _, _, student, course, _payment_user = _setup_payment_flow(
        test_db_session, with_referral=False
    )

    await _create_referral_commission_for_flutterwave(
        user=student, course=course, meta={}, db_session=test_db_session
    )

    commissions = test_db_session.exec(select(ReferralCommission)).all()
    assert commissions == []


@pytest.mark.asyncio
async def test_flutterwave_duplicate_webhook_is_idempotent(test_db_session):
    _, _, student, course, payment_user = _setup_payment_flow(test_db_session)

    # Webhook fires twice (e.g. Flutterwave retry, or Paystack already created it)
    await _create_referral_commission_for_flutterwave(
        user=student, course=course, meta={}, db_session=test_db_session
    )
    await _create_referral_commission_for_flutterwave(
        user=student, course=course, meta={}, db_session=test_db_session
    )

    commissions = test_db_session.exec(
        select(ReferralCommission).where(
            ReferralCommission.payment_user_id == payment_user.id
        )
    ).all()
    assert len(commissions) == 1
