"""Tests for learning time-tracking heartbeat ingestion."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlmodel import select

from src.db.trail_sessions import TrailActivitySession
from src.db.users import AnonymousUser
from src.services.trail.tracking import (IDLE_GAP_SECONDS,
                                         MAX_HEARTBEAT_SECONDS,
                                         ActivityHeartbeat,
                                         record_activity_heartbeat)

from .conftest import current_user, make_activity, make_chapter, make_course


def _activity(session, org):
    course = make_course(session, org)
    chapter = make_chapter(session, org, course)
    return make_activity(session, org, course, chapter, order=1)


def _count_sessions(session, user_id, activity_id) -> int:
    return len(
        session.exec(
            select(TrailActivitySession).where(
                TrailActivitySession.user_id == user_id,
                TrailActivitySession.activity_id == activity_id,
            )
        ).all()
    )


@pytest.mark.asyncio
async def test_heartbeat_accumulates_in_same_session(session, org, student_user):
    activity = _activity(session, org)
    payload = ActivityHeartbeat(activity_uuid=activity.activity_uuid, seconds=30)

    await record_activity_heartbeat(None, current_user(student_user), payload, session)
    row = await record_activity_heartbeat(
        None, current_user(student_user), payload, session
    )

    assert row.seconds_spent == 60
    assert _count_sessions(session, student_user.id, activity.id) == 1


@pytest.mark.asyncio
async def test_heartbeat_caps_increment(session, org, student_user):
    activity = _activity(session, org)
    payload = ActivityHeartbeat(
        activity_uuid=activity.activity_uuid, seconds=MAX_HEARTBEAT_SECONDS + 5000
    )
    row = await record_activity_heartbeat(
        None, current_user(student_user), payload, session
    )
    assert row.seconds_spent == MAX_HEARTBEAT_SECONDS


@pytest.mark.asyncio
async def test_idle_gap_opens_new_session(session, org, student_user):
    activity = _activity(session, org)
    payload = ActivityHeartbeat(activity_uuid=activity.activity_uuid, seconds=30)

    first = await record_activity_heartbeat(
        None, current_user(student_user), payload, session
    )
    # Force the last heartbeat to be older than the idle gap.
    first.last_heartbeat_at = str(
        datetime.now(timezone.utc) - timedelta(seconds=IDLE_GAP_SECONDS + 60)
    )
    session.add(first)
    session.commit()

    await record_activity_heartbeat(None, current_user(student_user), payload, session)
    assert _count_sessions(session, student_user.id, activity.id) == 2


@pytest.mark.asyncio
async def test_heartbeat_unknown_activity_404(session, student_user):
    payload = ActivityHeartbeat(activity_uuid="activity_does_not_exist", seconds=30)
    with pytest.raises(HTTPException) as exc:
        await record_activity_heartbeat(
            None, current_user(student_user), payload, session
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_anonymous_cannot_record_time(session, org):
    course = make_course(session, org)
    chapter = make_chapter(session, org, course)
    activity = make_activity(session, org, course, chapter, order=1)
    payload = ActivityHeartbeat(activity_uuid=activity.activity_uuid, seconds=30)
    with pytest.raises(HTTPException) as exc:
        await record_activity_heartbeat(None, AnonymousUser(), payload, session)
    assert exc.value.status_code == 401
