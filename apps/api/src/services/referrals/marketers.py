"""
Marketer Service - All marketer business logic
Marketers are users who promote the platform and earn a higher commission
(default $7.70) per paid course from students they refer. The entire existing
referral pipeline is reused — only the commission amount differs, resolved at
webhook time by get_commission_amount_for_code().
"""

import hashlib
import logging
from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from redis.exceptions import RedisError
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, and_, func, select

from src.db.referrals.marketer_kyc import KYCStatus, MarketerKYC
from src.db.referrals.marketers import (
    MARKETER_COMMISSION_RATE_USD,
    Marketer,
    MarketerStatus,
)
from src.db.referrals.referral_codes import (
    ReferralCode,
    ReferralCodeStatus,
)
from src.db.referrals.referral_commissions import (
    CommissionStatus,
    CommissionType,
    ReferralCommission,
)
from src.db.referrals.referral_tracking import ReferralTracking
from src.db.users import User
from src.services.referrals.redis_cache import get_redis_client
from src.services.referrals.referral_codes import (
    build_referral_link,
    generate_unique_code,
    get_referral_code_by_code,
    get_referral_code_by_user,
)

logger = logging.getLogger(__name__)

# Standard (non-marketer) referrer commission — single source with
# referral_commissions.COMMISSION_AMOUNT_USD
STANDARD_COMMISSION_USD = 4.00

# Payout minimums
MARKETER_MINIMUM_PAYOUT_USD = 7.70
STANDARD_MINIMUM_PAYOUT_USD = 1.00

# Redis cache for is_active_marketer (checked on every payment webhook)
MARKETER_ACTIVE_CACHE_TTL = 300  # 5 minutes

# Registration rate limits
REGISTRATION_RATE_LIMIT_PER_HOUR = 3  # per IP → MKTR_004
REGISTRATION_NETWORK_LIMIT_30D = 3  # accounts per IP in 30 days → MKTR_005


def marketer_error(
    status_code: int, error_code: str, message: str, field: str | None = None
) -> HTTPException:
    """Build the standard marketer error response shape (DRY utility)"""
    detail = {"error_code": error_code, "message": message}
    if field:
        detail["field"] = field
    return HTTPException(status_code=status_code, detail=detail)


def _marketer_cache_key(user_id: int, org_id: int) -> str:
    return f"mkt:active:{user_id}:{org_id}"


def invalidate_marketer_cache(user_id: int, org_id: int) -> None:
    """Delete the Redis active-marketer key so rate changes apply immediately"""
    redis_client = get_redis_client()
    if redis_client:
        try:
            redis_client.delete(_marketer_cache_key(user_id, org_id))
        except RedisError as e:
            logger.warning(f"Failed to invalidate marketer cache: {e}")


def compute_device_fingerprint(request: Request | None) -> str | None:
    """
    SHA-256 of User-Agent + Accept-Language + /24 IP range.
    Used to flag (not reject) registrations from devices already linked to an
    active marketer — shared devices are real, so this only sets needs_review.
    """
    if request is None:
        return None
    try:
        user_agent = request.headers.get("user-agent", "")
        accept_language = request.headers.get("accept-language", "")
        client_ip = _get_client_ip(request)
        ip_range = ".".join(client_ip.split(".")[:3]) if client_ip else ""
        raw = f"{user_agent}|{accept_language}|{ip_range}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()
    except Exception as e:
        logger.warning(f"Failed to compute device fingerprint: {e}")
        return None


def _get_client_ip(request: Request) -> str:
    """Extract client IP, honouring reverse-proxy headers"""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


