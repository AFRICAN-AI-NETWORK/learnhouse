"""
Referral API Router
Handles all referral-related endpoints following RESTful principles
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlmodel import Session
from src.core.events.database import get_db_session
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.db.referrals.referral_codes import ReferralCodeRead
from src.db.referrals.payout_requests import ReferrerPayoutRequestRead, BankDetails
from src.services.referrals.referral_codes import (
    create_referral_code_for_user,
    get_my_referral_code,
)
from src.services.referrals.referral_commissions import (
    get_commission_balance,
    get_commission_history,
)
from src.services.referrals.payouts import (
    create_payout_request,
    get_payout_history,
)

logger = logging.getLogger(__name__)

router = APIRouter()


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
    return await get_payout_history(request, org_id, current_user, db_session, limit)
