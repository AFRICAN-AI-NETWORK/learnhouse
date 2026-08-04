import logging
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import HTTPException, Request, status
from sqlmodel import Session, select

from src.db.organizations import Organization, OrganizationRead
from src.db.payments.payments_products import PaymentsProduct
from src.db.user_organizations import UserOrganization
from src.db.users import User, UserCreate, UserRead
from src.db.waitlist import (WaitlistConfig, WaitlistCoursePreference,
                             WaitlistStatusEnum)
from src.security.features_utils.usage import (check_limits_with_usage,
                                               increase_feature_usage)
from src.security.security import security_hash_password
from src.services.users.emails import send_account_creation_email
from src.services.users.users import generate_verification_token
from src.services.waitlist.emails import send_waitlist_confirmation_email

logger = logging.getLogger(__name__)


async def create_waitlist_user(
    request: Request,
    db_session: Session,
    user_object: UserCreate,
    waitlist_uuid: str,
    selected_product_ids: List[int] = [],
) -> UserRead:
    """
    Create a new user who joins via waitlist invite link.
    Handles complete flow: validation, user creation, course preferences, org linking.

    Args:
        request: FastAPI request object
        db_session: Database session
        user_object: User creation data
        waitlist_uuid: UUID of the waitlist campaign
        selected_product_ids: List of product IDs the user is interested in

    Returns:
        UserRead: Created user object

    Raises:
        HTTPException: Various validation and creation errors
    """

    # ========== 1. VALIDATION PHASE ==========

    # Verify waitlist exists and is ACTIVE
    waitlist_query = select(WaitlistConfig).where(
        WaitlistConfig.waitlist_uuid == waitlist_uuid,
        WaitlistConfig.status == WaitlistStatusEnum.ACTIVE.value,
    )
    waitlist = db_session.exec(waitlist_query).first()

    if not waitlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Waitlist not found or no longer active",
        )

    # Verify launch datetime hasn't passed (UTC-aware comparison)
    try:
        from datetime import timezone as tz

        # Parse launch_datetime with timezone awareness
        launch_dt = datetime.fromisoformat(
            waitlist.launch_datetime.replace("Z", "+00:00")
        )
        if launch_dt.tzinfo is None:
            launch_dt = launch_dt.replace(tzinfo=tz.utc)
        else:
            launch_dt = launch_dt.astimezone(tz.utc)
        # Get current time in UTC for consistent comparison
        current_time_utc = datetime.now(tz.utc)
        if current_time_utc >= launch_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This waitlist has already launched. Registration is closed.",
            )
    except ValueError as e:
        logger.warning(
            "Warning: Failed to parse launch_datetime for waitlist %s: %s. Allowing registration to proceed.",
            waitlist.waitlist_uuid,
            e,
        )
        pass  # If datetime parsing fails, continue anyway

    # Resolve org_id from waitlist (NOT user-provided)
    org_id = waitlist.org_id

    # Verify organization exists and is active
    org_query = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(org_query).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization does not exist",
        )

    # Usage check - ensure org hasn't exceeded member limits
    check_limits_with_usage("members", org_id, db_session)

    # Verify username is unique
    username_query = select(User).where(User.username == user_object.username)
    if db_session.exec(username_query).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists"
        )

    # Verify email is unique
    email_query = select(User).where(User.email == user_object.email)
    if db_session.exec(email_query).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists"
        )

    # Verify password meets requirements (minimum 8 characters)
    if len(user_object.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long",
        )

    # Referral system: Validate disposable email
    if user_object.referral_code:
        from src.services.referrals.fraud_prevention import \
            validate_email_for_referral

        is_valid, error_msg = await validate_email_for_referral(
            user_object.email, db_session
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )

    # ========== 2. USER CREATION PHASE ==========

    user = User.model_validate(user_object)

    # Hash password
    user.password = security_hash_password(user_object.password)

    # Generate unique user_uuid
    user.user_uuid = f"user_{uuid4()}"

    # Set email verification status to false (users must verify email)
    user.email_verified = False

    # Set user_status to WAITLIST (blocks login until countdown ends)
    # This is set immediately because we know this is a waitlist registration
    user.user_status = "WAITLIST"

    # Store waitlist information
    user.waitlist_interest = user_object.waitlist_interest or waitlist.interest_category
    user.waitlist_joined_date = str(datetime.now())

    # Set timestamps
    user.creation_date = str(datetime.now())
    user.update_date = str(datetime.now())

    # Add user to database
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Referral system: Track referral if code provided
    if user_object.referral_code:
        try:
            from src.services.referrals.referral_tracking import \
                validate_and_track_referral

            referral_code_obj, fraud_score = await validate_and_track_referral(
                request=request,
                referred_user_id=user.id,
                referral_code=user_object.referral_code,
                device_id=user_object.device_id,
                browser_fingerprint=user_object.browser_fingerprint or {},
                db_session=db_session,
            )

            # Log fraud score
            if fraud_score >= 75:
                from src.services.referrals.referral_tracking import logger

                logger.warning(
                    f"High fraud risk score {fraud_score} for user {user.id} "
                    f"with referral code {user_object.referral_code}"
                )
        except HTTPException as e:
            # Log referral validation error but allow signup to continue
            from src.services.referrals.referral_tracking import logger

            logger.warning(f"Referral validation failed for user {user.id}: {e.detail}")
        except Exception as e:
            # Log unexpected errors but don't block signup
            from src.services.referrals.referral_tracking import logger

            logger.error(
                f"Unexpected error tracking referral for user {user.id}: {str(e)}"
            )

    # ========== 3. COURSE PREFERENCE STORAGE PHASE ==========

    if selected_product_ids:
        for product_id in selected_product_ids:
            # Validate product exists and belongs to same organization
            product_query = select(PaymentsProduct).where(
                PaymentsProduct.id == product_id, PaymentsProduct.org_id == org_id
            )
            product = db_session.exec(product_query).first()

            if not product:
                # Log warning but don't fail - continue with other preferences
                print(
                    f"Warning: Product {product_id} not found or doesn't belong to org {org_id}"
                )
                continue

            # Create product preference record
            preference = WaitlistCoursePreference(
                user_id=user.id,
                payments_product_id=product_id,
                waitlist_config_id=waitlist.id,
                org_id=org_id,
                creation_date=str(datetime.now()),
            )

            db_session.add(preference)

        db_session.commit()

    # ========== 4. ORGANIZATION LINKING PHASE ==========

    # Link user to organization with default learner role (role_id=4)
    user_organization = UserOrganization(
        user_id=user.id if user.id else 0,
        org_id=org_id,
        role_id=4,  # Learner role
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )

    db_session.add(user_organization)
    db_session.commit()
    db_session.refresh(user_organization)

    # Increment organization's member usage counter
    increase_feature_usage("members", org_id, db_session)

    # ========== 5. EMAIL NOTIFICATION PHASE ==========

    # Generate verification token
    verification_token = generate_verification_token(
        user_email=user.email, user_id=user.id, org_slug=org.slug
    )

    # Send account creation email with verification link
    send_account_creation_email(
        user=UserRead.model_validate(user),
        email=user.email,
        organization=OrganizationRead.model_validate(org),
        verification_token=verification_token,
    )

    # Send waitlist confirmation email with proper organization details
    send_waitlist_confirmation_email(
        user=UserRead.model_validate(user),
        email=user.email,
        organization=OrganizationRead.model_validate(org),
        waitlist_config=waitlist,
    )

    # ========== 6. DATABASE TRACKING PHASE ==========

    # Increment waitlist registration counter
    waitlist.total_registrations += 1
    db_session.add(waitlist)
    db_session.commit()

    # Return user as UserRead
    return UserRead.model_validate(user)


