from datetime import datetime, timedelta, tzinfo
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import Session, select

from src.db.courses.assignments import Assignment
from src.db.courses.chapters import Chapter
from src.db.courses.courses import Course
from src.db.courses.programme_weeks import ProgrammeWeek
from src.db.courses.schedules import (
    CourseTimetableEvent,
    TimetableStatusEnum,
    TimetableVisibilityEnum,
)
from src.db.users import AnonymousUser, PublicUser
from src.security.calendar_security import (
    require_calendar_right,
    require_course_calendar_access,
)
from src.services.academic_calendar import get_primary_org_id
from src.services.courses.rest_day_rules import find_conflicts, occurrences
from src.services.courses.weekly_schedule import get_schedule_days, resolve_schedule
from src.services.utils.datetimes import parse_instant, resolve_zone


class RestDayConflict(BaseModel):
    item_type: str
    item_uuid: str
    title: str
    conflicting_dates: list[str]
    timezone: str


def needs_rest_day_check(before: Any | None, after: Any) -> bool:
    """Return whether a write can newly affect rest-day enforcement."""
    if before is None:
        return _is_visible(after)
    if not _is_visible(after):
        return False
    if not _is_visible(before):
        return True
    fields = ("starts_at", "ends_at", "recurrence", "timezone", "visibility", "status", "due_date", "published")
    return any(getattr(before, field, None) != getattr(after, field, None) for field in fields)


def assert_publishable(
    spans: list[tuple[datetime, datetime]],
    zone: ZoneInfo,
    course_id: int,
    db_session: Session,
) -> None:
    schedule = resolve_schedule(
        db_session.exec(select(Course).where(Course.id == course_id)).one(),
        db_session,
    )
    if not schedule.rest_day_enforced:
        return
    rest_weekdays = {
        day.weekday for day in get_schedule_days(schedule, db_session) if day.is_rest_day
    }
    conflicts = find_conflicts(spans, zone, rest_weekdays)
    if conflicts:
        dates = ", ".join(item.isoformat() for item in conflicts)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Published item falls on a rest day: {dates}",
        )


def assert_event_publishable(event: CourseTimetableEvent, db_session: Session) -> None:
    zone = resolve_zone(event.timezone)
    if zone is None:
        raise HTTPException(status_code=422, detail="Timezone must be a valid IANA name")
    until = _programme_week_end(event, db_session)
    assert_publishable(
        list(
            occurrences(
                parse_instant(event.starts_at),
                parse_instant(event.ends_at),
                getattr(event.recurrence, "value", event.recurrence),
                until,
            )
        ),
        zone,
        event.course_id,
        db_session,
    )


def assert_due_date_publishable(item: Any, db_session: Session) -> None:
    if not item.due_date:
        return
    course = db_session.exec(select(Course).where(Course.id == item.course_id)).one()
    schedule = resolve_schedule(course, db_session)
    zone = _due_timezone(item.due_date) or resolve_zone(schedule.timezone)
    if zone is None:
        raise HTTPException(status_code=422, detail="Due date must include a valid timezone")
    instant = _parse_due_instant(item.due_date, zone)
    assert_publishable(
        [(instant, instant)],
        zone,
        item.course_id,
        db_session,
    )


