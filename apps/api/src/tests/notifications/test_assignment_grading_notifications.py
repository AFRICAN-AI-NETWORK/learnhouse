"""
Tests for the notification side effects wired into assignment grading and
rejection: notify_assignment_reviewed() / notify_retake_requested() are
called with the right data, and a notification failure never turns a
successful grade/reject into an error.

RBAC (courses_rbac_check_for_assignments) is monkeypatched to bypass —
it's pre-existing, unmodified, and already covered by src/tests/security;
these tests target only the new notification wiring.
"""

from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from sqlmodel import Session, select

from src.db.courses.assignments import (Assignment, AssignmentTask,
                                        AssignmentTaskSubmission,
                                        AssignmentTaskTypeEnum,
                                        AssignmentUserSubmission,
                                        AssignmentUserSubmissionRevisionCreate,
                                        AssignmentUserSubmissionStatus,
                                        GradingTypeEnum)
from src.db.notifications import Notification, NotificationType
from src.db.users import User
from src.services.courses.activities import assignments as assignments_service


@pytest.fixture(autouse=True)
def _bypass_rbac(monkeypatch):
    monkeypatch.setattr(
        assignments_service,
        "courses_rbac_check_for_assignments",
        AsyncMock(return_value=True),
    )


def _make_assignment(
    session: Session, course, required_for_certificate: bool = False
) -> Assignment:
    assignment = Assignment(
        title="Capstone Project",
        description="Final project",
        due_date="2026-12-31",
        published=True,
        grading_type=GradingTypeEnum.NUMERIC,
        required_for_certificate=required_for_certificate,
        org_id=course.org_id,
        course_id=course.id,
        chapter_id=1,
        activity_id=1,
        assignment_uuid=f"assignment_{uuid4()}",
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment


def _make_task(session: Session, assignment: Assignment, max_grade_value=100):
    task = AssignmentTask(
        title="Task 1",
        description="Do the thing",
        hint="",
        reference_file=None,
        assignment_type=AssignmentTaskTypeEnum.OTHER,
        contents={},
        max_grade_value=max_grade_value,
        assignment_id=assignment.id,
        org_id=assignment.org_id,
        course_id=assignment.course_id,
        chapter_id=assignment.chapter_id,
        activity_id=assignment.activity_id,
        assignment_task_uuid=f"task_{uuid4()}",
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def _make_submission(
    session: Session, user: User, assignment: Assignment
) -> AssignmentUserSubmission:
    submission = AssignmentUserSubmission(
        submission_status=AssignmentUserSubmissionStatus.SUBMITTED,
        grade=0,
        submission_feedback="",
        user_id=user.id,
        assignment_id=assignment.id,
        assignmentusersubmission_uuid=f"submission_{uuid4()}",
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)
    return submission


def _make_task_submission(
    session: Session,
    user: User,
    assignment: Assignment,
    task: AssignmentTask,
    grade: int,
):
    task_submission = AssignmentTaskSubmission(
        assignment_task_submission_uuid=f"task_sub_{uuid4()}",
        task_submission={},
        grade=grade,
        task_submission_grade_feedback="",
        assignment_type=AssignmentTaskTypeEnum.OTHER,
        user_id=user.id,
        activity_id=assignment.activity_id,
        course_id=assignment.course_id,
        chapter_id=assignment.chapter_id,
        assignment_task_id=task.id,
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )
    session.add(task_submission)
    session.commit()
    return task_submission


@pytest.mark.asyncio
class TestGradeAssignmentSubmissionNotifies:
    async def test_grading_creates_assignment_reviewed_notification(
        self, session: Session, user: User, other_user: User, course
    ):
        assignment = _make_assignment(session, course)
        task = _make_task(session, assignment, max_grade_value=100)
        _make_submission(session, user, assignment)
        _make_task_submission(session, user, assignment, task, grade=90)

        await assignments_service.grade_assignment_submission(
            request=None,
            user_id=str(user.id),
            assignment_uuid=assignment.assignment_uuid,
            current_user=other_user,
            db_session=session,
            feedback="Excellent work!",
        )

        notification = session.exec(select(Notification)).first()
        assert notification is not None
        assert notification.notification_type == NotificationType.ASSIGNMENT_REVIEWED
        assert notification.user_id == user.id
        assert notification.metadata_json["grade"] == 90
        assert notification.metadata_json["max_grade"] == 100
        assert notification.metadata_json["feedback"] == "Excellent work!"
        assert notification.metadata_json["unlocks_certificate"] is False

    async def test_feedback_is_persisted_on_submission(
        self, session: Session, user: User, other_user: User, course
    ):
        assignment = _make_assignment(session, course)
        task = _make_task(session, assignment)
        submission = _make_submission(session, user, assignment)
        _make_task_submission(session, user, assignment, task, grade=80)

        await assignments_service.grade_assignment_submission(
            request=None,
            user_id=str(user.id),
            assignment_uuid=assignment.assignment_uuid,
            current_user=other_user,
            db_session=session,
            feedback="Nice work",
        )

        session.refresh(submission)
        assert submission.submission_feedback == "Nice work"
        assert submission.submission_status == AssignmentUserSubmissionStatus.GRADED

    async def test_omitted_feedback_leaves_submission_feedback_unchanged(
        self, session: Session, user: User, other_user: User, course
    ):
        assignment = _make_assignment(session, course)
        task = _make_task(session, assignment)
        submission = _make_submission(session, user, assignment)
        submission.submission_feedback = "original"
        session.add(submission)
        session.commit()
        _make_task_submission(session, user, assignment, task, grade=80)

        await assignments_service.grade_assignment_submission(
            request=None,
            user_id=str(user.id),
            assignment_uuid=assignment.assignment_uuid,
            current_user=other_user,
            db_session=session,
            feedback=None,
        )

        session.refresh(submission)
        assert submission.submission_feedback == "original"

    async def test_notification_failure_does_not_break_grading(
        self, session: Session, user: User, other_user: User, course, monkeypatch
    ):
        assignment = _make_assignment(session, course)
        task = _make_task(session, assignment)
        _make_submission(session, user, assignment)
        _make_task_submission(session, user, assignment, task, grade=70)

        monkeypatch.setattr(
            assignments_service.notification_service,
            "notify_assignment_reviewed",
            AsyncMock(side_effect=RuntimeError("db is down")),
        )

        result = await assignments_service.grade_assignment_submission(
            request=None,
            user_id=str(user.id),
            assignment_uuid=assignment.assignment_uuid,
            current_user=other_user,
            db_session=session,
        )

        assert "graded with the grade of 70" in result["message"]


@pytest.mark.asyncio
class TestRejectAssignmentSubmissionNotifies:
    async def test_rejecting_creates_retake_requested_notification(
        self, session: Session, user: User, other_user: User, course
    ):
        assignment = _make_assignment(session, course)
        _make_submission(session, user, assignment)

        await assignments_service.reject_assignment_submission(
            request=None,
            user_id=str(user.id),
            assignment_uuid=assignment.assignment_uuid,
            revision_object=AssignmentUserSubmissionRevisionCreate(
                submission_feedback="Missing citations"
            ),
            current_user=other_user,
            db_session=session,
        )

        notification = session.exec(select(Notification)).first()
        assert notification is not None
        assert notification.notification_type == NotificationType.RETAKE_REQUESTED
        assert notification.user_id == user.id
        assert notification.metadata_json["feedback"] == "Missing citations"

    async def test_notification_failure_does_not_break_rejection(
        self, session: Session, user: User, other_user: User, course, monkeypatch
    ):
        assignment = _make_assignment(session, course)
        submission = _make_submission(session, user, assignment)

        monkeypatch.setattr(
            assignments_service.notification_service,
            "notify_retake_requested",
            AsyncMock(side_effect=RuntimeError("db is down")),
        )

        result = await assignments_service.reject_assignment_submission(
            request=None,
            user_id=str(user.id),
            assignment_uuid=assignment.assignment_uuid,
            revision_object=AssignmentUserSubmissionRevisionCreate(
                submission_feedback="Try again"
            ),
            current_user=other_user,
            db_session=session,
        )

        assert result.id == submission.id
        session.refresh(submission)
        assert (
            submission.submission_status
            == AssignmentUserSubmissionStatus.NEEDS_REVISION
        )
