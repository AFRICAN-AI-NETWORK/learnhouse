import os
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import uuid4

import jwt
from fastapi import HTTPException, Request, UploadFile, status
from sqlmodel import Session, select

from src.db.organizations import Organization, OrganizationRead
from src.db.roles import Role, RoleRead
from src.db.user_organizations import UserOrganization
from src.db.users import (
    AnonymousUser,
    InternalUser,
    PublicUser,
    User,
    UserCreate,
    UserRead,
    UserRoleWithOrg,
    UserSession,
    UserUpdate,
    UserUpdatePassword,
)
from src.security.features_utils.usage import (
    check_limits_with_usage,
    increase_feature_usage,
)
from src.security.rbac.rbac import (
    authorization_verify_based_on_roles_and_authorship,
    authorization_verify_if_user_is_anon,
)
from src.security.security import security_hash_password, security_verify_password
from src.services.orgs.invites import get_invite_code
from src.services.users.avatars import upload_avatar
from src.services.users.emails import send_account_creation_email
from src.services.users.usergroups import add_users_to_usergroup


# JWT Verification Token Functions
def generate_verification_token(user_email: str, user_id: int, org_slug: str) -> str:
    """Generate a JWT token for email verification"""
    secret = os.getenv(
        "JWT_VERIFICATION_TOKEN_SECRET", "your-secret-key-change-in-production"
    )
    expiry = datetime.now(UTC) + timedelta(days=7)  # Token valid for 7 days

    payload = {
        "email": user_email,
        "user_id": user_id,
        "org_slug": org_slug,
        "exp": expiry,
        "type": "email_verification",
    }

    token = jwt.encode(payload, secret, algorithm="HS256")

    # FIX: Ensure token is a string, not bytes
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return token


def verify_verification_token(token: str) -> dict:
    """Verify and decode a JWT verification token"""
    secret = os.getenv(
        "JWT_VERIFICATION_TOKEN_SECRET", "your-secret-key-change-in-production"
    )

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])

        # Check if token is for email verification
        if payload.get("type") != "email_verification":
            raise HTTPException(status_code=400, detail="Invalid token type")

        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=400,
            detail="Verification token has expired. Please request a new one.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid verification token")


async def verify_user_email(
    request: Request,
    db_session: Session,
    token: str,
) -> dict:
    """Verify user's email using the verification token"""

    # Decode and verify token
    payload = verify_verification_token(token)

    user_id = payload.get("user_id")
    email = payload.get("email")

    # Get user from database
    statement = select(User).where(User.id == user_id, User.email == email)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    # Check if already verified
    if user.email_verified:
        return {"message": "Email already verified", "already_verified": True}

    # Mark email as verified
    user.email_verified = True
    user.update_date = str(datetime.now(UTC))

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    return {
        "message": "Email verified successfully",
        "already_verified": False,
        "user": UserRead.model_validate(user),
    }


