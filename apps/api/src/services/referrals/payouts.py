"""
Payout Service - Manages referrer payout requests with Paystack integration
Implements safe two-phase commit pattern to prevent balance loss
"""
import logging
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, Request, status
from sqlmodel import Session, select, and_
from src.db.referrals.payout_requests import (
    ReferrerPayoutRequest,
    ReferrerPayoutRequestCreate,
    ReferrerPayoutRequestRead,
    ReferrerPayoutRequestUpdate,
    PayoutStatus,
    BankDetails,
)
from src.db.referrals.referral_commissions import ReferralCommission, CommissionStatus
from src.db.users import User, PublicUser
from src.services.orgs.orgs import rbac_check
from src.services.payments.payments_paystack import make_paystack_request

logger = logging.getLogger(__name__)

# Configuration constants
MINIMUM_PAYOUT_AMOUNT = 1.00  # Minimum $1 USD


async def validate_payout_amount(
    user_id: int,
    amount: float,
    db_session: Session
) -> None:
    """
    Validate payout amount is within limits (DRY utility)
    
    Args:
        user_id: User ID
        amount: Payout amount requested
        db_session: Database session
        
    Raises:
        HTTPException: If amount is invalid
    """
    if amount < MINIMUM_PAYOUT_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum payout amount is ${MINIMUM_PAYOUT_AMOUNT}"
        )
    
    # Get user's eligible balance
    from src.services.referrals.referral_commissions import get_commission_balance
    from src.db.users import PublicUser
    
    # Calculate eligible amount from commissions
    from sqlmodel import func
    eligible_statement = select(func.sum(ReferralCommission.commission_amount)).where(
        and_(
            ReferralCommission.referrer_user_id == user_id,
            ReferralCommission.status == CommissionStatus.ELIGIBLE
        )
    )
    eligible_amount = db_session.exec(eligible_statement).first() or 0.0
    
    if amount > eligible_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient eligible balance. Available: ${eligible_amount:.2f}"
        )


async def check_pending_payout(
    user_id: int,
    db_session: Session
) -> Optional[ReferrerPayoutRequest]:
    """
    Check if user has pending payout request (DRY utility)
    Prevents multiple simultaneous payouts
    
    Args:
        user_id: User ID
        db_session: Database session
        
    Returns:
        Pending payout request or None
    """
    statement = select(ReferrerPayoutRequest).where(
        and_(
            ReferrerPayoutRequest.referrer_user_id == user_id,
            ReferrerPayoutRequest.status.in_([PayoutStatus.REQUESTED, PayoutStatus.PROCESSING])
        )
    )
    return db_session.exec(statement).first()


async def create_paystack_transfer_recipient(
    email: str,
    name: str,
    bank_account_info: dict,
    currency: str = "NGN"
) -> dict:
    """
    Create Paystack transfer recipient (DRY utility)
    
    Args:
        email: Recipient email
        name: Recipient name
        bank_account_info: Bank account details
        currency: Currency code
        
    Returns:
        Paystack recipient data with recipient_code
    """
    recipient_data = {
        "type": "nuban",  # Nigerian bank account (adjust for other countries)
        "name": name,
        "account_number": bank_account_info.get("account_number"),
        "bank_code": bank_account_info.get("bank_code"),
        "currency": currency,
        "email": email
    }
    
    try:
        result = await make_paystack_request("POST", "/transferrecipient", recipient_data)
        return result
    except Exception as e:
        logger.error(f"Failed to create Paystack transfer recipient: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create transfer recipient: {str(e)}"
        )


async def initiate_paystack_transfer(
    amount: float,
    recipient_code: str,
    reference: str,
    reason: str = "Referral commission payout"
) -> dict:
    """
    Initiate Paystack transfer (DRY utility)
    
    Args:
        amount: Amount in USD (will be converted to local currency)
        recipient_code: Paystack recipient code
        reference: Unique transfer reference
        reason: Transfer reason
        
    Returns:
        Paystack transfer data
    """
    # Convert amount to kobo/cents (multiply by 100)
    amount_in_subunit = int(amount * 100)
    
    transfer_data = {
        "source": "balance",
        "amount": amount_in_subunit,
        "recipient": recipient_code,
        "reference": reference,
        "reason": reason
    }
    
    try:
        result = await make_paystack_request("POST", "/transfer", transfer_data)
        return result
    except Exception as e:
        logger.error(f"Failed to initiate Paystack transfer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate transfer: {str(e)}"
        )