async def list_rest_day_conflicts(
    request: Request,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
    course_uuid: str | None = None,
) -> list[RestDayConflict]:
    if course_uuid is None:
        await require_calendar_right(current_user, "read", db_session)
        course_id = None
        org_id = get_primary_org_id(db_session)
    else:
        course = db_session.exec(
            select(Course).where(Course.course_uuid == course_uuid)
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        await require_course_calendar_access(
            request, course_uuid, current_user, "read", db_session
        )
        course_id = course.id
        org_id = course.org_id

    schedule_by_course: dict[int, Any] = {}
    conflicts: list[RestDayConflict] = []
    event_query = select(CourseTimetableEvent).where(
        CourseTimetableEvent.visibility == TimetableVisibilityEnum.published,
        CourseTimetableEvent.status == TimetableStatusEnum.scheduled,
    )
    if course_id is not None:
        event_query = event_query.where(CourseTimetableEvent.course_id == course_id)
    else:
        event_query = event_query.join(Course).where(Course.org_id == org_id)

    for event in db_session.exec(event_query).all():
        result = _conflict_dates_for_event(event, schedule_by_course, db_session)
        if result:
            conflicts.append(
                RestDayConflict(
                    item_type="timetable_event",
                    item_uuid=event.event_uuid,
                    title=event.title,
                    conflicting_dates=[item.isoformat() for item in result],
                    timezone=event.timezone,
                )
            )

    chapters = select(Chapter).where(Chapter.published.is_(True), Chapter.due_date.is_not(None))
    assignments = select(Assignment).where(
        Assignment.published.is_(True), Assignment.due_date.is_not(None)
    )
    if course_id is not None:
        chapters = chapters.where(Chapter.course_id == course_id)
        assignments = assignments.where(Assignment.course_id == course_id)
    else:
        chapters = chapters.join(Course).where(Course.org_id == org_id)
        assignments = assignments.join(Course).where(Course.org_id == org_id)

    for item, item_type, item_uuid in [
        (item, "chapter", item.chapter_uuid)
        for item in db_session.exec(chapters).all()
    ] + [
        (item, "assignment", item.assignment_uuid)
        for item in db_session.exec(assignments).all()
    ]:
        result = _conflict_dates_for_due_date(item, schedule_by_course, db_session)
        if result:
            conflicts.append(
                RestDayConflict(
                    item_type=item_type,
                    item_uuid=item_uuid,
                    title=item.name if item_type == "chapter" else item.title,
                    conflicting_dates=[day.isoformat() for day in result],
                    timezone=_due_timezone_label(item.due_date),
                )
            )
    return conflicts


def _is_visible(item: Any) -> bool:
    if hasattr(item, "visibility"):
        return (
            item.visibility == TimetableVisibilityEnum.published
            and item.status == TimetableStatusEnum.scheduled
        )
    return bool(getattr(item, "published", False))


def _conflict_dates_for_event(
    event: CourseTimetableEvent, schedules: dict[int, Any], db_session: Session
) -> list:
    schedule = schedules.setdefault(
        event.course_id,
        resolve_schedule(
            db_session.exec(select(Course).where(Course.id == event.course_id)).one(),
            db_session,
        ),
    )
    zone = resolve_zone(event.timezone)
    if zone is None:
        return []
    until = _programme_week_end(event, db_session)
    spans = occurrences(
        parse_instant(event.starts_at),
        parse_instant(event.ends_at),
        getattr(event.recurrence, "value", event.recurrence),
        until,
    )
    rest_weekdays = {
        day.weekday for day in get_schedule_days(schedule, db_session) if day.is_rest_day
    }
    return find_conflicts(spans, zone, rest_weekdays)


def _conflict_dates_for_due_date(
    item: Any, schedules: dict[int, Any], db_session: Session
) -> list:
    course = db_session.exec(select(Course).where(Course.id == item.course_id)).one()
    schedule = schedules.setdefault(item.course_id, resolve_schedule(course, db_session))
    zone = _due_timezone(item.due_date) or resolve_zone(schedule.timezone)
    if zone is None:
        return []
    rest_weekdays = {
        day.weekday for day in get_schedule_days(schedule, db_session) if day.is_rest_day
    }
    instant = _parse_due_instant(item.due_date, zone)
    return find_conflicts([(instant, instant)], zone, rest_weekdays)


def _programme_week_end(event: CourseTimetableEvent, db_session: Session) -> datetime:
    if event.programme_week_id:
        week = db_session.get(ProgrammeWeek, event.programme_week_id)
        if week:
            return parse_instant(f"{week.ends_on}T23:59:59")
    return parse_instant(event.starts_at) + timedelta(days=366)


def _due_timezone(value: str) -> tzinfo | None:
    parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    return parsed.tzinfo


def _due_timezone_label(value: str) -> str:
    zone = _due_timezone(value)
    return str(zone) if zone else ""


def _parse_due_instant(value: str, fallback_zone: tzinfo) -> datetime:
    parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=fallback_zone)
    return parsed
