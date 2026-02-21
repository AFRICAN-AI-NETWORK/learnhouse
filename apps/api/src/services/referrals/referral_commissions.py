"""
Referral Commission Service - Manages commission tracking and balance
Follows DRY principles with reusable utilities
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from fastapi import HTTPException, Request, status
from sqlmodel import Session, select, and_, func
from src.db.referrals.referral_commissions import (
    ReferralCommission,
    ReferralCommissionCreate,
    ReferralCommissionRead,
    CommissionStatus,
)
from src.db.referrals.referral_codes import ReferralCode
from src.db.users import User, PublicUser
from src.db.payments.payments_users import PaymentsUser
from src.services.orgs.orgs import rbac_check

logger = logging.getLogger(__name__)

# Configuration constants
REFUND_PERIOD_DAYS = 14
COMMISSION_AMOUNT_USD = 4.00


async def get_commission_by_payment(
    payment_user_id: int,
    referral_code_id: int,
    db_session: Session
) -> Optional[ReferralCommission]:
    """
    Get commission by payment user and referral code (DRY utility)
    Prevents duplicate commissions
    
    Args:
        payment_user_id: PaymentsUser ID
        referral_code_id: ReferralCode ID
        db_session: Database session
        
    Returns:
        ReferralCommission or None
    """
    statement = select(ReferralCommission).where(
        and_(
            ReferralCommission.payment_user_id == payment_user_id,
            ReferralCommission.referral_code_id == referral_code_id
        )
    )
    return db_session.exec(statement).first()


async def create_commission_for_payment(
    org_id: int,
    referrer_user_id: int,
    referred_user_id: int,
    payment_user_id: int,
    course_id: Optional[int],
    referral_code_id: int,
    payment_completion_date: datetime,
    db_session: Session
) -> Optional[ReferralCommission]:
    """
    Create referral commission for successful payment (Core logic - DRY)
    Implements idempotency to prevent duplicate commissions from webhook retries
    
    Args:
        org_id: Organization ID
        referrer_user_id: Referrer user ID
        referred_user_id: Referred user ID
        payment_user_id: PaymentsUser ID
        course_id: Course ID (optional)
        referral_code_id: ReferralCode ID
        payment_completion_date: Payment completion timestamp
        db_session: Database session
        
    Returns:
        ReferralCommission or None if already exists (idempotent)
    """
    # Check if commission already exists (idempotency)
    existing = await get_commission_by_payment(payment_user_id, referral_code_id, db_session)
    if existing:
        logger.info(f"Commission already exists for payment {payment_user_id} - idempotent response")
        return None
    
    # Calculate refund period expiration
    refund_expiration = payment_completion_date + timedelta(days=REFUND_PERIOD_DAYS)
    
    # Create commission
    commission = ReferralCommission(
        org_id=org_id,
        referrer_user_id=referrer_user_id,
        referred_user_id=referred_user_id,
        payment_user_id=payment_user_id,
        course_id=course_id,
        referral_code_id=referral_code_id,
        commission_amount=COMMISSION_AMOUNT_USD,
        status=CommissionStatus.PENDING,
        payment_completion_date=payment_completion_date,
        refund_period_expiration_date=refund_expiration,
        creation_date=datetime.now(),
        update_date=datetime.now()
    )
    
    db_session.add(commission)
    db_session.commit()
    db_session.refresh(commission)
    
    logger.info(f"Created commission ${COMMISSION_AMOUNT_USD} for referrer {referrer_user_id} from payment {payment_user_id}")
    
    return commission


async def forfeit_commission_for_refund(
    payment_user_id: int,
    db_session: Session
) -> Optional[ReferralCommission]:
    """
    Forfeit commission when payment is refunded (Core logic - DRY)
    Deducts from referrer's balance if commission was eligible
    
    Args:
        payment_user_id: PaymentsUser ID
        db_session: Database session
        
    Returns:
        ReferralCommission or None if not found
    """
    # Find commission by payment
    statement = select(ReferralCommission).where(
        ReferralCommission.payment_user_id == payment_user_id
    )
    commission = db_session.exec(statement).first()
    
    if not commission:
        logger.info(f"No commission found for payment {payment_user_id}")
        return None
    
    # Check if commission was already forfeited
    if commission.status == CommissionStatus.FORFEITED:
        logger.info(f"Commission {commission.id} already forfeited")
        return commission
    
    # If commission was eligible, deduct from referrer's balance
    if commission.status == CommissionStatus.ELIGIBLE:
        user_statement = select(User).where(User.id == commission.referrer_user_id)
        user = db_session.exec(user_statement).first()
        if user:
            user.referral_commission_balance -= commission.commission_amount
            # Ensure balance doesn't go negative
            if user.referral_commission_balance < 0:
                user.referral_commission_balance = 0
            db_session.add(user)
            logger.info(f"Deducted ${commission.commission_amount} from user {user.id} balance")
    
    # Update commission status
    commission.status = CommissionStatus.FORFEITED
    commission.update_date = datetime.now()
    db_session.add(commission)
    db_session.commit()
    db_session.refresh(commission)
    
    logger.info(f"Forfeited commission {commission.id} for payment {payment_user_id}")
    
    return commission


async def update_pending_commissions_to_eligible(
    db_session: Session
) -> int:
    """
    Update pending commissions to eligible after refund period expires
    Should be run as scheduled job daily
    
    Args:
        db_session: Database session
        
    Returns:
        Number of commissions updated
    """
    now = datetime.now()
    
    # Query pending commissions with expired refund period
    statement = select(ReferralCommission).where(
        and_(
            ReferralCommission.status == CommissionStatus.PENDING,
            ReferralCommission.refund_period_expiration_date <= now
        )
    )
    commissions = db_session.exec(statement).all()
    
    updated_count = 0
    
    for commission in commissions:
        # Update commission status
        commission.status = CommissionStatus.ELIGIBLE
        commission.update_date = now
        db_session.add(commission)
        
        # Update referrer's balance
        user_statement = select(User).where(User.id == commission.referrer_user_id)
        user = db_session.exec(user_statement).first()
        if user:
            user.referral_commission_balance += commission.commission_amount
            db_session.add(user)
            logger.info(f"Added ${commission.commission_amount} to user {user.id} balance")
        
        updated_count += 1
    
    db_session.commit()
    
    logger.info(f"Updated {updated_count} pending commissions to eligible")
    
    return updated_count


async def get_commission_balance(
    request: Request,
    org_id: int,
    current_user: PublicUser,
    db_session: Session
) -> dict:
    """
    Get current user's commission balance breakdown
    
    Args:
        request: FastAPI request
        org_id: Organization ID
        current_user: Current authenticated user
        db_session: Database session
        
    Returns:
        Dict with balance breakdown
    """
    # Note: No RBAC check - all authenticated users can view their commission balance
    
    # Get user
    user_statement = select(User).where(User.id == current_user.id)
    user = db_session.exec(user_statement).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate eligible for payout (status = ELIGIBLE)
    eligible_statement = select(func.sum(ReferralCommission.commission_amount)).where(
        and_(
            ReferralCommission.referrer_user_id == current_user.id,
            ReferralCommission.status == CommissionStatus.ELIGIBLE
        )
    )
    eligible_amount = db_session.exec(eligible_statement).first() or 0.0
    
    # Calculate pending (status = PENDING)
    pending_statement = select(func.sum(ReferralCommission.commission_amount)).where(
        and_(
            ReferralCommission.referrer_user_id == current_user.id,
            ReferralCommission.status == CommissionStatus.PENDING
        )
    )
    pending_amount = db_session.exec(pending_statement).first() or 0.0
    
    # Total balance from user record
    total_balance = user.referral_commission_balance
    
    return {
        "total_balance": round(total_balance, 2),
        "eligible_for_payout": round(eligible_amount, 2),
        "pending": round(pending_amount, 2),
        "currency": "USD"
    }


async def get_commission_history(
    request: Request,
    org_id: int,
    current_user: PublicUser,
    db_session: Session,
    limit: int = 50
) -> List[dict]:
    """
    Get commission history for current user
    
    Args:
        request: FastAPI request
        org_id: Organization ID
        current_user: Current authenticated user
        db_session: Database session
        limit: Maximum number of records to return
        
    Returns:
        List of commission records
    """
    # Note: No RBAC check - all authenticated users can view their commission history
    
    # Query commissions
    statement = select(ReferralCommission).where(
        ReferralCommission.referrer_user_id == current_user.id
    ).order_by(ReferralCommission.creation_date.desc()).limit(limit)
    
    commissions = db_session.exec(statement).all()
    
    # Build response
    history = []
    for commission in commissions:
        # Get referred user
        referred_user_statement = select(User).where(User.id == commission.referred_user_id)
        referred_user = db_session.exec(referred_user_statement).first()
        
        # Get course if available
        course_name = None
        if commission.course_id:
            from src.db.courses.courses import Course
            course_statement = select(Course).where(Course.id == commission.course_id)
            course = db_session.exec(course_statement).first()
            if course:
                course_name = course.name
        
        history.append({
            "id": commission.id,
            "referred_user_email": referred_user.email if referred_user else "Unknown",
            "course_name": course_name or "N/A",
            "amount": commission.commission_amount,
            "status": commission.status.value,
            "payment_completion_date": commission.payment_completion_date.isoformat() if commission.payment_completion_date else None,
            "eligible_date": commission.refund_period_expiration_date.isoformat() if commission.refund_period_expiration_date else None,
            "payout_date": commission.payout_date.isoformat() if commission.payout_date else None
        })
    
    return history
