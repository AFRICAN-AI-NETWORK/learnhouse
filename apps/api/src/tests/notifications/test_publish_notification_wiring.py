"""
Tests for the chapter/activity "publish" -> notification fan-out wiring:
a fan-out job must be enqueued exactly once, only on the False->True
published transition, and a scheduling failure must never break the
publish action itself.
"""

from datetime import datetime
from uuid import uuid4

import pytest
from unittest.mock import AsyncMock, MagicMock

from sqlmodel import Session

from src.db.courses.activities import (
    Activity,
    ActivitySubTypeEnum,
    ActivityTypeEnum,
    ActivityUpdate,
)
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import Chapter, ChapterUpdate
from src.services.courses import chapters as chapters_service
from src.services.courses.activities import activities as activities_service


@pytest.fixture(autouse=True)
def _bypass_rbac(monkeypatch):
    monkeypatch.setattr(
        chapters_service,
        "courses_rbac_check_for_chapters",
        AsyncMock(return_value=True),
    )
    monkeypatch.setattr(
        activities_service,
        "courses_rbac_check_for_activities",
        AsyncMock(return_value=True),
    )


class TestChapterPublishFanout:
    async def _make_chapter(self, session: Session, course, published: bool) -> Chapter:
        chapter = Chapter(
            name="Advanced Concepts",
            org_id=course.org_id,
            course_id=course.id,
            published=published,
            chapter_uuid=f"chapter_{uuid4()}",
            creation_date=str(datetime.utcnow()),
            update_date=str(datetime.utcnow()),
        )
        session.add(chapter)
        session.commit()
        session.refresh(chapter)

        # Publishing requires the chapter's activities to sum to 100 points.
        activity = Activity(
            name="Lesson 1",
            activity_type=ActivityTypeEnum.TYPE_CUSTOM,
            activity_sub_type=ActivitySubTypeEnum.SUBTYPE_CUSTOM,
            points=100,
            published=True,
            org_id=course.org_id,
            course_id=course.id,
            activity_uuid=f"activity_{uuid4()}",
            creation_date=str(datetime.utcnow()),
            update_date=str(datetime.utcnow()),
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
                org_id=course.org_id,
                creation_date=str(datetime.utcnow()),
                update_date=str(datetime.utcnow()),
            )
        )
        session.commit()
        return chapter

    @pytest.mark.asyncio
    async def test_enqueues_job_on_publish_transition(
        self, session: Session, course, monkeypatch
    ):
        chapter = await self._make_chapter(session, course, published=False)
        mock_enqueue = MagicMock()
        monkeypatch.setattr(
            "src.services.notifications.scheduling.enqueue_job", mock_enqueue
        )

        await chapters_service.update_chapter(
            request=None,
            chapter_object=ChapterUpdate(published=True),
            chapter_id=chapter.id,
            current_user=object(),
            db_session=session,
        )

        mock_enqueue.assert_called_once()
        job_id, func, args = mock_enqueue.call_args[0]
        assert job_id == f"chapter_notif_{chapter.id}"
        assert args == [chapter.id]

    @pytest.mark.asyncio
    async def test_no_job_when_already_published(
        self, session: Session, course, monkeypatch
    ):
        chapter = await self._make_chapter(session, course, published=True)
        mock_enqueue = MagicMock()
        monkeypatch.setattr(
            "src.services.notifications.scheduling.enqueue_job", mock_enqueue
        )

        await chapters_service.update_chapter(
            request=None,
            chapter_object=ChapterUpdate(published=True, name="Renamed"),
            chapter_id=chapter.id,
            current_user=object(),
            db_session=session,
        )

        mock_enqueue.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_job_when_staying_unpublished(
        self, session: Session, course, monkeypatch
    ):
        chapter = await self._make_chapter(session, course, published=False)
        mock_enqueue = MagicMock()
        monkeypatch.setattr(
            "src.services.notifications.scheduling.enqueue_job", mock_enqueue
        )

        await chapters_service.update_chapter(
            request=None,
            chapter_object=ChapterUpdate(name="Renamed"),
            chapter_id=chapter.id,
            current_user=object(),
            db_session=session,
        )

        mock_enqueue.assert_not_called()

    @pytest.mark.asyncio
    async def test_scheduling_failure_does_not_break_publish(
        self, session: Session, course, monkeypatch
    ):
        """
        enqueue_job is documented to never raise on its own (see
        test_scheduling.py), but the publish path wraps the call in its own
        try/except too — defense in depth, so a future change to
        enqueue_job's contract can't silently break chapter publishing.
        """
        chapter = await self._make_chapter(session, course, published=False)
        monkeypatch.setattr(
            "src.services.notifications.scheduling.enqueue_job",
            MagicMock(side_effect=RuntimeError("scheduler down")),
        )

        result = await chapters_service.update_chapter(
            request=None,
            chapter_object=ChapterUpdate(published=True),
            chapter_id=chapter.id,
            current_user=object(),
            db_session=session,
        )

        assert result.id == chapter.id
        assert result.published is True


class TestActivityPublishFanout:
    async def _make_activity(
        self, session: Session, course, published: bool
    ) -> Activity:
        activity = Activity(
            name="Lesson 3",
            activity_type=ActivityTypeEnum.TYPE_CUSTOM,
            activity_sub_type=ActivitySubTypeEnum.SUBTYPE_CUSTOM,
            published=published,
            org_id=course.org_id,
            course_id=course.id,
            activity_uuid=f"activity_{uuid4()}",
            creation_date=str(datetime.utcnow()),
            update_date=str(datetime.utcnow()),
        )
        session.add(activity)
        session.commit()
        session.refresh(activity)
        return activity

    @pytest.mark.asyncio
    async def test_enqueues_job_on_publish_transition(
        self, session: Session, course, monkeypatch
    ):
        activity = await self._make_activity(session, course, published=False)
        mock_enqueue = MagicMock()
        monkeypatch.setattr(
            "src.services.notifications.scheduling.enqueue_job", mock_enqueue
        )

        await activities_service.update_activity(
            request=None,
            activity_object=ActivityUpdate(published=True),
            activity_uuid=activity.activity_uuid,
            current_user=object(),
            db_session=session,
        )

        mock_enqueue.assert_called_once()
        job_id, func, args = mock_enqueue.call_args[0]
        assert job_id == f"activity_notif_{activity.id}"
        assert args == [activity.id]

    @pytest.mark.asyncio
    async def test_no_job_when_already_published(
        self, session: Session, course, monkeypatch
    ):
        activity = await self._make_activity(session, course, published=True)
        mock_enqueue = MagicMock()
        monkeypatch.setattr(
            "src.services.notifications.scheduling.enqueue_job", mock_enqueue
        )

        await activities_service.update_activity(
            request=None,
            activity_object=ActivityUpdate(published=True, name="Renamed"),
            activity_uuid=activity.activity_uuid,
            current_user=object(),
            db_session=session,
        )

        mock_enqueue.assert_not_called()
