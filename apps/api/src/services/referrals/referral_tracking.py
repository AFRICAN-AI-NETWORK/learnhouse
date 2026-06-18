"""
Referral Tracking Service - Tracks signups with fraud detection
Implements multi-factor fraud detection (IP + device fingerprint)
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Request, status
from sqlmodel import Session, select, and_, func, case
from src.db.referrals.referral_tracking import (
    ReferralTracking,
)
from src.db.referrals.referral_codes import ReferralCode
from src.services.referrals.referral_codes import validate_referral_code_exists

logger = logging.getLogger(__name__)

# Fraud detection thresholds
IP_FRAUD_THRESHOLD = 5
DEVICE_FRAUD_THRESHOLD = 3
FRAUD_SCORE_REVIEW_THRESHOLD = 75
FRAUD_SCORE_HIGH_RISK = 90
FRAUD_TIME_WINDOW_HOURS = 48


def extract_ip_address(request: Request) -> str:
    """
    Extract IP address from request (DRY utility)
    Handles X-Forwarded-For header for proxies

    SECURITY NOTE: X-Forwarded-For can be spoofed by malicious clients.
    Ensure your load balancer/proxy (nginx, CloudFlare, etc.) is configured
    to strip untrusted X-Forwarded-For headers and set them correctly.

    Args:
        request: FastAPI request

    Returns:
        IP address string
    """
    # Check X-Forwarded-For header first (for proxies/load balancers)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP if multiple are present
        return forwarded_for.split(",")[0].strip()

    # Fall back to direct client IP
    if request.client:
        return request.client.host

    return "unknown"


async def calculate_fraud_risk_score(
    ip_address: str,
    device_id: Optional[str],
    referral_code_id: int,
    db_session: Session,
) -> int:
    """
    Calculate fraud risk score based on multiple factors
    Uses single optimized query with temporal window to prevent false positives

    Scoring:
    - Same IP + same device = +50 points
    - Same IP, different device = +20 points
    - Same device, different IP = +10 points
    - Device used for >3 referrals = +30 points
    - IP used for >5 signups = +20 points

    Args:
        ip_address: IP address
        device_id: Device fingerprint hash
        referral_code_id: ReferralCode ID
        db_session: Database session

    Returns:
        Risk score (0-100+)
    """
    score = 0

    time_threshold = datetime.now() - timedelta(hours=FRAUD_TIME_WINDOW_HOURS)

    statement = select(
        # Count same IP + same device (exact duplicate)
        func.sum(
            case(
                (
                    and_(
                        ReferralTracking.ip_address == ip_address,
                        ReferralTracking.device_id == device_id,
                        ReferralTracking.signup_date >= time_threshold,
                    ),
                    1,
                ),
                else_=0,
            )
        ).label("ip_device_count"),
        # Count same IP (any device)
        func.sum(
            case(
                (
                    and_(
                        ReferralTracking.ip_address == ip_address,
                        ReferralTracking.signup_date >= time_threshold,
                    ),
                    1,
                ),
                else_=0,
            )
        ).label("ip_count"),
        # Count same device (any IP)
        func.sum(
            case(
                (
                    and_(
                        ReferralTracking.device_id == device_id,
                        ReferralTracking.signup_date >= time_threshold,
                    ),
                    1,
                ),
                else_=0,
            )
        ).label("device_count"),
    )

    result = db_session.exec(statement).first()

    if not result:
        return 0

    ip_device_count = result[0] or 0
    ip_count = result[1] or 0
    device_count = result[2] or 0

    # Analyze results and calculate score
    if device_id and ip_device_count > 0:
        score += 50  # High risk: exact duplicate (same IP + device)
        logger.warning(
            f"Fraud risk: Same IP+device combination found {ip_device_count} times "
            f"in last {FRAUD_TIME_WINDOW_HOURS}h"
        )

    if ip_count > IP_FRAUD_THRESHOLD:
        score += 20
        logger.warning(
            f"Fraud risk: IP {ip_address} used {ip_count} times "
            f"in last {FRAUD_TIME_WINDOW_HOURS}h (threshold: {IP_FRAUD_THRESHOLD})"
        )

    if device_id:
        if device_count > DEVICE_FRAUD_THRESHOLD:
            score += 30
            logger.warning(
                f"Fraud risk: Device {device_id[:8]}... used {device_count} times "
                f"in last {FRAUD_TIME_WINDOW_HOURS}h (threshold: {DEVICE_FRAUD_THRESHOLD})"
            )
        elif device_count > 0:
            score += 10

    logger.info(f"Fraud risk score: {score} (optimized single-query check)")

    return score


async def create_referral_tracking(
    referred_user_id: int,
    referral_code_id: int,
    referrer_user_id: int,
    ip_address: str,
    device_id: Optional[str],
    browser_fingerprint: dict,
    db_session: Session,
    fraud_score: int = 0,
) -> ReferralTracking:
    """
    One referred user can only use ONE referral code (prevents gaming the system)

    Args:
        referred_user_id: Referred user ID (the person who was referred)
        referral_code_id: ReferralCode ID
        referrer_user_id: Referrer user ID (the person who referred others)
        ip_address: IP address
        device_id: Device fingerprint hash
        browser_fingerprint: Full browser fingerprint data
        db_session: Database session

    Returns:
        ReferralTracking

    Raises:
        HTTPException: If this referred user already used a different referral code
    """

    existing_statement = select(ReferralTracking).where(
        ReferralTracking.referred_user_id == referred_user_id
    )
    existing = db_session.exec(existing_statement).first()

    if existing:
        logger.info(
            f"Referred user {referred_user_id} already used a referral code - "
            f"first referral code takes priority (prevents gaming)"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already referred with a different code",
        )

    # Create tracking record
    tracking = ReferralTracking(
        referred_user_id=referred_user_id,
        referral_code_id=referral_code_id,
        referrer_user_id=referrer_user_id,
        ip_address=ip_address,
        device_id=device_id,
        browser_fingerprint=browser_fingerprint,
        fraud_score=fraud_score,
        registration_complete=True,
        signup_date=datetime.now(),
        creation_date=datetime.now(),
    )

    db_session.add(tracking)
    db_session.commit()
    db_session.refresh(tracking)

    logger.info(
        f"Created referral tracking: Referrer {referrer_user_id} successfully referred "
        f"user {referred_user_id} with code {referral_code_id}"
    )

    return tracking


async def validate_and_track_referral(
    request: Request,
    referred_user_id: int,
    referral_code: str,
    device_id: Optional[str],
    browser_fingerprint: dict,
    db_session: Session,
) -> tuple[ReferralCode, int]:
    """
    Validate referral code and create tracking with fraud detection
    Returns referral code and fraud risk score

    Args:
        request: FastAPI request
        referred_user_id: Referred user ID
        referral_code: Referral code string
        device_id: Device fingerprint hash
        browser_fingerprint: Full browser fingerprint data
        db_session: Database session

    Returns:
        Tuple of (ReferralCode, fraud_risk_score)

    Raises:
        HTTPException: If validation fails
    """
    # Extract IP address
    ip_address = extract_ip_address(request)

    # Validate referral code exists and is active (imported at top to avoid circular dependency)
    referral_code_obj = await validate_referral_code_exists(referral_code, db_session)

    # Prevent self-referral
    if referral_code_obj.referrer_user_id == referred_user_id:
        logger.warning(f"User {referred_user_id} attempted self-referral")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot use your own referral code",
        )

    # Calculate fraud risk score
    fraud_score = await calculate_fraud_risk_score(
        ip_address, device_id, referral_code_obj.id, db_session
    )

    # Create tracking record
    try:
        await create_referral_tracking(
            referred_user_id=referred_user_id,
            referral_code_id=referral_code_obj.id,
            referrer_user_id=referral_code_obj.referrer_user_id,
            ip_address=ip_address,
            device_id=device_id,
            browser_fingerprint=browser_fingerprint,
            db_session=db_session,
            fraud_score=fraud_score,
        )
    except HTTPException:
        # User already has referral tracking - allow signup to continue
        logger.info(f"User {referred_user_id} already tracked with different code")

    return referral_code_obj, fraud_score
