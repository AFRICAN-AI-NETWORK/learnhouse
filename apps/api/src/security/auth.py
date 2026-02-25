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
            detail="Please verify your email address before logging in. Check your inbox for the verification link."
        )
    
    # NEW: Check user status for waitlist handling
    user_status = getattr(user, 'user_status', 'ACTIVE')
    
    if user_status == "WAITLIST":
        # User is on waitlist, cannot login yet
        # Get waitlist details to show launch date
        from src.db.waitlist import WaitlistConfig
        waitlist_interest = getattr(user, 'waitlist_interest', None)
        if waitlist_interest:
            waitlist_query = select(WaitlistConfig).where(
                WaitlistConfig.interest_category == waitlist_interest,
                WaitlistConfig.status == "ACTIVE"
            )
            waitlist = db_session.exec(waitlist_query).first()
            if waitlist:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Your account is on the waitlist for {waitlist.name}. You can login after {waitlist.launch_datetime}."
                )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is on a waitlist. Please wait for the launch date."
        )
    
    elif user_status == "WAITLIST_ACTIVATED":
        # User received activation email, allow login and transition to ACTIVE
        user.user_status = "ACTIVE"
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    
    elif user_status == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact support."
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
