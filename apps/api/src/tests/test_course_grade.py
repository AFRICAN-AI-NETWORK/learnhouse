"""
Tests for the course grade computation system (src/services/courses/grade.py).

Layers covered:
  * Pure helper `get_activity_weighted_points_earned` / `normalized_assignment_score`
    — no DB, fastest entries.
  * `compute_course_grade` — DB-backed, all documented edge cases.
  * Certificate issuance persists the computed grade.
  * Grade endpoint authorization (anonymous 401, non-enrolled 403) via the
    `get_course_grade_for_user` service orchestration.
"""

from datetime import datetime
from types import SimpleNamespace

import pytest
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool

# Import every model module touched so create_all builds the full schema.
from src.db.users import User, AnonymousUser  # noqa: F401
from src.db.organizations import Organization  # noqa: F401
from src.db.courses.courses import Course
from src.db.courses.chapters import Chapter  # noqa: F401
from src.db.courses.activities import (
    Activity,
    ActivityTypeEnum,
    ActivitySubTypeEnum,
)
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.assignments import (
    Assignment,
    AssignmentTask,
    AssignmentTaskTypeEnum,
    AssignmentUserSubmission,
    AssignmentUserSubmissionStatus,
    GradingTypeEnum,
)
from src.db.courses.certifications import Certifications, CertificateUser
from src.db.trails import Trail  # noqa: F401
from src.db.trail_runs import TrailRun
from src.db.trail_steps import TrailStep

from src.services.courses.grade import (
    LATE_PENALTY_MULTIPLIER,
    compute_course_grade,
    get_activity_weighted_points_earned,
    normalized_assignment_score,
)


# ─────────────────────────── DB fixture ────────────────────────────


@pytest.fixture(name="db")
def db_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


# ─────────────────────────── Seed helpers ──────────────────────────

_NOW = str(datetime.now())
_ORG_ID = 1
_COURSE_ID = 100
_CHAPTER_ID = 10
_USER_ID = 7


def _make_course(db: Session, course_id: int = _COURSE_ID, uuid: str = "course_test"):
    course = Course(
        id=course_id,
        name="Test Course",
        description="",
        about="",
        learnings="",
        tags="",
        thumbnail_type="",
        thumbnail_image="",
        thumbnail_video="",
        public=True,
        open_to_contributors=False,
        org_id=_ORG_ID,
        course_uuid=uuid,
        creation_date=_NOW,
        update_date=_NOW,
    )
    db.add(course)
    db.commit()
    return course


def _make_activity(db: Session, activity_id: int, points: float):
    activity = Activity(
        id=activity_id,
        name=f"Activity {activity_id}",
        activity_type=ActivityTypeEnum.TYPE_DYNAMIC,
        activity_sub_type=ActivitySubTypeEnum.SUBTYPE_DYNAMIC_PAGE,
        content={},
        details=None,
        published=True,
        points=points,
        org_id=_ORG_ID,
        course_id=_COURSE_ID,
        activity_uuid=f"activity_{activity_id}",
        creation_date=_NOW,
        update_date=_NOW,
    )
    db.add(activity)
    # link into the course
    db.add(
        ChapterActivity(
            order=activity_id,
            chapter_id=_CHAPTER_ID,
            activity_id=activity_id,
            course_id=_COURSE_ID,
            org_id=_ORG_ID,
            creation_date=_NOW,
            update_date=_NOW,
        )
    )
    db.commit()
    return activity


def _make_trail_step(
    db: Session,
    activity_id: int,
    *,
    complete: bool = True,
    is_late: bool = False,
    points_earned: float = 0,
    user_id: int = _USER_ID,
):
    step = TrailStep(
        complete=complete,
        teacher_verified=False,
        grade="",
        points_earned=points_earned,
        is_late=is_late,
        data={},
        trailrun_id=1,
        trail_id=1,
        activity_id=activity_id,
        course_id=_COURSE_ID,
        org_id=_ORG_ID,
        user_id=user_id,
        creation_date=_NOW,
        update_date=_NOW,
    )
    db.add(step)
    db.commit()
    return step