def _check_registration_rate_limits(request: Request | None) -> None:
    """
    Redis-backed registration rate limits:
    - 3 registrations per IP per hour → MKTR_004
    - 3 marketer accounts per IP in 30 days (across all orgs) → MKTR_005
    Degrades to no-op when Redis is unavailable.
    """
    if request is None:
        return
    redis_client = get_redis_client()
    if not redis_client:
        return

    client_ip = _get_client_ip(request)
    if not client_ip:
        return

    try:
        hourly_key = f"mktr:reg:hourly:{client_ip}"
        hourly_count = redis_client.incr(hourly_key)
        if hourly_count == 1:
            redis_client.expire(hourly_key, 3600)
        if hourly_count > REGISTRATION_RATE_LIMIT_PER_HOUR:
            raise marketer_error(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "MKTR_004",
                "Registration rate limit exceeded — try again later",
            )

        monthly_key = f"mktr:reg:30d:{client_ip}"
        monthly_count = redis_client.incr(monthly_key)
        if monthly_count == 1:
            redis_client.expire(monthly_key, 30 * 24 * 3600)
        if monthly_count > REGISTRATION_NETWORK_LIMIT_30D:
            raise marketer_error(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "MKTR_005",
                "Registration limit reached for your network — contact support",
            )
    except HTTPException:
        raise
    except RedisError as e:
        logger.warning(f"Rate limit check failed (Redis error): {e}")


async def get_marketer_by_user(
    user_id: int, org_id: int, db_session: Session
) -> Marketer | None:
    """Get marketer row by user + org (DRY utility)"""
    statement = select(Marketer).where(
        and_(Marketer.user_id == user_id, Marketer.org_id == org_id)
    )
    return db_session.exec(statement).first()


async def get_marketer_or_404(
    marketer_id: int, org_id: int, db_session: Session
) -> Marketer:
    """Get marketer by id scoped to org, raising MKTR_401 if not found"""
    marketer = db_session.get(Marketer, marketer_id)
    if not marketer or marketer.org_id != org_id:
        raise marketer_error(
            status.HTTP_404_NOT_FOUND, "MKTR_401", "Marketer not found"
        )
    return marketer


# ==================== Registration & Lifecycle ====================


async def register_marketer(
    user_id: int,
    org_id: int,
    phone_number: str,
    db_session: Session,
    request: Request | None = None,
) -> Marketer:
    """
    Register a new marketer (status PENDING_APPROVAL, awaiting admin review).

    Raises:
        MKTR_001 duplicate marketer, MKTR_002 user not found,
        MKTR_004/005 rate limits, MKTR_006 phone taken,
        MKTR_007 suspended, MKTR_008 rejected
    """
    # Rate limits first — cheapest check, blocks abuse before DB work
    _check_registration_rate_limits(request)

    user = db_session.get(User, user_id)
    if not user:
        raise marketer_error(
            status.HTTP_404_NOT_FOUND, "MKTR_002", "User account not found"
        )

    existing = await get_marketer_by_user(user_id, org_id, db_session)
    if existing:
        if existing.status == MarketerStatus.SUSPENDED:
            raise marketer_error(
                status.HTTP_400_BAD_REQUEST,
                "MKTR_007",
                "Your marketer account is suspended — contact support",
            )
        if existing.status == MarketerStatus.REJECTED:
            raise marketer_error(
                status.HTTP_400_BAD_REQUEST,
                "MKTR_008",
                "Your marketer application was rejected — contact support to appeal",
            )
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_001",
            "You already have a marketer profile in this organization",
        )

    phone_number = (phone_number or "").strip()
    if phone_number:
        phone_taken = db_session.exec(
            select(Marketer).where(
                and_(
                    Marketer.org_id == org_id,
                    Marketer.phone_number == phone_number,
                )
            )
        ).first()
        if phone_taken:
            raise marketer_error(
                status.HTTP_400_BAD_REQUEST,
                "MKTR_006",
                "This phone number is already registered to another marketer",
                field="phone_number",
            )

    # Device fingerprint: same device already linked to an ACTIVE marketer in
    # this org flags for review but does not reject (shared devices are real)
    needs_review = False
    fingerprint = compute_device_fingerprint(request)
    if fingerprint:
        redis_client = get_redis_client()
        fp_key = f"mktr:device:{org_id}:{fingerprint}"
        if redis_client:
            try:
                if redis_client.exists(fp_key):
                    needs_review = True
                    logger.warning(
                        f"Marketer registration for user {user_id} flagged: device "
                        f"fingerprint already linked to an active marketer in org {org_id}"
                    )
                else:
                    redis_client.setex(fp_key, 90 * 24 * 3600, str(user_id))
            except RedisError as e:
                logger.warning(f"Device fingerprint check failed: {e}")

    marketer = Marketer(
        user_id=user_id,
        org_id=org_id,
        phone_number=phone_number or None,
        status=MarketerStatus.PENDING_APPROVAL,
        commission_rate_usd=MARKETER_COMMISSION_RATE_USD,
        needs_review=needs_review,
        creation_date=datetime.now(timezone.utc),
        update_date=datetime.now(timezone.utc),
    )
    db_session.add(marketer)
    try:
        db_session.commit()
    except IntegrityError:
        # DB-level unique constraints (user_org / phone_org) as the last line
        # of defence against races
        db_session.rollback()
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_001",
            "You already have a marketer profile in this organization",
        )
    db_session.refresh(marketer)

    logger.info(f"Registered marketer {marketer.id} (user {user_id}, org {org_id})")

    # Acknowledgement email — never blocks registration
    try:
        from src.services.referrals.marketer_emails import (
            send_marketer_application_received_email,
        )

        send_marketer_application_received_email(user.email, user.username)
    except Exception as e:
        logger.error(f"Failed to send marketer application email: {e}")

    return marketer


