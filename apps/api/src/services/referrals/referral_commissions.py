"""
Referral Commission Service - Manages commission tracking and balance
Follows DRY principles with reusable utilities
"""
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import HTTPException, Request
from sqlmodel import Session, select, and_, func
from src.db.referrals.referral_commissions import (
    ReferralCommission,
    CommissionStatus,
)
from src.db.users import User, PublicUser

logger = logging.getLogger(__name__)

# Configuration constants
REFUND_PERIOD_DAYS = 14
COMMISSION_AMOUNT_USD = 4.00  # TODO: Move to org-level config for multi-tenant support


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
    db_session: Session,
    refund_reason: Optional[str] = None
) -> Optional[ReferralCommission]:
    """
    Forfeit commission when payment is refunded (Core logic - DRY)
    Deducts from referrer's balance if commission was eligible
    
    Args:
        payment_user_id: PaymentsUser ID
        db_session: Database session
        refund_reason: Optional reason for refund (audit trail)
        
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
        # Use SELECT FOR UPDATE to prevent race conditions on balance updates
        user_statement = select(User).where(User.id == commission.referrer_user_id).with_for_update()
        user = db_session.exec(user_statement).first()
        if user:
            user.referral_commission_balance -= commission.commission_amount
            # Ensure balance doesn't go negative
            if user.referral_commission_balance < 0:
                user.referral_commission_balance = 0
            db_session.add(user)
            logger.info(f"Deducted ${commission.commission_amount} from user {user.id} balance (refund)")
    
    # Update commission status
    commission.status = CommissionStatus.FORFEITED
    commission.update_date = datetime.now()
    db_session.add(commission)
    db_session.commit()
    db_session.refresh(commission)
    
    # Audit trail logging
    logger.info(
        f"Forfeited commission {commission.id} for payment {payment_user_id}"
        f"{f' - Reason: {refund_reason}' if refund_reason else ''}"
    )
    
    return commission


async def update_pending_commissions_to_eligible(
    db_session: Session
) -> int:
    """
    Update pending commissions to eligible after refund period expires
    Should be run as scheduled job daily
    Uses bulk updates to prevent N+1 query issues
    
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
    
    if not commissions:
        logger.info("No pending commissions to update")
        return 0
    
    # Group commissions by referrer_user_id and sum amounts (bulk optimization)
    user_balance_updates = defaultdict(float)
    for commission in commissions:
        user_balance_updates[commission.referrer_user_id] += commission.commission_amount
    
    # Update all commission statuses in memory (batch commit)
    for commission in commissions:
        commission.status = CommissionStatus.ELIGIBLE
        commission.update_date = now
        db_session.add(commission)
    
    # Bulk update user balances with row locking to prevent race conditions
    for user_id, total_amount in user_balance_updates.items():
        # Use SELECT FOR UPDATE to lock the row during update
        user_statement = select(User).where(User.id == user_id).with_for_update()
        user = db_session.exec(user_statement).first()
        if user:
            user.referral_commission_balance += total_amount
            db_session.add(user)
            logger.info(f"Added ${total_amount:.2f} to user {user.id} balance (bulk update)")
    
    db_session.commit()
    
    updated_count = len(commissions)
    logger.info(f"Updated {updated_count} pending commissions to eligible (optimized bulk update)")
    
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
    
    # Query commissions - fetch all data upfront
    statement = select(ReferralCommission).where(
        ReferralCommission.referrer_user_id == current_user.id
    ).order_by(ReferralCommission.creation_date.desc()).limit(limit)
    
    commissions = db_session.exec(statement).all()
    
    if not commissions:
        return []
    
    # Collect unique user IDs and course IDs for batch fetching
    referred_user_ids = {c.referred_user_id for c in commissions}
    course_ids = {c.course_id for c in commissions if c.course_id}
    
    # Batch fetch all referred users
    user_map = {}
    if referred_user_ids:
        user_statement = select(User).where(User.id.in_(referred_user_ids))
        users = db_session.exec(user_statement).all()
        user_map = {user.id: user for user in users}
    
    # Batch fetch all courses
    course_map = {}
    if course_ids:
        from src.db.courses.courses import Course
        course_statement = select(Course).where(Course.id.in_(course_ids))
        courses = db_session.exec(course_statement).all()
        course_map = {course.id: course for course in courses}
    
    # Build response using pre-fetched data (no N+1 queries)
    history = []
    for commission in commissions:
        referred_user = user_map.get(commission.referred_user_id)
        course = course_map.get(commission.course_id) if commission.course_id else None
        
        history.append({
            "id": commission.id,
            "referred_username": referred_user.username if referred_user else "Unknown",
            "referred_user_email": referred_user.email if referred_user else "Unknown",
            "course_name": course.name if course else "Platform Registration",
            "amount": commission.commission_amount,
            "status": commission.status.value,
            "payment_completion_date": commission.payment_completion_date.isoformat() if commission.payment_completion_date else None,
            "eligible_date": commission.refund_period_expiration_date.isoformat() if commission.refund_period_expiration_date else None,
            "payout_date": commission.payout_date.isoformat() if commission.payout_date else None,
            "created_at": commission.creation_date.isoformat() if commission.creation_date else None
        })
    
    return history
