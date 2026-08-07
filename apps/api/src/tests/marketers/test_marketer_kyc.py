"""
Marketer KYC tests: submission, duplicate ID protection, review, prerequisites
"""

import pytest
from fastapi import HTTPException

from src.db.referrals.marketer_kyc import KYCDocumentType, KYCStatus
from src.services.referrals.marketer_kyc import (
    approve_kyc,
    get_kyc_status,
    hash_id_number,
    reject_kyc,
    submit_kyc,
    validate_payout_prerequisites,
)
from src.tests.marketers.conftest import make_marketer, make_user


def _error_code(exc: HTTPException) -> str:
    return exc.detail.get("error_code") if isinstance(exc.detail, dict) else None


async def _submit(
    db, marketer, user, id_number="A1234567", doc=KYCDocumentType.PASSPORT
):
    return await submit_kyc(
        marketer_id=marketer.id,
        org_id=1,
        user_id=user.id,
        document_type=doc,
        id_number=id_number,
        front_key="marketer-kyc/1/1/front.jpg",
        selfie_key="marketer-kyc/1/1/selfie.jpg",
        db_session=db,
    )


def test_hash_id_number_normalizes():
    assert hash_id_number(" ab123 ") == hash_id_number("AB123")
    assert len(hash_id_number("AB123")) == 64


@pytest.mark.asyncio
async def test_submit_kyc_sets_pending_review(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)

    kyc = await _submit(test_db_session, marketer, user)

    assert kyc.status == KYCStatus.PENDING_REVIEW
    assert kyc.submission_count == 1
    assert kyc.id_number_hash == hash_id_number("A1234567")


@pytest.mark.asyncio
async def test_duplicate_id_number_raises_mktr_201(test_db_session):
    user_a = make_user(test_db_session)
    marketer_a, _ = make_marketer(test_db_session, user_a, phone="+254700000001")
    user_b = make_user(test_db_session)
    marketer_b, _ = make_marketer(test_db_session, user_b, phone="+254700000002")

    await _submit(test_db_session, marketer_a, user_a, id_number="SAME-ID-1")

    with pytest.raises(HTTPException) as exc:
        await _submit(test_db_session, marketer_b, user_b, id_number="SAME-ID-1")
    assert _error_code(exc.value) == "MKTR_201"


@pytest.mark.asyncio
async def test_max_submissions_raises_mktr_202(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)

    for attempt in range(3):
        kyc = await _submit(test_db_session, marketer, user)
        await reject_kyc(kyc.id, 1, "blurry", 999, test_db_session)

    with pytest.raises(HTTPException) as exc:
        await _submit(test_db_session, marketer, user)
    assert _error_code(exc.value) == "MKTR_202"


@pytest.mark.asyncio
async def test_national_id_requires_back_image(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)

    with pytest.raises(HTTPException) as exc:
        await _submit(test_db_session, marketer, user, doc=KYCDocumentType.NATIONAL_ID)
    assert _error_code(exc.value) == "MKTR_203"


@pytest.mark.asyncio
async def test_approve_kyc_sets_verified(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)
    kyc = await _submit(test_db_session, marketer, user)

    approved = await approve_kyc(kyc.id, 1, 999, test_db_session)

    assert approved.status == KYCStatus.VERIFIED
    assert approved.reviewed_by_user_id == 999
    assert approved.reviewed_at is not None
    assert await get_kyc_status(marketer.id, test_db_session) == KYCStatus.VERIFIED


@pytest.mark.asyncio
async def test_reject_kyc_stores_reason(test_db_session):
    user = make_user(test_db_session)
    marketer, _ = make_marketer(test_db_session, user)
    kyc = await _submit(test_db_session, marketer, user)

    rejected = await reject_kyc(kyc.id, 1, "Photo unreadable", 999, test_db_session)

    assert rejected.status == KYCStatus.REJECTED
    assert rejected.rejection_reason == "Photo unreadable"


@pytest.mark.asyncio
async def test_prerequisites_country_first(test_db_session):
    user = make_user(test_db_session)  # no country
    _marketer, _ = make_marketer(test_db_session, user)

    with pytest.raises(HTTPException) as exc:
        await validate_payout_prerequisites(user.id, 1, test_db_session)
    assert _error_code(exc.value) == "MKTR_305"


@pytest.mark.asyncio
async def test_prerequisites_kyc_unverified(test_db_session):
    user = make_user(test_db_session, country="NG")
    _marketer, _ = make_marketer(test_db_session, user)

    with pytest.raises(HTTPException) as exc:
        await validate_payout_prerequisites(user.id, 1, test_db_session)
    assert _error_code(exc.value) == "MKTR_206"


@pytest.mark.asyncio
async def test_prerequisites_kyc_pending_review(test_db_session):
    user = make_user(test_db_session, country="NG")
    marketer, _ = make_marketer(test_db_session, user)
    await _submit(test_db_session, marketer, user)

    with pytest.raises(HTTPException) as exc:
        await validate_payout_prerequisites(user.id, 1, test_db_session)
    assert _error_code(exc.value) == "MKTR_207"


@pytest.mark.asyncio
async def test_prerequisites_payment_method_missing(test_db_session):
    user = make_user(test_db_session, country="NG")
    marketer, _ = make_marketer(test_db_session, user)
    kyc = await _submit(test_db_session, marketer, user)
    await approve_kyc(kyc.id, 1, 999, test_db_session)

    with pytest.raises(HTTPException) as exc:
        await validate_payout_prerequisites(user.id, 1, test_db_session)
    assert _error_code(exc.value) == "MKTR_304"


@pytest.mark.asyncio
async def test_prerequisites_all_met_passes(test_db_session):
    from src.db.referrals.marketer_payment_methods import PaymentMethodType
    from src.services.referrals.payouts import save_payment_method

    user = make_user(test_db_session, country="NG")
    marketer, _ = make_marketer(test_db_session, user)
    kyc = await _submit(test_db_session, marketer, user)
    await approve_kyc(kyc.id, 1, 999, test_db_session)
    await save_payment_method(
        marketer_id=marketer.id,
        user_id=user.id,
        org_id=1,
        payment_method_type=PaymentMethodType.BANK_TRANSFER,
        country_code="NG",
        account_details={
            "bank_name": "Access Bank",
            "account_number": "0123456789",
            "account_holder": "Test User",
            "account_type": "savings",
            "bank_code": "044",
        },
        db_session=test_db_session,
    )

    # No exception raised
    await validate_payout_prerequisites(user.id, 1, test_db_session)