async def approve_marketer(
    marketer_id: int, org_id: int, admin_user_id: int, db_session: Session
) -> Marketer:
    """
    Approve a pending marketer: sets ACTIVE, generates the MKT- referral code,
    sends the approval email. Raises MKTR_402 if not PENDING_APPROVAL.
    """
    marketer = await get_marketer_or_404(marketer_id, org_id, db_session)

    if marketer.status != MarketerStatus.PENDING_APPROVAL:
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_402",
            "Cannot approve — marketer is not in PENDING_APPROVAL status",
        )

    marketer.status = MarketerStatus.ACTIVE
    marketer.approved_by_user_id = admin_user_id
    marketer.approved_at = datetime.now(timezone.utc)
    marketer.update_date = datetime.now(timezone.utc)
    db_session.add(marketer)
    db_session.commit()
    db_session.refresh(marketer)

    referral_code = await generate_referral_code_for_marketer(marketer.id, db_session)

    invalidate_marketer_cache(marketer.user_id, org_id)

    user = db_session.get(User, marketer.user_id)
    if user:
        try:
            from src.services.referrals.marketer_emails import (
                send_marketer_approved_email,
            )

            send_marketer_approved_email(
                user.email,
                user.username,
                referral_code.code,
                referral_code.referral_link,
            )
        except Exception as e:
            logger.error(f"Failed to send marketer approval email: {e}")

    logger.info(f"Marketer {marketer_id} approved by admin {admin_user_id}")
    return marketer


async def reject_marketer(
    marketer_id: int,
    org_id: int,
    reason: str,
    admin_user_id: int,
    db_session: Session,
) -> Marketer:
    """Reject a marketer application, storing the reason"""
    marketer = await get_marketer_or_404(marketer_id, org_id, db_session)

    marketer.status = MarketerStatus.REJECTED
    marketer.rejection_reason = reason
    marketer.update_date = datetime.now(timezone.utc)
    db_session.add(marketer)
    db_session.commit()
    db_session.refresh(marketer)

    invalidate_marketer_cache(marketer.user_id, org_id)

    user = db_session.get(User, marketer.user_id)
    if user:
        try:
            from src.services.referrals.marketer_emails import (
                send_marketer_rejected_email,
            )

            send_marketer_rejected_email(user.email, user.username, reason)
        except Exception as e:
            logger.error(f"Failed to send marketer rejection email: {e}")

    logger.info(f"Marketer {marketer_id} rejected by admin {admin_user_id}: {reason}")
    return marketer


async def suspend_marketer(
    marketer_id: int, org_id: int, admin_user_id: int, db_session: Session
) -> Marketer:
    """
    Suspend an active marketer: deactivates their referral code and deletes the
    Redis cache key immediately so the commission rate reverts to $4.00 within
    the same request, not after the 5-minute TTL.
    """
    marketer = await get_marketer_or_404(marketer_id, org_id, db_session)

    if marketer.status == MarketerStatus.SUSPENDED:
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_403",
            "Cannot suspend — marketer is already suspended",
        )

    marketer.status = MarketerStatus.SUSPENDED
    marketer.update_date = datetime.now(timezone.utc)
    db_session.add(marketer)

    # Deactivate referral code — new signups cannot use it
    if marketer.referral_code_id:
        referral_code = db_session.get(ReferralCode, marketer.referral_code_id)
        if referral_code:
            referral_code.status = ReferralCodeStatus.INACTIVE
            db_session.add(referral_code)

    db_session.commit()
    db_session.refresh(marketer)

    # Immediate cache invalidation — rate reverts now, not after TTL
    invalidate_marketer_cache(marketer.user_id, org_id)

    logger.info(f"Marketer {marketer_id} suspended by admin {admin_user_id}")
    return marketer


