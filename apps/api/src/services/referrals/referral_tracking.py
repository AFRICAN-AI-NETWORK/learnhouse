"""
Referral Tracking Service - Tracks signups with fraud detection
Implements multi-factor fraud detection (IP + device fingerprint)
"""
import logging
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, Request, status
from sqlmodel import Session, select, and_, func
from src.db.referrals.referral_tracking import (
    ReferralTracking,
    ReferralTrackingCreate,
)
from src.db.referrals.referral_codes import ReferralCode
from src.db.users import User

logger = logging.getLogger(__name__)

# Fraud detection thresholds
IP_FRAUD_THRESHOLD = 5  # Flag if >5 signups from same IP per day
DEVICE_FRAUD_THRESHOLD = 3  # Flag if same device used for >3 referrals
FRAUD_SCORE_REVIEW_THRESHOLD = 75  # Score above which commission needs review
FRAUD_SCORE_HIGH_RISK = 90  # Score indicating high fraud probability


def extract_ip_address(request: Request) -> str:
    """
    Extract IP address from request (DRY utility)
    Handles X-Forwarded-For header for proxies
    
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
    db_session: Session
) -> int:
    """
    Calculate fraud risk score based on multiple factors (Core logic - DRY)
    
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
    
    # Check IP + device combination
    if device_id:
        same_ip_device_statement = select(func.count(ReferralTracking.id)).where(
            and_(
                ReferralTracking.ip_address == ip_address,
                ReferralTracking.device_id == device_id
            )
        )
        same_ip_device_count = db_session.exec(same_ip_device_statement).first() or 0
        if same_ip_device_count > 0:
            score += 50  # High risk: exact duplicate
            logger.warning(f"Fraud risk: Same IP+device combination found {same_ip_device_count} times")
    
    # Check same IP, different devices
    same_ip_statement = select(func.count(ReferralTracking.id)).where(
        ReferralTracking.ip_address == ip_address
    )
    same_ip_count = db_session.exec(same_ip_statement).first() or 0
    if same_ip_count > IP_FRAUD_THRESHOLD:
        score += 20
        logger.warning(f"Fraud risk: IP {ip_address} used {same_ip_count} times")
    
    # Check same device, different IPs
    if device_id:
        same_device_statement = select(func.count(ReferralTracking.id)).where(
            ReferralTracking.device_id == device_id
        )
        same_device_count = db_session.exec(same_device_statement).first() or 0
        if same_device_count > DEVICE_FRAUD_THRESHOLD:
            score += 30
            logger.warning(f"Fraud risk: Device {device_id[:8]}... used {same_device_count} times")
        elif same_device_count > 0:
            score += 10  # Low risk: could be legitimate
    
    logger.info(f"Fraud risk score: {score}")
    
    return score


async def create_referral_tracking(
    referred_user_id: int,
    referral_code_id: int,
    referrer_user_id: int,
    ip_address: str,
    device_id: Optional[str],
    browser_fingerprint: dict,
    db_session: Session
) -> ReferralTracking:
    """
    Create referral tracking record (Core logic - DRY)
    Prevents duplicate tracking for same user
    
    Args:
        referred_user_id: Referred user ID
        referral_code_id: ReferralCode ID
        referrer_user_id: Referrer user ID
        ip_address: IP address
        device_id: Device fingerprint hash
        browser_fingerprint: Full browser fingerprint data
        db_session: Database session
        
    Returns:
        ReferralTracking
        
    Raises:
        HTTPException: If user already has referral tracking
    """
    # Check if user already has referral tracking (prevents multiple referral codes)
    existing_statement = select(ReferralTracking).where(
        ReferralTracking.referred_user_id == referred_user_id
    )
    existing = db_session.exec(existing_statement).first()
    
    if existing:
        logger.info(f"User {referred_user_id} already has referral tracking - using first referral only")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already referred with a different code"
        )
    
    # Create tracking record
    tracking = ReferralTracking(
        referred_user_id=referred_user_id,
        referral_code_id=referral_code_id,
        referrer_user_id=referrer_user_id,
        ip_address=ip_address,
        device_id=device_id,
        browser_fingerprint=browser_fingerprint,
        registration_complete=True,
        signup_date=datetime.now(),
        creation_date=datetime.now()
    )
    
    db_session.add(tracking)
    db_session.commit()
    db_session.refresh(tracking)
    
    logger.info(f"Created referral tracking for user {referred_user_id} with code {referral_code_id}")
    
    return tracking


async def validate_and_track_referral(
    request: Request,
    referred_user_id: int,
    referral_code: str,
    device_id: Optional[str],
    browser_fingerprint: dict,
    db_session: Session
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
    
    # Validate referral code exists and is active
    from src.services.referrals.referral_codes import validate_referral_code_exists
    referral_code_obj = await validate_referral_code_exists(referral_code, db_session)
    
    # Prevent self-referral
    if referral_code_obj.referrer_user_id == referred_user_id:
        logger.warning(f"User {referred_user_id} attempted self-referral")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot use your own referral code"
        )
    
    # Calculate fraud risk score
    fraud_score = await calculate_fraud_risk_score(
        ip_address,
        device_id,
        referral_code_obj.id,
        db_session
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
            db_session=db_session
        )
    except HTTPException:
        # User already has referral tracking - allow signup to continue
        logger.info(f"User {referred_user_id} already tracked with different code")
    
    return referral_code_obj, fraud_score
