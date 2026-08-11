"""
Marketer API Router
Self-service endpoints for marketers plus admin management endpoints.

Error contract: every marketer error is
    { "error_code": "MKTR_xxx", "message": "...", "field": "..."? }
Internal details are logged server-side only, never returned to the client.
"""

import logging
from datetime import UTC

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, and_, select

from src.core.events.database import get_db_session
from src.db.referrals.marketer_kyc import KYCDocumentType, KYCStatus, MarketerKYC
from src.db.referrals.marketer_payment_methods import MarketerPaymentMethodCreate
from src.db.referrals.marketers import (
    Marketer,
    MarketerCreate,
    MarketerPublicRead,
    MarketerRead,
    MarketerStatus,
)
from src.db.referrals.payout_requests import (
    PayoutStatus,
    ReferrerPayoutRequest,
    ReferrerPayoutRequestRead,
)
from src.db.users import PublicUser, User
from src.security.auth import get_current_user
from src.services.referrals.marketer_kyc import (
    approve_kyc,
    generate_kyc_document_url,
    reject_kyc,
    submit_kyc,
    upload_kyc_document,
)
from src.services.referrals.marketers import (
    admin_grant_marketer,
    approve_marketer,
    get_admin_marketer_stats,
    get_marketer_by_user,
    get_marketer_dashboard,
    get_marketer_leaderboard,
    get_marketer_monthly_revenue,
    get_marketer_or_404,
    get_marketer_students,
    marketer_error,
    reactivate_marketer,
    register_marketer,
    reject_marketer,
    suspend_marketer,
)
from src.services.referrals.payouts import (
    build_masked_payment_method,
    create_payout_request,
    get_active_payment_method,
    get_payout_history,
    save_payment_method,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== Request Schemas ====================


class ReasonBody(BaseModel):
    reason: str


class PayoutRequestBody(BaseModel):
    amount: float


# ==================== RBAC Helpers ====================


def _require_admin(current_user, org_id: int, db_session: Session) -> None:
    """Admin or Maintainer role required (role_id 1 or 2)"""
    from fastapi import HTTPException

    from src.db.user_organizations import UserOrganization

    if not current_user or not current_user.id:
        raise HTTPException(status_code=401, detail="Authentication required")

    statement = select(UserOrganization).where(
        UserOrganization.user_id == current_user.id,
        UserOrganization.org_id == org_id,
        UserOrganization.role_id.in_([1, 2]),  # Admin, Maintainer
    )
    if not db_session.exec(statement).first():
        raise HTTPException(status_code=403, detail="Admin or Maintainer role required")


async def _require_marketer(
    current_user, org_id: int, db_session: Session, allow_suspended: bool = False
) -> Marketer:
    """
    Fetch the caller's marketer row, raising 404 when none exists.
    SUSPENDED marketers get 403 on all endpoints except those that pass
    allow_suspended=True (/me, /kyc/status) so they can see why.
    """
    marketer = await get_marketer_by_user(current_user.id, org_id, db_session)
    if not marketer:
        raise marketer_error(404, "MKTR_401", "You are not a marketer")
    if marketer.status == MarketerStatus.SUSPENDED and not allow_suspended:
        raise marketer_error(
            403, "MKTR_007", "Your marketer account is suspended — contact support"
        )
    return marketer


async def require_active_marketer(
    current_user, org_id: int, db_session: Session
) -> Marketer:
    """RBAC guard: caller must have an ACTIVE marketer row (HTTP 403 otherwise)"""
    marketer = await _require_marketer(current_user, org_id, db_session)
    if marketer.status != MarketerStatus.ACTIVE:
        raise marketer_error(403, "MKTR_402", "Your marketer account is not active yet")
    return marketer


# ==================== Marketer Self-Service ====================


@router.post("/{org_id}/register", response_model=MarketerPublicRead)
async def api_register_marketer(
    request: Request,
    org_id: int,
    body: MarketerCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Register as a marketer. Rate limited: 3 per IP per hour."""
    return await register_marketer(
        user_id=current_user.id,
        org_id=org_id,
        phone_number=body.phone_number,
        db_session=db_session,
        request=request,
    )


@router.get("/{org_id}/me")
async def api_get_my_marketer_profile(
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Current marketer profile + referral code. 404 if not a marketer.
    Accessible to suspended marketers so they can see their status."""
    marketer = await _require_marketer(
        current_user, org_id, db_session, allow_suspended=True
    )

    from src.db.referrals.referral_codes import ReferralCode

    referral_code = (
        db_session.get(ReferralCode, marketer.referral_code_id)
        if marketer.referral_code_id
        else None
    )
    profile = MarketerPublicRead.model_validate(marketer).model_dump()
    # Marketers see their own rejection reason (admin notes stay hidden)
    profile["rejection_reason"] = (
        marketer.rejection_reason
        if marketer.status == MarketerStatus.REJECTED
        else None
    )
    profile["referral_code"] = referral_code.code if referral_code else None
    profile["referral_link"] = referral_code.referral_link if referral_code else None
    return profile


@router.get("/{org_id}/dashboard")
async def api_get_marketer_dashboard(
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Full dashboard payload — one call, all panels"""
    await require_active_marketer(current_user, org_id, db_session)
    return await get_marketer_dashboard(current_user.id, org_id, db_session)


@router.get("/{org_id}/students")
async def api_get_marketer_students(
    org_id: int,
    page: int = 1,
    limit: int = 20,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Paginated list of referred students with per-course commissions"""
    await require_active_marketer(current_user, org_id, db_session)
    return await get_marketer_students(current_user.id, org_id, page, limit, db_session)


@router.get("/{org_id}/monthly-revenue")
async def api_get_marketer_monthly_revenue(
    org_id: int,
    year: int | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Monthly revenue for a year (defaults to current year)"""
    from datetime import datetime

    await require_active_marketer(current_user, org_id, db_session)
    year = year or datetime.now(UTC).year
    months = await get_marketer_monthly_revenue(
        current_user.id, org_id, year, db_session
    )
    return {"year": year, "months": months}


@router.post("/{org_id}/payment-method")
async def api_save_payment_method(
    org_id: int,
    body: MarketerPaymentMethodCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Save payout destination (bank or mobile money). Masked response only."""
    marketer = await require_active_marketer(current_user, org_id, db_session)
    payment_method = await save_payment_method(
        marketer_id=marketer.id,
        user_id=current_user.id,
        org_id=org_id,
        payment_method_type=body.payment_method_type,
        country_code=body.country_code,
        account_details=body.account_details,
        db_session=db_session,
    )
    return build_masked_payment_method(payment_method)


@router.get("/{org_id}/payment-method")
async def api_get_payment_method(
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Active payment method (masked). 404 if none saved."""
    marketer = await require_active_marketer(current_user, org_id, db_session)
    payment_method = await get_active_payment_method(marketer.id, db_session)
    if not payment_method:
        raise marketer_error(404, "MKTR_304", "No payment method saved")
    return build_masked_payment_method(payment_method)


@router.delete("/{org_id}/payment-method")
async def api_delete_payment_method(
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Deactivate the saved method. 400 while a payout is PROCESSING."""
    from datetime import datetime

    marketer = await require_active_marketer(current_user, org_id, db_session)

    processing = db_session.exec(
        select(ReferrerPayoutRequest).where(
            and_(
                ReferrerPayoutRequest.referrer_user_id == current_user.id,
                ReferrerPayoutRequest.status == PayoutStatus.PROCESSING,
            )
        )
    ).first()
    if processing:
        raise marketer_error(
            400,
            "MKTR_355",
            "Cannot remove payment method — a payout is currently processing",
        )

    payment_method = await get_active_payment_method(marketer.id, db_session)

    if not payment_method:
        raise marketer_error(404, "MKTR_304", "No payment method saved")

    payment_method.is_active = False
    payment_method.update_date = datetime.now(UTC)
    db_session.add(payment_method)
    db_session.commit()
    return {"message": "Payment method removed"}


@router.post("/{org_id}/kyc/upload")
async def api_upload_kyc(
    org_id: int,
    document_type: KYCDocumentType = Form(...),
    id_number: str = Form(...),
    front_file: UploadFile = File(...),
    selfie_file: UploadFile = File(...),
    back_file: UploadFile | None = File(None),
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Upload KYC documents. Max 10MB each; JPEG/PNG/PDF."""
    marketer = await require_active_marketer(current_user, org_id, db_session)

    front_key = await upload_kyc_document(front_file, org_id, marketer.id, "front")
    selfie_key = await upload_kyc_document(selfie_file, org_id, marketer.id, "selfie")
    back_key = (
        await upload_kyc_document(back_file, org_id, marketer.id, "back")
        if back_file
        else None
    )

    kyc = await submit_kyc(
        marketer_id=marketer.id,
        org_id=org_id,
        user_id=current_user.id,
        document_type=document_type,
        id_number=id_number,
        front_key=front_key,
        selfie_key=selfie_key,
        back_key=back_key,
        db_session=db_session,
    )
    return {"status": kyc.status, "submission_count": kyc.submission_count}


@router.get("/{org_id}/kyc/status")
async def api_get_kyc_status(
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Current KYC status. Accessible to suspended marketers."""
    marketer = await _require_marketer(
        current_user, org_id, db_session, allow_suspended=True
    )
    kyc = db_session.exec(
        select(MarketerKYC).where(MarketerKYC.marketer_id == marketer.id)
    ).first()
    if not kyc:
        return {"status": KYCStatus.UNVERIFIED}
    return {
        "status": kyc.status,
        "rejection_reason": (
            kyc.rejection_reason if kyc.status == KYCStatus.REJECTED else None
        ),
        "reviewed_at": kyc.reviewed_at if kyc.status == KYCStatus.VERIFIED else None,
        "submission_count": kyc.submission_count,
    }


@router.post("/{org_id}/request-payout", response_model=ReferrerPayoutRequestRead)
async def api_request_marketer_payout(
    request: Request,
    org_id: int,
    body: PayoutRequestBody,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Request a payout from the saved payment method (KYC required)"""
    await require_active_marketer(current_user, org_id, db_session)
    return await create_payout_request(
        request=request,
        org_id=org_id,
        amount=body.amount,
        bank_details=None,
        current_user=current_user,
        db_session=db_session,
        use_saved_method=True,
    )


@router.get("/{org_id}/payout-history", response_model=list[ReferrerPayoutRequestRead])
async def api_get_marketer_payout_history(
    request: Request,
    org_id: int,
    limit: int = 20,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Payout request history for the current marketer"""
    await require_active_marketer(current_user, org_id, db_session)
    return await get_payout_history(request, org_id, current_user, db_session, limit)


# ==================== Admin Endpoints ====================


@router.get("/{org_id}/admin/all")
async def api_admin_list_marketers(
    org_id: int,
    status: MarketerStatus | None = None,
    page: int = 1,
    limit: int = 50,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """List marketers, optionally filtered by status"""
    from sqlmodel import func

    _require_admin(current_user, org_id, db_session)

    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    conditions = [Marketer.org_id == org_id]
    if status:
        conditions.append(Marketer.status == status)

    total = (
        db_session.exec(
            select(func.count(Marketer.id)).where(and_(*conditions))
        ).first()
        or 0
    )
    marketers = db_session.exec(
        select(Marketer)
        .where(and_(*conditions))
        .order_by(Marketer.creation_date.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    # Batch fetch users (no N+1)
    user_ids = [m.user_id for m in marketers]
    user_map = {}
    if user_ids:
        users = db_session.exec(select(User).where(User.id.in_(user_ids))).all()
        user_map = {u.id: u for u in users}

    results = []
    for m in marketers:
        user = user_map.get(m.user_id)
        record = MarketerRead.model_validate(m).model_dump()
        record["name"] = f"{user.first_name} {user.last_name}" if user else None
        record["email"] = user.email if user else None
        record["username"] = user.username if user else None
        results.append(record)

    return {"marketers": results, "total_count": total, "page": page, "limit": limit}


@router.get("/{org_id}/admin/stats")
async def api_admin_marketer_stats(
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Marketer program summary + top-10 leaderboard"""
    _require_admin(current_user, org_id, db_session)
    return await get_admin_marketer_stats(org_id, db_session)


@router.get("/{org_id}/admin/leaderboard")
async def api_admin_marketer_leaderboard(
    org_id: int,
    limit: int = 10,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Top marketers by students referred"""
    _require_admin(current_user, org_id, db_session)
    return {
        "leaderboard": await get_marketer_leaderboard(
            org_id, min(max(limit, 1), 100), db_session
        )
    }


@router.post("/{org_id}/admin/{marketer_id}/approve", response_model=MarketerRead)
async def api_admin_approve_marketer(
    org_id: int,
    marketer_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Approve a pending marketer — generates their MKT- referral code"""
    _require_admin(current_user, org_id, db_session)
    return await approve_marketer(marketer_id, org_id, current_user.id, db_session)


@router.post("/{org_id}/admin/{marketer_id}/reject", response_model=MarketerRead)
async def api_admin_reject_marketer(
    org_id: int,
    marketer_id: int,
    body: ReasonBody,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Reject a marketer application with a reason"""
    _require_admin(current_user, org_id, db_session)
    return await reject_marketer(
        marketer_id, org_id, body.reason, current_user.id, db_session
    )


@router.post("/{org_id}/admin/{user_id}/grant", response_model=MarketerRead)
async def api_admin_grant_marketer(
    org_id: int,
    user_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Instantly grant marketer status to a user (Admin only)"""
    _require_admin(current_user, org_id, db_session)
    return await admin_grant_marketer(user_id, org_id, current_user.id, db_session)


@router.post("/{org_id}/admin/{marketer_id}/suspend", response_model=MarketerRead)
async def api_admin_suspend_marketer(
    org_id: int,
    marketer_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Suspend an active marketer — commission rate reverts immediately"""
    _require_admin(current_user, org_id, db_session)
    return await suspend_marketer(marketer_id, org_id, current_user.id, db_session)


@router.post("/{org_id}/admin/{marketer_id}/reactivate", response_model=MarketerRead)
async def api_admin_reactivate_marketer(
    org_id: int,
    marketer_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Reactivate a suspended marketer"""
    _require_admin(current_user, org_id, db_session)
    return await reactivate_marketer(marketer_id, org_id, current_user.id, db_session)


@router.get("/{org_id}/admin/{marketer_id}/students")
async def api_admin_marketer_students(
    org_id: int,
    marketer_id: int,
    page: int = 1,
    limit: int = 20,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Admin view of a specific marketer's student list"""
    _require_admin(current_user, org_id, db_session)
    marketer = await get_marketer_or_404(marketer_id, org_id, db_session)
    return await get_marketer_students(
        marketer.user_id, org_id, page, limit, db_session
    )


@router.get("/{org_id}/admin/kyc/pending")
async def api_admin_kyc_queue(
    org_id: int,
    page: int = 1,
    limit: int = 20,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """PENDING_REVIEW KYC submissions with pre-signed document URLs (15 min)"""
    from sqlmodel import func

    _require_admin(current_user, org_id, db_session)

    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    conditions = [
        MarketerKYC.org_id == org_id,
        MarketerKYC.status == KYCStatus.PENDING_REVIEW,
    ]
    total = (
        db_session.exec(
            select(func.count(MarketerKYC.id)).where(and_(*conditions))
        ).first()
        or 0
    )
    kyc_records = db_session.exec(
        select(MarketerKYC)
        .where(and_(*conditions))
        .order_by(MarketerKYC.update_date.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    user_ids = [k.user_id for k in kyc_records]
    user_map = {}
    if user_ids:
        users = db_session.exec(select(User).where(User.id.in_(user_ids))).all()
        user_map = {u.id: u for u in users}

    results = []
    for kyc in kyc_records:
        user = user_map.get(kyc.user_id)
        results.append(
            {
                "kyc_id": kyc.id,
                "marketer_id": kyc.marketer_id,
                "name": f"{user.first_name} {user.last_name}" if user else None,
                "email": user.email if user else None,
                "document_type": kyc.document_type,
                "submitted_at": kyc.update_date,
                "submission_count": kyc.submission_count,
                "document_front_url": generate_kyc_document_url(kyc.document_front_url),
                "document_back_url": (
                    generate_kyc_document_url(kyc.document_back_url)
                    if kyc.document_back_url
                    else None
                ),
                "selfie_url": generate_kyc_document_url(kyc.selfie_url),
            }
        )

    return {"kyc_records": results, "total_count": total, "page": page, "limit": limit}


@router.post("/{org_id}/admin/kyc/{kyc_id}/approve")
async def api_admin_approve_kyc(
    org_id: int,
    kyc_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Approve KYC — payouts unlock for the marketer"""
    _require_admin(current_user, org_id, db_session)
    kyc = await approve_kyc(kyc_id, org_id, current_user.id, db_session)
    return {"kyc_id": kyc.id, "status": kyc.status}


@router.post("/{org_id}/admin/kyc/{kyc_id}/reject")
async def api_admin_reject_kyc(
    org_id: int,
    kyc_id: int,
    body: ReasonBody,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Reject KYC with a reason; marketer can resubmit if attempts remain"""
    _require_admin(current_user, org_id, db_session)
    kyc = await reject_kyc(kyc_id, org_id, body.reason, current_user.id, db_session)
    return {"kyc_id": kyc.id, "status": kyc.status}


@router.get("/{org_id}/admin/payouts")
async def api_admin_marketer_payouts(
    org_id: int,
    status: PayoutStatus | None = None,
    page: int = 1,
    limit: int = 50,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Payout requests from marketers only (joins Marketer to filter)"""
    from sqlmodel import func

    from src.db.referrals.referral_codes import ReferralCode

    _require_admin(current_user, org_id, db_session)

    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    conditions = [
        ReferrerPayoutRequest.org_id == org_id,
        Marketer.org_id == org_id,
    ]
    if status:
        conditions.append(ReferrerPayoutRequest.status == status)

    base_join = select(ReferrerPayoutRequest, Marketer).join(
        Marketer, Marketer.user_id == ReferrerPayoutRequest.referrer_user_id
    )

    total = (
        db_session.exec(
            select(func.count(ReferrerPayoutRequest.id))
            .join(
                Marketer,
                Marketer.user_id == ReferrerPayoutRequest.referrer_user_id,
            )
            .where(and_(*conditions))
        ).first()
        or 0
    )

    rows = db_session.exec(
        base_join.where(and_(*conditions))
        .order_by(ReferrerPayoutRequest.request_date.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    ).all()

    user_ids = [m.user_id for _, m in rows]
    code_ids = [m.referral_code_id for _, m in rows if m.referral_code_id]
    user_map = {}
    code_map = {}
    if user_ids:
        users = db_session.exec(select(User).where(User.id.in_(user_ids))).all()
        user_map = {u.id: u for u in users}
    if code_ids:
        codes = db_session.exec(
            select(ReferralCode).where(ReferralCode.id.in_(code_ids))
        ).all()
        code_map = {c.id: c for c in codes}

    payouts = []
    for payout, marketer in rows:
        user = user_map.get(marketer.user_id)
        payouts.append(
            {
                "payout_id": payout.id,
                "marketer_id": marketer.id,
                "name": f"{user.first_name} {user.last_name}" if user else None,
                "email": user.email if user else None,
                "referral_code": (
                    code_map[marketer.referral_code_id].code
                    if marketer.referral_code_id in code_map
                    else None
                ),
                "amount_usd": payout.total_amount,
                "converted_amount": payout.converted_amount,
                "currency": payout.currency,
                "status": payout.status,
                "retry_count": payout.retry_count,
                "request_date": payout.request_date,
                "completion_date": payout.completion_date,
                "failure_reason": payout.failure_reason,
            }
        )

    return {"payouts": payouts, "total_count": total, "page": page, "limit": limit}


@router.post("/{org_id}/admin/payouts/{payout_id}/approve")
async def api_admin_approve_marketer_payout(
    org_id: int,
    payout_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Approve a payout — the background job processes it automatically"""
    from datetime import datetime

    _require_admin(current_user, org_id, db_session)

    payout = db_session.get(ReferrerPayoutRequest, payout_id)
    if not payout or payout.org_id != org_id:
        raise marketer_error(404, "MKTR_308", "Payout not found")
    if payout.status != PayoutStatus.REQUESTED:
        raise marketer_error(
            400, "MKTR_309", "Payout cannot be approved — it is not in REQUESTED status"
        )

    payout.status = PayoutStatus.APPROVED
    payout.update_date = datetime.now(UTC)
    db_session.add(payout)
    db_session.commit()

    # Notify the marketer that processing has started
    user = db_session.get(User, payout.referrer_user_id)
    if user:
        try:
            from src.services.referrals.marketer_emails import (
                send_marketer_payout_processing_email,
            )

            send_marketer_payout_processing_email(
                user.email, user.username, payout.total_amount
            )
        except Exception as e:  # noqa: BLE001 - intentionally swallow email errors
            logger.error(f"Failed to send payout processing email: {e}")

    logger.info(
        "Marketer payout %d approved by admin %d for org %d",
        payout_id,
        current_user.id,
        org_id,
    )
    return {"payout_id": payout_id, "status": payout.status}


@router.post("/{org_id}/admin/payouts/{payout_id}/reject")
async def api_admin_reject_marketer_payout(
    org_id: int,
    payout_id: int,
    body: ReasonBody,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Reject a payout request. MKTR_406 once it is APPROVED or beyond."""
    from datetime import datetime

    _require_admin(current_user, org_id, db_session)

    payout = db_session.get(ReferrerPayoutRequest, payout_id)
    if not payout or payout.org_id != org_id:
        raise marketer_error(404, "MKTR_308", "Payout not found")
    if payout.status != PayoutStatus.REQUESTED:
        raise marketer_error(
            400, "MKTR_406", "Payout already approved or processed — cannot modify"
        )

    payout.status = PayoutStatus.FAILED
    payout.failure_reason = body.reason
    payout.update_date = datetime.now(UTC)
    db_session.add(payout)
    db_session.commit()

    logger.info(
        "Marketer payout %d rejected by admin %d: %s",
        payout_id,
        current_user.id,
        body.reason,
    )
    return {"payout_id": payout_id, "status": payout.status, "reason": body.reason}
