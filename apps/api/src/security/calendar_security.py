"""
Authorization for the academic calendar (years, cohorts, weekly schedule,
programme weeks, student journey).

Access is rights-based: any role whose ``rights`` grant the requested action on
the ``academic_calendar`` resource qualifies, so roles are configured in data
rather than hardcoded here.
"""

from typing import Literal

from fastapi import HTTPException, Request, status
from sqlmodel import Session

from src.db.users import AnonymousUser, PublicUser
from src.security.courses_security import courses_rbac_check
from src.security.rbac.rbac import authorization_verify_has_rights

CALENDAR_RESOURCE = "academic_calendar"
CalendarAction = Literal["create", "read", "update", "delete"]


def require_authenticated(current_user: PublicUser | AnonymousUser) -> None:
    if current_user is None or getattr(current_user, "id", 0) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required",
        )


async def has_calendar_right(
    current_user: PublicUser | AnonymousUser,
    action: CalendarAction,
    db_session: Session,
) -> bool:
    if current_user is None or getattr(current_user, "id", 0) == 0:
        return False
    return await authorization_verify_has_rights(
        current_user.id, [(CALENDAR_RESOURCE, action)], db_session
    )


async def require_calendar_right(
    current_user: PublicUser | AnonymousUser,
    action: CalendarAction,
    db_session: Session,
) -> None:
    """Guard for organization-level calendar resources."""
    require_authenticated(current_user)
    if not await has_calendar_right(current_user, action, db_session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have permission to {action} academic calendar resources",
        )


async def require_course_calendar_access(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    action: CalendarAction,
    db_session: Session,
) -> None:
    """
    Guard for course-level calendar resources.

    Passes for holders of the calendar right, and otherwise falls back to the
    course ownership check so course authors keep managing their own course.
    """
    require_authenticated(current_user)
    if await has_calendar_right(current_user, action, db_session):
        return
    await courses_rbac_check(
        request,
        course_uuid,
        current_user,
        action,
        db_session,
        require_course_ownership=True,
    )
