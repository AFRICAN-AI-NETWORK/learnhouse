"""
Referral Commission Service - Manages commission tracking and balance
Follows DRY principles with reusable utilities
"""

import logging
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, Request
from sqlmodel import Session, select, and_, func
from src.db.referrals.referral_commissions import (
    ReferralCommission,
    CommissionStatus,
    CommissionType,
)
from src.db.referrals.referral_tracking import ReferralTracking
from src.db.referrals.referral_codes import ReferralCode
from src.db.referrals.referral_commissions import CommissionStatus, ReferralCommission
from src.db.referrals.referral_tracking import ReferralTracking
from src.db.users import PublicUser, User

logger = logging.getLogger(__name__)

# Configuration constants
REFUND_PERIOD_DAYS = 14
COMMISSION_AMOUNT_USD = 4.00  # Standard referrer rate; marketers get their
# per-row commission_rate_usd via get_commission_amount_for_code()
ELIGIBILITY_CHUNK_SIZE = 500  # Rows per batch in the nightly eligibility job


async def get_commission_by_payment(
    payment_user_id: int, referral_code_id: int, db_session: Session
) -> ReferralCommission | None:
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
            ReferralCommission.referral_code_id == referral_code_id,
        )
    )
    return db_session.exec(statement).first()


async def create_commission_for_payment(
    org_id: int,
    referrer_user_id: int,
    referred_user_id: int,
    payment_user_id: int,
    course_id: int | None,
    referral_code_id: int,
    payment_completion_date: datetime,
    db_session: Session,
) -> ReferralCommission | None:
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
    existing = await get_commission_by_payment(
        payment_user_id, referral_code_id, db_session
    )
    if existing:
        logger.info(
            f"Commission already exists for payment {payment_user_id} - idempotent response"
        )
        return None

    # Calculate refund period expiration
    refund_expiration = payment_completion_date + timedelta(days=REFUND_PERIOD_DAYS)

    # Resolve the commission amount for this referral code: active marketers
    # earn their per-row rate (default $7.70), standard referrers earn $4.00.
    # Falls back to the standard rate on any failure (MKTR_103 — logged only).
    try:
        # Lazy import to avoid circular dependency
        from src.services.referrals.marketers import get_commission_amount_for_code

        commission_amount, commission_type = await get_commission_amount_for_code(
            referral_code_id, db_session
        )
    except Exception as e:
        logger.error(
            f"MKTR_103: Commission amount calculation failed for referral code "
            f"{referral_code_id}: {e}. Falling back to standard ${COMMISSION_AMOUNT_USD}"
        )
        commission_amount = COMMISSION_AMOUNT_USD
        commission_type = CommissionType.STANDARD

    # Create commission
    commission = ReferralCommission(
        org_id=org_id,
        referrer_user_id=referrer_user_id,
        referred_user_id=referred_user_id,
        payment_user_id=payment_user_id,
        course_id=course_id,
        referral_code_id=referral_code_id,
        commission_amount=commission_amount,
        commission_type=commission_type,
        status=CommissionStatus.PENDING,
        payment_completion_date=payment_completion_date,
        refund_period_expiration_date=refund_expiration,
        creation_date=datetime.now(UTC),
        update_date=datetime.now(UTC),
    )

    db_session.add(commission)
    db_session.commit()
    db_session.refresh(commission)

    logger.info(
        f"Created {commission_type.value} commission ${commission_amount} "
        f"for referrer {referrer_user_id} from payment {payment_user_id}"
    )

    return commission


async def forfeit_commission_for_refund(
    payment_user_id: int, db_session: Session, refund_reason: str | None = None
) -> ReferralCommission | None:
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
        user_statement = (
            select(User).where(User.id == commission.referrer_user_id).with_for_update()
        )
        user = db_session.exec(user_statement).first()
        if user:
            user.referral_commission_balance -= commission.commission_amount
            # Ensure balance doesn't go negative
            user.referral_commission_balance = max(user.referral_commission_balance, 0)
            db_session.add(user)
            logger.info(
                f"Deducted ${commission.commission_amount} from user {user.id} balance (refund)"
            )

    # Update commission status
    commission.status = CommissionStatus.FORFEITED
    commission.update_date = datetime.now(UTC)
    db_session.add(commission)
    db_session.commit()
    db_session.refresh(commission)

    # Audit trail logging
    logger.info(
        f"Forfeited commission {commission.id} for payment {payment_user_id}"
        f"{f' - Reason: {refund_reason}' if refund_reason else ''}"
    )

    return commission


