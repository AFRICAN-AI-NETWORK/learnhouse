from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlmodel import Session, col, select

from src.db.academic_calendar import AcademicCohort, CourseAcademicCohort
from src.db.courses.chapters import Chapter
from src.db.courses.course_chapters import CourseChapter
from src.db.courses.courses import Course
from src.db.courses.programme_weeks import (
    ProgrammeWeek,
    ProgrammeWeekRead,
    ProgrammeWeeksGenerate,
    ProgrammeWeekUpdate,
)
from src.db.student_journey import StudentJourneyMilestone
from src.db.users import AnonymousUser, PublicUser
from src.security.calendar_security import require_course_calendar_access
from src.security.courses_security import courses_rbac_check
from src.services.utils.datetimes import parse_calendar_date

MAX_PROGRAMME_WEEKS = 104


async def generate_programme_weeks(
    request: Request,
    course_uuid: str,
    weeks_object: ProgrammeWeeksGenerate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[ProgrammeWeekRead]:
    """
    Create weeks 1..N for a course run, starting on the cohort's start date.

    Existing weeks are kept as they are, so the call can be repeated to extend
    a run. New weeks are mapped to the course's published chapters in order.
    """
    course = _get_course_or_404(course_uuid, db_session)
    await require_course_calendar_access(
        request, course_uuid, current_user, "create", db_session
    )
    run, cohort = _get_run_or_404(course, weeks_object.academic_cohort_uuid, db_session)

    count = weeks_object.number_of_weeks
    if not 1 <= count <= MAX_PROGRAMME_WEEKS:
        raise HTTPException(
            status_code=422,
            detail=f"Number of weeks must be between 1 and {MAX_PROGRAMME_WEEKS}",
        )
    first_day = parse_calendar_date(cohort.start_date)
    last_day = first_day + timedelta(days=7 * count - 1)
    if last_day > parse_calendar_date(cohort.end_date):
        raise HTTPException(
            status_code=422,
            detail=f"{count} weeks would run past the cohort end date ({cohort.end_date})",
        )

    existing = {week.week_number for week in _get_run_weeks(run, db_session)}
    chapter_ids = _published_chapter_ids(course, db_session)
    now = str(datetime.now(UTC))
    for number in range(1, count + 1):
        if number in existing:
            continue
        starts_on = first_day + timedelta(days=7 * (number - 1))
        db_session.add(
            ProgrammeWeek(
                programme_week_uuid=f"programme_week_{uuid4()}",
                course_academic_cohort_id=run.id,
                course_id=course.id,
                org_id=course.org_id,
                week_number=number,
                starts_on=starts_on.isoformat(),
                ends_on=(starts_on + timedelta(days=6)).isoformat(),
                chapter_id=chapter_ids[number - 1]
                if number <= len(chapter_ids)
                else None,
                creation_date=now,
                update_date=now,
            )
        )
    db_session.commit()
    return _weeks_to_read(course, cohort.academic_cohort_uuid, db_session)


async def list_programme_weeks(
    request: Request,
    course_uuid: str,
    academic_cohort_uuid: str | None,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[ProgrammeWeekRead]:
    """Weeks of a course, for one cohort or for every cohort it runs under."""
    course = _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(request, course_uuid, current_user, "read", db_session)
    return _weeks_to_read(course, academic_cohort_uuid, db_session)


async def update_programme_week(
    request: Request,
    course_uuid: str,
    programme_week_uuid: str,
    week_object: ProgrammeWeekUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> ProgrammeWeekRead:
    course = _get_course_or_404(course_uuid, db_session)
    await require_course_calendar_access(
        request, course_uuid, current_user, "update", db_session
    )
    week = db_session.exec(
        select(ProgrammeWeek).where(
            ProgrammeWeek.programme_week_uuid == programme_week_uuid,
            ProgrammeWeek.course_id == course.id,
        )
    ).first()
    if not week:
        raise HTTPException(status_code=404, detail="Programme week not found")

    changes = week_object.model_dump(exclude_unset=True)
    if "chapter_id" in changes:
        week.chapter_id = _course_chapter_id(course, changes["chapter_id"], db_session)
    if "milestone_uuid" in changes:
        week.milestone_id = _course_milestone_id(
            course, changes["milestone_uuid"], db_session
        )
    week.update_date = str(datetime.now(UTC))
    db_session.add(week)
    db_session.commit()

    return next(
        item
        for item in _weeks_to_read(course, None, db_session)
        if item.programme_week_uuid == programme_week_uuid
    )


def get_course_programme_week(
    course: Course, programme_week_id: int, db_session: Session
) -> ProgrammeWeek | None:
    """A programme week by id, only when it belongs to the course."""
    return db_session.exec(
        select(ProgrammeWeek).where(
            ProgrammeWeek.id == programme_week_id,
            ProgrammeWeek.course_id == course.id,
        )
    ).first()


# ── Internals ────────────────────────────────────────────────────────────────


def _get_course_or_404(course_uuid: str, db_session: Session) -> Course:
    course = db_session.exec(
        select(Course).where(Course.course_uuid == course_uuid)
    ).first()
    if not course or course.id is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _get_run_or_404(
    course: Course, academic_cohort_uuid: str, db_session: Session
) -> tuple[CourseAcademicCohort, AcademicCohort]:
    row = db_session.exec(
        select(CourseAcademicCohort, AcademicCohort)
        .join(
            AcademicCohort, AcademicCohort.id == CourseAcademicCohort.academic_cohort_id
        )
        .where(
            CourseAcademicCohort.course_id == course.id,
            AcademicCohort.academic_cohort_uuid == academic_cohort_uuid,
        )
    ).first()
    if not row:
        raise HTTPException(
            status_code=404,
            detail="This course does not run under that academic cohort",
        )
    return row


def _get_run_weeks(
    run: CourseAcademicCohort, db_session: Session
) -> list[ProgrammeWeek]:
    return list(
        db_session.exec(
            select(ProgrammeWeek).where(
                ProgrammeWeek.course_academic_cohort_id == run.id
            )
        ).all()
    )


def _published_chapter_ids(course: Course, db_session: Session) -> list[int]:
    statement = (
        select(Chapter.id)
        .join(CourseChapter, CourseChapter.chapter_id == Chapter.id)
        .where(CourseChapter.course_id == course.id, Chapter.published == True)
        .order_by(col(CourseChapter.order).asc())
    )
    return list(db_session.exec(statement).all())


def _course_chapter_id(
    course: Course, chapter_id: int | None, db_session: Session
) -> int | None:
    if chapter_id is None:
        return None
    chapter = db_session.exec(
        select(Chapter).where(Chapter.id == chapter_id, Chapter.course_id == course.id)
    ).first()
    if not chapter:
        raise HTTPException(
            status_code=422, detail="Chapter does not belong to this course"
        )
    return chapter.id


def _course_milestone_id(
    course: Course, milestone_uuid: str | None, db_session: Session
) -> int | None:
    if milestone_uuid is None:
        return None
    milestone = db_session.exec(
        select(StudentJourneyMilestone).where(
            StudentJourneyMilestone.milestone_uuid == milestone_uuid,
            StudentJourneyMilestone.course_id == course.id,
        )
    ).first()
    if not milestone:
        raise HTTPException(
            status_code=422, detail="Milestone does not belong to this course"
        )
    return milestone.id


def _weeks_to_read(
    course: Course, academic_cohort_uuid: str | None, db_session: Session
) -> list[ProgrammeWeekRead]:
    statement = (
        select(
            ProgrammeWeek,
            AcademicCohort.academic_cohort_uuid,
            StudentJourneyMilestone.milestone_uuid,
        )
        .join(
            CourseAcademicCohort,
            CourseAcademicCohort.id == ProgrammeWeek.course_academic_cohort_id,
        )
        .join(
            AcademicCohort, AcademicCohort.id == CourseAcademicCohort.academic_cohort_id
        )
        .join(
            StudentJourneyMilestone,
            StudentJourneyMilestone.id == ProgrammeWeek.milestone_id,
            isouter=True,
        )
        .where(ProgrammeWeek.course_id == course.id)
        .order_by(
            col(AcademicCohort.start_date).asc(), col(ProgrammeWeek.week_number).asc()
        )
    )
    if academic_cohort_uuid is not None:
        statement = statement.where(
            AcademicCohort.academic_cohort_uuid == academic_cohort_uuid
        )
    return [
        ProgrammeWeekRead(
            id=week.id,
            programme_week_uuid=week.programme_week_uuid,
            academic_cohort_uuid=cohort_uuid,
            week_number=week.week_number,
            starts_on=week.starts_on,
            ends_on=week.ends_on,
            chapter_id=week.chapter_id,
            milestone_uuid=milestone_uuid,
        )
        for week, cohort_uuid, milestone_uuid in db_session.exec(statement).all()
    ]
