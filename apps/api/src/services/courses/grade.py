"""
Course grade computation — the single source of truth for all grade logic.

This module is the DRY enforcement point for the performance-weighted course
grade. The formula `normalized_score × activity.points × late_multiplier` lives
in exactly one place: `get_activity_weighted_points_earned`. Every other path
(trail-step persistence, course-level aggregation, backfill, unit tests) calls
that function rather than re-implementing the arithmetic.

Grade model
-----------
A course's grade is the ratio of points the student *earned* to the points the
course makes *possible*:

    course_grade_percentage =
        sum(effective points_earned over the user's activities in the course)
        ÷ sum(activity.points over all course activities where points > 0)
        × 100

How `points_earned` is derived per activity:

* Assignment-backed activity (an ``Assignment`` row references the activity):
      normalized = AssignmentUserSubmission.grade ÷ sum(AssignmentTask.max_grade_value)
      points_earned = normalized × activity.points
  ``normalized`` is clamped to the [0, 1] range so a single over-graded task can
  never let one activity contribute more than its own weight to the course.

* Completion-based activity (no assignment):
      points_earned = activity.points if the step is complete else 0

The late penalty (`LATE_PENALTY_MULTIPLIER`) is then applied on top of either
path when the trail step is flagged late.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

from sqlmodel import Session, select

from src.db.courses.activities import Activity
from src.db.courses.assignments import (Assignment, AssignmentTask,
                                        AssignmentUserSubmission)
from src.db.courses.chapter_activities import ChapterActivity
from src.db.trail_steps import TrailStep

# Multiplier applied to earned points when an activity is completed late.
# Kept here as the single definition shared by every grade-related path.
LATE_PENALTY_MULTIPLIER = 0.8


@dataclass
class ActivityGradeDetail:
    """Per-activity grade breakdown, used for auditing and UI display."""

    activity_id: int
    activity_name: str
    activity_type: str
    points_possible: float
    points_earned: float
    # Raw normalized assignment score (0.0-1.0), or None for completion-based
    # activities or assignment activities the user has not submitted.
    assignment_score: Optional[float]
    is_late: bool
    is_complete: bool


@dataclass
class GradeResult:
    """Aggregate result of computing a user's grade for a single course."""

    total_points_possible: float
    total_points_earned: float
    # (earned / possible) × 100, rounded to 2 dp. None when the course has no
    # activities worth any points (avoids a division by zero).
    grade_percentage: Optional[float]
    activity_breakdown: List[ActivityGradeDetail] = field(default_factory=list)


####################################################
# Pure computation (no DB access — unit-testable)
####################################################


def normalized_assignment_score(
    submission: Optional[AssignmentUserSubmission],
    task_max_sum: float,
) -> Optional[float]:
    """
    Return the assignment's normalized score in the [0, 1] range, or None.

    None means "not applicable / not weightable":
      - no submission exists yet, or
      - the assignment's tasks sum to a max grade of 0 (completion-based
        fallback — see ``get_activity_weighted_points_earned``).

    The score is clamped to [0, 1] to defend against manually graded tasks whose
    grade may exceed their ``max_grade_value``.
    """
    if submission is None:
        return None
    if not task_max_sum or task_max_sum <= 0:
        return None

    score = (submission.grade or 0) / task_max_sum
    if score < 0:
        return 0.0
    if score > 1:
        return 1.0
    return score


def get_activity_weighted_points_earned(
    activity: Activity,
    trail_step: Optional[TrailStep],
    assignment: Optional[Assignment],
    submission: Optional[AssignmentUserSubmission],
    task_max_sum: float,
) -> float:
    """
    The single formula for one activity's effective earned points.

    Pure: takes already-fetched objects, performs no DB I/O. ``trail_step`` may
    be None (the user never started this activity → 0 earned). ``assignment``
    None means the activity is completion-based.
    """
    points = activity.points or 0
    if points <= 0:
        return 0.0

    is_complete = bool(trail_step.complete) if trail_step is not None else False
    is_late = bool(trail_step.is_late) if trail_step is not None else False

    if assignment is None:
        # Completion-based activity.
        effective = points if is_complete else 0.0
    elif submission is None:
        # Assignment activity the user has never submitted.
        effective = 0.0
    else:
        normalized = normalized_assignment_score(submission, task_max_sum)
        if normalized is None:
            # All tasks have max_grade_value 0 → fall back to completion-based.
            effective = points if is_complete else 0.0
        else:
            effective = normalized * points

    if is_late:
        effective *= LATE_PENALTY_MULTIPLIER

    return effective


####################################################
# DB loading helpers (shared by every grade path)
####################################################


def get_assignment_for_activity(
    activity_id: int, db_session: Session
) -> Optional[Assignment]:
    return db_session.exec(
        select(Assignment).where(Assignment.activity_id == activity_id)
    ).first()


def get_user_assignment_submission(
    assignment_id: int, user_id: int, db_session: Session
) -> Optional[AssignmentUserSubmission]:
    return db_session.exec(
        select(AssignmentUserSubmission).where(
            AssignmentUserSubmission.assignment_id == assignment_id,
            AssignmentUserSubmission.user_id == user_id,
        )
    ).first()


def get_task_max_grade_sum(assignment_id: int, db_session: Session) -> int:
    tasks = db_session.exec(
        select(AssignmentTask).where(AssignmentTask.assignment_id == assignment_id)
    ).all()
    return sum((task.max_grade_value or 0) for task in tasks)


