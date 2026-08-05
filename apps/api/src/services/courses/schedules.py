from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, Request, status
from sqlmodel import Session, col, select

from src.db.courses.courses import Course
from src.db.courses.schedules import (CourseRegisterEntry,
                                      CourseRegisterEntryRead,
                                      CourseRegisterEntryUpdate,
                                      CourseRegisterPeriodRead,
                                      CourseRegisterPolicy,
                                      CourseRegisterPolicyRead,
                                      CourseRegisterPolicyUpdate,
                                      CourseRegisterSummaryRead,
                                      CourseTimetableEvent,
                                      CourseTimetableEventCreate,
                                      CourseTimetableEventRead,
                                      CourseTimetableEventUpdate,
                                      RegisterEntryMethodEnum,
                                      RegisterEntryStatusEnum,
                                      RegisterFrequencyEnum,
                                      StudentTimetableEventRead,
                                      TimetableVisibilityEnum)
from src.db.users import AnonymousUser, PublicUser
from src.security.courses_security import courses_rbac_check


async def get_timetable_events(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[CourseTimetableEventRead]:
    course = await _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(request, course_uuid, current_user, "read", db_session)

    statement = (
        select(CourseTimetableEvent)
        .where(CourseTimetableEvent.course_id == course.id)
        .order_by(col(CourseTimetableEvent.starts_at).asc())
    )

    if not await _can_manage_schedule(request, course_uuid, current_user, db_session):
        statement = statement.where(
            CourseTimetableEvent.visibility == TimetableVisibilityEnum.published
        )

    events = db_session.exec(statement).all()
    return [CourseTimetableEventRead(**event.model_dump()) for event in events]


async def get_my_timetable_events(
    request: Request,
    org_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[StudentTimetableEventRead]:
    await _require_authenticated(current_user)

    statement = (
        select(CourseTimetableEvent, Course)
        .where(CourseTimetableEvent.course_id == Course.id)
        .where(Course.org_id == org_id)
        .where(CourseTimetableEvent.visibility == TimetableVisibilityEnum.published)
        .where(CourseTimetableEvent.status != "cancelled")
        .order_by(col(CourseTimetableEvent.starts_at).asc())
    )
    rows = db_session.exec(statement).all()
    events: list[StudentTimetableEventRead] = []

    for event, course in rows:
        try:
            await courses_rbac_check(
                request, course.course_uuid, current_user, "read", db_session
            )
        except HTTPException:
            continue

        events.append(
            StudentTimetableEventRead(
                **event.model_dump(exclude={"course_id", "org_id"}),
                course_id=course.id,
                course_name=course.name,
                course_description=course.description,
            )
        )

    return events


async def create_timetable_event(
    request: Request,
    course_uuid: str,
    event_object: CourseTimetableEventCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> CourseTimetableEventRead:
    course = await _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(
        request,
        course_uuid,
        current_user,
        "update",
        db_session,
        require_course_ownership=True,
    )
    _validate_timetable_event(event_object)

    now = str(datetime.now(timezone.utc))
    event = CourseTimetableEvent(
        **event_object.model_dump(),
        event_uuid=f"timetable_event_{uuid4()}",
        course_uuid=course.course_uuid,
        course_id=course.id,
        org_id=course.org_id,
        creation_date=now,
        update_date=now,
    )

    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)
    return CourseTimetableEventRead(**event.model_dump())


async def update_timetable_event(
    request: Request,
    course_uuid: str,
    event_uuid: str,
    event_object: CourseTimetableEventUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> CourseTimetableEventRead:
    await _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(
        request,
        course_uuid,
        current_user,
        "update",
        db_session,
        require_course_ownership=True,
    )
    _validate_timetable_event(event_object)

    event = _get_event_or_404(course_uuid, event_uuid, db_session)
    for key, value in event_object.model_dump().items():
        setattr(event, key, value)
    event.update_date = str(datetime.now(timezone.utc))

    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)
    return CourseTimetableEventRead(**event.model_dump())


async def delete_timetable_event(
    request: Request,
    course_uuid: str,
    event_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    await _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(
        request,
        course_uuid,
        current_user,
        "delete",
        db_session,
        require_course_ownership=True,
    )

    event = _get_event_or_404(course_uuid, event_uuid, db_session)
    db_session.delete(event)
    db_session.commit()
    return {"status": "success", "event_uuid": event_uuid}


async def get_register_policy(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> CourseRegisterPolicyRead:
    course = await _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(request, course_uuid, current_user, "read", db_session)
    policy = _get_or_create_register_policy(course, db_session)
    return CourseRegisterPolicyRead(**policy.model_dump())


async def update_register_policy(
    request: Request,
    course_uuid: str,
    policy_object: CourseRegisterPolicyUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> CourseRegisterPolicyRead:
    course = await _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(
        request,
        course_uuid,
        current_user,
        "update",
        db_session,
        require_course_ownership=True,
    )
    _validate_register_policy(policy_object)

    policy = _get_or_create_register_policy(course, db_session)
    for key, value in policy_object.model_dump().items():
        if key == "course_uuid":
            continue
        setattr(policy, key, value)
    policy.update_date = str(datetime.now(timezone.utc))

    db_session.add(policy)
    db_session.commit()
    db_session.refresh(policy)
    return CourseRegisterPolicyRead(**policy.model_dump())


async def get_register_summary(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> CourseRegisterSummaryRead:
    course = await _get_course_or_404(course_uuid, db_session)
    await _require_authenticated(current_user)
    await courses_rbac_check(request, course_uuid, current_user, "read", db_session)

    policy = _get_or_create_register_policy(course, db_session)
    current_period = _resolve_current_period(course_uuid, policy, db_session)
    current_entry = _get_entry_for_period(
        course_uuid,
        current_user.id,
        current_period.starts_at,
        current_period.ends_at,
        current_period_timetable_event_uuid(policy, course_uuid, db_session),
        db_session,
    )

    statement = (
        select(CourseRegisterEntry)
        .where(CourseRegisterEntry.course_uuid == course_uuid)
        .where(CourseRegisterEntry.user_id == current_user.id)
        .order_by(col(CourseRegisterEntry.period_start).desc())
    )
    entries = db_session.exec(statement).all()

    return CourseRegisterSummaryRead(
        policy=CourseRegisterPolicyRead(**policy.model_dump()),
        current_period=current_period,
        current_entry=(
            CourseRegisterEntryRead(**current_entry.model_dump())
            if current_entry
            else None
        ),
        entries=[CourseRegisterEntryRead(**entry.model_dump()) for entry in entries],
    )


async def mark_register(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> CourseRegisterEntryRead:
    course = await _get_course_or_404(course_uuid, db_session)
    await _require_authenticated(current_user)
    await courses_rbac_check(request, course_uuid, current_user, "read", db_session)

    policy = _get_or_create_register_policy(course, db_session)
    if not policy.enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Register is disabled for this course",
        )

    period = _resolve_current_period(course_uuid, policy, db_session)
    now = _utcnow()
    opens_at = _parse_datetime(period.checkin_opens_at)
    closes_at = _parse_datetime(period.checkin_closes_at)

    if now < opens_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Register check-in window is not open yet",
        )
    if now > closes_at and not policy.allow_late:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Register check-in window is closed",
        )

    timetable_event_uuid = current_period_timetable_event_uuid(
        policy, course_uuid, db_session
    )
    existing = _get_entry_for_period(
        course_uuid,
        current_user.id,
        period.starts_at,
        period.ends_at,
        timetable_event_uuid,
        db_session,
    )
    if existing:
        return CourseRegisterEntryRead(**existing.model_dump())

    entry_status = (
        RegisterEntryStatusEnum.late
        if now > closes_at
        else RegisterEntryStatusEnum.marked
    )
    now_string = _datetime_to_api_string(now)
    entry = CourseRegisterEntry(
        entry_uuid=f"register_entry_{uuid4()}",
        course_uuid=course.course_uuid,
        course_id=course.id,
        org_id=course.org_id,
        user_id=current_user.id,
        timetable_event_uuid=timetable_event_uuid,
        period_start=period.starts_at,
        period_end=period.ends_at,
        status=entry_status,
        marked_at=now_string,
        method=RegisterEntryMethodEnum.student_self_mark,
        creation_date=now_string,
        update_date=now_string,
    )

    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)
    return CourseRegisterEntryRead(**entry.model_dump())


async def get_register_entries(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
    user_id: Optional[int] = None,
    status_filter: Optional[RegisterEntryStatusEnum] = None,
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
) -> list[CourseRegisterEntryRead]:
    await _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(
        request,
        course_uuid,
        current_user,
        "update",
        db_session,
        require_course_ownership=True,
    )

    statement = select(CourseRegisterEntry).where(
        CourseRegisterEntry.course_uuid == course_uuid
    )
    if user_id is not None:
        statement = statement.where(CourseRegisterEntry.user_id == user_id)
    if status_filter is not None:
        statement = statement.where(CourseRegisterEntry.status == status_filter)
    if period_start is not None:
        statement = statement.where(CourseRegisterEntry.period_start >= period_start)
    if period_end is not None:
        statement = statement.where(CourseRegisterEntry.period_end <= period_end)

    statement = statement.order_by(col(CourseRegisterEntry.period_start).desc())
    entries = db_session.exec(statement).all()
    return [CourseRegisterEntryRead(**entry.model_dump()) for entry in entries]


async def update_register_entry(
    request: Request,
    course_uuid: str,
    entry_uuid: str,
    entry_object: CourseRegisterEntryUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> CourseRegisterEntryRead:
    await _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(
        request,
        course_uuid,
        current_user,
        "update",
        db_session,
        require_course_ownership=True,
    )

    statement = (
        select(CourseRegisterEntry)
        .where(CourseRegisterEntry.course_uuid == course_uuid)
        .where(CourseRegisterEntry.entry_uuid == entry_uuid)
    )
    entry = db_session.exec(statement).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Register entry not found")

    for key, value in entry_object.model_dump().items():
        if value is not None:
            setattr(entry, key, value)
    entry.method = RegisterEntryMethodEnum.instructor_override
    entry.update_date = str(datetime.now(timezone.utc))

    db_session.add(entry)
    db_session.commit()
    db_session.refresh(entry)
    return CourseRegisterEntryRead(**entry.model_dump())


async def _can_manage_schedule(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> bool:
    try:
        await courses_rbac_check(
            request,
            course_uuid,
            current_user,
            "update",
            db_session,
            require_course_ownership=True,
        )
        return True
    except HTTPException:
        return False


async def _get_course_or_404(course_uuid: str, db_session: Session) -> Course:
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(statement).first()
    if not course or course.id is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _get_event_or_404(
    course_uuid: str, event_uuid: str, db_session: Session
) -> CourseTimetableEvent:
    statement = (
        select(CourseTimetableEvent)
        .where(CourseTimetableEvent.course_uuid == course_uuid)
        .where(CourseTimetableEvent.event_uuid == event_uuid)
    )
    event = db_session.exec(statement).first()
    if not event:
        raise HTTPException(status_code=404, detail="Timetable event not found")
    return event


def _get_or_create_register_policy(
    course: Course,
    db_session: Session,
) -> CourseRegisterPolicy:
    statement = select(CourseRegisterPolicy).where(
        CourseRegisterPolicy.course_uuid == course.course_uuid
    )
    policy = db_session.exec(statement).first()
    if policy:
        return policy

    now = str(datetime.now(timezone.utc))
    policy = CourseRegisterPolicy(
        policy_uuid=f"register_policy_{uuid4()}",
        course_uuid=course.course_uuid,
        course_id=course.id,
        org_id=course.org_id,
        enabled=True,
        frequency=RegisterFrequencyEnum.weekly,
        checkin_opens_minutes_before=15,
        checkin_closes_minutes_after=30,
        requires_enrollment=True,
        allow_late=True,
        linked_timetable_event_uuid=None,
        creation_date=now,
        update_date=now,
    )
    db_session.add(policy)
    db_session.commit()
    db_session.refresh(policy)
    return policy


def _validate_timetable_event(
    event_object: CourseTimetableEventCreate | CourseTimetableEventUpdate,
) -> None:
    if not event_object.title or not event_object.title.strip():
        raise HTTPException(status_code=422, detail="Title is required")

    starts_at = _parse_datetime(event_object.starts_at)
    ends_at = _parse_datetime(event_object.ends_at)
    if starts_at >= ends_at:
        raise HTTPException(
            status_code=422,
            detail="Timetable event start time must be before end time",
        )


def _validate_register_policy(policy_object: CourseRegisterPolicyUpdate) -> None:
    if policy_object.checkin_opens_minutes_before < 0:
        raise HTTPException(
            status_code=422,
            detail="checkin_opens_minutes_before must be non-negative",
        )
    if policy_object.checkin_closes_minutes_after < 0:
        raise HTTPException(
            status_code=422,
            detail="checkin_closes_minutes_after must be non-negative",
        )


async def _require_authenticated(current_user: PublicUser | AnonymousUser) -> None:
    if current_user.id == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required",
        )


def _resolve_current_period(
    course_uuid: str,
    policy: CourseRegisterPolicy,
    db_session: Session,
) -> CourseRegisterPeriodRead:
    now = _utcnow()

    if policy.frequency == RegisterFrequencyEnum.daily:
        starts_at = now.replace(hour=0, minute=0, second=0, microsecond=0)
        ends_at = starts_at + timedelta(days=1) - timedelta(milliseconds=1)
        return _period_from_bounds(starts_at, ends_at, starts_at, ends_at, now)

    event = _resolve_current_timetable_event(course_uuid, policy, db_session)
    if policy.frequency == RegisterFrequencyEnum.per_session and event:
        event_start = _parse_datetime(event.starts_at)
        event_end = _parse_datetime(event.ends_at)
        opens_at = event_start - timedelta(minutes=policy.checkin_opens_minutes_before)
        closes_at = event_end + timedelta(minutes=policy.checkin_closes_minutes_after)
        return _period_from_bounds(event_start, event_end, opens_at, closes_at, now)

    if policy.frequency in [
        RegisterFrequencyEnum.per_session,
        RegisterFrequencyEnum.manual,
    ]:
        closed_at = now - timedelta(minutes=1)
        return _period_from_bounds(now, now, closed_at, closed_at, now)

    if event and policy.linked_timetable_event_uuid:
        event_start = _parse_datetime(event.starts_at)
        event_end = _parse_datetime(event.ends_at)
        opens_at = event_start - timedelta(minutes=policy.checkin_opens_minutes_before)
        closes_at = event_end + timedelta(minutes=policy.checkin_closes_minutes_after)
    else:
        opens_at = now
        closes_at = None

    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7) - timedelta(milliseconds=1)
    return _period_from_bounds(
        week_start,
        week_end,
        opens_at,
        closes_at or week_end,
        now,
    )


def _period_from_bounds(
    starts_at: datetime,
    ends_at: datetime,
    opens_at: datetime,
    closes_at: datetime,
    now: datetime,
) -> CourseRegisterPeriodRead:
    return CourseRegisterPeriodRead(
        starts_at=_datetime_to_api_string(starts_at),
        ends_at=_datetime_to_api_string(ends_at),
        checkin_opens_at=_datetime_to_api_string(opens_at),
        checkin_closes_at=_datetime_to_api_string(closes_at),
        is_open=opens_at <= now <= closes_at,
    )


def _resolve_current_timetable_event(
    course_uuid: str,
    policy: CourseRegisterPolicy,
    db_session: Session,
) -> Optional[CourseTimetableEvent]:
    statement = select(CourseTimetableEvent).where(
        CourseTimetableEvent.course_uuid == course_uuid
    )

    if policy.linked_timetable_event_uuid:
        statement = statement.where(
            CourseTimetableEvent.event_uuid == policy.linked_timetable_event_uuid
        )
        return db_session.exec(statement).first()

    now = _utcnow()
    events = db_session.exec(
        statement.where(CourseTimetableEvent.register_required == True)  # noqa: E712
        .where(CourseTimetableEvent.visibility == TimetableVisibilityEnum.published)
        .order_by(col(CourseTimetableEvent.starts_at).asc())
    ).all()

    for event in events:
        event_start = _parse_datetime(event.starts_at)
        event_end = _parse_datetime(event.ends_at)
        opens_at = event_start - timedelta(minutes=policy.checkin_opens_minutes_before)
        closes_at = event_end + timedelta(minutes=policy.checkin_closes_minutes_after)
        if opens_at <= now <= closes_at:
            return event

    return None


def current_period_timetable_event_uuid(
    policy: CourseRegisterPolicy,
    course_uuid: str,
    db_session: Session,
) -> Optional[str]:
    event = _resolve_current_timetable_event(course_uuid, policy, db_session)
    return event.event_uuid if event else None


def _get_entry_for_period(
    course_uuid: str,
    user_id: int,
    period_start: str,
    period_end: str,
    timetable_event_uuid: Optional[str],
    db_session: Session,
) -> Optional[CourseRegisterEntry]:
    statement = (
        select(CourseRegisterEntry)
        .where(CourseRegisterEntry.course_uuid == course_uuid)
        .where(CourseRegisterEntry.user_id == user_id)
        .where(CourseRegisterEntry.period_start == period_start)
        .where(CourseRegisterEntry.period_end == period_end)
    )
    if timetable_event_uuid:
        statement = statement.where(
            CourseRegisterEntry.timetable_event_uuid == timetable_event_uuid
        )
    else:
        statement = statement.where(CourseRegisterEntry.timetable_event_uuid == None)  # noqa: E711

    return db_session.exec(statement).first()


def _parse_datetime(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _datetime_to_api_string(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