def _make_assignment(db: Session, activity_id: int, assignment_id: int):
    assignment = Assignment(
        id=assignment_id,
        title="Assignment",
        description="",
        due_date="",
        published=True,
        grading_type=GradingTypeEnum.PERCENTAGE,
        org_id=_ORG_ID,
        course_id=_COURSE_ID,
        chapter_id=_CHAPTER_ID,
        activity_id=activity_id,
        assignment_uuid=f"assignment_{assignment_id}",
        creation_date=_NOW,
        update_date=_NOW,
    )
    db.add(assignment)
    db.commit()
    return assignment


def _make_task(db: Session, assignment_id: int, task_id: int, max_grade_value: int):
    task = AssignmentTask(
        id=task_id,
        title="Task",
        description="",
        hint="",
        reference_file=None,
        assignment_type=AssignmentTaskTypeEnum.QUIZ,
        contents={},
        max_grade_value=max_grade_value,
        assignment_task_uuid=f"task_{task_id}",
        creation_date=_NOW,
        update_date=_NOW,
        assignment_id=assignment_id,
        org_id=_ORG_ID,
        course_id=_COURSE_ID,
        chapter_id=_CHAPTER_ID,
        activity_id=1,
    )
    db.add(task)
    db.commit()
    return task


def _make_user_submission(
    db: Session, assignment_id: int, grade: int, user_id: int = _USER_ID
):
    sub = AssignmentUserSubmission(
        submission_status=AssignmentUserSubmissionStatus.GRADED,
        grade=grade,
        submission_feedback="",
        user_id=user_id,
        assignment_id=assignment_id,
        assignmentusersubmission_uuid=f"aus_{assignment_id}_{user_id}",
        creation_date=_NOW,
        update_date=_NOW,
    )
    db.add(sub)
    db.commit()
    return sub


# ═══════════════════════════════════════════════════════════════════
# 1. Pure helper — get_activity_weighted_points_earned (no DB)
# ═══════════════════════════════════════════════════════════════════


def _activity(points):
    return SimpleNamespace(id=1, points=points, name="a", activity_type="TYPE_DYNAMIC")


def _step(complete=True, is_late=False):
    return SimpleNamespace(complete=complete, is_late=is_late, user_id=_USER_ID)


def _sub(grade):
    return SimpleNamespace(grade=grade)


class TestPureWeightedPoints:
    def test_completion_based_complete(self):
        assert (
            get_activity_weighted_points_earned(
                _activity(40), _step(True), None, None, 0
            )
            == 40
        )

    def test_completion_based_incomplete(self):
        assert (
            get_activity_weighted_points_earned(
                _activity(40), _step(False), None, None, 0
            )
            == 0
        )

    def test_completion_based_late_penalty(self):
        assert get_activity_weighted_points_earned(
            _activity(40), _step(True, is_late=True), None, None, 0
        ) == pytest.approx(40 * LATE_PENALTY_MULTIPLIER)

    def test_assignment_weighted_normal(self):
        assignment = SimpleNamespace(id=1)
        # 80/100 of a 60-point activity → 48
        assert get_activity_weighted_points_earned(
            _activity(60), _step(True), assignment, _sub(80), 100
        ) == pytest.approx(48)

    def test_assignment_weighted_late(self):
        assignment = SimpleNamespace(id=1)
        assert get_activity_weighted_points_earned(
            _activity(60), _step(True, is_late=True), assignment, _sub(80), 100
        ) == pytest.approx(48 * LATE_PENALTY_MULTIPLIER)

    def test_assignment_no_submission_is_zero(self):
        assignment = SimpleNamespace(id=1)
        assert (
            get_activity_weighted_points_earned(
                _activity(60), _step(True), assignment, None, 100
            )
            == 0
        )

    def test_assignment_zero_max_grade_falls_back_to_completion(self):
        assignment = SimpleNamespace(id=1)
        # task_max_sum == 0 with an existing submission → full points on complete
        assert (
            get_activity_weighted_points_earned(
                _activity(60), _step(True), assignment, _sub(0), 0
            )
            == 60
        )

    def test_score_clamped_above_one(self):
        assignment = SimpleNamespace(id=1)
        # grade exceeding the task max never awards more than the activity points
        assert get_activity_weighted_points_earned(
            _activity(60), _step(True), assignment, _sub(150), 100
        ) == pytest.approx(60)

    def test_zero_points_activity_contributes_nothing(self):
        assert (
            get_activity_weighted_points_earned(
                _activity(0), _step(True), None, None, 0
            )
            == 0
        )

    def test_none_trail_step_is_zero(self):
        assert (
            get_activity_weighted_points_earned(_activity(40), None, None, None, 0) == 0
        )


