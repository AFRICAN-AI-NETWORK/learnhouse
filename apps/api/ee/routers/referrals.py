"""
Referral API Router
Handles all referral-related endpoints following RESTful principles
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from src.core.events.database import get_db_session
from src.db.referrals.payout_requests import (BankDetails,
                                              ReferrerPayoutRequestRead)
from src.db.referrals.referral_codes import ReferralCodeRead
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.referrals.payouts import (create_payout_request,
                                            get_payout_history)
from src.services.referrals.referral_codes import (
    create_referral_code_for_user, get_my_referral_code)
from src.services.referrals.referral_commissions import (
    get_commission_balance, get_commission_history)

logger = logging.getLogger(__name__)

router = APIRouter()


def _require_referral_access(current_user, org_id, db_session):
    """Allow referral self-service only to admins, maintainers, and partners."""
    from src.db.roles import Role
    from src.db.user_organizations import UserOrganization

    if not current_user or not current_user.id:
        raise HTTPException(status_code=401, detail="Authentication required")

    statement = (
        select(Role)
        .join(UserOrganization, UserOrganization.role_id == Role.id)
        .where(
            UserOrganization.user_id == current_user.id,
            UserOrganization.org_id == org_id,
        )
    )
    roles = db_session.exec(statement).all()
    for role in roles:
        if role.id in (1, 2, 4) or role.role_uuid == "partner_role":
            return

    raise HTTPException(
        status_code=403,
        detail="Partner role required to access referrals",
    )


@router.post("/{org_id}/generate-code", response_model=ReferralCodeRead)
async def api_generate_referral_code(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Generate permanent referral code for current user

    Returns existing code if already generated (idempotent)
    """
    _require_referral_access(current_user, org_id, db_session)
    return await create_referral_code_for_user(
        request, org_id, current_user.id, current_user, db_session
    )


