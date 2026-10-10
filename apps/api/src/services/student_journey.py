from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlmodel import Session, col, select

from src.db.academic_calendar import AcademicCohort, CourseAcademicCohort
from src.db.courses.assignments import Assignment
from src.db.courses.certifications import CertificateUser, Certifications
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import Chapter
from src.db.courses.courses import Course
from src.db.courses.programme_weeks import ProgrammeWeek
from src.db.student_journey import (
    JourneyPhaseEnum,
    MilestoneCriteriaEnum,
    MilestoneProgressUpdate,
    MilestoneStatusEnum,
    StudentJourneyMilestone,
    StudentJourneyMilestoneCreate,
    StudentJourneyMilestoneRead,
    StudentJourneyMilestoneUpdate,
    StudentMilestoneStatus,
    UserMilestoneProgress,
)
from src.db.trail_runs import TrailRun
from src.db.trail_steps import TrailStep
from src.db.users import AnonymousUser, PublicUser, User
from src.security.calendar_security import (
    require_authenticated,
    require_course_calendar_access,
)
from src.security.courses_security import courses_rbac_check
from src.services.courses.certifications import has_ungraded_required_assignments
from src.services.courses.grade import compute_course_grade
from src.services.courses.weekly_schedule import resolve_schedule
from src.services.utils.datetimes import local_date, parse_instant, resolve_zone

DEFAULT_GRADE_THRESHOLD = 50

# Seeded once per course; staff can edit every entry afterwards.
DEFAULT_JOURNEY: tuple[
    tuple[JourneyPhaseEnum, str, MilestoneCriteriaEnum, dict], ...
] = (
    (
        JourneyPhaseEnum.onboarding,
        "Course started",
        MilestoneCriteriaEnum.course_started,
        {},
    ),
    (
        JourneyPhaseEnum.core_learning,
        "Core learning passed",
        MilestoneCriteriaEnum.course_grade_at_least,
        {"threshold": DEFAULT_GRADE_THRESHOLD},
    ),
    (
        JourneyPhaseEnum.capstone,
        "Capstone graded",
        MilestoneCriteriaEnum.required_assignments_graded,
        {},
    ),
    (
        JourneyPhaseEnum.alumni,
        "Certificate issued",
        MilestoneCriteriaEnum.certificate_issued,
        {},
    ),
)


# ── Criteria ─────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class _Learner:
    user_id: int
    course_id: int
    db_session: Session


def _course_started(learner: _Learner, config: dict) -> bool:
    return _get_trail_run(learner) is not None


def _chapter_completed(learner: _Learner, config: dict) -> bool:
    db = learner.db_session
    activity_ids = set(
        db.exec(
            select(ChapterActivity.activity_id).where(
                ChapterActivity.chapter_id == config.get("chapter_id"),
                ChapterActivity.course_id == learner.course_id,
            )
        ).all()
    )
    if not activity_ids:
        return False
    completed = set(
        db.exec(
            select(TrailStep.activity_id).where(
                TrailStep.user_id == learner.user_id,
                TrailStep.course_id == learner.course_id,
                TrailStep.complete == True,
            )
        ).all()
    )
    return activity_ids <= completed


def _course_grade_at_least(learner: _Learner, config: dict) -> bool:
    grade = compute_course_grade(
        learner.user_id, learner.course_id, learner.db_session
    ).grade_percentage
    return grade is not None and grade >= config.get(
        "threshold", DEFAULT_GRADE_THRESHOLD
    )


def _required_assignments_graded(learner: _Learner, config: dict) -> bool:
    """The existing capstone gate, applied only when the course has a capstone."""
    has_required = learner.db_session.exec(
        select(Assignment.id).where(
            Assignment.course_id == learner.course_id,
            Assignment.required_for_certificate == True,
        )
    ).first()
    return has_required is not None and not has_ungraded_required_assignments(
        learner.user_id, learner.course_id, learner.db_session
    )


def _certificate_issued(learner: _Learner, config: dict) -> bool:
    statement = (
        select(CertificateUser.id)
        .join(Certifications, Certifications.id == CertificateUser.certification_id)
        .where(
            CertificateUser.user_id == learner.user_id,
            Certifications.course_id == learner.course_id,
        )
    )
    return learner.db_session.exec(statement).first() is not None


_EVALUATORS: dict[MilestoneCriteriaEnum, Callable[[_Learner, dict], bool]] = {
    MilestoneCriteriaEnum.manual: lambda learner, config: False,
    MilestoneCriteriaEnum.course_started: _course_started,
    MilestoneCriteriaEnum.chapter_completed: _chapter_completed,
    MilestoneCriteriaEnum.course_grade_at_least: _course_grade_at_least,
    MilestoneCriteriaEnum.required_assignments_graded: _required_assignments_graded,
    MilestoneCriteriaEnum.certificate_issued: _certificate_issued,
}