async def reactivate_marketer(
    marketer_id: int, org_id: int, admin_user_id: int, db_session: Session
) -> Marketer:
    """
    Reactivate a suspended marketer. Rejected accounts cannot be reactivated
    (MKTR_404) — they must re-apply.
    """
    marketer = await get_marketer_or_404(marketer_id, org_id, db_session)

    if marketer.status != MarketerStatus.SUSPENDED:
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_404",
            "Cannot reactivate — only suspended accounts can be reactivated",
        )

    marketer.status = MarketerStatus.ACTIVE
    marketer.update_date = datetime.now(timezone.utc)
    db_session.add(marketer)

    # Re-activate referral code
    if marketer.referral_code_id:
        referral_code = db_session.get(ReferralCode, marketer.referral_code_id)
        if referral_code:
            referral_code.status = ReferralCodeStatus.ACTIVE
            db_session.add(referral_code)

    db_session.commit()
    db_session.refresh(marketer)

    invalidate_marketer_cache(marketer.user_id, org_id)

    logger.info(f"Marketer {marketer_id} reactivated by admin {admin_user_id}")
    return marketer


async def generate_referral_code_for_marketer(
    marketer_id: int, db_session: Session
) -> ReferralCode:
    """
    Generate (or link) the marketer's referral code, prefixed MKT- for visual
    distinction in the admin view. If the user already has a referral code from
    the standard referral program, that code is linked instead of replaced so
    existing shared links keep working.
    """
    marketer = db_session.get(Marketer, marketer_id)
    if not marketer:
        raise marketer_error(
            status.HTTP_404_NOT_FOUND, "MKTR_401", "Marketer not found"
        )

    # Reuse the user's existing code if they already generated one
    existing_code = await get_referral_code_by_user(
        marketer.user_id, marketer.org_id, db_session
    )
    if existing_code:
        marketer.referral_code_id = existing_code.id
        marketer.update_date = datetime.now(timezone.utc)
        db_session.add(marketer)
        db_session.commit()
        db_session.refresh(existing_code)
        return existing_code

    # Generate a new MKT- prefixed code (collision-checked)
    code = None
    for _ in range(10):
        candidate = f"MKT-{generate_unique_code(8)}"
        if not await get_referral_code_by_code(candidate, db_session):
            code = candidate
            break
    if not code:
        raise marketer_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "MKTR_101",
            "Failed to generate a unique referral code — try again",
        )

    referral_code = ReferralCode(
        org_id=marketer.org_id,
        referrer_user_id=marketer.user_id,
        code=code,
        referral_link=build_referral_link(code),
        status=ReferralCodeStatus.ACTIVE,
        creation_date=datetime.now(timezone.utc),
        update_date=datetime.now(timezone.utc),
    )
    db_session.add(referral_code)

    user = db_session.get(User, marketer.user_id)
    if user:
        user.has_referral_code = True
        db_session.add(user)

    db_session.commit()
    db_session.refresh(referral_code)

    marketer.referral_code_id = referral_code.id
    marketer.update_date = datetime.now(timezone.utc)
    db_session.add(marketer)
    db_session.commit()

    logger.info(f"Generated referral code {code} for marketer {marketer_id}")
    return referral_code


# ==================== Commission Rate Resolution ====================


