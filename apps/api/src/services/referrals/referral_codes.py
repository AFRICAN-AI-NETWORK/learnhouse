"""
Referral Code Service - Core utilities following DRY principles
Handles referral code generation, validation, and retrieval
"""

import logging
import secrets
import string
from datetime import UTC, datetime

from fastapi import HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, and_, select

from config.config import get_learnhouse_config
from src.db.referrals.referral_codes import (
    ReferralCode,
    ReferralCodeRead,
    ReferralCodeStatus,
)
from src.db.users import PublicUser, User

logger = logging.getLogger(__name__)

# Configuration constants
REFERRAL_CODE_LENGTH = 10
REFERRAL_CODE_MAX_ATTEMPTS = 10


def generate_unique_code(length: int = REFERRAL_CODE_LENGTH) -> str:
    """
    Generate a unique alphanumeric referral code (DRY utility)
    Uses cryptographically secure random generation

    Args:
        length: Length of code to generate (default 10)

    Returns:
        Uppercase alphanumeric string
    """
    alphabet = string.ascii_uppercase + string.digits
    # Exclude ambiguous characters: 0, O, I, 1, L
    alphabet = (
        alphabet.replace("0", "")
        .replace("O", "")
        .replace("I", "")
        .replace("1", "")
        .replace("L", "")
    )
    return "".join(secrets.choice(alphabet) for _ in range(length))


def build_referral_link(code: str, base_url: str | None = None) -> str:
    """
    Build referral link from code (DRY utility)

    Args:
        code: Referral code
        base_url: Base application URL (optional, reads from config if not provided)

    Returns:
        Full referral link
    """
    if base_url is None:
        config = get_learnhouse_config()
        base_url = config.hosting_config.app_base_url
    return f"{base_url}/ref/{code}"


async def get_referral_code_by_code(
    code: str, db_session: Session
) -> ReferralCode | None:
    """
    Get referral code by code string (DRY utility)
    Case-insensitive lookup

    Args:
        code: Referral code string
        db_session: Database session

    Returns:
        ReferralCode or None
    """
    statement = select(ReferralCode).where(ReferralCode.code == code.upper())
    return db_session.exec(statement).first()


async def get_referral_code_by_user(
    user_id: int, org_id: int, db_session: Session
) -> ReferralCode | None:
    """
    Get referral code by user ID (DRY utility)

    Args:
        user_id: User ID
        org_id: Organization ID
        db_session: Database session

    Returns:
        ReferralCode or None
    """
    statement = select(ReferralCode).where(
        and_(ReferralCode.referrer_user_id == user_id, ReferralCode.org_id == org_id)
    )
    return db_session.exec(statement).first()


async def validate_referral_code_exists(code: str, db_session: Session) -> ReferralCode:
    """
    Validate referral code exists and is active (DRY utility)

    Args:
        code: Referral code string
        db_session: Database session

    Returns:
        ReferralCode

    Raises:
        HTTPException: If code not found or inactive
    """
    referral_code = await get_referral_code_by_code(code, db_session)

    if not referral_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Referral code not found"
        )

    if referral_code.status != ReferralCodeStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Referral code is inactive"
        )

    return referral_code


async def create_referral_code_for_user(
    request: Request,
    org_id: int,
    user_id: int,
    current_user: PublicUser,
    db_session: Session,
) -> ReferralCode:
    """
    Create a permanent referral code for a user

    Args:
        request: FastAPI request
        org_id: Organization ID
        user_id: User ID
        current_user: Current authenticated user
        db_session: Database session

    Returns:
        ReferralCode

    Raises:
        HTTPException: If user already has a code or code generation fails
    """

    # Check if user already has a referral code
    existing_code = await get_referral_code_by_user(user_id, org_id, db_session)
    if existing_code:
        logger.info(f"User {user_id} already has referral code: {existing_code.code}")
        return existing_code

    # Generate unique code with retries
    code = None
    for attempt in range(REFERRAL_CODE_MAX_ATTEMPTS):
        candidate_code = generate_unique_code()
        existing = await get_referral_code_by_code(candidate_code, db_session)
        if not existing:
            code = candidate_code
            break

    if not code:
        logger.error(
            f"Failed to generate unique referral code after {REFERRAL_CODE_MAX_ATTEMPTS} attempts"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate unique referral code. Please try again.",
        )

    # Get base URL once for efficiency (avoid repeated config reads)
    config = get_learnhouse_config()
    base_url = config.hosting_config.app_base_url

    # Build referral link
    referral_link = build_referral_link(code, base_url)

    # Create referral code
    referral_code = ReferralCode(
        org_id=org_id,
        referrer_user_id=user_id,
        code=code,
        referral_link=referral_link,
        status=ReferralCodeStatus.ACTIVE,
        creation_date=datetime.now(UTC),
        update_date=datetime.now(UTC),
    )

    db_session.add(referral_code)

    # Update user's has_referral_code flag
    user_statement = select(User).where(User.id == user_id)
    user = db_session.exec(user_statement).first()
    if user:
        user.has_referral_code = True
        db_session.add(user)

    try:
        db_session.commit()
        db_session.refresh(referral_code)
    except IntegrityError as e:
        db_session.rollback()
        logger.error(f"Database integrity error creating referral code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create referral code due to uniqueness constraint. Please try again.",
        )

    logger.info(f"Created referral code {code} for user {user_id}")

    return referral_code


async def get_my_referral_code(
    request: Request, org_id: int, current_user: PublicUser, db_session: Session
) -> ReferralCodeRead | None:
    """
    Get current user's referral code

    Args:
        request: FastAPI request
        org_id: Organization ID
        current_user: Current authenticated user
        db_session: Database session

    Returns:
        ReferralCodeRead or None
    """

    referral_code = await get_referral_code_by_user(current_user.id, org_id, db_session)

    if not referral_code:
        return None

    return ReferralCodeRead.model_validate(referral_code)
