from typing import Optional
from sqlmodel import Session, select  # Added 'select' here
from src.core.events.database import get_db_session
from src.db.users import AnonymousUser, PublicUser, User, UserRead
from src.services.users.users import security_get_user
from config.config import get_learnhouse_config
from pydantic import BaseModel
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from src.services.dev.dev import isDevModeEnabled
from src.services.users.users import security_verify_password
from src.security.security import ALGORITHM, SECRET_KEY
from src.db.waitlist import UserStatusEnum

import jwt as pyjwt_lib

if not hasattr(pyjwt_lib.encode, "__wrapped_for_fastapi_jwt_auth__"):
    _original_encode = pyjwt_lib.encode

    class DecodableStr(str):
        def decode(self, *args, **kwargs):
            return self

    def patched_encode(*args, **kwargs):
        result = _original_encode(*args, **kwargs)
        if isinstance(result, str):
            return DecodableStr(result)
        return result

    patched_encode.__wrapped_for_fastapi_jwt_auth__ = True
    pyjwt_lib.encode = patched_encode

from fastapi_jwt_auth import AuthJWT

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


#### JWT Auth ####################################################
class Settings(BaseModel):
    authjwt_secret_key: str = "secret" if isDevModeEnabled() else SECRET_KEY
    authjwt_token_location = {"cookies", "headers"}
    authjwt_cookie_csrf_protect = False
    authjwt_access_token_expires = (
        False if isDevModeEnabled() else timedelta(hours=8).total_seconds()
    )
    authjwt_cookie_samesite = "lax"
    authjwt_cookie_secure = True
    authjwt_cookie_domain = get_learnhouse_config().hosting_config.cookie_config.domain


@AuthJWT.load_config  # type: ignore
def get_config():
    return Settings()


#### JWT Auth ####################################################


#### Classes ####################################################


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


#### Classes ####################################################
async def authenticate_user(
    request: Request, username: str, password: str, db_session: Session
) -> User | bool:
    # Get user (existing code)
    statement = select(User).where(User.email == username)
    user = db_session.exec(statement).first()

    if not user:
        return False

    # Check if password is empty (should not happen, but handle gracefully)
    if not user.password:
        return False

    # Verify password (existing code)
    if not security_verify_password(password, user.password):
        return False

    # NEW: Check if email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. Check your inbox for the verification link.",
        )

    # NEW: Check user status for waitlist handling
    user_status = getattr(user, "user_status", "ACTIVE")

    if user_status == UserStatusEnum.WAITLIST.value:
        # User is on waitlist, cannot login yet
        # Get waitlist details to show launch date
        from src.db.waitlist import WaitlistConfig, WaitlistStatusEnum

        waitlist_interest = getattr(user, "waitlist_interest", None)
        if waitlist_interest:
            waitlist_query = select(WaitlistConfig).where(
                WaitlistConfig.interest_category == waitlist_interest
            )
            waitlist = db_session.exec(waitlist_query).first()
            if waitlist:
                # Check if waitlist is completed or launch time has passed
                is_launched = False
                if waitlist.status == WaitlistStatusEnum.COMPLETED.value:
                    is_launched = True
                else:
                    try:
                        launch_dt = datetime.fromisoformat(
                            waitlist.launch_datetime.replace("Z", "+00:00")
                        )
                        if launch_dt.tzinfo is None:
                            launch_dt = launch_dt.replace(tzinfo=timezone.utc)
                        else:
                            launch_dt = launch_dt.astimezone(timezone.utc)

                        if datetime.now(timezone.utc) >= launch_dt:
                            is_launched = True
                    except ValueError:
                        pass

                if is_launched:
                    # Waitlist is live! The user was likely skipped by the email cron job
                    # (e.g. email was unverified at the time). Activate them now!
                    user.user_status = UserStatusEnum.ACTIVE.value
                    db_session.add(user)
                    db_session.commit()
                    db_session.refresh(user)
                    return user
                else:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Your account is on the waitlist for {waitlist.name}. You can login after {waitlist.launch_datetime}.",
                    )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is on a waitlist. Please wait for the launch date.",
        )

    elif user_status == UserStatusEnum.WAITLIST_ACTIVATED.value:
        # User received activation email, allow login and transition to ACTIVE
        user.user_status = UserStatusEnum.ACTIVE.value
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    elif user_status == UserStatusEnum.SUSPENDED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact support.",
        )

    # ACTIVE status or newly transitioned from WAITLIST_ACTIVATED - allow login
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    request: Request,
    Authorize: AuthJWT = Depends(),
    db_session: Session = Depends(get_db_session),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        Authorize.jwt_optional()
        username = Authorize.get_jwt_subject() or None
        token_data = TokenData(username=username)  # type: ignore
    except JWTError:
        raise credentials_exception
    if username:
        user = await security_get_user(request, db_session, email=token_data.username)  # type: ignore # treated as an email
        if user is None:
            raise credentials_exception
        public_user = PublicUser(**user.model_dump())
        request.state.user = public_user
        return public_user
    else:
        return AnonymousUser()


async def non_public_endpoint(current_user: UserRead | AnonymousUser):
    if isinstance(current_user, AnonymousUser):
        raise HTTPException(status_code=401, detail="Not authenticated")


async def verify_websocket_token(token: str, db: Session) -> Optional[int]:
    """
    Verify JWT token for WebSocket connection.
    Returns user_id if valid, None otherwise.

    SECURITY NOTE: Tokens passed in query parameters are visible in logs.
    Ensure Logfire is configured to scrub 'token' from URL logs:

    logfire.configure(
        scrubbing_patterns=['token', 'password', 'authorization'],
        scrubbing_callback=lambda key, value: '***REDACTED***'
    )
    """
    try:
        from fastapi_jwt_auth import AuthJWT
        from src.db.users import User
        from sqlmodel import select
        import logging

        # Create AuthJWT instance with the token
        auth = AuthJWT()
        auth._token = token

        # Verify token
        auth.jwt_required()
        user_uuid = auth.get_jwt_subject()

        # Get user from database
        user = db.exec(select(User).where(User.user_uuid == user_uuid)).first()

        if user:
            return user.id

        return None

    except Exception as e:
        import logging

        logging.error(f"WebSocket token verification failed: {e}")
        return None
