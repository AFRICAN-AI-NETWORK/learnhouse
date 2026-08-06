from fastapi import APIRouter, Depends, Request

from src.core.events.database import get_db_session
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.courses.live_sessions import (
    end_live_session,
    get_live_session_registrations,
    is_user_registered,
    register_for_live_session,
    send_manual_notifications,
)

router = APIRouter()


@router.post("/{activity_uuid}/end")
async def api_end_live_session(
    activity_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
):
    """
    End a live session and trigger archiving.
    """
    # Note: RBAC check for Admin/Course Owner could be added here
    # For now, we rely on the service to handle basic logic
    return await end_live_session(activity_uuid, db_session)


@router.post("/{activity_uuid}/register")
async def api_register_live_session(
    request: Request,
    activity_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
):
    """
    Register current user for a live session.
    """
    return await register_for_live_session(
        request, activity_uuid, current_user, db_session
    )


@router.get("/{activity_uuid}/participants")
async def api_get_live_participants(
    activity_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
):
    """
    Get all registered participants for a live session.
    """
    # Note: Logic to restrict non-admins from seeing list could be added here
    return await get_live_session_registrations(activity_uuid, db_session)


@router.get("/{activity_uuid}/is_registered")
async def api_check_registration(
    activity_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
):
    """
    Check if the current user is registered for the session.
    """
    registered = await is_user_registered(activity_uuid, current_user.id, db_session)
    return {"registered": registered}


@router.post("/{activity_uuid}/notify")
async def api_send_session_notifications(
    activity_uuid: str,
    user_ids: list[int],
    notification_type: str = "CONFIRMATION",
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
):
    """
    Manually trigger batch notifications for session participants.
    """
    # Note: Admin check should be added here
    await send_manual_notifications(
        db_session, activity_uuid, user_ids, notification_type
    )
    return {"status": "success"}