class TestNormalizedScore:
    def test_none_submission(self):
        assert normalized_assignment_score(None, 100) is None

    def test_zero_max_sum(self):
        assert normalized_assignment_score(_sub(50), 0) is None

    def test_normal(self):
        assert normalized_assignment_score(_sub(80), 100) == pytest.approx(0.8)

    def test_clamped(self):
        assert normalized_assignment_score(_sub(150), 100) == 1.0


# ═══════════════════════════════════════════════════════════════════
# 2. compute_course_grade — DB-backed edge cases
# ═══════════════════════════════════════════════════════════════════


class TestComputeCourseGrade:
    def test_basic(self, db):
        _make_course(db)
        # 60-pt assignment activity, submission 80/100
        _make_activity(db, 1, 60)
        _make_trail_step(db, 1)
        assignment = _make_assignment(db, activity_id=1, assignment_id=1)
        _make_task(db, assignment.id, task_id=1, max_grade_value=100)
        _make_user_submission(db, assignment.id, grade=80)
        # 40-pt completion-based activity, completed
        _make_activity(db, 2, 40)
        _make_trail_step(db, 2)

        result = compute_course_grade(_USER_ID, _COURSE_ID, db)
        assert result.total_points_possible == 100
        assert result.total_points_earned == pytest.approx(88)
        assert result.grade_percentage == 88.00
        assert len(result.activity_breakdown) == 2

    def test_late_penalty(self, db):
        _make_course(db)
        _make_activity(db, 1, 60)
        _make_trail_step(db, 1, is_late=True)
        assignment = _make_assignment(db, activity_id=1, assignment_id=1)
        _make_task(db, assignment.id, task_id=1, max_grade_value=100)
        _make_user_submission(db, assignment.id, grade=80)
        _make_activity(db, 2, 40)
        _make_trail_step(db, 2)

        result = compute_course_grade(_USER_ID, _COURSE_ID, db)
        # 48 * 0.8 = 38.4 ; + 40 = 78.4
        assert result.total_points_earned == pytest.approx(78.4)
        assert result.grade_percentage == 78.40

    def test_no_submission(self, db):
        _make_course(db)
        _make_activity(db, 1, 60)
        _make_trail_step(db, 1)
        assignment = _make_assignment(db, activity_id=1, assignment_id=1)
        _make_task(db, assignment.id, task_id=1, max_grade_value=100)
        # no AssignmentUserSubmission
        _make_activity(db, 2, 40)
        _make_trail_step(db, 2)

        result = compute_course_grade(_USER_ID, _COURSE_ID, db)
        assert result.total_points_earned == pytest.approx(40)
        assert result.grade_percentage == 40.00

    def test_zero_max_grade_falls_back_to_completion(self, db):
        _make_course(db)
        _make_activity(db, 1, 60)
        _make_trail_step(db, 1)
        assignment = _make_assignment(db, activity_id=1, assignment_id=1)
        _make_task(db, assignment.id, task_id=1, max_grade_value=0)
        _make_user_submission(db, assignment.id, grade=0)

        result = compute_course_grade(_USER_ID, _COURSE_ID, db)
        assert result.total_points_earned == pytest.approx(60)
        assert result.grade_percentage == 100.00

    def test_no_points_activities_grade_is_none(self, db):
        _make_course(db)
        _make_activity(db, 1, 0)
        _make_trail_step(db, 1)
        _make_activity(db, 2, 0)
        _make_trail_step(db, 2)

        result = compute_course_grade(_USER_ID, _COURSE_ID, db)
        assert result.total_points_possible == 0
        assert result.grade_percentage is None

    def test_user_with_no_steps_scores_zero(self, db):
        _make_course(db)
        _make_activity(db, 1, 100)
        # a different user completed it; our user has nothing
        _make_trail_step(db, 1, user_id=999)

        result = compute_course_grade(_USER_ID, _COURSE_ID, db)
        assert result.total_points_possible == 100
        assert result.total_points_earned == 0
        assert result.grade_percentage == 0.00


