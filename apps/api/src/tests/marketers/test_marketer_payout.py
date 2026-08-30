"""
Marketer payout tests: minimums, saved payment methods, in-flight blocking,
the APPROVED-guard bug fix, and the retry system.
"""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from src.db.notifications import EmailStatus
from src.db.referrals.marketer_payment_methods import PaymentMethodType
from src.db.referrals.payout_requests import (
    PayoutStatus,
    ReferrerPayoutRequest,
)
from src.db.referrals.referral_commissions import (
    CommissionStatus,
    ReferralCommission,
)
from src.services.referrals.payouts import (
    MAX_PAYOUT_RETRIES,
    _handle_payout_failure,
    build_masked_payment_method,
    check_pending_payout,
    decrypt_bank_data,
    get_active_payment_method,
    process_payout_request,
    save_payment_method,
    validate_payout_amount,
)
from src.tests.marketers.conftest import make_marketer, make_user


def _error_code(exc: HTTPException) -> str:
    return exc.detail.get("error_code") if isinstance(exc.detail, dict) else None


def test_postgres_enum_contract_matches_model_values():
    assert [status.value for status in PayoutStatus] == [
        "REQUESTED",
        "APPROVED",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
    ]
    assert [status.value for status in EmailStatus] == [
        "not_required",
        "pending",
        "sent",
        "failed_permanent",
    ]


def _add_eligible_commission(db, user, amount=7.70, org_id=1):
    commission = ReferralCommission(
        org_id=org_id,
        referrer_user_id=user.id,
        referred_user_id=user.id,
        payment_user_id=int(datetime.now(UTC).timestamp() * 1000) % 10_000_000,
        referral_code_id=1,
        commission_amount=amount,
        status=CommissionStatus.ELIGIBLE,
        payment_completion_date=datetime.now(UTC) - timedelta(days=15),
        refund_period_expiration_date=datetime.now(UTC) - timedelta(days=1),
    )
    db.add(commission)
    db.commit()
    return commission


def _make_payout(db, user, amount=10.0, status=PayoutStatus.REQUESTED, org_id=1):
    payout = ReferrerPayoutRequest(
        org_id=org_id,
        referrer_user_id=user.id,
        total_amount=amount,
        status=status,
        bank_account_info="",
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)
    return payout


# ==================== Minimum & balance validation ====================


@pytest.mark.asyncio
async def test_marketer_minimum_payout_enforced(test_db_session):
    user = make_user(test_db_session)
    make_marketer(test_db_session, user, with_code=False)
    _add_eligible_commission(test_db_session, user, 7.70)

    with pytest.raises(HTTPException) as exc:
        await validate_payout_amount(user.id, 5.00, test_db_session, org_id=1)
    assert _error_code(exc.value) == "MKTR_301"

    # At the minimum it passes
    await validate_payout_amount(user.id, 7.70, test_db_session, org_id=1)


@pytest.mark.asyncio
async def test_amount_exceeding_balance_raises_mktr_302(test_db_session):
    user = make_user(test_db_session)
    make_marketer(test_db_session, user, with_code=False)
    _add_eligible_commission(test_db_session, user, 7.70)

    with pytest.raises(HTTPException) as exc:
        await validate_payout_amount(user.id, 100.00, test_db_session, org_id=1)
    assert _error_code(exc.value) == "MKTR_302"


# ==================== In-flight payout blocking ====================


@pytest.mark.asyncio
async def test_check_pending_payout_blocks_approved(test_db_session):
    """Bug fix: APPROVED payouts must count as in-flight"""
    user = make_user(test_db_session)
    _make_payout(test_db_session, user, status=PayoutStatus.APPROVED)

    pending = await check_pending_payout(user.id, test_db_session)
    assert pending is not None
    assert pending.status == PayoutStatus.APPROVED


@pytest.mark.asyncio
async def test_check_pending_payout_ignores_completed_and_failed(test_db_session):
    user = make_user(test_db_session)
    _make_payout(test_db_session, user, status=PayoutStatus.COMPLETED)
    _make_payout(test_db_session, user, status=PayoutStatus.FAILED)

    assert await check_pending_payout(user.id, test_db_session) is None


# ==================== process_payout_request guard (bug fix 3.2.1) ====================


@pytest.mark.asyncio
async def test_process_payout_skips_requested_status(test_db_session):
    """Only APPROVED payouts are processed — REQUESTED is returned untouched"""
    user = make_user(test_db_session)
    payout = _make_payout(test_db_session, user, status=PayoutStatus.REQUESTED)

    result = await process_payout_request(payout.id, test_db_session)

    assert result.status == PayoutStatus.REQUESTED  # not processed, not failed


@pytest.mark.asyncio
async def test_process_payout_processes_approved(test_db_session, monkeypatch):
    """APPROVED payouts enter processing (previously silently skipped)"""
    import httpx

    from src.services.referrals import payouts as payouts_module

    async def mock_network_error(*args, **kwargs):
        raise httpx.ConnectTimeout("Mocked network timeout")

    monkeypatch.setattr(payouts_module, "make_paystack_request", mock_network_error)

    user = make_user(test_db_session, country="NG")
    payout = _make_payout(test_db_session, user, status=PayoutStatus.APPROVED)

    # Paystack is unreachable in tests — the payout must enter the retry path
    # (attempt 1/3 → back to APPROVED with retry_count incremented) instead of
    # being skipped by the old REQUESTED guard.
    result = await process_payout_request(payout.id, test_db_session)

    assert result.retry_count == 1
    assert result.status == PayoutStatus.APPROVED  # queued for retry