async def create_user(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    user_object: UserCreate,
    org_id: int,
):
    user = User.model_validate(user_object)

    # RBAC check
    await rbac_check(request, current_user, "create", "user_x", db_session)

    # Complete the user object
    import random
    user.user_uuid = f"user_{uuid4()}"
    user.password = security_hash_password(user_object.password)
    user.email_verified = False
    user.creation_date = str(datetime.now(UTC))
    user.update_date = str(datetime.now(UTC))
    user.verification_otp = str(random.randint(100000, 999999))
    user.verification_otp_expiry = str(datetime.now(UTC) + timedelta(minutes=30))

    # Verifications

    # Check if Organization exists
    statement = select(Organization).where(Organization.id == org_id)
    result = db_session.exec(statement)
    org = result.first()

    if not org:
        raise HTTPException(
            status_code=400,
            detail="Organization does not exist",
        )

    # Usage check
    check_limits_with_usage("members", org_id, db_session)

    # Username
    statement = select(User).where(User.username == user.username)
    result = db_session.exec(statement)

    if result.first():
        raise HTTPException(
            status_code=400,
            detail="Username already exists",
        )

    # Email
    statement = select(User).where(User.email == user.email)
    result = db_session.exec(statement)

    if result.first():
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    # Referral system: Validate disposable email
    if user_object.referral_code:
        from src.services.referrals.fraud_prevention import validate_email_for_referral

        is_valid, error_msg = await validate_email_for_referral(user.email, db_session)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail=error_msg,
            )

    # Exclude unset values
    user_data = user.dict(exclude_unset=True)
    for key, value in user_data.items():
        setattr(user, key, value)

    # Add user to database
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Referral system: Track referral if code provided
    if user_object.referral_code:
        try:
            from src.services.referrals.referral_tracking import (
                validate_and_track_referral,
            )

            _referral_code_obj, fraud_score = await validate_and_track_referral(
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
        except Exception as e:  # noqa: BLE001
            # Log unexpected errors but don't block signup
            from src.services.referrals.referral_tracking import logger

            logger.error(
                f"Unexpected error tracking referral for user {user.id}: {e!s}"
            )

    # Link user and organization
    # Determine role_id based on signup_type
    target_role_id = 4  # Default: User
    if getattr(user_object, "signup_type", "student") == "partner":
        partner_role_statement = select(Role).where(Role.role_uuid == "partner_role")
        partner_role = db_session.exec(partner_role_statement).first()
        if partner_role:
            target_role_id = partner_role.id
        else:
            # Fallback if role doesn't exist for some reason
            target_role_id = 4

    user_organization = UserOrganization(
        user_id=user.id if user.id else 0,
        org_id=int(org_id),
        role_id=target_role_id,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )

    db_session.add(user_organization)
    db_session.commit()
    db_session.refresh(user_organization)

    user = UserRead.model_validate(user)

    increase_feature_usage("members", org_id, db_session)

    # Generate verification token
    verification_token = generate_verification_token(
        user_email=user.email, user_id=user.id, org_slug=org.slug
    )

    # Send Account creation email with verification token and OTP
    send_account_creation_email(
        user=user,
        email=user.email,
        organization=OrganizationRead.model_validate(org),
        verification_token=verification_token,
        otp_code=user.verification_otp,
    )

    return user


async def create_user_with_invite(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    user_object: UserCreate,
    org_id: int,
    invite_code: str,
):
    # Check if invite code exists
    inviteCode = await get_invite_code(
        request, org_id, invite_code, current_user, db_session
    )

    if not inviteCode:
        raise HTTPException(
            status_code=400,
            detail="Invite code is incorrect",
        )

    # Usage check
    check_limits_with_usage("members", org_id, db_session)

    user = await create_user(request, db_session, current_user, user_object, org_id)

    # Check if invite code contains UserGroup
    if inviteCode.get("usergroup_id"):  # type: ignore
        # Add user to UserGroup
        await add_users_to_usergroup(
            request,
            db_session,
            InternalUser(id=0),
            int(inviteCode.get("usergroup_id")),  # type: ignore / Convert to int since usergroup_id is expected to be int
            str(user.id),
        )

    increase_feature_usage("members", org_id, db_session)

    return user


async def create_user_without_org(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    user_object: UserCreate,
):
    user = User.model_validate(user_object)

    # RBAC check
    await rbac_check(request, current_user, "create", "user_x", db_session)

    # Complete the user object
    user.user_uuid = f"user_{uuid4()}"
    user.password = security_hash_password(user_object.password)
    user.email_verified = False
    user.creation_date = str(datetime.now(UTC))
    user.update_date = str(datetime.now(UTC))

    # Verifications

    # Username
    statement = select(User).where(User.username == user.username)
    result = db_session.exec(statement)

    if result.first():
        raise HTTPException(
            status_code=400,
            detail="Username already exists",
        )

    # Email
    statement = select(User).where(User.email == user.email)
    result = db_session.exec(statement)

    if result.first():
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    # Exclude unset values
    user_data = user.dict(exclude_unset=True)
    for key, value in user_data.items():
        setattr(user, key, value)

    # Add user to database
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    user = UserRead.model_validate(user)

    # Send Account creation email without verification (no org)
    send_account_creation_email(
        user=user,
        email=user.email,
        organization=None,
        verification_token=None,
    )

    return user


async def update_user(
    request: Request,
    db_session: Session,
    user_id: int,
    current_user: PublicUser | AnonymousUser,
    user_object: UserUpdate,
):
    # Get user
    statement = select(User).where(User.id == user_id)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="User does not exist",
        )

    # RBAC check
    await rbac_check(request, current_user, "update", user.user_uuid, db_session)

    # Verifications

    # Username
    statement = select(User).where(User.username == user_object.username)
    username_user = db_session.exec(statement).first()

    if username_user:
        isSameUser = username_user.id == current_user.id
        if not isSameUser:
            raise HTTPException(
                status_code=400,
                detail="Username already exists",
            )

    # Email
    statement = select(User).where(User.email == user_object.email)
    email_user = db_session.exec(statement).first()

    if email_user:
        isSameUser = email_user.id == current_user.id
        if not isSameUser:
            raise HTTPException(
                status_code=400,
                detail="Email already exists",
            )

    # Update user
    user_data = user_object.dict(exclude_unset=True)
    for key, value in user_data.items():
        setattr(user, key, value)

    user.update_date = str(datetime.now(UTC))

    # Update user in database
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    user = UserRead.model_validate(user)

    return user


