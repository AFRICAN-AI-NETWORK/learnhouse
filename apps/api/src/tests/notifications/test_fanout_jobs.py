"""Tests for the course/org-wide notification fan-out jobs."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session, select

from src.db.courses.activities import (Activity, ActivitySubTypeEnum,
                                       ActivityTypeEnum)
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import Chapter
from src.db.notifications import Notification, NotificationType
from src.db.roles import Role
from src.db.trail_runs import TrailRun
from src.db.trails import Trail
from src.db.user_organizations import UserOrganization
from src.db.users import User
from src.services.notifications.fanout_jobs import (fanout_activity_added,
                                                    fanout_app_update,
                                                    fanout_chapter_added)
from src.services.trail.trail import get_enrolled_user_ids_for_course


def _enroll(session: Session, user: User, course, org) -> TrailRun:
    trail = Trail(
        org_id=org.id,
        user_id=user.id,
        trail_uuid=f"trail_{uuid4()}",
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )
    session.add(trail)
    session.commit()
    session.refresh(trail)

    trail_run = TrailRun(
        trail_id=trail.id,
        course_id=course.id,
        org_id=org.id,
        user_id=user.id,
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )
    session.add(trail_run)
    session.commit()
    session.refresh(trail_run)
    return trail_run


def _make_chapter(session: Session, course, org, published: bool = True) -> Chapter:
    chapter = Chapter(
        name="Advanced Concepts",
        org_id=org.id,
        course_id=course.id,
        published=published,
        chapter_uuid=f"chapter_{uuid4()}",
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )
    session.add(chapter)
    session.commit()
    session.refresh(chapter)
    return chapter


def _make_activity(
    session: Session, course, chapter, org, published: bool = True
) -> Activity:
    activity = Activity(
        name="Lesson 3",
        activity_type=ActivityTypeEnum.TYPE_CUSTOM,
        activity_sub_type=ActivitySubTypeEnum.SUBTYPE_CUSTOM,
        published=published,
        org_id=org.id,
        course_id=course.id,
        activity_uuid=f"activity_{uuid4()}",
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)

    session.add(
        ChapterActivity(
            order=1,
            chapter_id=chapter.id,
            activity_id=activity.id,
            course_id=course.id,
            org_id=org.id,
            creation_date=str(datetime.now(timezone.utc)),
            update_date=str(datetime.now(timezone.utc)),
        )
    )
    session.commit()
    return activity


class TestGetEnrolledUserIdsForCourse:
    def test_returns_enrolled_users(
        self, session: Session, user: User, other_user: User, course, org
    ):
        _enroll(session, user, course, org)
        _enroll(session, other_user, course, org)

        user_ids = get_enrolled_user_ids_for_course(course.id, session)
        assert set(user_ids) == {user.id, other_user.id}

    def test_returns_empty_for_course_with_no_enrollments(
        self, session: Session, course
    ):
        assert get_enrolled_user_ids_for_course(course.id, session) == []


@pytest.mark.asyncio
class TestFanoutChapterAdded:
    async def test_notifies_all_enrolled_students(
        self, session: Session, user: User, other_user: User, course, org
    ):
        _enroll(session, user, course, org)
        _enroll(session, other_user, course, org)
        chapter = _make_chapter(session, course, org)

        sent = await fanout_chapter_added(chapter.id, session)

        assert sent == 2
        notifications = session.exec(select(Notification)).all()
        assert len(notifications) == 2
        assert all(
            n.notification_type == NotificationType.CHAPTER_ADDED for n in notifications
        )

    async def test_skips_unpublished_chapter(
        self, session: Session, user: User, course, org
    ):
        _enroll(session, user, course, org)
        chapter = _make_chapter(session, course, org, published=False)

        sent = await fanout_chapter_added(chapter.id, session)

        assert sent == 0
        assert len(session.exec(select(Notification)).all()) == 0

    async def test_one_failure_does_not_block_others(
        self, session: Session, user: User, other_user: User, course, org, monkeypatch
    ):
        _enroll(session, user, course, org)
        _enroll(session, other_user, course, org)
        chapter = _make_chapter(session, course, org)

        from src.services.notifications import notification_service as svc

        original = svc.notify_chapter_added
        call_count = {"n": 0}

        async def flaky(db_session, **kwargs):
            call_count["n"] += 1
            if call_count["n"] == 1:
                raise RuntimeError("boom")
            return await original(db_session, **kwargs)

        monkeypatch.setattr(
            "src.services.notifications.fanout_jobs.notification_service.notify_chapter_added",
            flaky,
        )

        sent = await fanout_chapter_added(chapter.id, session)
        assert sent == 1  # one failed, one succeeded


@pytest.mark.asyncio
class TestFanoutActivityAdded:
    async def test_notifies_all_enrolled_students_with_chapter_context(
        self, session: Session, user: User, course, org
    ):
        _enroll(session, user, course, org)
        chapter = _make_chapter(session, course, org)
        activity = _make_activity(session, course, chapter, org)

        sent = await fanout_activity_added(activity.id, session)

        assert sent == 1
        notification = session.exec(select(Notification)).first()
        assert notification.notification_type == NotificationType.ACTIVITY_ADDED
        assert "Advanced Concepts" in notification.message

    async def test_skips_unpublished_activity(
        self, session: Session, user: User, course, org
    ):
        _enroll(session, user, course, org)
        chapter = _make_chapter(session, course, org)
        activity = _make_activity(session, course, chapter, org, published=False)

        sent = await fanout_activity_added(activity.id, session)
        assert sent == 0


@pytest.mark.asyncio
class TestFanoutAppUpdate:
    async def _enroll_org_members(self, session: Session, users, org):
        role = Role(
            name="Student",
            description="Student role",
            role_uuid=f"role_{uuid4()}",
            creation_date=str(datetime.now(timezone.utc)),
            update_date=str(datetime.now(timezone.utc)),
        )
        session.add(role)
        session.commit()
        session.refresh(role)

        for u in users:
            session.add(
                UserOrganization(
                    user_id=u.id,
                    org_id=org.id,
                    role_id=role.id,
                    creation_date=str(datetime.now(timezone.utc)),
                    update_date=str(datetime.now(timezone.utc)),
                )
            )
        session.commit()

    async def test_pushes_live_ws_event_to_every_org_member(
        self, session: Session, user: User, other_user: User, org, monkeypatch
    ):
        """
        Announcements deliberately do NOT get a persisted notification row
        per member (see the "keep Announcements a parallel backend"
        decision) — this is purely a live WS nudge, so it's verified via
        the WebSocket call, not the notification table.
        """
        await self._enroll_org_members(session, (user, other_user), org)

        from unittest.mock import AsyncMock

        mock_send = AsyncMock()
        monkeypatch.setattr(
            "src.services.chat.websocket_manager.connection_manager.send_personal_message",
            mock_send,
        )

        sent = await fanout_app_update(
            announcement_id=1,
            org_id=org.id,
            announcement_title="Scheduled maintenance",
            announcement_content="We will be down at 2am UTC.",
            db_session=session,
        )

        assert sent == 2
        assert mock_send.await_count == 2
        pushed_user_ids = {call.args[1] for call in mock_send.await_args_list}
        assert pushed_user_ids == {user.id, other_user.id}
        for call in mock_send.await_args_list:
            payload = call.args[0]
            assert payload["type"] == "activity_notification"
            assert payload["data"]["notification_type"] == "app_update"
            assert payload["data"]["title"] == "Scheduled maintenance"

        # No notification rows are created for this trigger.
        assert session.exec(select(Notification)).all() == []

    async def test_one_push_failure_does_not_block_others(
        self, session: Session, user: User, other_user: User, org, monkeypatch
    ):
        await self._enroll_org_members(session, (user, other_user), org)

        from unittest.mock import AsyncMock

        mock_send = AsyncMock(side_effect=[RuntimeError("disconnected"), None])
        monkeypatch.setattr(
            "src.services.chat.websocket_manager.connection_manager.send_personal_message",
            mock_send,
        )

        sent = await fanout_app_update(
            announcement_id=1,
            org_id=org.id,
            announcement_title="Scheduled maintenance",
            announcement_content="We will be down at 2am UTC.",
            db_session=session,
        )

        assert sent == 1