# ==================== Retry system ====================


def test_retry_increments_then_fails_permanently(test_db_session):
    user = make_user(test_db_session)
    payout = _make_payout(test_db_session, user, status=PayoutStatus.PROCESSING)

    for attempt in range(1, MAX_PAYOUT_RETRIES + 1):
        payout.status = PayoutStatus.PROCESSING
        _handle_payout_failure(payout, "paystack timeout", test_db_session)
        assert payout.retry_count == attempt
        if attempt < MAX_PAYOUT_RETRIES:
            assert payout.status == PayoutStatus.APPROVED
        else:
            assert payout.status == PayoutStatus.FAILED

    assert payout.last_retry_at is not None
    assert payout.failure_reason == "paystack timeout"


# ==================== Saved payment methods ====================

BANK_DETAILS = {
    "bank_name": "Access Bank",
    "account_number": "0123456789",
    "account_holder": "Test User",
    "account_type": "savings",
    "bank_code": "044",
}

MOBILE_DETAILS = {
    "phone_number": "+254712345678",
    "provider": "mpesa",
    "account_name": "Test User",
}


@pytest.mark.asyncio
async def test_save_payment_method_encrypts_and_derives_currency(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)

    method = await save_payment_method(
        marketer.id,
        user.id,
        1,
        PaymentMethodType.BANK_TRANSFER,
        "NG",
        BANK_DETAILS,
        test_db_session,
    )

    assert method.currency == "NGN"
    assert method.is_active is True
    assert method.flutterwave_beneficiary_id is None
    # Stored encrypted, decrypts back to the original
    assert method.account_details != str(BANK_DETAILS)
    assert decrypt_bank_data(method.account_details) == BANK_DETAILS


@pytest.mark.asyncio
async def test_save_payment_method_deactivates_previous(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)

    first = await save_payment_method(
        marketer.id,
        user.id,
        1,
        PaymentMethodType.BANK_TRANSFER,
        "NG",
        BANK_DETAILS,
        test_db_session,
    )
    second = await save_payment_method(
        marketer.id,
        user.id,
        1,
        PaymentMethodType.BANK_TRANSFER,
        "NG",
        {**BANK_DETAILS, "account_number": "9876543210"},
        test_db_session,
    )

    test_db_session.refresh(first)
    assert first.is_active is False
    active = await get_active_payment_method(marketer.id, test_db_session)
    assert active.id == second.id


@pytest.mark.asyncio
async def test_save_payment_method_unsupported_country(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)

    with pytest.raises(HTTPException) as exc:
        await save_payment_method(
            marketer.id,
            user.id,
            1,
            PaymentMethodType.BANK_TRANSFER,
            "XX",
            BANK_DETAILS,
            test_db_session,
        )
    assert _error_code(exc.value) == "MKTR_351"


@pytest.mark.asyncio
async def test_mobile_money_unavailable_for_nigeria(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)

    with pytest.raises(HTTPException) as exc:
        await save_payment_method(
            marketer.id,
            user.id,
            1,
            PaymentMethodType.MOBILE_MONEY,
            "NG",
            MOBILE_DETAILS,
            test_db_session,
        )
    assert _error_code(exc.value) == "MKTR_352"


@pytest.mark.asyncio
async def test_bank_transfer_unavailable_for_kenya(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)

    with pytest.raises(HTTPException) as exc:
        await save_payment_method(
            marketer.id,
            user.id,
            1,
            PaymentMethodType.BANK_TRANSFER,
            "KE",
            BANK_DETAILS,
            test_db_session,
        )
    assert _error_code(exc.value) == "MKTR_353"


@pytest.mark.asyncio
async def test_save_blocked_while_payout_processing(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)
    _make_payout(test_db_session, user, status=PayoutStatus.PROCESSING)

    with pytest.raises(HTTPException) as exc:
        await save_payment_method(
            marketer.id,
            user.id,
            1,
            PaymentMethodType.BANK_TRANSFER,
            "NG",
            BANK_DETAILS,
            test_db_session,
        )
    assert _error_code(exc.value) == "MKTR_355"


@pytest.mark.asyncio
async def test_masked_payment_method_hides_account_number(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)
    method = await save_payment_method(
        marketer.id,
        user.id,
        1,
        PaymentMethodType.BANK_TRANSFER,
        "NG",
        BANK_DETAILS,
        test_db_session,
    )

    masked = build_masked_payment_method(method)

    assert masked.masked_account == "****6789"
    assert "0123456789" not in str(masked.model_dump())


@pytest.mark.asyncio
async def test_masked_mobile_money_method(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)
    method = await save_payment_method(
        marketer.id,
        user.id,
        1,
        PaymentMethodType.MOBILE_MONEY,
        "KE",
        MOBILE_DETAILS,
        test_db_session,
    )

    masked = build_masked_payment_method(method)

    assert masked.currency == "KES"
    assert masked.masked_account == "****5678"
    assert masked.provider == "mpesa"


# ==================== Recipient type mapping ====================


def test_country_to_currency_expanded():
    from src.services.referrals.payouts import COUNTRY_TO_CURRENCY

    for country, currency in [
        ("RW", "RWF"),
        ("TZ", "TZS"),
        ("UG", "UGX"),
        ("CI", "XOF"),
        ("EG", "EGP"),
    ]:
        assert COUNTRY_TO_CURRENCY[country] == currency