async def update_pending_commissions_to_eligible(db_session: Session) -> int:
    """
    Update pending commissions to eligible after refund period expires
    Should be run as scheduled job daily
    Uses bulk updates to prevent N+1 query issues

    Args:
        db_session: Database session

    Returns:
        Number of commissions updated
    """
    now = datetime.now(UTC)
    total_updated = 0
    # Per-user totals across all chunks — used for the marketer digest email
    digest_totals: dict = defaultdict(float)

    # Process in fixed-size chunks so memory stays O(1) regardless of how many
    # commissions mature on the same day. Each chunk commits atomically; if the
    # job is interrupted, the next run picks up remaining rows because
    # processed commissions are no longer PENDING.
    while True:
        statement = (
            select(ReferralCommission)
            .where(
                and_(
                    ReferralCommission.status == CommissionStatus.PENDING,
                    ReferralCommission.refund_period_expiration_date <= now,
                )
            )
            .limit(ELIGIBILITY_CHUNK_SIZE)
        )
        commissions = db_session.exec(statement).all()

        if not commissions:
            break

        # Group commissions by referrer_user_id and sum amounts (bulk optimization)
        user_balance_updates = defaultdict(float)
        for commission in commissions:
            user_balance_updates[commission.referrer_user_id] += (
                commission.commission_amount
            )

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
                logger.info(
                    f"Added ${total_amount:.2f} to user {user.id} balance (bulk update)"
                )

        db_session.commit()
        total_updated += len(commissions)
        for user_id, total_amount in user_balance_updates.items():
            digest_totals[user_id] += total_amount

        # Last chunk was partial — nothing left to fetch
        if len(commissions) < ELIGIBILITY_CHUNK_SIZE:
            break

    if total_updated == 0:
        logger.info("No pending commissions to update")
    else:
        logger.info(
            f"Updated {total_updated} pending commissions to eligible "
            f"(chunked bulk update, {ELIGIBILITY_CHUNK_SIZE}/batch)"
        )
        _send_marketer_eligible_digests(digest_totals, db_session)

    return total_updated


def _send_marketer_eligible_digests(digest_totals: dict, db_session: Session) -> None:
    """
    Daily digest email to active marketers whose commissions became ELIGIBLE.
    Batch-fetched; never raises — email failure must not affect the job.
    """
    if not digest_totals:
        return
    try:
        from src.db.referrals.marketers import Marketer, MarketerStatus
        from src.services.referrals.marketer_emails import (
            send_marketer_commission_eligible_email,
        )

        marketers = db_session.exec(
            select(Marketer).where(
                and_(
                    Marketer.user_id.in_(list(digest_totals.keys())),
                    Marketer.status == MarketerStatus.ACTIVE,
                )
            )
        ).all()
        if not marketers:
            return

        marketer_user_ids = [m.user_id for m in marketers]
        users = db_session.exec(
            select(User).where(User.id.in_(marketer_user_ids))
        ).all()

        for user in users:
            try:
                send_marketer_commission_eligible_email(
                    user.email, user.username, round(digest_totals[user.id], 2)
                )
            except Exception as e:
                logger.error(f"Failed to send eligible digest to user {user.id}: {e}")
    except Exception as e:
        logger.error(f"Marketer eligible digest step failed: {e}")


