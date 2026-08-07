"""
Commission amount resolution tests
Active marketer → $7.70 / MARKETER; everyone else → $4.00 / STANDARD
"""

from datetime import UTC, datetime

import pytest

from src.db.referrals.marketers import MarketerStatus
from src.db.referrals.referral_codes import ReferralCode, ReferralCodeStatus
from src.db.referrals.referral_commissions import CommissionType
from src.services.referrals.marketers import (
    get_commission_amount_for_code,
    get_minimum_payout,
    is_active_marketer,
)
from src.services.referrals.referral_commissions import (
    create_commission_for_payment,
)
from src.tests.marketers.conftest import make_marketer, make_user


@pytest.mark.asyncio
async def test_active_marketer_gets_marketer_rate(test_db_session):
    user = make_user(test_db_session)
    _marketer, code = make_marketer(test_db_session, user)

    amount, ctype = await get_commission_amount_for_code(code.id, test_db_session)

    assert amount == 7.70
    assert ctype == CommissionType.MARKETER


@pytest.mark.asyncio
async def test_non_marketer_gets_standard_rate(test_db_session):
    user = make_user(test_db_session)
    code = ReferralCode(
        org_id=1,
        referrer_user_id=user.id,
        code="STANDARD1",
        referral_link="https://example.com/ref/STANDARD1",
        status=ReferralCodeStatus.ACTIVE,
    )
    test_db_session.add(code)
    test_db_session.commit()
    test_db_session.refresh(code)

    amount, ctype = await get_commission_amount_for_code(code.id, test_db_session)

    assert amount == 4.00
    assert ctype == CommissionType.STANDARD


@pytest.mark.asyncio
async def test_suspended_marketer_gets_standard_rate(test_db_session):
    user = make_user(test_db_session)
    _marketer, code = make_marketer(
        test_db_session, user, status=MarketerStatus.SUSPENDED
    )

    amount, ctype = await get_commission_amount_for_code(code.id, test_db_session)

    assert amount == 4.00
    assert ctype == CommissionType.STANDARD


@pytest.mark.asyncio
async def test_marketer_with_custom_rate(test_db_session):
    user = make_user(test_db_session)
    _marketer, code = make_marketer(test_db_session, user, commission_rate=10.50)

    amount, ctype = await get_commission_amount_for_code(code.id, test_db_session)

    assert amount == 10.50
    assert ctype == CommissionType.MARKETER


@pytest.mark.asyncio
async def test_unknown_code_falls_back_to_standard(test_db_session):
    amount, ctype = await get_commission_amount_for_code(99999, test_db_session)

    assert amount == 4.00
    assert ctype == CommissionType.STANDARD


@pytest.mark.asyncio
async def test_is_active_marketer_states(test_db_session):
    for status, expected in [
        (MarketerStatus.ACTIVE, True),
        (MarketerStatus.SUSPENDED, False),
        (MarketerStatus.REJECTED, False),
        (MarketerStatus.PENDING_APPROVAL, False),
    ]:
        user = make_user(test_db_session)
        make_marketer(
            test_db_session,
            user,
            status=status,
            with_code=False,
            phone=f"+23480000{user.id or 0}{status.value[:2]}",
        )
        assert await is_active_marketer(user.id, 1, test_db_session) is expected, (
            f"status={status}"
        )


@pytest.mark.asyncio
async def test_minimum_payout_marketer_vs_standard(test_db_session):
    marketer_user = make_user(test_db_session)
    make_marketer(test_db_session, marketer_user, with_code=False)
    standard_user = make_user(test_db_session)

    assert await get_minimum_payout(marketer_user.id, 1, test_db_session) == 7.70
    assert await get_minimum_payout(standard_user.id, 1, test_db_session) == 1.00


@pytest.mark.asyncio
async def test_create_commission_uses_marketer_amount(test_db_session):
    user = make_user(test_db_session)
    student = make_user(test_db_session)
    _marketer, code = make_marketer(test_db_session, user)

    commission = await create_commission_for_payment(
        org_id=1,
        referrer_user_id=user.id,
        referred_user_id=student.id,
        payment_user_id=1,
        course_id=None,
        referral_code_id=code.id,
        payment_completion_date=datetime.now(UTC),
        db_session=test_db_session,
    )

    assert commission is not None
    assert commission.commission_amount == 7.70
    assert commission.commission_type == CommissionType.MARKETER

    # Idempotency: same payment + code returns None (no duplicate)
    duplicate = await create_commission_for_payment(
        org_id=1,
        referrer_user_id=user.id,
        referred_user_id=student.id,
        payment_user_id=1,
        course_id=None,
        referral_code_id=code.id,
        payment_completion_date=datetime.now(UTC),
        db_session=test_db_session,
    )
    assert duplicate is None


@pytest.mark.asyncio
async def test_create_commission_standard_referrer(test_db_session):
    user = make_user(test_db_session)
    student = make_user(test_db_session)
    code = ReferralCode(
        org_id=1,
        referrer_user_id=user.id,
        code="STDCODE99",
        referral_link="https://example.com/ref/STDCODE99",
        status=ReferralCodeStatus.ACTIVE,
    )
    test_db_session.add(code)
    test_db_session.commit()
    test_db_session.refresh(code)

    commission = await create_commission_for_payment(
        org_id=1,
        referrer_user_id=user.id,
        referred_user_id=student.id,
        payment_user_id=2,
        course_id=None,
        referral_code_id=code.id,
        payment_completion_date=datetime.now(UTC),
        db_session=test_db_session,
    )

    assert commission is not None
    assert commission.commission_amount == 4.00
    assert commission.commission_type == CommissionType.STANDARD