def load_activity_grade_inputs(activity: Activity, user_id: int, db_session: Session):
    """
    Fetch the assignment, the user's submission and the task max-grade sum for an
    activity. Returns ``(assignment, submission, task_max_sum)`` with assignment
    and submission possibly None for completion-based / unsubmitted activities.
    """
    assignment = None
    submission = None
    task_max_sum = 0
    if activity is not None and activity.id is not None:
        assignment = get_assignment_for_activity(activity.id, db_session)
        if assignment is not None and assignment.id is not None:
            submission = get_user_assignment_submission(
                assignment.id, user_id, db_session
            )
            task_max_sum = get_task_max_grade_sum(assignment.id, db_session)
    return assignment, submission, task_max_sum


####################################################
# Persistence side-effect (isolated from pure math)
####################################################


def compute_and_store_trail_step_grade(
    activity: Activity,
    trail_step: TrailStep,
    db_session: Session,
) -> float:
    """
    Recompute a trail step's weighted points from current submission data, write
    ``points_earned`` and the audit ``grade`` string, commit, and return the
    earned points. The only place that performs the DB side-effect for a single
    step.
    """
    assignment, submission, task_max_sum = load_activity_grade_inputs(
        activity, trail_step.user_id, db_session
    )

    points_earned = get_activity_weighted_points_earned(
        activity, trail_step, assignment, submission, task_max_sum
    )
    normalized = normalized_assignment_score(submission, task_max_sum)

    trail_step.points_earned = points_earned
    if normalized is not None:
        # Persist the normalized score for auditing (e.g. "0.80").
        trail_step.grade = f"{normalized:.2f}"
    trail_step.update_date = str(datetime.now())

    db_session.add(trail_step)
    db_session.commit()
    db_session.refresh(trail_step)

    return points_earned


####################################################
# Course-level aggregation
####################################################


def compute_course_grade(
    user_id: int,
    course_id: int,
    db_session: Session,
) -> GradeResult:
    """
    Compute the user's performance-weighted grade for a course.

    Activities with ``points`` null or <= 0 are excluded from both the numerator
    and the denominator. If no activity carries points, ``grade_percentage`` is
    None.
    """
    chapter_activities = db_session.exec(
        select(ChapterActivity).where(ChapterActivity.course_id == course_id)
    ).all()

    seen_activity_ids: set[int] = set()
    total_points_possible = 0.0
    total_points_earned = 0.0
    breakdown: List[ActivityGradeDetail] = []

    for chapter_activity in chapter_activities:
        activity_id = chapter_activity.activity_id
        # An activity may be referenced once per course; guard against dupes so
        # it never double-counts toward the denominator.
        if activity_id in seen_activity_ids:
            continue
        seen_activity_ids.add(activity_id)

        activity = db_session.exec(
            select(Activity).where(Activity.id == activity_id)
        ).first()
        if not activity or not activity.points or activity.points <= 0:
            continue

        points = activity.points

        trail_step = db_session.exec(
            select(TrailStep).where(
                TrailStep.user_id == user_id,
                TrailStep.activity_id == activity_id,
                TrailStep.course_id == course_id,
            )
        ).first()

        assignment, submission, task_max_sum = load_activity_grade_inputs(
            activity, user_id, db_session
        )

        earned = get_activity_weighted_points_earned(
            activity, trail_step, assignment, submission, task_max_sum
        )
        normalized = normalized_assignment_score(submission, task_max_sum)

        total_points_possible += points
        total_points_earned += earned

        breakdown.append(
            ActivityGradeDetail(
                activity_id=activity_id,
                activity_name=activity.name,
                activity_type=getattr(
                    activity.activity_type, "value", str(activity.activity_type)
                ),
                points_possible=round(points, 4),
                points_earned=round(earned, 4),
                assignment_score=(
                    round(normalized, 4) if normalized is not None else None
                ),
                is_late=bool(trail_step.is_late) if trail_step else False,
                is_complete=bool(trail_step.complete) if trail_step else False,
            )
        )

    grade_percentage: Optional[float] = None
    if total_points_possible > 0:
        grade_percentage = round(total_points_earned / total_points_possible * 100, 2)

    return GradeResult(
        total_points_possible=round(total_points_possible, 4),
        total_points_earned=round(total_points_earned, 4),
        grade_percentage=grade_percentage,
        activity_breakdown=breakdown,
    )


####################################################
# Endpoint orchestration (RBAC + enrollment + compute)
####################################################


async def get_course_grade_for_user(
    request,
    course_uuid: str,
    current_user,
    db_session: Session,
) -> dict:
    """
    Resolve ``course_uuid``, authorize the caller, and return their own course
    grade. This endpoint only ever computes ``current_user``'s grade, so the
    "a student must not see another student's grade" requirement is satisfied
    structurally — there is no other-user parameter to abuse.

    Authorization gates:
      - Anonymous users are rejected with 401.
      - A user must be enrolled (a ``TrailRun`` for this course exists) to read a
        grade; otherwise 403. Enrollment is itself gated by course access at
        enroll time, so it is a sufficient gate for a self-only read.
    """
    from fastapi import HTTPException, status

    from src.db.courses.courses import Course
    from src.db.trail_runs import TrailRun

    course = db_session.exec(
        select(Course).where(Course.course_uuid == course_uuid)
    ).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    if current_user is None or getattr(current_user, "id", 0) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    trail_run = db_session.exec(
        select(TrailRun).where(
            TrailRun.course_id == course.id,
            TrailRun.user_id == current_user.id,
        )
    ).first()
    if not trail_run:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not enrolled in this course",
        )

    result = compute_course_grade(current_user.id, course.id, db_session)

    return {
        "course_uuid": course.course_uuid,
        "total_points_possible": result.total_points_possible,
        "total_points_earned": result.total_points_earned,
        "grade_percentage": result.grade_percentage,
        "activity_breakdown": [vars(detail) for detail in result.activity_breakdown],
    }
