from datetime import timedelta
from typing import Literal, Optional

from fastapi import (APIRouter, Depends, Form, HTTPException, Request,
                     Response, status)
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from config.config import get_learnhouse_config
from src.core.events.database import get_db_session
from src.db.organizations import Organization, OrganizationRead
from src.db.users import AnonymousUser, User, UserRead
from src.security.auth import AuthJWT, authenticate_user, get_current_user
from src.services.auth.utils import signWithGoogle
from src.services.users.emails import send_account_creation_email
from src.services.users.users import (generate_verification_token,
                                      verify_user_email)

router = APIRouter()


# Email verification models
class EmailVerificationRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr
    org_slug: str


@router.get("/refresh")
def refresh(response: Response, Authorize: AuthJWT = Depends()):
    """
    The jwt_refresh_token_required() function insures a valid refresh
    token is present in the request before running any code below that function.
    we can use the get_jwt_subject() function to get the subject of the refresh
    token, and use the create_access_token() function again to make a new access token
    """
    Authorize.jwt_refresh_token_required()

    current_user = Authorize.get_jwt_subject()
    new_access_token = Authorize.create_access_token(subject=current_user)  # type: ignore

    response.set_cookie(
        key="access_token_cookie",
        value=new_access_token,
        httponly=False,
        domain=get_learnhouse_config().hosting_config.cookie_config.domain,
        expires=int(timedelta(hours=8).total_seconds()),
    )
    return {"access_token": new_access_token}


@router.post("/login")
async def login(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    Authorize: AuthJWT = Depends(),
    db_session: Session = Depends(get_db_session),
):
    user = await authenticate_user(request, username, password, db_session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = Authorize.create_access_token(subject=username)
    refresh_token = Authorize.create_refresh_token(subject=username)
    Authorize.set_refresh_cookies(refresh_token)

    # set cookies using fastapi
    response.set_cookie(
        key="access_token_cookie",
        value=access_token,
        httponly=False,
        domain=get_learnhouse_config().hosting_config.cookie_config.domain,
        expires=int(timedelta(hours=8).total_seconds()),
    )

    user = UserRead.model_validate(user)

    result = {
        "user": user,
        "tokens": {"access_token": access_token, "refresh_token": refresh_token},
    }
    return result


class ThirdPartyLogin(BaseModel):
    email: EmailStr
    provider: Literal["google"]
    access_token: str


@router.post("/oauth")
async def third_party_login(
    request: Request,
    response: Response,
    body: ThirdPartyLogin,
    org_id: Optional[int] = None,
    current_user: AnonymousUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
    Authorize: AuthJWT = Depends(),
):
    # Google
    if body.provider == "google":
        user = await signWithGoogle(
            request, body.access_token, body.email, org_id, current_user, db_session
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = Authorize.create_access_token(subject=user.email)
    refresh_token = Authorize.create_refresh_token(subject=user.email)
    Authorize.set_refresh_cookies(refresh_token)

    # set cookies using fastapi
    response.set_cookie(
        key="access_token_cookie",
        value=access_token,
        httponly=False,
        domain=get_learnhouse_config().hosting_config.cookie_config.domain,
        expires=int(timedelta(hours=8).total_seconds()),
    )

    user = UserRead.model_validate(user)

    result = {
        "user": user,
        "tokens": {"access_token": access_token, "refresh_token": refresh_token},
    }
    return result


@router.delete("/logout")
def logout(Authorize: AuthJWT = Depends()):
    """
    Because the JWT are stored in an httponly cookie now, we cannot
    log the user out by simply deleting the cookies in the frontend.
    We need the backend to send us a response to delete the cookies.
    """
    Authorize.jwt_required()

    Authorize.unset_jwt_cookies()
    return {"msg": "Successfully logout"}


# NEW: Email verification endpoint
@router.post("/verify-email")
async def verify_email_endpoint(
    request: Request,
    verification_data: EmailVerificationRequest,
    db_session: Session = Depends(get_db_session),
):
    """
    Verify user's email address using the verification token from the email.

    This endpoint is called when a user clicks the verification link in their email.

    Returns:
    - success: bool
    - message: str
    - already_verified: bool
    """
    result = await verify_user_email(
        request=request, db_session=db_session, token=verification_data.token
    )

    return {
        "success": True,
        "message": result["message"],
        "already_verified": result.get("already_verified", False),
    }


# NEW: Resend verification email endpoint
@router.post("/resend-verification")
async def resend_verification_email(
    request: Request,
    resend_data: ResendVerificationRequest,
    db_session: Session = Depends(get_db_session),
):
    """
    Resend verification email to user if they didn't receive it or it expired.

    Returns:
    - success: bool
    - message: str
    """
    # Get user
    statement = select(User).where(User.email == resend_data.email)
    user = db_session.exec(statement).first()

    if not user:
        # Don't reveal if user exists or not for security reasons
        return {
            "success": True,
            "message": "If the email exists in our system, a verification email has been sent.",
        }

    # Check if already verified
    if user.email_verified:
        raise HTTPException(
            status_code=400, detail="Email is already verified. You can log in now."
        )

    # Get organization
    statement = select(Organization).where(Organization.slug == resend_data.org_slug)
    org = db_session.exec(statement).first()

    if not org:
        raise HTTPException(status_code=400, detail="Organization not found")

    # Generate new verification token
    verification_token = generate_verification_token(
        user_email=user.email, user_id=user.id, org_slug=org.slug
    )

    # Resend email
    send_account_creation_email(
        user=UserRead.model_validate(user),
        email=user.email,
        organization=OrganizationRead.model_validate(org),
        verification_token=verification_token,
    )

    return {
        "success": True,
        "message": "Verification email sent successfully. Please check your inbox.",
    }