async def is_active_marketer(user_id: int, org_id: int, db_session: Session) -> bool:
    """
    Check whether a user is an ACTIVE marketer, Redis-cached for 5 minutes.
    Called by get_commission_amount_for_code on every payment webhook.
    """
    cache_key = _marketer_cache_key(user_id, org_id)
    redis_client = get_redis_client()

    if redis_client:
        try:
            cached = redis_client.get(cache_key)
            if cached is not None:
                return cached == "1"
        except RedisError as e:
            logger.warning(f"Marketer cache read failed: {e}")

    marketer = db_session.exec(
        select(Marketer).where(
            and_(
                Marketer.user_id == user_id,
                Marketer.org_id == org_id,
                Marketer.status == MarketerStatus.ACTIVE,
            )
        )
    ).first()
    result = marketer is not None

    if redis_client:
        try:
            redis_client.setex(
                cache_key, MARKETER_ACTIVE_CACHE_TTL, "1" if result else "0"
            )
        except RedisError as e:
            logger.warning(f"Marketer cache write failed: {e}")

    return result


async def get_commission_amount_for_code(
    referral_code_id: int, db_session: Session
) -> tuple[float, CommissionType]:
    """
    Resolve the commission amount for a referral code (single source of truth).

    Returns:
        (marketer.commission_rate_usd, MARKETER) for active marketers
        (4.00, STANDARD) otherwise
    """
    referral_code = db_session.get(ReferralCode, referral_code_id)
    if not referral_code:
        logger.warning(
            f"MKTR_101: Referral code {referral_code_id} not found — "
            "using standard commission"
        )
        return STANDARD_COMMISSION_USD, CommissionType.STANDARD

    if await is_active_marketer(
        referral_code.referrer_user_id, referral_code.org_id, db_session
    ):
        marketer = await get_marketer_by_user(
            referral_code.referrer_user_id, referral_code.org_id, db_session
        )
        if marketer:
            return marketer.commission_rate_usd, CommissionType.MARKETER

    return STANDARD_COMMISSION_USD, CommissionType.STANDARD


async def get_minimum_payout(user_id: int, org_id: int, db_session: Session) -> float:
    """Minimum payout: $7.70 for active marketers, $1.00 for standard referrers"""
    if await is_active_marketer(user_id, org_id, db_session):
        return MARKETER_MINIMUM_PAYOUT_USD
    return STANDARD_MINIMUM_PAYOUT_USD


# ==================== Dashboard & Analytics ====================


