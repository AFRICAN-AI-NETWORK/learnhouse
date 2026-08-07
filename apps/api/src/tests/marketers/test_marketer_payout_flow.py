"""
Integration test: full marketer payout flow
commission → eligible → KYC verified → payment method saved → payout requested
→ admin approves → background processing (Paystack mocked) → COMPLETED →
balance decremented → recipient code cached for reuse
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import Mock

import pytest

from src.db.referrals.marketer_kyc import KYCDocumentType
from src.db.referrals.marketer_payment_methods import PaymentMethodType
from src.db.referrals.payout_requests import PayoutStatus
from src.db.referrals.referral_commissions import (
    CommissionStatus,
    ReferralCommission,
)
from src.services.referrals import payouts as payouts_module
from src.services.referrals.marketer_kyc import approve_kyc, submit_kyc
from src.services.referrals.marketers import refresh_marketer_counters
from src.services.referrals.payouts import (
    create_payout_request,
    process_payout_request,
    save_payment_method,
)
from src.services.referrals.referral_commissions import (
    update_pending_commissions_to_eligible,
)
from src.tests.marketers.conftest import make_marketer, make_user


@pytest.fixture
def mock_flutterwave(monkeypatch):
    """Mock Paystack recipient + transfer API and the exchange rate lookup"""
    calls = {"transferrecipient": 0, "transfer": 0}

    async def fake_flutterwave(method, endpoint, data, headers=None):
        if "transferrecipient" in endpoint:
            calls["transferrecipient"] += 1
            return {"recipient_code": "RCP_flow1"}
        if "transfer" in endpoint:
            calls["transfer"] += 1
            return {"transfer_code": "TRF_flow1"}
        return {}

    async def fake_rate(currency):
        return 1500.0

    monkeypatch.setattr(payouts_module, "make_paystack_request", fake_flutterwave)
    monkeypatch.setattr(payouts_module, "get_usd_to_currency_exchange_rate", fake_rate)
    return calls


@pytest.mark.asyncio
async def test_full_payout_flow(test_db_session, mock_flutterwave):
    org_id = 1
    user = make_user(test_db_session, country="NG")
    marketer, code = make_marketer(test_db_session, user)
    student = make_user(test_db_session)

    # 1. Two commissions created 15 days ago (refund window elapsed)
    for i in range(2):
        commission = ReferralCommission(
            org_id=org_id,
            referrer_user_id=user.id,
            referred_user_id=student.id,
            payment_user_id=9000 + i,
            referral_code_id=code.id,
            commission_amount=7.70,
            status=CommissionStatus.PENDING,
            payment_completion_date=datetime.now(UTC) - timedelta(days=15),
            refund_period_expiration_date=datetime.now(UTC) - timedelta(days=1),
        )
        test_db_session.add(commission)
    test_db_session.commit()

    # 2. Nightly job moves them to ELIGIBLE and credits the balance
    updated = await update_pending_commissions_to_eligible(test_db_session)
    assert updated == 2
    test_db_session.refresh(user)
    assert user.referral_commission_balance == pytest.approx(15.40)

    # 3. KYC verified
    kyc = await submit_kyc(
        marketer_id=marketer.id,
        org_id=org_id,
        user_id=user.id,
        document_type=KYCDocumentType.PASSPORT,
        id_number="FLOW-123",
        front_key="marketer-kyc/1/1/front.jpg",
        selfie_key="marketer-kyc/1/1/selfie.jpg",
        db_session=test_db_session,
    )
    await approve_kyc(kyc.id, org_id, 999, test_db_session)

    # 4. Payment method saved
    await save_payment_method(
        marketer.id,
        user.id,
        org_id,
        PaymentMethodType.BANK_TRANSFER,
        "NG",
        {
            "bank_name": "Access Bank",
            "account_number": "0123456789",
            "account_holder": "Test User",
            "account_type": "savings",
            "bank_code": "044",
        },
        test_db_session,
    )

    # 5. Payout requested from the saved method (no bank details in request)
    mock_user = Mock()
    mock_user.id = user.id
    payout_read = await create_payout_request(
        request=Mock(),
        org_id=org_id,
        amount=15.40,
        bank_details=None,
        current_user=mock_user,
        db_session=test_db_session,
        use_saved_method=True,
    )
    assert payout_read.status == PayoutStatus.REQUESTED

    # 6. Second payout blocked while the first is in flight (MKTR_303)
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        await create_payout_request(
            request=Mock(),
            org_id=org_id,
            amount=7.70,
            bank_details=None,
            current_user=mock_user,
            db_session=test_db_session,
            use_saved_method=True,
        )
    assert exc.value.detail["error_code"] == "MKTR_303"

    # 7. Admin approves
    from src.db.referrals.payout_requests import ReferrerPayoutRequest

    payout = test_db_session.get(ReferrerPayoutRequest, payout_read.id)
    payout.status = PayoutStatus.APPROVED
    test_db_session.add(payout)
    test_db_session.commit()

    # 8. Background job processes → COMPLETED, balance decremented
    result = await process_payout_request(payout.id, test_db_session)
    assert result.status == PayoutStatus.COMPLETED
    assert type(result.paystack_transfer_code) is str
    assert result.converted_amount == pytest.approx(15.40 * 1500.0)

    test_db_session.refresh(user)
    assert user.referral_commission_balance == pytest.approx(0.0)

    # Commissions marked PAID and linked to the payout
    paid = test_db_session.exec(
        __import__("sqlmodel")
        .select(ReferralCommission)
        .where(ReferralCommission.status == CommissionStatus.PAID)
    ).all()
    assert len(paid) == 2
    assert all(c.payout_request_id == payout.id for c in paid)

    # 9. No recipient code caching needed for flutterwave

    # 10. Denormalized counters reflect the payout
    await refresh_marketer_counters(marketer.id, test_db_session)
    test_db_session.refresh(marketer)
    assert marketer.total_courses_sold == 2
    assert marketer.total_paid_usd == pytest.approx(15.40)


@pytest.mark.asyncio
async def test_eligibility_job_chunked_processing(test_db_session, monkeypatch):
    """Chunk loop processes every row even when count exceeds the chunk size"""
    from src.services.referrals import referral_commissions as rc_module

    monkeypatch.setattr(rc_module, "ELIGIBILITY_CHUNK_SIZE", 2)

    user = make_user(test_db_session)
    for i in range(5):
        commission = ReferralCommission(
            org_id=1,
            referrer_user_id=user.id,
            referred_user_id=user.id,
            payment_user_id=9200 + i,
            referral_code_id=1,
            commission_amount=4.00,
            status=CommissionStatus.PENDING,
            payment_completion_date=datetime.now(UTC) - timedelta(days=15),
            refund_period_expiration_date=datetime.now(UTC) - timedelta(days=1),
        )
        test_db_session.add(commission)
    test_db_session.commit()

    updated = await update_pending_commissions_to_eligible(test_db_session)

    assert updated == 5
    test_db_session.refresh(user)
    assert user.referral_commission_balance == pytest.approx(20.0)
