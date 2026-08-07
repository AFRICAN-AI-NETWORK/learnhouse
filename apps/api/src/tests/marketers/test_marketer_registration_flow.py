"""
Integration test: full marketer registration flow
register → pending → approve → code generated → $7.70 commission on payment
"""

from datetime import datetime

import pytest

from src.db.referrals.marketers import MarketerStatus
from src.db.referrals.referral_codes import ReferralCode
from src.db.referrals.referral_commissions import CommissionStatus, CommissionType
from src.services.referrals.marketers import (
    approve_marketer,
    is_active_marketer,
    register_marketer,
)
from src.services.referrals.referral_commissions import (
    create_commission_for_payment,
)
from src.tests.marketers.conftest import make_user


@pytest.mark.asyncio
async def test_full_registration_to_commission_flow(test_db_session):
    # 1. Register
    user = make_user(test_db_session)
    marketer = await register_marketer(user.id, 1, "+2348099999999", test_db_session)
    assert marketer.status == MarketerStatus.PENDING_APPROVAL
    assert not await is_active_marketer(user.id, 1, test_db_session)

    # 2. Admin approves → ACTIVE + MKT- code
    admin = make_user(test_db_session)
    approved = await approve_marketer(marketer.id, 1, admin.id, test_db_session)
    assert approved.status == MarketerStatus.ACTIVE
    assert await is_active_marketer(user.id, 1, test_db_session)

    code = test_db_session.get(ReferralCode, approved.referral_code_id)
    assert code is not None
    assert code.code.startswith("MKT-")

    # 3. Student pays with the marketer's code → $7.70 MARKETER commission
    student = make_user(test_db_session)
    commission = await create_commission_for_payment(
        org_id=1,
        referrer_user_id=user.id,
        referred_user_id=student.id,
        payment_user_id=777,
        course_id=None,
        referral_code_id=code.id,
        payment_completion_date=datetime.now(),
        db_session=test_db_session,
    )

    assert commission is not None
    assert commission.commission_amount == 7.70
    assert commission.commission_type == CommissionType.MARKETER
    assert commission.status == CommissionStatus.PENDING  # 14-day refund period
