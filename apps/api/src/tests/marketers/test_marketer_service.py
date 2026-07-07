"""
Marketer lifecycle service tests: register, approve, reject, suspend, reactivate
"""

import pytest
from fastapi import HTTPException

from src.db.referrals.marketers import MarketerStatus
from src.db.referrals.referral_codes import ReferralCode, ReferralCodeStatus
from src.services.referrals.marketers import (
    approve_marketer,
    reactivate_marketer,
    register_marketer,
    reject_marketer,
    suspend_marketer,
)
from src.tests.marketers.conftest import make_user, make_marketer


def _error_code(exc: HTTPException) -> str:
    return exc.detail.get("error_code") if isinstance(exc.detail, dict) else None


@pytest.mark.asyncio
async def test_register_creates_pending_marketer(test_db_session):
    user = make_user(test_db_session)

    marketer = await register_marketer(
        user_id=user.id,
        org_id=1,
        phone_number="+2348011111111",
        db_session=test_db_session,
    )

    assert marketer.status == MarketerStatus.PENDING_APPROVAL
    assert marketer.commission_rate_usd == 7.70
    assert marketer.phone_number == "+2348011111111"
    assert marketer.referral_code_id is None


@pytest.mark.asyncio
async def test_register_duplicate_raises_mktr_001(test_db_session):
    user = make_user(test_db_session)
    await register_marketer(user.id, 1, "+2348011111112", test_db_session)

    with pytest.raises(HTTPException) as exc:
        await register_marketer(user.id, 1, "+2348011111113", test_db_session)
    assert _error_code(exc.value) == "MKTR_001"


@pytest.mark.asyncio
async def test_register_duplicate_phone_raises_mktr_006(test_db_session):
    user_a = make_user(test_db_session)
    user_b = make_user(test_db_session)
    await register_marketer(user_a.id, 1, "+2348011111114", test_db_session)

    with pytest.raises(HTTPException) as exc:
        await register_marketer(user_b.id, 1, "+2348011111114", test_db_session)
    assert _error_code(exc.value) == "MKTR_006"


@pytest.mark.asyncio
async def test_register_unknown_user_raises_mktr_002(test_db_session):
    with pytest.raises(HTTPException) as exc:
        await register_marketer(424242, 1, "+2348011111115", test_db_session)
    assert _error_code(exc.value) == "MKTR_002"


@pytest.mark.asyncio
async def test_approve_sets_active_and_generates_mkt_code(test_db_session):
    user = make_user(test_db_session)
    marketer = await register_marketer(user.id, 1, "+2348011111116", test_db_session)

    approved = await approve_marketer(marketer.id, 1, 999, test_db_session)

    assert approved.status == MarketerStatus.ACTIVE
    assert approved.approved_by_user_id == 999
    assert approved.approved_at is not None
    assert approved.referral_code_id is not None

    code = test_db_session.get(ReferralCode, approved.referral_code_id)
    assert code.code.startswith("MKT-")
    assert code.status == ReferralCodeStatus.ACTIVE

    # User flag updated
    test_db_session.refresh(user)
    assert user.has_referral_code is True


@pytest.mark.asyncio
async def test_approve_non_pending_raises_mktr_402(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)  # already ACTIVE

    with pytest.raises(HTTPException) as exc:
        await approve_marketer(marketer.id, 1, 999, test_db_session)
    assert _error_code(exc.value) == "MKTR_402"


@pytest.mark.asyncio
async def test_reject_stores_reason(test_db_session):
    user = make_user(test_db_session)
    marketer = await register_marketer(user.id, 1, "+2348011111117", test_db_session)

    rejected = await reject_marketer(
        marketer.id, 1, "Incomplete application", 999, test_db_session
    )

    assert rejected.status == MarketerStatus.REJECTED
    assert rejected.rejection_reason == "Incomplete application"


@pytest.mark.asyncio
async def test_suspend_deactivates_referral_code(test_db_session):
    user = make_user(test_db_session)
    marketer, code = make_marketer(test_db_session, user)

    suspended = await suspend_marketer(marketer.id, 1, 999, test_db_session)

    assert suspended.status == MarketerStatus.SUSPENDED
    test_db_session.refresh(code)
    assert code.status == ReferralCodeStatus.INACTIVE


@pytest.mark.asyncio
async def test_suspend_twice_raises_mktr_403(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)
    await suspend_marketer(marketer.id, 1, 999, test_db_session)

    with pytest.raises(HTTPException) as exc:
        await suspend_marketer(marketer.id, 1, 999, test_db_session)
    assert _error_code(exc.value) == "MKTR_403"


@pytest.mark.asyncio
async def test_reactivate_suspended_marketer(test_db_session):
    user = make_user(test_db_session)
    marketer, code = make_marketer(test_db_session, user)
    await suspend_marketer(marketer.id, 1, 999, test_db_session)

    reactivated = await reactivate_marketer(marketer.id, 1, 999, test_db_session)

    assert reactivated.status == MarketerStatus.ACTIVE
    test_db_session.refresh(code)
    assert code.status == ReferralCodeStatus.ACTIVE


@pytest.mark.asyncio
async def test_reactivate_rejected_raises_mktr_404(test_db_session):
    user = make_user(test_db_session)
    marketer = await register_marketer(user.id, 1, "+2348011111118", test_db_session)
    await reject_marketer(marketer.id, 1, "fraud", 999, test_db_session)

    with pytest.raises(HTTPException) as exc:
        await reactivate_marketer(marketer.id, 1, 999, test_db_session)
    assert _error_code(exc.value) == "MKTR_404"


@pytest.mark.asyncio
async def test_registering_after_rejection_raises_mktr_008(test_db_session):
    user = make_user(test_db_session)
    marketer = await register_marketer(user.id, 1, "+2348011111119", test_db_session)
    await reject_marketer(marketer.id, 1, "fraud", 999, test_db_session)

    with pytest.raises(HTTPException) as exc:
        await register_marketer(user.id, 1, "+2348011111120", test_db_session)
    assert _error_code(exc.value) == "MKTR_008"


@pytest.mark.asyncio
async def test_approve_reuses_existing_referral_code(test_db_session):
    """A user who already earned a standard referral code keeps it on approval
    so previously shared links keep working"""
    user = make_user(test_db_session)
    existing = ReferralCode(
        org_id=1,
        referrer_user_id=user.id,
        code="OLDCODE77",
        referral_link="https://example.com/ref/OLDCODE77",
        status=ReferralCodeStatus.ACTIVE,
    )
    test_db_session.add(existing)
    test_db_session.commit()
    test_db_session.refresh(existing)

    marketer = await register_marketer(user.id, 1, "+2348011111121", test_db_session)
    approved = await approve_marketer(marketer.id, 1, 999, test_db_session)

    assert approved.referral_code_id == existing.id
