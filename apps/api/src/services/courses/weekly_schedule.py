from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from src.db.courses.courses import Course
from src.db.courses.weekly_schedule import (
    LearningPhaseEnum,
    WeeklyOperatingSchedule,
    WeeklyOperatingScheduleBase,
    WeeklyOperatingScheduleDay,
    WeeklyOperatingScheduleDayBase,
    WeeklyOperatingScheduleDayRead,
    WeeklyOperatingScheduleRead,
    WeeklyOperatingScheduleUpdate,
)
from src.db.organizations import Organization
from src.db.users import AnonymousUser, PublicUser
from src.security.calendar_security import (
    require_calendar_right,
    require_course_calendar_access,
)
from src.security.courses_security import courses_rbac_check
from src.services.utils.datetimes import resolve_zone

# Monday to Sunday.
DEFAULT_WEEK: tuple[tuple[LearningPhaseEnum, bool], ...] = (
    (LearningPhaseEnum.learn, False),
    (LearningPhaseEnum.practice, False),
    (LearningPhaseEnum.connect, False),
    (LearningPhaseEnum.apply, False),
    (LearningPhaseEnum.build, False),
    (LearningPhaseEnum.support, False),
    (LearningPhaseEnum.rest, True),
)


# ── Endpoints ────────────────────────────────────────────────────────────────


async def get_default_schedule(
    current_user: PublicUser | AnonymousUser, db_session: Session
) -> WeeklyOperatingScheduleRead:
    _require_authenticated(current_user)
    schedule = get_or_create_default_schedule(db_session)
    return _to_read(schedule, None, db_session)


