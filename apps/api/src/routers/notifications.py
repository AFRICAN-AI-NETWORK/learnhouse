from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.notifications import NotificationRead
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.notifications import notification_service

router = APIRouter()


@router.get("/", response_model=list[NotificationRead])
async def api_get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(notification_service.DEFAULT_PAGE_SIZE, ge=1, le=100),
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Get the current user's notifications, newest first."""
    return notification_service.get_notifications_paginated(
        db_session, user_id=current_user.id, page=page, limit=limit
    )


@router.get("/unread-count")
async def api_get_unread_notification_count(
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    count = notification_service.get_unread_count(db_session, user_id=current_user.id)
    return {"unread_count": count}


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def api_mark_notification_as_read(
    notification_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    notification = notification_service.mark_as_read(
        db_session, user_id=current_user.id, notification_id=notification_id
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@router.post("/read-all")
async def api_mark_all_notifications_as_read(
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    count = notification_service.mark_all_as_read(db_session, user_id=current_user.id)
    return {"marked_read": count}


@router.delete("/{notification_id}")
async def api_delete_notification(
    notification_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    deleted = notification_service.delete_notification(
        db_session, user_id=current_user.id, notification_id=notification_id
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"detail": "Notification deleted"}
