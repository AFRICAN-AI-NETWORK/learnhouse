from datetime import UTC, date, datetime
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlmodel import Session, col, select

from src.db.academic_calendar import (
    AcademicCohort,
    AcademicCohortCreate,
    AcademicCohortRead,
    AcademicCohortUpdate,
    AcademicYear,
    AcademicYearCreate,
    AcademicYearRead,
    AcademicYearUpdate,
    CourseAcademicCohort,
    CourseAcademicCohortsUpdate,
)
from src.db.courses.courses import Course
from src.db.organizations import Organization
from src.db.users import AnonymousUser, PublicUser
from src.security.calendar_security import (
    require_authenticated,
    require_calendar_right,
    require_course_calendar_access,
)
from src.security.courses_security import courses_rbac_check
from src.services.utils.datetimes import parse_calendar_date

# ── Academic years ───────────────────────────────────────────────────────────


async def create_academic_year(
    year_object: AcademicYearCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> AcademicYearRead:
    await require_calendar_right(current_user, "create", db_session)

    now = str(datetime.now(UTC))
    year = AcademicYear(
        **year_object.model_dump(),
        academic_year_uuid=f"academic_year_{uuid4()}",
        org_id=get_primary_org_id(db_session),
        creation_date=now,
        update_date=now,
    )
    _validate_year(year, db_session)

    db_session.add(year)
    db_session.commit()
    db_session.refresh(year)
    return _year_to_read(year)


async def list_academic_years(
    current_user: PublicUser | AnonymousUser, db_session: Session
) -> list[AcademicYearRead]:
    require_authenticated(current_user)
    statement = select(AcademicYear).order_by(col(AcademicYear.start_date).desc())
    return [_year_to_read(year) for year in db_session.exec(statement).all()]


async def get_active_academic_year(
    current_user: PublicUser | AnonymousUser, db_session: Session
) -> AcademicYearRead:
    """The latest active year, or the latest year when none is active."""
    require_authenticated(current_user)
    statement = select(AcademicYear).order_by(
        col(AcademicYear.is_active).desc(), col(AcademicYear.start_date).desc()
    )
    year = db_session.exec(statement).first()
    if not year:
        raise HTTPException(status_code=404, detail="No academic year found")
    return _year_to_read(year)


async def update_academic_year(
    academic_year_uuid: str,
    year_object: AcademicYearUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> AcademicYearRead:
    await require_calendar_right(current_user, "update", db_session)
    year = _get_year_or_404(academic_year_uuid, db_session)

    candidate = _with_changes(year, year_object)
    _validate_year(candidate, db_session)
    for cohort in _get_year_cohorts(year, db_session):
        _validate_cohort(cohort, candidate)

    _apply_changes(year, year_object)
    db_session.add(year)
    db_session.commit()
    db_session.refresh(year)
    return _year_to_read(year)


async def delete_academic_year(
    academic_year_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    await require_calendar_right(current_user, "delete", db_session)
    year = _get_year_or_404(academic_year_uuid, db_session)
    if _get_year_cohorts(year, db_session):
        raise HTTPException(
            status_code=409,
            detail="Remove this academic year's cohorts before deleting it",
        )

    db_session.delete(year)
    db_session.commit()
    return {"status": "success", "academic_year_uuid": academic_year_uuid}


# ── Academic cohorts ─────────────────────────────────────────────────────────


async def create_academic_cohort(
    cohort_object: AcademicCohortCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> AcademicCohortRead:
    await require_calendar_right(current_user, "create", db_session)
    year = _get_year_or_404(cohort_object.academic_year_uuid, db_session)

    now = str(datetime.now(UTC))
    cohort = AcademicCohort(
        **cohort_object.model_dump(exclude={"academic_year_uuid"}),
        academic_cohort_uuid=f"academic_cohort_{uuid4()}",
        academic_year_id=year.id,
        org_id=year.org_id,
        creation_date=now,
        update_date=now,
    )
    _validate_cohort(cohort, year)

    db_session.add(cohort)
    db_session.commit()
    db_session.refresh(cohort)
    return _cohort_to_read(cohort, year.academic_year_uuid)


async def list_academic_cohorts(
    academic_year_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[AcademicCohortRead]:
    require_authenticated(current_user)
    year = _get_year_or_404(academic_year_uuid, db_session)
    return [
        _cohort_to_read(cohort, year.academic_year_uuid)
        for cohort in _get_year_cohorts(year, db_session)
    ]


async def update_academic_cohort(
    academic_cohort_uuid: str,
    cohort_object: AcademicCohortUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> AcademicCohortRead:
    await require_calendar_right(current_user, "update", db_session)
    cohort = _get_cohort_or_404(academic_cohort_uuid, db_session)
    year = db_session.get(AcademicYear, cohort.academic_year_id)

    _validate_cohort(_with_changes(cohort, cohort_object), year)

    _apply_changes(cohort, cohort_object)
    db_session.add(cohort)
    db_session.commit()
    db_session.refresh(cohort)
    return _cohort_to_read(cohort, year.academic_year_uuid)


async def delete_academic_cohort(
    academic_cohort_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    await require_calendar_right(current_user, "delete", db_session)
    cohort = _get_cohort_or_404(academic_cohort_uuid, db_session)
    linked = db_session.exec(
        select(CourseAcademicCohort).where(
            CourseAcademicCohort.academic_cohort_id == cohort.id
        )
    ).first()
    if linked:
        raise HTTPException(
            status_code=409,
            detail="Unlink this cohort from its courses before deleting it",
        )

    db_session.delete(cohort)
    db_session.commit()
    return {"status": "success", "academic_cohort_uuid": academic_cohort_uuid}


# ── Course links ─────────────────────────────────────────────────────────────


async def set_course_cohorts(
    request: Request,
    course_uuid: str,
    cohorts_object: CourseAcademicCohortsUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[AcademicCohortRead]:
    """Make the course run under exactly the listed cohorts."""
    course = _get_course_or_404(course_uuid, db_session)
    await require_course_calendar_access(
        request, course_uuid, current_user, "update", db_session
    )

    wanted_uuids = set(cohorts_object.academic_cohort_uuids)
    wanted = db_session.exec(
        select(AcademicCohort).where(
            col(AcademicCohort.academic_cohort_uuid).in_(wanted_uuids)
        )
    ).all()
    missing = wanted_uuids - {cohort.academic_cohort_uuid for cohort in wanted}
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Academic cohort not found: {', '.join(sorted(missing))}",
        )

    links = {
        link.academic_cohort_id: link for link in _get_course_links(course, db_session)
    }
    wanted_ids = {cohort.id for cohort in wanted}
    for cohort_id, link in links.items():
        if cohort_id not in wanted_ids:
            db_session.delete(link)
    for cohort_id in wanted_ids - links.keys():
        db_session.add(
            CourseAcademicCohort(
                course_id=course.id,
                academic_cohort_id=cohort_id,
                org_id=course.org_id,
                creation_date=str(datetime.now(UTC)),
            )
        )
    db_session.commit()
    return _course_cohorts(course, db_session)


async def list_course_cohorts(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[AcademicCohortRead]:
    course = _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(request, course_uuid, current_user, "read", db_session)
    return _course_cohorts(course, db_session)


# ── Shared lookups ───────────────────────────────────────────────────────────


def get_primary_org_id(db_session: Session) -> int:
    """Id of the organization this single-organization deployment serves."""
    organization = db_session.exec(
        select(Organization).order_by(col(Organization.id).asc())
    ).first()
    if not organization or organization.id is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization.id


# ── Internals ────────────────────────────────────────────────────────────────


def _get_year_or_404(academic_year_uuid: str, db_session: Session) -> AcademicYear:
    year = db_session.exec(
        select(AcademicYear).where(
            AcademicYear.academic_year_uuid == academic_year_uuid
        )
    ).first()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    return year


def _get_cohort_or_404(
    academic_cohort_uuid: str, db_session: Session
) -> AcademicCohort:
    cohort = db_session.exec(
        select(AcademicCohort).where(
            AcademicCohort.academic_cohort_uuid == academic_cohort_uuid
        )
    ).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Academic cohort not found")
    return cohort


def _get_course_or_404(course_uuid: str, db_session: Session) -> Course:
    course = db_session.exec(
        select(Course).where(Course.course_uuid == course_uuid)
    ).first()
    if not course or course.id is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _get_year_cohorts(year: AcademicYear, db_session: Session) -> list[AcademicCohort]:
    statement = (
        select(AcademicCohort)
        .where(AcademicCohort.academic_year_id == year.id)
        .order_by(col(AcademicCohort.start_date).asc())
    )
    return list(db_session.exec(statement).all())


def _get_course_links(
    course: Course, db_session: Session
) -> list[CourseAcademicCohort]:
    return list(
        db_session.exec(
            select(CourseAcademicCohort).where(
                CourseAcademicCohort.course_id == course.id
            )
        ).all()
    )


def _course_cohorts(course: Course, db_session: Session) -> list[AcademicCohortRead]:
    statement = (
        select(AcademicCohort, AcademicYear.academic_year_uuid)
        .join(
            CourseAcademicCohort,
            CourseAcademicCohort.academic_cohort_id == AcademicCohort.id,
        )
        .join(AcademicYear, AcademicYear.id == AcademicCohort.academic_year_id)
        .where(CourseAcademicCohort.course_id == course.id)
        .order_by(col(AcademicCohort.start_date).asc())
    )
    return [
        _cohort_to_read(cohort, year_uuid)
        for cohort, year_uuid in db_session.exec(statement).all()
    ]


def _with_changes[RowT: (AcademicYear, AcademicCohort)](
    row: RowT, changes: AcademicYearUpdate | AcademicCohortUpdate
) -> RowT:
    """Unsaved copy of ``row`` with the changes applied, for validation."""
    return type(row)(**{**row.model_dump(), **changes.model_dump(exclude_unset=True)})


def _apply_changes(
    row: AcademicYear | AcademicCohort,
    changes: AcademicYearUpdate | AcademicCohortUpdate,
) -> None:
    """Copy the fields the client sent onto the row."""
    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    row.update_date = str(datetime.now(UTC))


def _parse_date(value: str, label: str) -> date:
    try:
        return parse_calendar_date(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=422, detail=f"{label} must be a date in YYYY-MM-DD format"
        ) from exc


def _validate_year(year: AcademicYear, db_session: Session) -> None:
    if not year.name or not year.name.strip():
        raise HTTPException(status_code=422, detail="Name is required")

    start = _parse_date(year.start_date, "Start date")
    end = _parse_date(year.end_date, "End date")
    if start >= end:
        raise HTTPException(
            status_code=422, detail="Academic year must start before it ends"
        )

    if not year.is_active:
        return
    others = db_session.exec(
        select(AcademicYear).where(
            AcademicYear.is_active == True,
            AcademicYear.academic_year_uuid != year.academic_year_uuid,
        )
    ).all()
    for other in others:
        # ISO dates compare correctly as strings.
        if year.start_date <= other.end_date and other.start_date <= year.end_date:
            raise HTTPException(
                status_code=409,
                detail=f"Dates overlap the active academic year '{other.name}'",
            )


def _validate_cohort(cohort: AcademicCohort, year: AcademicYear) -> None:
    if not cohort.name or not cohort.name.strip():
        raise HTTPException(status_code=422, detail="Name is required")

    start = _parse_date(cohort.start_date, "Start date")
    end = _parse_date(cohort.end_date, "End date")
    if start >= end:
        raise HTTPException(status_code=422, detail="Cohort must start before it ends")
    if cohort.start_date < year.start_date or cohort.end_date > year.end_date:
        raise HTTPException(
            status_code=422,
            detail=f"Cohort '{cohort.name}' must fall within its academic year",
        )

    opens = cohort.enrollment_window_start
    closes = cohort.enrollment_window_end
    if opens:
        _parse_date(opens, "Enrollment window start")
    if closes:
        _parse_date(closes, "Enrollment window end")
    if opens and closes and opens > closes:
        raise HTTPException(
            status_code=422, detail="Enrollment window must open before it closes"
        )
    if closes and closes > cohort.end_date:
        raise HTTPException(
            status_code=422,
            detail="Enrollment window must close on or before the cohort end date",
        )


def _year_to_read(year: AcademicYear) -> AcademicYearRead:
    return AcademicYearRead(**year.model_dump())


def _cohort_to_read(
    cohort: AcademicCohort, academic_year_uuid: str
) -> AcademicCohortRead:
    return AcademicCohortRead(
        **cohort.model_dump(), academic_year_uuid=academic_year_uuid
    )