async def get_commission_balance(
    request: Request, org_id: int, current_user: PublicUser, db_session: Session
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

    # Single grouped query for ELIGIBLE + PENDING sums, joined with the user's
    # maintained balance — 1 DB round-trip instead of 3 per balance check
    grouped_statement = (
        select(
            ReferralCommission.status,
            func.coalesce(func.sum(ReferralCommission.commission_amount), 0.0),
            User.referral_commission_balance,
        )
        .join(User, User.id == ReferralCommission.referrer_user_id)
        .where(
            and_(
                ReferralCommission.referrer_user_id == current_user.id,
                ReferralCommission.status.in_(
                    [CommissionStatus.ELIGIBLE, CommissionStatus.PENDING]
                ),
            )
        )
        .group_by(ReferralCommission.status, User.referral_commission_balance)
    )
    rows = db_session.exec(grouped_statement).all()

    amounts = {status: amount for status, amount, _ in rows}
    total_balance = rows[0][2] if rows else None

    if total_balance is None:
        # No ELIGIBLE/PENDING commissions — fall back to the user row
        user = db_session.exec(select(User).where(User.id == current_user.id)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        total_balance = user.referral_commission_balance

    return {
        "total_balance": round(total_balance, 2),
        "eligible_for_payout": round(amounts.get(CommissionStatus.ELIGIBLE, 0.0), 2),
        "pending": round(amounts.get(CommissionStatus.PENDING, 0.0), 2),
        "currency": "USD",
    }


async def get_commission_history(
    request: Request,
    org_id: int,
    current_user: PublicUser,
    db_session: Session,
    limit: int = 50,
) -> list[dict]:
    """
    Get unified referral tracking history for current user.
    Includes both registrations (from tracking) and payments (from commissions).
    """

    # 1. Fetch all tracking records for this referrer in this org
    # We join with ReferralCode to filter by org_id
    tracking_statement = (
        select(ReferralTracking)
        .join(ReferralCode, ReferralTracking.referral_code_id == ReferralCode.id)
        .where(
            and_(
                ReferralTracking.referrer_user_id == current_user.id,
                ReferralCode.org_id == org_id,
            )
        )
        .order_by(ReferralTracking.creation_date.desc())
        .limit(limit)
    )

    tracking_records = db_session.exec(tracking_statement).all()

    # 2. Fetch all commission records for this referrer in this org
    commission_statement = (
        select(ReferralCommission)
        .where(
            and_(
                ReferralCommission.referrer_user_id == current_user.id,
                ReferralCommission.org_id == org_id,
            )
        )
        .order_by(ReferralCommission.creation_date.desc())
        .limit(limit)
    )

    commissions = db_session.exec(commission_statement).all()

    # 3. Batch fetch all unique referred users
    referred_user_ids = {t.referred_user_id for t in tracking_records} | {
        c.referred_user_id for c in commissions
    }
    user_map = {}
    if referred_user_ids:
        user_statement = select(User).where(User.id.in_(referred_user_ids))
        users = db_session.exec(user_statement).all()
        user_map = {user.id: user for user in users}

    # 4. Batch fetch all courses for commissions
    course_ids = {c.course_id for c in commissions if c.course_id}
    course_map = {}
    if course_ids:
        from src.db.courses.courses import Course

        course_statement = select(Course).where(Course.id.in_(course_ids))
        courses = db_session.exec(course_statement).all()
        course_map = {course.id: course for course in courses}

    # Build response using pre-fetched data (no N+1 queries)
    history = []

    # First, add all commissions (these are "Paid" or "Pending Payout" events)
    for commission in commissions:
        referred_user = user_map.get(commission.referred_user_id)
        course = course_map.get(commission.course_id) if commission.course_id else None

        history.append(
            {
                "id": commission.id,
                "referred_user_email": referred_user.email
                if referred_user
                else "Unknown",
                "course_name": course.name if course else "N/A",
                "amount": commission.commission_amount,
                "status": commission.status.value,
                "payment_completion_date": commission.payment_completion_date.isoformat()
                if commission.payment_completion_date
                else None,
                "eligible_date": commission.refund_period_expiration_date.isoformat()
                if commission.refund_period_expiration_date
                else None,
                "payout_date": commission.payout_date.isoformat()
                if commission.payout_date
                else None,
            }
        )

    return history
