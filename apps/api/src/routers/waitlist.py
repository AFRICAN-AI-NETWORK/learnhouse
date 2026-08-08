"""Waitlist API Router - All waitlist-related endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, validator
from sqlmodel import Session, select

from src.core.events.database import get_db_session
from src.db.user_organizations import UserOrganization
from src.db.users import AnonymousUser, PublicUser, UserRead
from src.db.waitlist import (
    WaitlistConfigCreate,
    WaitlistConfigRead,
    WaitlistConfigUpdate,
)
from src.security.auth import get_current_user
from src.security.phone_validation import validate_e164_phone_number
from src.services.users.waitlist import create_waitlist_user, get_waitlist_users
from src.services.waitlist.config import (
    cancel_waitlist_config,
    create_waitlist_config,
    get_org_waitlist_configs,
    get_waitlist_config,
    update_waitlist_config,
)
from src.services.waitlist.courses import (
    get_course_preference_analytics,
    get_org_courses_for_waitlist,
    get_user_course_preferences,
)

router = APIRouter()


# ==================== Request/Response Models ====================


class WaitlistUserRegistration(BaseModel):
    """Request model for user registration via waitlist"""

    username: str
    email: str
    password: str
    phone_number: str
    first_name: str = ""
    last_name: str = ""
    bio: str | None = ""
    selected_product_ids: list[int] = []
    # Referral tracking fields
    referral_code: str | None = None
    device_id: str | None = None
    browser_fingerprint: dict | None = None

    @validator("phone_number", pre=True, always=True)
    def validate_phone_number(cls, value):
        return validate_e164_phone_number(value, required=True)


# ==================== Waitlist Configuration Endpoints (Admin) ====================


@router.post("/config", response_model=WaitlistConfigRead, tags=["waitlist"])
async def create_waitlist(
    request: Request,
    config_data: WaitlistConfigCreate,
    current_user: PublicUser | AnonymousUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Create a new waitlist campaign configuration.
    Admin-only endpoint.
    """
    # RBAC check: Ensure user is admin of the organization
    if isinstance(current_user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    # Verify user is admin or maintainer of the organization
    statement = select(UserOrganization).where(
        UserOrganization.user_id == current_user.id,
        UserOrganization.org_id == config_data.org_id,
        UserOrganization.role_id.in_([1, 2]),  # 1=Admin, 2=Maintainer
    )
    user_org = db_session.exec(statement).first()
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create waitlists in this organization. Admin or Maintainer role required.",
        )

    return await create_waitlist_config(request, db_session, config_data)


@router.get(
    "/config/{waitlist_uuid}", response_model=WaitlistConfigRead, tags=["waitlist"]
)
async def get_waitlist_details(
    request: Request,
    waitlist_uuid: str,
    db_session: Session = Depends(get_db_session),
):
    """
    Retrieve a specific waitlist configuration by UUID.
    Public endpoint - used by waitlist join page.
    """
    return await get_waitlist_config(request, db_session, waitlist_uuid)