async def get_waitlist_users(
    request: Request,
    db_session: Session,
    waitlist_uuid: str,
    skip: int = 0,
    limit: int = 100,
) -> List[UserRead]:
    """
    Get all users registered on a specific waitlist.
    Admin-only function with RBAC check.

    Args:
        request: FastAPI request object
        db_session: Database session
        waitlist_uuid: UUID of the waitlist campaign
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return

    Returns:
        List[UserRead]: List of users on the waitlist
    """

    # Get waitlist config
    waitlist_query = select(WaitlistConfig).where(
        WaitlistConfig.waitlist_uuid == waitlist_uuid
    )
    waitlist = db_session.exec(waitlist_query).first()

    if not waitlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist not found"
        )

    # Get all users with matching waitlist_interest and WAITLIST status
    users_query = (
        select(User)
        .where(
            User.waitlist_interest == waitlist.interest_category,
            User.user_status == "WAITLIST",
        )
        .offset(skip)
        .limit(limit)
    )

    users = db_session.exec(users_query).all()

    return [UserRead.model_validate(user) for user in users]


async def get_waitlist_user_course_preferences(
    request: Request,
    db_session: Session,
    waitlist_uuid: str,
    user_id: Optional[int] = None,
) -> List[dict]:
    """
    Get course preferences for waitlist analytics.

    Args:
        request: FastAPI request object
        db_session: Database session
        waitlist_uuid: UUID of the waitlist campaign
        user_id: Optional user ID to get preferences for specific user

    Returns:
        List[dict]: Course preferences with details
    """

    # Get waitlist config
    waitlist_query = select(WaitlistConfig).where(
        WaitlistConfig.waitlist_uuid == waitlist_uuid
    )
    waitlist = db_session.exec(waitlist_query).first()

    if not waitlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist not found"
        )

    # Build query for preferences
    if user_id:
        # Get preferences for specific user
        prefs_query = (
            select(WaitlistCoursePreference, PaymentsProduct)
            .join(
                PaymentsProduct,
                WaitlistCoursePreference.payments_product_id == PaymentsProduct.id,
            )
            .where(
                WaitlistCoursePreference.waitlist_config_id == waitlist.id,
                WaitlistCoursePreference.user_id == user_id,
            )
        )
    else:
        # Get all preferences for this waitlist (aggregated)
        prefs_query = (
            select(WaitlistCoursePreference, PaymentsProduct)
            .join(
                PaymentsProduct,
                WaitlistCoursePreference.payments_product_id == PaymentsProduct.id,
            )
            .where(WaitlistCoursePreference.waitlist_config_id == waitlist.id)
        )

    preferences = db_session.exec(prefs_query).all()

    # Format response
    result = []
    for pref, product in preferences:
        result.append(
            {
                "preference_id": pref.id,
                "user_id": pref.user_id,
                "payments_product_id": pref.payments_product_id,
                "product_name": product.name,
                "creation_date": pref.creation_date,
            }
        )

    return result