async def update_user_avatar(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    avatar_file: UploadFile | None = None,
):
    # Get user
    statement = select(User).where(User.id == current_user.id)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="User does not exist",
        )

    # RBAC check
    await rbac_check(request, current_user, "update", user.user_uuid, db_session)

    # Upload avatar with security validation
    if avatar_file and avatar_file.filename:
        try:
            name_in_disk = await upload_avatar(avatar_file, user.user_uuid)
            user.avatar_image = name_in_disk
        except Exception as e:  # noqa: BLE001
            raise HTTPException(
                status_code=400,
                detail=f"Avatar upload failed: {e!s}",
            )

    # Update user in database
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    user = UserRead.model_validate(user)

    return user


async def update_user_password(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    user_id: int,
    form: UserUpdatePassword,
):
    # Get user
    statement = select(User).where(User.id == user_id)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="User does not exist",
        )

    # RBAC check
    await rbac_check(request, current_user, "update", user.user_uuid, db_session)

    if not security_verify_password(form.old_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong password"
        )

    # Update user
    user.password = security_hash_password(form.new_password)
    user.update_date = str(datetime.now(UTC))

    # Update user in database
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    user = UserRead.model_validate(user)

    return user


async def read_user_by_id(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    user_id: int,
):
    # Get user
    statement = select(User).where(User.id == user_id)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="User does not exist",
        )

    user = UserRead.model_validate(user)

    return user


async def read_user_by_uuid(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    user_uuid: str,
):
    # Get user
    statement = select(User).where(User.user_uuid == user_uuid)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="User does not exist",
        )

    user = UserRead.model_validate(user)

    return user


async def read_user_by_username(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    username: str,
):
    # Get user
    statement = select(User).where(User.username == username)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="User does not exist",
        )

    user = UserRead.model_validate(user)

    return user


async def get_user_session(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
) -> UserSession:
    # Get user
    statement = select(User).where(User.user_uuid == current_user.user_uuid)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="User does not exist",
        )

    user = UserRead.model_validate(user)

    # Get roles and orgs
    statement = (
        select(UserOrganization)
        .where(UserOrganization.user_id == user.id)
        .join(Organization)
    )
    user_organizations = db_session.exec(statement).all()

    roles = []

    for user_organization in user_organizations:
        role_statement = select(Role).where(Role.id == user_organization.role_id)
        role = db_session.exec(role_statement).first()

        org_statement = select(Organization).where(
            Organization.id == user_organization.org_id
        )
        org = db_session.exec(org_statement).first()

        roles.append(
            UserRoleWithOrg(
                role=RoleRead.model_validate(role),
                org=OrganizationRead.model_validate(org),
            )
        )

    user_session = UserSession(
        user=user,
        roles=roles,
    )

    return user_session


async def authorize_user_action(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    resource_uuid: str,
    action: Literal["create", "read", "update", "delete"],
):
    # Get user
    statement = select(User).where(User.user_uuid == current_user.user_uuid)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="User does not exist",
        )

    # RBAC check
    authorized = await authorization_verify_based_on_roles_and_authorship(
        request, current_user.id, action, resource_uuid, db_session
    )

    if authorized:
        return True
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to perform this action",
        )


async def delete_user_by_id(
    request: Request,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    user_id: int,
):
    # Get user
    statement = select(User).where(User.id == user_id)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="User does not exist",
        )

    # RBAC check
    await rbac_check(request, current_user, "delete", user.user_uuid, db_session)

    # Cleanup UserOrganization first (backup for the DB cascade)
    statement_org = select(UserOrganization).where(UserOrganization.user_id == user_id)
    user_orgs = db_session.exec(statement_org).all()
    for user_org in user_orgs:
        db_session.delete(user_org)

    # Delete user
    db_session.delete(user)
    db_session.commit()

    return "User deleted"


# Utils & Security functions


async def security_get_user(request: Request, db_session: Session, email: str) -> User:
    # Check if user exists
    statement = select(User).where(User.email == email)
    user = db_session.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with Email does not exist",
        )

    user = User(**user.model_dump())

    return user


## 🔒 RBAC Utils ##


async def rbac_check(
    request: Request,
    current_user: PublicUser | AnonymousUser,
    action: Literal["create", "read", "update", "delete"],
    user_uuid: str,
    db_session: Session,
):
    if action == "create" or action == "read":
        if current_user.id == 0:  # if user is anonymous
            return True
        else:
            await authorization_verify_based_on_roles_and_authorship(
                request, current_user.id, "create", "user_x", db_session
            )

    else:
        await authorization_verify_if_user_is_anon(current_user.id)

        # if user is the same as the one being read
        if current_user.user_uuid == user_uuid:
            return True

        await authorization_verify_based_on_roles_and_authorship(
            request, current_user.id, action, user_uuid, db_session
        )


## 🔒 RBAC Utils ##