@router.get(
    "/config/org/{org_id}", response_model=list[WaitlistConfigRead], tags=["waitlist"]
)
async def list_org_waitlists(
    request: Request,
    org_id: int,
    status_filter: str | None = None,
    current_user: PublicUser | AnonymousUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get all waitlist configurations for an organization.
    Admins/Maintainers can view all campaigns.
    Non-admin and anonymous users can view ACTIVE campaigns only.
    """
    if isinstance(current_user, AnonymousUser):
        return await get_org_waitlist_configs(
            request,
            db_session,
            org_id,
            "ACTIVE",
        )

    # Verify user is admin or maintainer of the organization
    statement = select(UserOrganization).where(
        UserOrganization.user_id == current_user.id,
        UserOrganization.org_id == org_id,
        UserOrganization.role_id.in_([1, 2]),  # 1=Admin, 2=Maintainer
    )
    user_org = db_session.exec(statement).first()

    # Admins/Maintainers: can apply status_filter and view all campaigns
    if user_org:
        return await get_org_waitlist_configs(
            request, db_session, org_id, status_filter
        )

    # Authenticated non-admin users: only ACTIVE campaigns
    return await get_org_waitlist_configs(
        request,
        db_session,
        org_id,
        "ACTIVE",
    )


@router.put(
    "/config/{waitlist_uuid}", response_model=WaitlistConfigRead, tags=["waitlist"]
)
async def update_waitlist(
    request: Request,
    waitlist_uuid: str,
    update_data: WaitlistConfigUpdate,
    current_user: PublicUser | AnonymousUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Update a waitlist configuration.
    Primary use case: Admin can extend/shorten countdown by modifying launch_datetime.
    Admin-only endpoint.
    """
    # RBAC check
    if isinstance(current_user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    # Get waitlist to verify org ownership
    from src.services.waitlist.config import get_waitlist_config

    waitlist = await get_waitlist_config(request, db_session, waitlist_uuid)

    # Verify user is admin or maintainer of the organization
    statement = select(UserOrganization).where(
        UserOrganization.user_id == current_user.id,
        UserOrganization.org_id == waitlist.org_id,
        UserOrganization.role_id.in_([1, 2]),  # 1=Admin, 2=Maintainer
    )
    user_org = db_session.exec(statement).first()
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this waitlist. Admin or Maintainer role required.",
        )

    return await update_waitlist_config(request, db_session, waitlist_uuid, update_data)


@router.delete(
    "/config/{waitlist_uuid}", response_model=WaitlistConfigRead, tags=["waitlist"]
)
async def cancel_waitlist(
    request: Request,
    waitlist_uuid: str,
    current_user: PublicUser | AnonymousUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Cancel a waitlist (soft delete, changes status to CANCELLED).
    Admin-only endpoint.
    """
    # RBAC check
    if isinstance(current_user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    # Get waitlist to verify org ownership
    from src.services.waitlist.config import get_waitlist_config

    waitlist = await get_waitlist_config(request, db_session, waitlist_uuid)

    # Verify user is admin or maintainer of the organization
    statement = select(UserOrganization).where(
        UserOrganization.user_id == current_user.id,
        UserOrganization.org_id == waitlist.org_id,
        UserOrganization.role_id.in_([1, 2]),  # 1=Admin, 2=Maintainer
    )
    user_org = db_session.exec(statement).first()
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to cancel this waitlist. Admin or Maintainer role required.",
        )

    return await cancel_waitlist_config(request, db_session, waitlist_uuid)


# ==================== Waitlist User Registration Endpoints ====================


@router.post("/join", response_model=UserRead)
async def join_waitlist(
    request: Request,
    waitlist_uuid: str,
    user_data: WaitlistUserRegistration,
    db_session: Session = Depends(get_db_session),
):
    """
    Register a new user on a waitlist using an invite link.
    Public endpoint - anyone with valid waitlist link can register.

    Query parameter: waitlist_uuid identifies the waitlist campaign.
    Request body includes user details, select_course_ids, and referral details.
    """
    from src.db.users import UserCreate

    # Convert registration payload to UserCreate object
    user_create = UserCreate(
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        phone_number=user_data.phone_number,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        bio=user_data.bio,
        is_waitlist=True,
        referral_code=user_data.referral_code,
        device_id=user_data.device_id,
        browser_fingerprint=user_data.browser_fingerprint,
    )

    # Pass request object as user creation now utilizes request variables
    # e.g for fetching IP for referrals tracking
    return await create_waitlist_user(
        request=request,
        db_session=db_session,
        user_object=user_create,
        waitlist_uuid=waitlist_uuid,
        selected_product_ids=user_data.selected_product_ids,
    )


@router.get(
    "/config/{waitlist_uuid}/users", response_model=list[UserRead], tags=["waitlist"]
)
async def list_waitlist_users(
    request: Request,
    waitlist_uuid: str,
    skip: int = 0,
    limit: int = 100,
    current_user: PublicUser | AnonymousUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get all users registered on a specific waitlist.
    Admin-only endpoint.
    """
    # RBAC check
    if isinstance(current_user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    # Get waitlist to verify org ownership
    from src.services.waitlist.config import get_waitlist_config

    waitlist = await get_waitlist_config(request, db_session, waitlist_uuid)

    # Verify user is admin or maintainer of the organization
    statement = select(UserOrganization).where(
        UserOrganization.user_id == current_user.id,
        UserOrganization.org_id == waitlist.org_id,
        UserOrganization.role_id.in_([1, 2]),  # 1=Admin, 2=Maintainer
    )
    user_org = db_session.exec(statement).first()
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view users for this waitlist. Admin or Maintainer role required.",
        )

    return await get_waitlist_users(request, db_session, waitlist_uuid, skip, limit)


# ==================== Course Listing Endpoints ====================


@router.get("/config/{waitlist_uuid}/courses", tags=["waitlist"])
async def list_waitlist_courses(
    request: Request,
    waitlist_uuid: str,
    db_session: Session = Depends(get_db_session),
):
    """
    Get all courses for the organization with pricing information.
    Public endpoint - used in Step 3 of registration form.

    Returns courses with is_free/price/currency for free/paid labels.
    """
    return await get_org_courses_for_waitlist(request, db_session, waitlist_uuid)


# ==================== Course Preference Analytics Endpoints ====================


@router.get("/config/{waitlist_uuid}/preferences", tags=["waitlist"])
async def get_waitlist_preferences(
    request: Request,
    waitlist_uuid: str,
    current_user: PublicUser | AnonymousUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get aggregated course preference analytics for a waitlist campaign.
    Admin-only endpoint for demand forecasting.

    Returns which courses are most popular among waitlist registrants.
    """
    # RBAC check
    if isinstance(current_user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    # Get waitlist to verify org ownership
    from src.services.waitlist.config import get_waitlist_config

    waitlist = await get_waitlist_config(request, db_session, waitlist_uuid)

    # Verify user is admin or maintainer of the organization
    statement = select(UserOrganization).where(
        UserOrganization.user_id == current_user.id,
        UserOrganization.org_id == waitlist.org_id,
        UserOrganization.role_id.in_([1, 2]),  # 1=Admin, 2=Maintainer
    )
    user_org = db_session.exec(statement).first()
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view preferences for this waitlist. Admin or Maintainer role required.",
        )

    return await get_course_preference_analytics(request, db_session, waitlist_uuid)


@router.get("/config/{waitlist_uuid}/users/{user_id}/preferences", tags=["waitlist"])
async def get_user_preferences(
    request: Request,
    waitlist_uuid: str,
    user_id: int,
    current_user: PublicUser | AnonymousUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get course preferences for a specific user on a waitlist.
    Admin-only endpoint or user themselves.
    """
    # RBAC check: Admin or the user themselves
    if isinstance(current_user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    # Get waitlist to verify org ownership
    from src.services.waitlist.config import get_waitlist_config

    waitlist = await get_waitlist_config(request, db_session, waitlist_uuid)

    # Check if user is admin/maintainer of the organization OR accessing their own preferences
    is_self = current_user.id == user_id

    if not is_self:
        # Verify user is admin or maintainer of the organization
        statement = select(UserOrganization).where(
            UserOrganization.user_id == current_user.id,
            UserOrganization.org_id == waitlist.org_id,
            UserOrganization.role_id.in_([1, 2]),  # 1=Admin, 2=Maintainer
        )
        user_org = db_session.exec(statement).first()
        if not user_org:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view other users' preferences. Admin or Maintainer role required.",
            )

    return await get_user_course_preferences(
        request, db_session, waitlist_uuid, user_id
    )