async def get_marketer_dashboard(
    marketer_user_id: int, org_id: int, db_session: Session
) -> dict:
    """
    Full marketer dashboard payload — one service call, batched queries,
    no N+1. Summary totals read live grouped sums (single query); the
    denormalized Marketer counters back the admin leaderboard.
    """
    marketer = await get_marketer_by_user(marketer_user_id, org_id, db_session)
    if not marketer:
        raise marketer_error(
            status.HTTP_404_NOT_FOUND, "MKTR_401", "Marketer not found"
        )

    user = db_session.get(User, marketer_user_id)

    referral_code = (
        db_session.get(ReferralCode, marketer.referral_code_id)
        if marketer.referral_code_id
        else None
    )

    # Single grouped query: commission sums + counts per status
    commission_rows = db_session.exec(
        select(
            ReferralCommission.status,
            func.coalesce(func.sum(ReferralCommission.commission_amount), 0.0),
            func.count(ReferralCommission.id),
        )
        .where(
            and_(
                ReferralCommission.referrer_user_id == marketer_user_id,
                ReferralCommission.org_id == org_id,
            )
        )
        .group_by(ReferralCommission.status)
    ).all()
    sums = {row[0]: row[1] for row in commission_rows}
    counts = {row[0]: row[2] for row in commission_rows}

    total_earned = sum(
        amount for st, amount in sums.items() if st != CommissionStatus.FORFEITED
    )
    total_courses_sold = sum(
        count for st, count in counts.items() if st != CommissionStatus.FORFEITED
    )

    # Distinct students referred (single count query)
    total_students = (
        db_session.exec(
            select(func.count(func.distinct(ReferralTracking.referred_user_id))).where(
                ReferralTracking.referrer_user_id == marketer_user_id
            )
        ).first()
        or 0
    )

    # Recent students: top 5 (full list is a separate paginated endpoint)
    recent = await get_marketer_students(
        marketer_user_id, org_id, page=1, limit=5, db_session=db_session
    )

    # Monthly revenue: last 12 months, single group-by query
    monthly = await get_marketer_monthly_revenue(
        marketer_user_id, org_id, datetime.now(timezone.utc).year, db_session
    )

    # KYC + payment method state
    kyc = db_session.exec(
        select(MarketerKYC).where(MarketerKYC.marketer_id == marketer.id)
    ).first()
    kyc_status = kyc.status if kyc else KYCStatus.UNVERIFIED

    from src.db.referrals.payout_requests import PayoutStatus, ReferrerPayoutRequest
    from src.services.referrals.payouts import (
        build_masked_payment_method,
        get_active_payment_method,
    )

    payment_method = await get_active_payment_method(marketer.id, db_session)
    payment_method_summary = (
        build_masked_payment_method(payment_method).model_dump()
        if payment_method
        else None
    )

    last_payout = db_session.exec(
        select(ReferrerPayoutRequest)
        .where(
            and_(
                ReferrerPayoutRequest.referrer_user_id == marketer_user_id,
                ReferrerPayoutRequest.status == PayoutStatus.COMPLETED,
            )
        )
        .order_by(ReferrerPayoutRequest.completion_date.desc())
    ).first()

    country_set = bool(
        user
        and (
            (isinstance(user.profile, dict) and user.profile.get("country"))
            or (isinstance(user.details, dict) and user.details.get("country"))
        )
    )

    completeness_flags = {
        "country_set": country_set,
        "phone_set": bool(marketer.phone_number),
        "kyc_verified": kyc_status == KYCStatus.VERIFIED,
        "payment_method_saved": payment_method is not None,
    }

    return {
        "profile": {
            "marketer_id": marketer.id,
            "name": f"{user.first_name} {user.last_name}" if user else None,
            "email": user.email if user else None,
            "username": user.username if user else None,
            "code": referral_code.code if referral_code else None,
            "referral_link": referral_code.referral_link if referral_code else None,
            "status": marketer.status,
            "approved_at": marketer.approved_at,
            "commission_rate_usd": marketer.commission_rate_usd,
        },
        "summary": {
            "total_students": total_students,
            "total_courses_sold": total_courses_sold,
            "total_earned_usd": round(total_earned, 2),
            "eligible_for_payout_usd": round(
                sums.get(CommissionStatus.ELIGIBLE, 0.0), 2
            ),
            "pending_usd": round(sums.get(CommissionStatus.PENDING, 0.0), 2),
            "total_paid_usd": round(sums.get(CommissionStatus.PAID, 0.0), 2),
        },
        "monthly_revenue": monthly,
        "recent_students": recent["students"],
        "payout_info": {
            "eligible_balance_usd": round(sums.get(CommissionStatus.ELIGIBLE, 0.0), 2),
            "last_payout_date": last_payout.completion_date if last_payout else None,
            "minimum_payout_usd": MARKETER_MINIMUM_PAYOUT_USD,
            "payment_method": payment_method_summary,
            "kyc_status": kyc_status,
            "profile_complete": all(completeness_flags.values()),
        },
        "completeness_flags": completeness_flags,
    }