@router.get("/{org_id}/my-code", response_model=Optional[ReferralCodeRead])
async def api_get_my_referral_code(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get current user's referral code if it exists

    Returns null if user hasn't generated a code yet
    """
    _require_referral_access(current_user, org_id, db_session)
    return await get_my_referral_code(request, org_id, current_user, db_session)


@router.get("/{org_id}/commission-balance")
async def api_get_commission_balance(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get current user's commission balance breakdown

    Returns:
        - total_balance: Total accumulated commissions
        - eligible_for_payout: Amount available for withdrawal
        - pending: Amount pending refund period
        - currency: USD
    """
    _require_referral_access(current_user, org_id, db_session)
    return await get_commission_balance(request, org_id, current_user, db_session)


@router.get("/{org_id}/commission-history")
async def api_get_commission_history(
    request: Request,
    org_id: int,
    limit: int = 50,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get commission history for current user

    Args:
        limit: Maximum number of records to return (default 50)

    Returns list of commission records with:
        - referred_user_email
        - course_name
        - amount
        - status (pending/eligible/paid/forfeited)
        - dates
    """
    _require_referral_access(current_user, org_id, db_session)
    return await get_commission_history(
        request, org_id, current_user, db_session, limit
    )


@router.post("/{org_id}/request-payout", response_model=ReferrerPayoutRequestRead)
async def api_request_payout(
    request: Request,
    org_id: int,
    amount: float,
    bank_details: BankDetails,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Request payout of accumulated commissions

    Args:
        amount: Amount to withdraw (minimum $1.00)
        bank_details: Bank account information for payout
            - bank_name: Name of bank
            - account_number: Bank account number
            - account_holder: Account holder name
            - account_type: "savings" or "current"
            - bank_code: Paystack bank code (optional)

    Returns:
        Payout request with status 'requested'
        Processing happens in background
    """
    _require_referral_access(current_user, org_id, db_session)
    return await create_payout_request(
        request, org_id, amount, bank_details, current_user, db_session
    )


@router.get("/{org_id}/payout-history", response_model=list[ReferrerPayoutRequestRead])
async def api_get_payout_history(
    request: Request,
    org_id: int,
    limit: int = 20,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get payout request history for current user

    Args:
        limit: Maximum number of records to return (default 20)

    Returns list of payout requests with status and dates
    """
    _require_referral_access(current_user, org_id, db_session)
    return await get_payout_history(request, org_id, current_user, db_session, limit)


# ==================== Admin Endpoints ====================


def _require_admin(current_user, org_id, db_session):
    """Helper to enforce admin/maintainer role for an org."""
    from fastapi import HTTPException
    from sqlmodel import select

    from src.db.user_organizations import UserOrganization

    if not current_user or not current_user.id:
        raise HTTPException(status_code=401, detail="Authentication required")

    statement = select(UserOrganization).where(
        UserOrganization.user_id == current_user.id,
        UserOrganization.org_id == org_id,
        UserOrganization.role_id.in_([1, 2]),  # Admin, Maintainer
    )
    user_org = db_session.exec(statement).first()
    if not user_org:
        raise HTTPException(
            status_code=403,
            detail="Admin or Maintainer role required",
        )


@router.get("/{org_id}/admin/flagged")
async def api_get_flagged_referrals(
    request: Request,
    org_id: int,
    min_score: int = 75,
    limit: int = 50,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get referral signups flagged for fraud review.
    Returns ReferralTracking records with fraud_score >= min_score.
    Admin-only endpoint.
    """
    from sqlmodel import select

    from src.db.referrals.referral_codes import ReferralCode
    from src.db.referrals.referral_tracking import ReferralTracking
    from src.db.users import User

    _require_admin(current_user, org_id, db_session)

    statement = (
        select(ReferralTracking)
        .join(ReferralCode, ReferralTracking.referral_code_id == ReferralCode.id)
        .where(
            ReferralCode.org_id == org_id,
            ReferralTracking.fraud_score >= min_score,
        )
        .order_by(ReferralTracking.fraud_score.desc())
        .limit(limit)
    )
    records = db_session.exec(statement).all()

    results = []
    for r in records:
        # Fetch referred user info
        referred = db_session.get(User, r.referred_user_id)
        referrer = db_session.get(User, r.referrer_user_id)
        results.append(
            {
                "id": r.id,
                "referred_user": {
                    "id": r.referred_user_id,
                    "username": referred.username if referred else "unknown",
                    "email": referred.email if referred else "unknown",
                },
                "referrer_user": {
                    "id": r.referrer_user_id,
                    "username": referrer.username if referrer else "unknown",
                    "email": referrer.email if referrer else "unknown",
                },
                "fraud_score": r.fraud_score,
                "ip_address": r.ip_address,
                "device_id": r.device_id,
                "signup_date": str(r.signup_date),
            }
        )

    return {"flagged_count": len(results), "records": results}


@router.get("/{org_id}/admin/payouts")
async def api_get_pending_payouts(
    request: Request,
    org_id: int,
    limit: int = 50,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get all REQUESTED payout requests awaiting admin approval.
    Admin-only endpoint.
    """
    from sqlmodel import select

    from src.db.referrals.payout_requests import (PayoutStatus,
                                                  ReferrerPayoutRequest)
    from src.db.users import User

    _require_admin(current_user, org_id, db_session)

    statement = (
        select(ReferrerPayoutRequest)
        .where(
            ReferrerPayoutRequest.org_id == org_id,
            ReferrerPayoutRequest.status == PayoutStatus.REQUESTED,
        )
        .order_by(ReferrerPayoutRequest.request_date.desc())
        .limit(limit)
    )
    payouts = db_session.exec(statement).all()

    results = []
    for p in payouts:
        user = db_session.get(User, p.referrer_user_id)
        results.append(
            {
                "id": p.id,
                "referrer": {
                    "id": p.referrer_user_id,
                    "username": user.username if user else "unknown",
                    "email": user.email if user else "unknown",
                },
                "amount": p.total_amount,
                "currency": p.currency,
                "status": p.status,
                "request_date": str(p.request_date),
            }
        )

    return {"pending_count": len(results), "payouts": results}


@router.post("/{org_id}/admin/payouts/{payout_id}/approve")
async def api_approve_payout(
    request: Request,
    org_id: int,
    payout_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Approve a payout request. Moves status from REQUESTED -> APPROVED.
    The background worker will then process APPROVED payouts.
    Admin-only endpoint.
    """
    from datetime import datetime

    from fastapi import HTTPException

    from src.db.referrals.payout_requests import (PayoutStatus,
                                                  ReferrerPayoutRequest)

    _require_admin(current_user, org_id, db_session)

    payout = db_session.get(ReferrerPayoutRequest, payout_id)
    if not payout or payout.org_id != org_id:
        raise HTTPException(status_code=404, detail="Payout request not found")
    if payout.status != PayoutStatus.REQUESTED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve payout with status '{payout.status}'",
        )

    payout.status = PayoutStatus.APPROVED
    payout.update_date = datetime.now()
    db_session.add(payout)
    db_session.commit()

    logger.info(
        "Payout %d approved by admin %d for org %d",
        payout_id,
        current_user.id,
        org_id,
    )
    return {"message": "Payout approved", "payout_id": payout_id, "status": "approved"}


@router.post("/{org_id}/admin/payouts/{payout_id}/reject")
async def api_reject_payout(
    request: Request,
    org_id: int,
    payout_id: int,
    reason: str = "Rejected by admin",
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Reject a payout request. Moves status to FAILED with a reason.
    Admin-only endpoint.
    """
    from datetime import datetime

    from fastapi import HTTPException

    from src.db.referrals.payout_requests import (PayoutStatus,
                                                  ReferrerPayoutRequest)

    _require_admin(current_user, org_id, db_session)

    payout = db_session.get(ReferrerPayoutRequest, payout_id)
    if not payout or payout.org_id != org_id:
        raise HTTPException(status_code=404, detail="Payout request not found")
    if payout.status not in (PayoutStatus.REQUESTED, PayoutStatus.APPROVED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject payout with status '{payout.status}'",
        )

    payout.status = PayoutStatus.FAILED
    payout.failure_reason = reason
    payout.update_date = datetime.now()
    db_session.add(payout)
    db_session.commit()

    logger.info(
        "Payout %d rejected by admin %d for org %d: %s",
        payout_id,
        current_user.id,
        org_id,
        reason,
    )
    return {"message": "Payout rejected", "payout_id": payout_id, "reason": reason}


@router.get("/{org_id}/admin/stats")
async def api_get_referral_stats(
    request: Request,
    org_id: int,
    limit: int = 20,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get referral leaderboard and summary stats for the organization.
    Admin-only endpoint.

    Returns:
        - total_referrals: Total successful referrals
        - total_referrers: Number of users who have referred others
        - leaderboard: Top referrers ranked by referral count
    """
    from sqlmodel import func, select

    from src.db.referrals.referral_codes import ReferralCode
    from src.db.referrals.referral_tracking import ReferralTracking
    from src.db.users import User

    _require_admin(current_user, org_id, db_session)

    # Total referrals for this org
    total_stmt = (
        select(func.count())
        .select_from(ReferralTracking)
        .join(ReferralCode, ReferralTracking.referral_code_id == ReferralCode.id)
        .where(ReferralCode.org_id == org_id)
    )
    total_referrals = db_session.exec(total_stmt).one() or 0

    # Leaderboard: top referrers by count
    leaderboard_stmt = (
        select(
            ReferralTracking.referrer_user_id,
            func.count().label("referral_count"),
        )
        .join(ReferralCode, ReferralTracking.referral_code_id == ReferralCode.id)
        .where(ReferralCode.org_id == org_id)
        .group_by(ReferralTracking.referrer_user_id)
        .order_by(func.count().desc())
        .limit(limit)
    )
    rows = db_session.exec(leaderboard_stmt).all()

    leaderboard = []
    for referrer_id, count in rows:
        user = db_session.get(User, referrer_id)
        leaderboard.append(
            {
                "user_id": referrer_id,
                "username": user.username if user else "unknown",
                "email": user.email if user else "unknown",
                "referral_count": count,
            }
        )

    return {
        "total_referrals": total_referrals,
        "total_referrers": len(leaderboard),
        "leaderboard": leaderboard,
    }


@router.get("/{org_id}/admin/partners")
async def api_get_all_partners(
    request: Request,
    org_id: int,
    limit: int = 100,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get all users who have a referral code in this organization.
    Admin-only endpoint.
    """
    from sqlmodel import func, select

    from src.db.referrals.referral_codes import ReferralCode
    from src.db.referrals.referral_tracking import ReferralTracking
    from src.db.users import User

    _require_admin(current_user, org_id, db_session)

    # Fetch all referral codes for this org
    statement = select(ReferralCode).where(ReferralCode.org_id == org_id).limit(limit)
    codes = db_session.exec(statement).all()

    results = []
    for code in codes:
        user = db_session.get(User, code.user_id)

        # Count referrals for this partner
        count_stmt = (
            select(func.count())
            .select_from(ReferralTracking)
            .where(ReferralTracking.referral_code_id == code.id)
        )
        referral_count = db_session.exec(count_stmt).one() or 0

        results.append(
            {
                "user_id": code.user_id,
                "username": user.username if user else "unknown",
                "email": user.email if user else "unknown",
                "referral_code": code.code,
                "referral_count": referral_count,
                "created_at": str(code.creation_date),
            }
        )

    return {"partners": results}


@router.get("/{org_id}/admin/partners/{partner_id}/students")
async def api_get_partner_students(
    request: Request,
    org_id: int,
    partner_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get detailed student tracking for a specific partner.
    Admin-only endpoint.
    """
    from src.db.users import PublicUser as InternalPublicUser
    from src.services.referrals.referral_commissions import \
        get_commission_history

    _require_admin(current_user, org_id, db_session)

    # Reuse the same logic used by partners, but for the target partner_id
    target_user = InternalPublicUser(id=partner_id)

    # We call the service function directly
    return await get_commission_history(
        request=request, org_id=org_id, current_user=target_user, db_session=db_session
    )