async def update_default_schedule(
    schedule_object: WeeklyOperatingScheduleUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> WeeklyOperatingScheduleRead:
    await require_calendar_right(current_user, "update", db_session)
    schedule = get_or_create_default_schedule(db_session)
    _apply_update(schedule, schedule_object, db_session)
    return _to_read(schedule, None, db_session)


async def get_course_schedule(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> WeeklyOperatingScheduleRead:
    """The course override when one exists, otherwise the organization default."""
    course = _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(request, course_uuid, current_user, "read", db_session)
    return _to_read(resolve_schedule(course, db_session), course, db_session)


async def upsert_course_schedule(
    request: Request,
    course_uuid: str,
    schedule_object: WeeklyOperatingScheduleUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> WeeklyOperatingScheduleRead:
    course = _get_course_or_404(course_uuid, db_session)
    await require_course_calendar_access(
        request, course_uuid, current_user, "update", db_session
    )
    schedule = _get_course_override(course, db_session) or _create_course_override(
        course, db_session
    )
    _apply_update(schedule, schedule_object, db_session)
    return _to_read(schedule, course, db_session)


async def delete_course_schedule(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    """Remove the course override so the course follows the default again."""
    course = _get_course_or_404(course_uuid, db_session)
    await require_course_calendar_access(
        request, course_uuid, current_user, "delete", db_session
    )
    schedule = _get_course_override(course, db_session)
    if not schedule:
        raise HTTPException(
            status_code=404, detail="This course has no weekly schedule override"
        )

    for day in get_schedule_days(schedule, db_session):
        db_session.delete(day)
    db_session.delete(schedule)
    db_session.commit()
    return {"status": "success", "course_uuid": course_uuid}


# ── Shared lookups ───────────────────────────────────────────────────────────


def get_or_create_default_schedule(db_session: Session) -> WeeklyOperatingSchedule:
    existing = _get_default_schedule(db_session)
    if existing:
        return existing

    organization = db_session.exec(
        select(Organization).order_by(col(Organization.id).asc())
    ).first()
    if not organization or organization.id is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    try:
        return _create_schedule(
            organization.id,
            None,
            _default_days(),
            WeeklyOperatingScheduleBase(),
            db_session,
        )
    except IntegrityError:
        # A concurrent request created the default first.
        db_session.rollback()
        existing = _get_default_schedule(db_session)
        if not existing:
            raise
        return existing


def resolve_schedule(course: Course, db_session: Session) -> WeeklyOperatingSchedule:
    """Single place that decides which schedule governs a course."""
    return _get_course_override(course, db_session) or get_or_create_default_schedule(
        db_session
    )


def get_schedule_days(
    schedule: WeeklyOperatingSchedule, db_session: Session
) -> list[WeeklyOperatingScheduleDay]:
    statement = (
        select(WeeklyOperatingScheduleDay)
        .where(WeeklyOperatingScheduleDay.schedule_id == schedule.id)
        .order_by(col(WeeklyOperatingScheduleDay.weekday).asc())
    )
    return list(db_session.exec(statement).all())


# ── Internals ────────────────────────────────────────────────────────────────


def _require_authenticated(current_user: PublicUser | AnonymousUser) -> None:
    if current_user.id == 0:
        raise HTTPException(status_code=401, detail="Authentication is required")


def _get_course_or_404(course_uuid: str, db_session: Session) -> Course:
    course = db_session.exec(
        select(Course).where(Course.course_uuid == course_uuid)
    ).first()
    if not course or course.id is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _get_default_schedule(db_session: Session) -> WeeklyOperatingSchedule | None:
    statement = (
        select(WeeklyOperatingSchedule)
        .where(col(WeeklyOperatingSchedule.course_id).is_(None))
        .order_by(col(WeeklyOperatingSchedule.id).asc())
    )
    return db_session.exec(statement).first()


def _get_course_override(
    course: Course, db_session: Session
) -> WeeklyOperatingSchedule | None:
    return db_session.exec(
        select(WeeklyOperatingSchedule).where(
            WeeklyOperatingSchedule.course_id == course.id
        )
    ).first()


def _default_days() -> list[WeeklyOperatingScheduleDayBase]:
    return [
        WeeklyOperatingScheduleDayBase(weekday=weekday, phase=phase, is_rest_day=rest)
        for weekday, (phase, rest) in enumerate(DEFAULT_WEEK)
    ]


def _create_course_override(
    course: Course, db_session: Session
) -> WeeklyOperatingSchedule:
    """Start the override as a copy of the default so it is complete from day one."""
    default = get_or_create_default_schedule(db_session)
    days = [
        WeeklyOperatingScheduleDayBase(
            weekday=day.weekday, phase=day.phase, is_rest_day=day.is_rest_day
        )
        for day in get_schedule_days(default, db_session)
    ]
    return _create_schedule(course.org_id, course.id, days, default, db_session)


def _create_schedule(
    org_id: int,
    course_id: int | None,
    days: list[WeeklyOperatingScheduleDayBase],
    settings: WeeklyOperatingScheduleBase,
    db_session: Session,
) -> WeeklyOperatingSchedule:
    now = str(datetime.now(UTC))
    schedule = WeeklyOperatingSchedule(
        schedule_uuid=f"weekly_schedule_{uuid4()}",
        org_id=org_id,
        course_id=course_id,
        name=settings.name,
        timezone=settings.timezone,
        rest_day_enforced=settings.rest_day_enforced,
        creation_date=now,
        update_date=now,
    )
    db_session.add(schedule)
    db_session.flush()
    for day in days:
        db_session.add(
            WeeklyOperatingScheduleDay(schedule_id=schedule.id, **day.model_dump())
        )
    db_session.commit()
    db_session.refresh(schedule)
    return schedule


def _apply_update(
    schedule: WeeklyOperatingSchedule,
    schedule_object: WeeklyOperatingScheduleUpdate,
    db_session: Session,
) -> None:
    _validate_update(schedule_object)

    days = {day.weekday: day for day in get_schedule_days(schedule, db_session)}
    incoming_days = schedule_object.days or []
    rest_by_weekday = {weekday: day.is_rest_day for weekday, day in days.items()}
    rest_by_weekday.update({day.weekday: day.is_rest_day for day in incoming_days})
    if all(rest_by_weekday.values()):
        raise HTTPException(
            status_code=422, detail="At least one weekday must not be a rest day"
        )

    if schedule_object.name is not None:
        schedule.name = schedule_object.name.strip()
    if schedule_object.timezone is not None:
        schedule.timezone = schedule_object.timezone.strip()
    if schedule_object.rest_day_enforced is not None:
        schedule.rest_day_enforced = schedule_object.rest_day_enforced

    for incoming in incoming_days:
        day = days.get(incoming.weekday)
        if day is None:
            day = WeeklyOperatingScheduleDay(
                schedule_id=schedule.id, **incoming.model_dump()
            )
            days[incoming.weekday] = day
        else:
            day.phase = incoming.phase
            day.is_rest_day = incoming.is_rest_day
        db_session.add(day)

    schedule.update_date = str(datetime.now(UTC))
    db_session.add(schedule)
    db_session.commit()
    db_session.refresh(schedule)


def _validate_update(schedule_object: WeeklyOperatingScheduleUpdate) -> None:
    if schedule_object.name is not None and not schedule_object.name.strip():
        raise HTTPException(status_code=422, detail="Name cannot be empty")

    if schedule_object.timezone is not None and not resolve_zone(
        schedule_object.timezone
    ):
        raise HTTPException(
            status_code=422,
            detail="Timezone must be a valid IANA name, for example Africa/Lagos",
        )

    weekdays = [day.weekday for day in schedule_object.days or []]
    if any(weekday < 0 or weekday > 6 for weekday in weekdays):
        raise HTTPException(
            status_code=422, detail="Weekday must be between 0 (Monday) and 6 (Sunday)"
        )
    if len(weekdays) != len(set(weekdays)):
        raise HTTPException(status_code=422, detail="Each weekday can be listed once")


def _to_read(
    schedule: WeeklyOperatingSchedule,
    course: Course | None,
    db_session: Session,
) -> WeeklyOperatingScheduleRead:
    return WeeklyOperatingScheduleRead(
        **schedule.model_dump(include={"name", "timezone", "rest_day_enforced"}),
        schedule_uuid=schedule.schedule_uuid,
        course_uuid=course.course_uuid if course else None,
        is_course_override=schedule.course_id is not None,
        days=[
            WeeklyOperatingScheduleDayRead(
                weekday=day.weekday, phase=day.phase, is_rest_day=day.is_rest_day
            )
            for day in get_schedule_days(schedule, db_session)
        ],
        creation_date=schedule.creation_date,
        update_date=schedule.update_date,
    )