async def get_marketer_students(
    marketer_user_id: int,
    org_id: int,
    page: int,
    limit: int,
    db_session: Session,
) -> dict:
    """
    Paginated list of students the marketer referred, with per-course
    commission breakdown. Batch-fetched — no N+1 queries.
    """
    page = max(page, 1)
    limit = min(max(limit, 1), 100)
    offset = (page - 1) * limit

    total_count = (
        db_session.exec(
            select(func.count(ReferralTracking.id)).where(
                ReferralTracking.referrer_user_id == marketer_user_id
            )
        ).first()
        or 0
    )

    tracking_records = db_session.exec(
        select(ReferralTracking)
        .where(ReferralTracking.referrer_user_id == marketer_user_id)
        .order_by(ReferralTracking.signup_date.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    student_ids = [t.referred_user_id for t in tracking_records]

    # Batch fetch users
    user_map = {}
    if student_ids:
        users = db_session.exec(select(User).where(User.id.in_(student_ids))).all()
        user_map = {u.id: u for u in users}

    # Batch fetch commissions for these students
    commissions_by_student: dict = {}
    course_ids = set()
    if student_ids:
        commissions = db_session.exec(
            select(ReferralCommission).where(
                and_(
                    ReferralCommission.referrer_user_id == marketer_user_id,
                    ReferralCommission.org_id == org_id,
                    ReferralCommission.referred_user_id.in_(student_ids),
                )
            )
        ).all()
        for c in commissions:
            commissions_by_student.setdefault(c.referred_user_id, []).append(c)
            if c.course_id:
                course_ids.add(c.course_id)

    # Batch fetch courses
    course_map = {}
    if course_ids:
        from src.db.courses.courses import Course

        courses = db_session.exec(select(Course).where(Course.id.in_(course_ids))).all()
        course_map = {c.id: c for c in courses}

    students = []
    for tracking in tracking_records:
        student = user_map.get(tracking.referred_user_id)
        student_commissions = commissions_by_student.get(tracking.referred_user_id, [])
        courses_purchased = [
            {
                "course_id": c.course_id,
                "course_name": (
                    course_map[c.course_id].name
                    if c.course_id and c.course_id in course_map
                    else "N/A"
                ),
                "purchase_date": c.payment_completion_date,
                "commission_amount": c.commission_amount,
                "commission_status": c.status,
            }
            for c in student_commissions
        ]
        students.append(
            {
                "student_id": tracking.referred_user_id,
                "name": (
                    f"{student.first_name} {student.last_name}"
                    if student
                    else "Unknown"
                ),
                "email": student.email if student else "unknown",
                "signup_date": tracking.signup_date,
                "courses_purchased": courses_purchased,
                "courses_count": len(courses_purchased),
                "total_commission_usd": round(
                    sum(
                        c.commission_amount
                        for c in student_commissions
                        if c.status != CommissionStatus.FORFEITED
                    ),
                    2,
                ),
            }
        )

    return {
        "students": students,
        "total_count": total_count,
        "page": page,
        "limit": limit,
    }


async def get_marketer_monthly_revenue(
    marketer_user_id: int, org_id: int, year: int, db_session: Session
) -> list:
    """
    Monthly commission revenue for a year — single SQL group-by query.
    Returns 12 records (months with no sales are zero-filled).
    """
    month_expr = func.extract("month", ReferralCommission.creation_date)
    year_expr = func.extract("year", ReferralCommission.creation_date)

    rows = db_session.exec(
        select(
            month_expr,
            ReferralCommission.status,
            func.count(ReferralCommission.id),
            func.coalesce(func.sum(ReferralCommission.commission_amount), 0.0),
        )
        .where(
            and_(
                ReferralCommission.referrer_user_id == marketer_user_id,
                ReferralCommission.org_id == org_id,
                year_expr == year,
            )
        )
        .group_by(month_expr, ReferralCommission.status)
    ).all()

    months = {
        m: {
            "month": m,
            "year": year,
            "courses_sold": 0,
            "commission_earned_usd": 0.0,
            "commissions_eligible_usd": 0.0,
            "commissions_paid_usd": 0.0,
        }
        for m in range(1, 13)
    }

    for month, commission_status, count, amount in rows:
        month = int(month)
        record = months[month]
        if commission_status != CommissionStatus.FORFEITED:
            record["courses_sold"] += count
            record["commission_earned_usd"] = round(
                record["commission_earned_usd"] + amount, 2
            )
        if commission_status == CommissionStatus.ELIGIBLE:
            record["commissions_eligible_usd"] = round(amount, 2)
        elif commission_status == CommissionStatus.PAID:
            record["commissions_paid_usd"] = round(amount, 2)

    return [months[m] for m in range(1, 13)]


async def get_admin_marketer_stats(org_id: int, db_session: Session) -> dict:
    """
    Admin summary: marketer counts by status, total paid to marketers, and the
    top-10 leaderboard by students referred (denormalized counters).
    """
    status_rows = db_session.exec(
        select(Marketer.status, func.count(Marketer.id))
        .where(Marketer.org_id == org_id)
        .group_by(Marketer.status)
    ).all()
    status_counts = {row[0]: row[1] for row in status_rows}

    total_paid = (
        db_session.exec(
            select(
                func.coalesce(func.sum(ReferralCommission.commission_amount), 0.0)
            ).where(
                and_(
                    ReferralCommission.org_id == org_id,
                    ReferralCommission.commission_type == CommissionType.MARKETER,
                    ReferralCommission.status == CommissionStatus.PAID,
                )
            )
        ).first()
        or 0.0
    )

    leaderboard = await get_marketer_leaderboard(org_id, 10, db_session)

    return {
        "total_marketers": sum(status_counts.values()),
        "active_marketers": status_counts.get(MarketerStatus.ACTIVE, 0),
        "pending_marketers": status_counts.get(MarketerStatus.PENDING_APPROVAL, 0),
        "suspended_marketers": status_counts.get(MarketerStatus.SUSPENDED, 0),
        "rejected_marketers": status_counts.get(MarketerStatus.REJECTED, 0),
        "total_commissions_paid_usd": round(total_paid, 2),
        "leaderboard": leaderboard,
    }


async def get_marketer_leaderboard(
    org_id: int, limit: int, db_session: Session
) -> list:
    """Top marketers by students referred — reads denormalized counters,
    users batch-fetched (no N+1)"""
    marketers = db_session.exec(
        select(Marketer)
        .where(Marketer.org_id == org_id)
        .order_by(Marketer.total_students_referred.desc())
        .limit(limit)
    ).all()

    user_ids = [m.user_id for m in marketers]
    user_map = {}
    code_map = {}
    if user_ids:
        users = db_session.exec(select(User).where(User.id.in_(user_ids))).all()
        user_map = {u.id: u for u in users}
        code_ids = [m.referral_code_id for m in marketers if m.referral_code_id]
        if code_ids:
            codes = db_session.exec(
                select(ReferralCode).where(ReferralCode.id.in_(code_ids))
            ).all()
            code_map = {c.id: c for c in codes}

    return [
        {
            "rank": i + 1,
            "marketer_id": m.id,
            "name": (
                f"{user_map[m.user_id].first_name} {user_map[m.user_id].last_name}"
                if m.user_id in user_map
                else "Unknown"
            ),
            "email": user_map[m.user_id].email if m.user_id in user_map else None,
            "referral_code": (
                code_map[m.referral_code_id].code
                if m.referral_code_id and m.referral_code_id in code_map
                else None
            ),
            "status": m.status,
            "students_referred": m.total_students_referred,
            "courses_sold": m.total_courses_sold,
            "total_earned_usd": round(m.total_earned_usd, 2),
            "total_paid_usd": round(m.total_paid_usd, 2),
            "balance_due_usd": round(m.total_earned_usd - m.total_paid_usd, 2),
        }
        for i, m in enumerate(marketers)
    ]


async def refresh_marketer_counters(marketer_id: int, db_session: Session) -> None:
    """
    Recompute and persist the denormalized Marketer counters.
    Called by the daily background job and after payout completion.
    """
    marketer = db_session.get(Marketer, marketer_id)
    if not marketer:
        return

    total_students = (
        db_session.exec(
            select(func.count(func.distinct(ReferralTracking.referred_user_id))).where(
                ReferralTracking.referrer_user_id == marketer.user_id
            )
        ).first()
        or 0
    )

    rows = db_session.exec(
        select(
            ReferralCommission.status,
            func.count(ReferralCommission.id),
            func.coalesce(func.sum(ReferralCommission.commission_amount), 0.0),
        )
        .where(
            and_(
                ReferralCommission.referrer_user_id == marketer.user_id,
                ReferralCommission.org_id == marketer.org_id,
            )
        )
        .group_by(ReferralCommission.status)
    ).all()

    total_courses = 0
    total_earned = 0.0
    total_paid = 0.0
    for commission_status, count, amount in rows:
        if commission_status != CommissionStatus.FORFEITED:
            total_courses += count
            total_earned += amount
        if commission_status == CommissionStatus.PAID:
            total_paid = amount

    marketer.total_students_referred = total_students
    marketer.total_courses_sold = total_courses
    marketer.total_earned_usd = round(total_earned, 2)
    marketer.total_paid_usd = round(total_paid, 2)
    marketer.update_date = datetime.now(timezone.utc)
    db_session.add(marketer)
    db_session.commit()
