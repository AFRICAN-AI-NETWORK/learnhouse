"""
Core notification service: create, in-app push, read/query, and read-state.

Email delivery is intentionally NOT performed here — see email_dispatch.py,
which picks up ``EmailStatus.PENDING`` rows on a periodic APScheduler sweep
so a slow/failing mail provider can never block a request that creates a
notification (e.g. grading a submission).
"""

import logging
from datetime import datetime
from typing import Optional, Sequence
from uuid import uuid4

from sqlmodel import Session, func, select

from src.db.notifications import Notification, NotificationType
from src.services.notifications.notification_copy import (
    NotificationCopy,
    activity_added_copy,
    assignment_reviewed_copy,
    chapter_added_copy,
    retake_requested_copy,
)

logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


async def _push_in_app(notification: Notification) -> None:
    """
    Best-effort real-time push over the existing chat WebSocket connection.

    Reuses connection_manager.send_personal_message — it already no-ops for
    offline users, so no new connection type or fallback path is needed here.
    Never allowed to fail notification creation: the row is already
    persisted, so a push failure just means the user sees it on next load.
    """
    try:
        from src.services.chat.websocket_manager import connection_manager

        await connection_manager.send_personal_message(
            {
                "type": "activity_notification",
                "data": {
                    "notification_uuid": notification.notification_uuid,
                    "notification_type": notification.notification_type.value,
                    "target_type": notification.target_type,
                    "target_id": notification.target_id,
                    "target_uuid": notification.target_uuid,
                    "title": notification.title,
                    "message": notification.message,
                    "metadata": notification.metadata_json,
                    "created_at": notification.created_at.isoformat(),
                },
            },
            notification.user_id,
        )
    except Exception as e:
        logger.warning(
            "Failed to push in-app notification %s to user %s: %s",
            notification.notification_uuid,
            notification.user_id,
            e,
        )


async def create_notification(
    db_session: Session,
    *,
    user_id: int,
    org_id: int,
    notification_type: NotificationType,
    target_type: str,
    copy: NotificationCopy,
    target_id: Optional[int] = None,
    target_uuid: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> Notification:
    """Persist one notification row and push it in-app immediately."""
    notification = Notification(
        notification_uuid=f"notif_{uuid4()}",
        user_id=user_id,
        org_id=org_id,
        notification_type=notification_type,
        target_type=target_type,
        target_id=target_id,
        target_uuid=target_uuid,
        title=copy.title,
        message=copy.message,
        metadata_json=metadata or {},
    )
    db_session.add(notification)
    db_session.commit()
    db_session.refresh(notification)

    await _push_in_app(notification)

    return notification


# ---------------------------------------------------------------------------
# Per-trigger convenience wrappers.
#
# Each one is the single place that knows which copy template + target
# metadata belongs to its notification type, so callers (grading, chapter
# publish, etc.) never build message strings themselves.
# ---------------------------------------------------------------------------


async def notify_assignment_reviewed(
    db_session: Session,
    *,
    user_id: int,
    org_id: int,
    assignment_id: int,
    assignment_uuid: str,
    assignment_title: str,
    instructor_name: str,
    grade: int,
    max_grade: int,
    feedback: Optional[str] = None,
    unlocks_certificate: bool = False,
) -> Notification:
    copy = assignment_reviewed_copy(
        instructor_name, assignment_title, grade, max_grade, feedback
    )
    return await create_notification(
        db_session,
        user_id=user_id,
        org_id=org_id,
        notification_type=NotificationType.ASSIGNMENT_REVIEWED,
        target_type="assignment",
        target_id=assignment_id,
        target_uuid=assignment_uuid,
        copy=copy,
        metadata={
            "grade": grade,
            "max_grade": max_grade,
            "feedback": feedback,
            "unlocks_certificate": unlocks_certificate,
        },
    )


async def notify_retake_requested(
    db_session: Session,
    *,
    user_id: int,
    org_id: int,
    assignment_id: int,
    assignment_uuid: str,
    assignment_title: str,
    instructor_name: str,
    feedback: Optional[str] = None,
) -> Notification:
    copy = retake_requested_copy(instructor_name, assignment_title, feedback)
    return await create_notification(
        db_session,
        user_id=user_id,
        org_id=org_id,
        notification_type=NotificationType.RETAKE_REQUESTED,
        target_type="assignment",
        target_id=assignment_id,
        target_uuid=assignment_uuid,
        copy=copy,
        metadata={"feedback": feedback},
    )


async def notify_chapter_added(
    db_session: Session,
    *,
    user_id: int,
    org_id: int,
    chapter_id: int,
    chapter_uuid: str,
    chapter_title: str,
    course_title: str,
) -> Notification:
    copy = chapter_added_copy(chapter_title, course_title)
    return await create_notification(
        db_session,
        user_id=user_id,
        org_id=org_id,
        notification_type=NotificationType.CHAPTER_ADDED,
        target_type="chapter",
        target_id=chapter_id,
        target_uuid=chapter_uuid,
        copy=copy,
    )


async def notify_activity_added(
    db_session: Session,
    *,
    user_id: int,
    org_id: int,
    activity_id: int,
    activity_uuid: str,
    activity_title: str,
    chapter_title: str,
    course_title: str,
) -> Notification:
    copy = activity_added_copy(activity_title, chapter_title, course_title)
    return await create_notification(
        db_session,
        user_id=user_id,
        org_id=org_id,
        notification_type=NotificationType.ACTIVITY_ADDED,
        target_type="activity",
        target_id=activity_id,
        target_uuid=activity_uuid,
        copy=copy,
    )


# ---------------------------------------------------------------------------
# Read-side queries and read-state mutation.
# ---------------------------------------------------------------------------


def get_notifications_paginated(
    db_session: Session,
    *,
    user_id: int,
    page: int = 1,
    limit: int = DEFAULT_PAGE_SIZE,
) -> Sequence[Notification]:
    limit = max(1, min(limit, MAX_PAGE_SIZE))
    page = max(1, page)
    statement = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return db_session.exec(statement).all()


def get_unread_count(db_session: Session, *, user_id: int) -> int:
    statement = (
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
    )
    return db_session.exec(statement).one()


def mark_as_read(
    db_session: Session, *, user_id: int, notification_id: int
) -> Optional[Notification]:
    notification = db_session.get(Notification, notification_id)
    if not notification or notification.user_id != user_id:
        return None

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db_session.add(notification)
        db_session.commit()
        db_session.refresh(notification)

    return notification


def mark_all_as_read(db_session: Session, *, user_id: int) -> int:
    statement = select(Notification).where(
        Notification.user_id == user_id,
        Notification.is_read == False,  # noqa: E712
    )
    unread = db_session.exec(statement).all()

    now = datetime.utcnow()
    for notification in unread:
        notification.is_read = True
        notification.read_at = now
        db_session.add(notification)

    if unread:
        db_session.commit()

    return len(unread)


def delete_notification(
    db_session: Session, *, user_id: int, notification_id: int
) -> bool:
    notification = db_session.get(Notification, notification_id)
    if not notification or notification.user_id != user_id:
        return False

    db_session.delete(notification)
    db_session.commit()
    return True