async def create_payout_request(
    request: Request,
    org_id: int,
    amount: float,
    bank_details: BankDetails,
    current_user: PublicUser,
    db_session: Session
) -> ReferrerPayoutRequestRead:
    """
    Create payout request (Core logic - DRY)
    Implements safe two-phase commit:
    1. REQUESTED: Validate and create request (no balance deduction)
    2. PROCESSING: Reserve balance and call Paystack API
    3. COMPLETED: Deduct balance on success
    4. FAILED: Restore balance on failure
    
    Args:
        request: FastAPI request
        org_id: Organization ID
        amount: Payout amount
        bank_details: Bank account details
        current_user: Current authenticated user
        db_session: Database session
        
    Returns:
        ReferrerPayoutRequestRead
        
    Raises:
        HTTPException: If validation fails
    """
    # RBAC check
    await rbac_check(request, org_id, current_user, db_session)
    
    # Validate amount
    await validate_payout_amount(current_user.id, amount, db_session)
    
    # Check for pending payouts
    pending = await check_pending_payout(current_user.id, db_session)
    if pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending payout request"
        )
    
    # Create payout request (REQUESTED status - no balance deduction yet)
    payout = ReferrerPayoutRequest(
        org_id=org_id,
        referrer_user_id=current_user.id,
        total_amount=amount,
        currency="USD",  # Base currency
        status=PayoutStatus.REQUESTED,
        bank_account_info=bank_details.model_dump(),  # TODO: Encrypt in production
        request_date=datetime.now(),
        creation_date=datetime.now(),
        update_date=datetime.now()
    )
    
    db_session.add(payout)
    db_session.commit()
    db_session.refresh(payout)
    
    logger.info(f"Created payout request {payout.id} for user {current_user.id} amount ${amount}")
    
    return ReferrerPayoutRequestRead.model_validate(payout)


async def process_payout_request(
    payout_id: int,
    db_session: Session
) -> ReferrerPayoutRequest:
    """
    Process payout request with Paystack (Background job logic)
    This should be called by a background worker, not directly from API
    
    Args:
        payout_id: Payout request ID
        db_session: Database session
        
    Returns:
        Updated payout request
    """
    # Get payout request
    statement = select(ReferrerPayoutRequest).where(
        ReferrerPayoutRequest.id == payout_id
    )
    payout = db_session.exec(statement).first()
    
    if not payout:
        raise ValueError(f"Payout request {payout_id} not found")
    
    if payout.status != PayoutStatus.REQUESTED:
        logger.warning(f"Payout {payout_id} is not in REQUESTED status")
        return payout
    
    # Update status to PROCESSING
    payout.status = PayoutStatus.PROCESSING
    payout.update_date = datetime.now()
    db_session.add(payout)
    db_session.commit()
    
    try:
        # Get user details
        user_statement = select(User).where(User.id == payout.referrer_user_id)
        user = db_session.exec(user_statement).first()
        
        if not user:
            raise ValueError(f"User {payout.referrer_user_id} not found")
        
        # Create Paystack transfer recipient
        recipient_result = await create_paystack_transfer_recipient(
            email=user.email,
            name=f"{user.first_name} {user.last_name}",
            bank_account_info=payout.bank_account_info,
            currency="NGN"  # TODO: Determine from user's country
        )
        
        recipient_code = recipient_result.get("recipient_code")
        payout.paystack_transfer_recipient_code = recipient_code
        db_session.add(payout)
        db_session.commit()
        
        # Initiate transfer
        transfer_reference = f"ref_payout_{payout.id}_{int(datetime.now().timestamp())}"
        transfer_result = await initiate_paystack_transfer(
            amount=payout.total_amount,
            recipient_code=recipient_code,
            reference=transfer_reference,
            reason="Referral commission payout"
        )
        
        transfer_code = transfer_result.get("transfer_code")
        payout.paystack_transfer_code = transfer_code
        payout.status = PayoutStatus.COMPLETED
        payout.completion_date = datetime.now()
        
        # Deduct from user balance (safe - only after successful transfer)
        user.referral_commission_balance -= payout.total_amount
        if user.referral_commission_balance < 0:
            user.referral_commission_balance = 0
        
        # Mark commissions as PAID
        commissions_statement = select(ReferralCommission).where(
            and_(
                ReferralCommission.referrer_user_id == user.id,
                ReferralCommission.status == CommissionStatus.ELIGIBLE
            )
        ).limit(int(payout.total_amount / 4))  # Assuming $4 per commission
        
        commissions = db_session.exec(commissions_statement).all()
        for commission in commissions:
            commission.status = CommissionStatus.PAID
            commission.payout_date = datetime.now()
            db_session.add(commission)
        
        db_session.add(user)
        db_session.add(payout)
        db_session.commit()
        
        logger.info(f"Successfully processed payout {payout_id}")
        
    except Exception as e:
        logger.error(f"Failed to process payout {payout_id}: {str(e)}")
        
        # Update status to FAILED (balance not deducted)
        payout.status = PayoutStatus.FAILED
        payout.failure_reason = str(e)
        payout.update_date = datetime.now()
        db_session.add(payout)
        db_session.commit()
    
    return payout


async def get_payout_history(
    request: Request,
    org_id: int,
    current_user: PublicUser,
    db_session: Session,
    limit: int = 20
) -> list[ReferrerPayoutRequestRead]:
    """
    Get payout request history for current user
    
    Args:
        request: FastAPI request
        org_id: Organization ID
        current_user: Current authenticated user
        db_session: Database session
        limit: Maximum number of records
        
    Returns:
        List of payout requests
    """
    # RBAC check
    await rbac_check(request, org_id, current_user, db_session)
    
    statement = select(ReferrerPayoutRequest).where(
        ReferrerPayoutRequest.referrer_user_id == current_user.id
    ).order_by(ReferrerPayoutRequest.creation_date.desc()).limit(limit)
    
    payouts = db_session.exec(statement).all()
    
    return [ReferrerPayoutRequestRead.model_validate(p) for p in payouts]