# ═══════════════════════════════════════════════════════════════════
# 3. Certificate issuance persists the computed grade
# ═══════════════════════════════════════════════════════════════════


class TestCertificateStoresGrade:
    @pytest.mark.asyncio
    async def test_certificate_stores_grade(self, db):
        from unittest.mock import Mock
        from src.services.courses.certifications import (
            check_course_completion_and_create_certificate,
        )

        _make_course(db)
        _make_activity(db, 1, 100)
        _make_trail_step(db, 1)

        # Verified user (required before a certificate is issued)
        db.add(
            User(
                id=_USER_ID,
                username="grad",
                first_name="Grad",
                last_name="User",
                email="grad@example.com",
                password="x",
                user_uuid="user_abcd",
                email_verified=True,
                creation_date=_NOW,
                update_date=_NOW,
            )
        )
        db.add(
            TrailRun(
                id=1,
                trail_id=1,
                course_id=_COURSE_ID,
                org_id=_ORG_ID,
                user_id=_USER_ID,
                creation_date=_NOW,
                update_date=_NOW,
            )
        )
        db.add(
            Certifications(
                id=1,
                certification_uuid="certification_1",
                course_id=_COURSE_ID,
                config={},
                creation_date=_NOW,
                update_date=_NOW,
            )
        )
        db.commit()

        created = await check_course_completion_and_create_certificate(
            Mock(), _USER_ID, _COURSE_ID, db
        )
        assert created is True

        cert_user = db.exec(
            select(CertificateUser).where(CertificateUser.user_id == _USER_ID)
        ).first()
        assert cert_user is not None
        assert cert_user.grade_percentage == 100.00


# ═══════════════════════════════════════════════════════════════════
# 4. Endpoint authorization
# ═══════════════════════════════════════════════════════════════════


class TestGradeEndpointAuthorization:
    @pytest.mark.asyncio
    async def test_authentication_required(self, db):
        from fastapi import HTTPException
        from src.services.courses.grade import get_course_grade_for_user

        _make_course(db, uuid="course_auth")
        with pytest.raises(HTTPException) as exc:
            await get_course_grade_for_user(None, "course_auth", AnonymousUser(), db)
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_non_enrolled_forbidden(self, db):
        from fastapi import HTTPException
        from src.services.courses.grade import get_course_grade_for_user

        _make_course(db, uuid="course_enroll")
        user = SimpleNamespace(id=_USER_ID)  # authenticated, not enrolled
        with pytest.raises(HTTPException) as exc:
            await get_course_grade_for_user(None, "course_enroll", user, db)
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_unknown_course_404(self, db):
        from fastapi import HTTPException
        from src.services.courses.grade import get_course_grade_for_user

        user = SimpleNamespace(id=_USER_ID)
        with pytest.raises(HTTPException) as exc:
            await get_course_grade_for_user(None, "course_missing", user, db)
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_enrolled_user_gets_grade(self, db):
        from src.services.courses.grade import get_course_grade_for_user

        _make_course(db, uuid="course_ok")
        _make_activity(db, 1, 100)
        _make_trail_step(db, 1)
        db.add(
            TrailRun(
                id=1,
                trail_id=1,
                course_id=_COURSE_ID,
                org_id=_ORG_ID,
                user_id=_USER_ID,
                creation_date=_NOW,
                update_date=_NOW,
            )
        )
        db.commit()

        user = SimpleNamespace(id=_USER_ID)
        result = await get_course_grade_for_user(None, "course_ok", user, db)
        assert result["course_uuid"] == "course_ok"
        assert result["grade_percentage"] == 100.00
        assert len(result["activity_breakdown"]) == 1
