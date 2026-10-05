"""
Fan-out jobs for notification triggers that target many users at once: a
new chapter/activity published to a course's enrolled students, or an
announcement broadcast to an org's members.

Always scheduled as a one-off APScheduler job from the triggering endpoint
(see the chapter/activity/announcement wiring) — never run inline in the
request/response cycle, since course or org membership can be in the
thousands and this must not block the instructor's publish action.

Each per-user notification goes through notification_service.create_notification
(one DB commit + WS push per row) rather than a raw bulk insert, trading a
little throughput for a single, already-tested "create + push" code path
and per-user failure isolation — acceptable since this runs off the
request path in the background.
"""

import asyncio
import logging

from sqlmodel import Session, select

from src.core.events.database import engine
from src.db.courses.activities import Activity
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import Chapter
from src.db.courses.courses import Course
from src.db.user_organizations import UserOrganization
from src.services.notifications import notification_service
from src.services.trail.trail import get_enrolled_user_ids_for_course

logger = logging.getLogger(__name__)


async def fanout_chapter_added(chapter_id: int, db_session: Session) -> int:
    """Notify every student enrolled in the chapter's course. Returns count sent."""
    chapter = db_session.get(Chapter, chapter_id)
    if not chapter or not chapter.published:
        return 0

    course = db_session.get(Course, chapter.course_id)
    if not course:
        return 0

    user_ids = get_enrolled_user_ids_for_course(course.id, db_session)
    sent = 0
    for user_id in user_ids:
        try:
            await notification_service.notify_chapter_added(
                db_session,
                user_id=user_id,
                org_id=chapter.org_id,
                chapter_id=chapter.id,
                chapter_uuid=chapter.chapter_uuid,
                chapter_title=chapter.name,
                course_title=course.name,
            )
            sent += 1
        except Exception as e:
            logger.exception(
                "Failed to notify user %s of new chapter %s: %s", user_id, chapter_id, e
            )
    return sent


async def fanout_activity_added(activity_id: int, db_session: Session) -> int:
    """Notify every student enrolled in the activity's course. Returns count sent."""
    activity = db_session.get(Activity, activity_id)
    if not activity or not activity.published:
        return 0

    course = db_session.get(Course, activity.course_id)
    if not course:
        return 0

    chapter_activity = db_session.exec(
        select(ChapterActivity).where(ChapterActivity.activity_id == activity_id)
    ).first()
    chapter = (
        db_session.get(Chapter, chapter_activity.chapter_id)
        if chapter_activity
        else None
    )
    chapter_title = chapter.name if chapter else course.name

    user_ids = get_enrolled_user_ids_for_course(course.id, db_session)
    sent = 0
    for user_id in user_ids:
        try:
            await notification_service.notify_activity_added(
                db_session,
                user_id=user_id,
                org_id=activity.org_id,
                activity_id=activity.id,
                activity_uuid=activity.activity_uuid,
                activity_title=activity.name,
                chapter_title=chapter_title,
                course_title=course.name,
            )
            sent += 1
        except Exception as e:
            logger.exception(
                "Failed to notify user %s of new activity %s: %s",
                user_id,
                activity_id,
                e,
            )
    return sent


async def fanout_app_update(
    announcement_id: int,
    org_id: int,
    announcement_title: str,
    announcement_content: str,
    db_session: Session,
) -> int:
    """
    Live-push an announcement to currently-connected org members.

    Deliberately does NOT create a `notification` row per member, unlike
    the chapter/activity fan-outs. Announcement already has its own
    lightweight, sparse read-tracking (AnnouncementRead, written only when
    a user actually opens it) via the existing GET/POST /announcements
    endpoints — eagerly writing one notification row per org member here
    would be strictly heavier for no benefit (see the notification system's
    "keep Announcements a parallel backend" decision). This is purely a
    real-time nudge for whoever is online right now; offline members still
    see the announcement through the existing endpoint on next load.
    """
    from src.services.chat.websocket_manager import connection_manager
    from src.services.notifications.notification_copy import app_update_copy

    copy = app_update_copy(announcement_title, announcement_content)
    user_ids = list(
        db_session.exec(
            select(UserOrganization.user_id)
            .where(UserOrganization.org_id == org_id)
            .distinct()
        ).all()
    )

    sent = 0
    for user_id in user_ids:
        try:
            await connection_manager.send_personal_message(
                {
                    "type": "activity_notification",
                    "data": {
                        "notification_type": "app_update",
                        "target_type": "app",
                        "target_id": announcement_id,
                        "title": copy.title,
                        "message": copy.message,
                    },
                },
                user_id,
            )
            sent += 1
        except Exception as e:
            logger.exception(
                "Failed to push announcement %s to user %s: %s",
                announcement_id,
                user_id,
                e,
            )
    return sent


# ---------------------------------------------------------------------------
# Synchronous wrappers for APScheduler (see src.services.notifications.scheduling).
# Each opens its own DB session, since the job runs independently of the
# request that scheduled it.
# ---------------------------------------------------------------------------


def sync_fanout_chapter_added(chapter_id: int) -> None:
    with Session(engine) as db_session:
        asyncio.run(fanout_chapter_added(chapter_id, db_session))


def sync_fanout_activity_added(activity_id: int) -> None:
    with Session(engine) as db_session:
        asyncio.run(fanout_activity_added(activity_id, db_session))


def sync_fanout_app_update(
    announcement_id: int,
    org_id: int,
    announcement_title: str,
    announcement_content: str,
) -> None:
    with Session(engine) as db_session:
        asyncio.run(
            fanout_app_update(
                announcement_id,
                org_id,
                announcement_title,
                announcement_content,
                db_session,
            )
        )