# ── Milestone definitions ────────────────────────────────────────────────────


async def seed_course_journey(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[StudentJourneyMilestoneRead]:
    """Create the default journey for a course that has no milestones yet."""
    course = _get_course_or_404(course_uuid, db_session)
    await require_course_calendar_access(
        request, course_uuid, current_user, "create", db_session
    )

    if not get_course_milestones(course, db_session):
        for order, (phase, name, criteria, config) in enumerate(DEFAULT_JOURNEY, 1):
            db_session.add(
                _new_milestone(
                    course,
                    StudentJourneyMilestoneCreate(
                        phase=phase,
                        name=name,
                        sequence_order=order,
                        criteria=criteria,
                        criteria_config=config,
                    ),
                )
            )
        db_session.commit()
    return _milestones_to_read(course, db_session)


async def list_course_milestones(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[StudentJourneyMilestoneRead]:
    course = _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(request, course_uuid, current_user, "read", db_session)
    return _milestones_to_read(course, db_session)


async def create_milestone(
    request: Request,
    course_uuid: str,
    milestone_object: StudentJourneyMilestoneCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> StudentJourneyMilestoneRead:
    course = _get_course_or_404(course_uuid, db_session)
    await require_course_calendar_access(
        request, course_uuid, current_user, "create", db_session
    )

    milestone = _new_milestone(course, milestone_object)
    _validate_milestone(milestone, course, db_session)

    db_session.add(milestone)
    db_session.commit()
    db_session.refresh(milestone)
    return _milestone_to_read(milestone, course)


async def update_milestone(
    request: Request,
    milestone_uuid: str,
    milestone_object: StudentJourneyMilestoneUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> StudentJourneyMilestoneRead:
    milestone, course = _get_milestone_and_course(milestone_uuid, db_session)
    await require_course_calendar_access(
        request, course.course_uuid, current_user, "update", db_session
    )

    changes = milestone_object.model_dump(exclude_unset=True)
    candidate = StudentJourneyMilestone(**{**milestone.model_dump(), **changes})
    _validate_milestone(candidate, course, db_session)

    for field, value in changes.items():
        setattr(milestone, field, value)
    milestone.update_date = str(datetime.now(UTC))
    db_session.add(milestone)
    db_session.commit()
    db_session.refresh(milestone)
    return _milestone_to_read(milestone, course)


async def delete_milestone(
    request: Request,
    milestone_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    milestone, course = _get_milestone_and_course(milestone_uuid, db_session)
    await require_course_calendar_access(
        request, course.course_uuid, current_user, "delete", db_session
    )

    for progress in db_session.exec(
        select(UserMilestoneProgress).where(
            UserMilestoneProgress.milestone_id == milestone.id
        )
    ).all():
        db_session.delete(progress)
    for week in db_session.exec(
        select(ProgrammeWeek).where(ProgrammeWeek.milestone_id == milestone.id)
    ).all():
        week.milestone_id = None
        db_session.add(week)
    db_session.delete(milestone)
    db_session.commit()
    return {"status": "success", "milestone_uuid": milestone_uuid}


# ── Learner progress ─────────────────────────────────────────────────────────


async def get_my_journey(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[StudentMilestoneStatus]:
    require_authenticated(current_user)
    course = _get_course_or_404(course_uuid, db_session)
    await courses_rbac_check(request, course_uuid, current_user, "read", db_session)
    return evaluate_progress(current_user.id, course, db_session)


async def get_learner_journey(
    request: Request,
    course_uuid: str,
    user_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[StudentMilestoneStatus]:
    """Staff view of one learner's milestones."""
    course = _get_course_or_404(course_uuid, db_session)
    await require_course_calendar_access(
        request, course_uuid, current_user, "read", db_session
    )
    _get_user_or_404(user_id, db_session)
    return evaluate_progress(user_id, course, db_session)


async def set_milestone_progress(
    request: Request,
    milestone_uuid: str,
    user_id: int,
    progress_object: MilestoneProgressUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[StudentMilestoneStatus]:
    """Staff override of a learner's standing on one milestone."""
    milestone, course = _get_milestone_and_course(milestone_uuid, db_session)
    await require_course_calendar_access(
        request, course.course_uuid, current_user, "update", db_session
    )
    _get_user_or_404(user_id, db_session)

    progress = _get_progress(user_id, [milestone], db_session).get(
        milestone.id
    ) or _new_progress(user_id, milestone)
    progress.is_manual_override = progress_object.status is not None
    # Clearing the override resets the status so evaluation starts clean.
    _set_status(progress, progress_object.status or MilestoneStatusEnum.not_started)
    if "notes" in progress_object.model_dump(exclude_unset=True):
        progress.notes = progress_object.notes
    progress.update_date = str(datetime.now(UTC))
    db_session.add(progress)
    db_session.commit()

    return evaluate_progress(user_id, course, db_session)


def evaluate_progress(
    user_id: int, course: Course, db_session: Session
) -> list[StudentMilestoneStatus]:
    """
    Bring a learner's milestone records up to date and return them in order.

    Achievement is read from existing signals (trail, grade, capstone gate,
    certificate) and is sticky: once achieved, a milestone stays achieved.
    """
    milestones = get_course_milestones(course, db_session)
    if not milestones:
        return []

    learner = _Learner(user_id, course.id, db_session)
    progress_by_milestone = _get_progress(user_id, milestones, db_session)
    started = _get_trail_run(learner) is not None
    overdue = _overdue_milestone_ids(learner, course, milestones)
    has_current = False  # the first unachieved milestone is the one in progress

    for milestone in milestones:
        progress = progress_by_milestone.get(milestone.id) or _new_progress(
            user_id, milestone
        )
        progress_by_milestone[milestone.id] = progress
        if progress.is_manual_override:
            has_current = has_current or (
                progress.status != MilestoneStatusEnum.achieved
            )
            continue

        achieved = progress.status == MilestoneStatusEnum.achieved or _EVALUATORS[
            milestone.criteria
        ](learner, milestone.criteria_config or {})
        if achieved:
            status = MilestoneStatusEnum.achieved
        elif milestone.id in overdue:
            status = MilestoneStatusEnum.at_risk
        elif started and not has_current:
            status = MilestoneStatusEnum.in_progress
        else:
            status = MilestoneStatusEnum.not_started
        has_current = has_current or not achieved

        if status != progress.status or progress.id is None:
            _set_status(progress, status)
            progress.update_date = str(datetime.now(UTC))
            db_session.add(progress)

    db_session.commit()
    return [
        _to_status(milestone, progress_by_milestone[milestone.id])
        for milestone in milestones
    ]


def get_course_milestones(
    course: Course, db_session: Session
) -> list[StudentJourneyMilestone]:
    statement = (
        select(StudentJourneyMilestone)
        .where(StudentJourneyMilestone.course_id == course.id)
        .order_by(col(StudentJourneyMilestone.sequence_order).asc())
    )
    return list(db_session.exec(statement).all())


# ── Internals ────────────────────────────────────────────────────────────────


def _get_course_or_404(course_uuid: str, db_session: Session) -> Course:
    course = db_session.exec(
        select(Course).where(Course.course_uuid == course_uuid)
    ).first()
    if not course or course.id is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _get_user_or_404(user_id: int, db_session: Session) -> User:
    user = db_session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_milestone_and_course(
    milestone_uuid: str, db_session: Session
) -> tuple[StudentJourneyMilestone, Course]:
    row = db_session.exec(
        select(StudentJourneyMilestone, Course)
        .join(Course, Course.id == StudentJourneyMilestone.course_id)
        .where(StudentJourneyMilestone.milestone_uuid == milestone_uuid)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return row


def _get_trail_run(learner: _Learner) -> TrailRun | None:
    return learner.db_session.exec(
        select(TrailRun).where(
            TrailRun.user_id == learner.user_id,
            TrailRun.course_id == learner.course_id,
        )
    ).first()


def _get_progress(
    user_id: int, milestones: list[StudentJourneyMilestone], db_session: Session
) -> dict[int, UserMilestoneProgress]:
    rows = db_session.exec(
        select(UserMilestoneProgress).where(
            UserMilestoneProgress.user_id == user_id,
            col(UserMilestoneProgress.milestone_id).in_(
                [milestone.id for milestone in milestones]
            ),
        )
    ).all()
    return {row.milestone_id: row for row in rows}


def _overdue_milestone_ids(
    learner: _Learner, course: Course, milestones: list[StudentJourneyMilestone]
) -> set[int]:
    """Milestones whose programme week has ended in the learner's course run."""
    run = _get_learner_run(learner)
    if run is None:
        return set()

    db = learner.db_session
    schedule = resolve_schedule(course, db)
    zone = resolve_zone(schedule.timezone) or UTC
    today = local_date(datetime.now(UTC), zone).isoformat()
    weeks = db.exec(
        select(ProgrammeWeek).where(
            ProgrammeWeek.course_academic_cohort_id == run.id,
            col(ProgrammeWeek.milestone_id).in_(
                [milestone.id for milestone in milestones]
            ),
        )
    ).all()
    # ISO dates compare correctly as strings.
    return {week.milestone_id for week in weeks if week.ends_on < today}


def _get_learner_run(learner: _Learner) -> CourseAcademicCohort | None:
    """
    The course run a learner belongs to: the earliest cohort of the course
    that had not ended when the learner enrolled.
    """
    trail_run = _get_trail_run(learner)
    if trail_run is None:
        return None
    try:
        enrolled_on = parse_instant(trail_run.creation_date).date().isoformat()
    except ValueError:
        return None

    statement = (
        select(CourseAcademicCohort)
        .join(
            AcademicCohort, AcademicCohort.id == CourseAcademicCohort.academic_cohort_id
        )
        .where(
            CourseAcademicCohort.course_id == learner.course_id,
            AcademicCohort.end_date >= enrolled_on,
        )
        .order_by(col(AcademicCohort.start_date).asc())
    )
    return learner.db_session.exec(statement).first()


def _new_milestone(
    course: Course, milestone_object: StudentJourneyMilestoneCreate
) -> StudentJourneyMilestone:
    now = str(datetime.now(UTC))
    return StudentJourneyMilestone(
        **milestone_object.model_dump(),
        milestone_uuid=f"milestone_{uuid4()}",
        course_id=course.id,
        org_id=course.org_id,
        creation_date=now,
        update_date=now,
    )


def _new_progress(
    user_id: int, milestone: StudentJourneyMilestone
) -> UserMilestoneProgress:
    now = str(datetime.now(UTC))
    return UserMilestoneProgress(
        user_id=user_id,
        milestone_id=milestone.id,
        org_id=milestone.org_id,
        creation_date=now,
        update_date=now,
    )


def _set_status(progress: UserMilestoneProgress, status: MilestoneStatusEnum) -> None:
    progress.status = status
    if status != MilestoneStatusEnum.achieved:
        progress.achieved_at = None
    elif progress.achieved_at is None:
        progress.achieved_at = str(datetime.now(UTC))


def _validate_milestone(
    milestone: StudentJourneyMilestone, course: Course, db_session: Session
) -> None:
    if not milestone.name or not milestone.name.strip():
        raise HTTPException(status_code=422, detail="Name is required")
    if milestone.sequence_order < 1:
        raise HTTPException(status_code=422, detail="Sequence order starts at 1")

    taken = db_session.exec(
        select(StudentJourneyMilestone).where(
            StudentJourneyMilestone.course_id == course.id,
            StudentJourneyMilestone.sequence_order == milestone.sequence_order,
            StudentJourneyMilestone.milestone_uuid != milestone.milestone_uuid,
        )
    ).first()
    if taken:
        raise HTTPException(
            status_code=409,
            detail=f"Sequence order {milestone.sequence_order} is already used by '{taken.name}'",
        )

    config = milestone.criteria_config or {}
    if milestone.criteria == MilestoneCriteriaEnum.chapter_completed:
        chapter = db_session.exec(
            select(Chapter).where(
                Chapter.id == config.get("chapter_id"), Chapter.course_id == course.id
            )
        ).first()
        if not chapter:
            raise HTTPException(
                status_code=422,
                detail="criteria_config.chapter_id must be a chapter of this course",
            )
    if milestone.criteria == MilestoneCriteriaEnum.course_grade_at_least:
        threshold = config.get("threshold")
        is_number = isinstance(threshold, int | float) and not isinstance(
            threshold, bool
        )
        if not is_number or not 0 <= threshold <= 100:
            raise HTTPException(
                status_code=422,
                detail="criteria_config.threshold must be a number from 0 to 100",
            )


def _milestone_to_read(
    milestone: StudentJourneyMilestone, course: Course
) -> StudentJourneyMilestoneRead:
    return StudentJourneyMilestoneRead(
        **milestone.model_dump(), course_uuid=course.course_uuid
    )


def _milestones_to_read(
    course: Course, db_session: Session
) -> list[StudentJourneyMilestoneRead]:
    return [
        _milestone_to_read(milestone, course)
        for milestone in get_course_milestones(course, db_session)
    ]


def _to_status(
    milestone: StudentJourneyMilestone, progress: UserMilestoneProgress
) -> StudentMilestoneStatus:
    return StudentMilestoneStatus(
        milestone_uuid=milestone.milestone_uuid,
        phase=milestone.phase,
        name=milestone.name,
        description=milestone.description,
        sequence_order=milestone.sequence_order,
        criteria=milestone.criteria,
        status=progress.status,
        achieved_at=progress.achieved_at,
        is_manual_override=progress.is_manual_override,
        notes=progress.notes,
    )
