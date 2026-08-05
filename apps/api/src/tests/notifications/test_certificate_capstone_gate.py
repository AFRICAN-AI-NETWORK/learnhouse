"""
Tests for the capstone-grading gate on certificate issuance:
- has_ungraded_required_assignments() in isolation
- check_course_completion_and_create_certificate() end-to-end, proving a
  student cannot get a certificate until every required_for_certificate
  assignment has been graded.
"""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session, select

from src.db.courses.activities import (Activity, ActivitySubTypeEnum,
                                       ActivityTypeEnum)
from src.db.courses.assignments import (Assignment, AssignmentUserSubmission,
                                        AssignmentUserSubmissionStatus,
                                        GradingTypeEnum)
from src.db.courses.certifications import CertificateUser, Certifications
from src.db.courses.chapter_activities import ChapterActivity
from src.db.trail_runs import TrailRun
from src.db.trail_steps import TrailStep
from src.db.trails import Trail
from src.db.users import User
from src.services.courses.certifications import (
    check_course_completion_and_create_certificate,
    has_ungraded_required_assignments)


def _make_assignment(session: Session, course, required: bool) -> Assignment:
    assignment = Assignment(
        title="Capstone Project",
        description="Final project",
        due_date="2026-12-31",
        published=True,
        grading_type=GradingTypeEnum.NUMERIC,
        required_for_certificate=required,
        org_id=course.org_id,
        course_id=course.id,
        chapter_id=1,
        activity_id=1,
        assignment_uuid=f"assignment_{uuid4()}",
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment


def _make_submission(
    session: Session,
    user: User,
    assignment: Assignment,
    status: AssignmentUserSubmissionStatus,
) -> AssignmentUserSubmission:
    submission = AssignmentUserSubmission(
        submission_status=status,
        grade=0,
        submission_feedback="",
        user_id=user.id,
        assignment_id=assignment.id,
        assignmentusersubmission_uuid=f"submission_{uuid4()}",
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)
    return submission


class TestHasUngradedRequiredAssignments:
    def test_false_when_no_required_assignments(
        self, session: Session, user: User, course
    ):
        _make_assignment(session, course, required=False)
        assert not has_ungraded_required_assignments(user.id, course.id, session)

    def test_true_when_required_assignment_has_no_submission(
        self, session: Session, user: User, course
    ):
        _make_assignment(session, course, required=True)
        assert has_ungraded_required_assignments(user.id, course.id, session)

    def test_true_when_required_assignment_submitted_but_not_graded(
        self, session: Session, user: User, course
    ):
        assignment = _make_assignment(session, course, required=True)
        _make_submission(
            session, user, assignment, AssignmentUserSubmissionStatus.SUBMITTED
        )
        assert has_ungraded_required_assignments(user.id, course.id, session)

    def test_false_when_required_assignment_is_graded(
        self, session: Session, user: User, course
    ):
        assignment = _make_assignment(session, course, required=True)
        _make_submission(
            session, user, assignment, AssignmentUserSubmissionStatus.GRADED
        )
        assert not has_ungraded_required_assignments(user.id, course.id, session)

    def test_only_checks_this_users_submission(
        self, session: Session, user: User, other_user: User, course
    ):
        assignment = _make_assignment(session, course, required=True)
        _make_submission(
            session, other_user, assignment, AssignmentUserSubmissionStatus.GRADED
        )
        # `user` (not other_user) has no submission at all.
        assert has_ungraded_required_assignments(user.id, course.id, session)


@pytest.mark.asyncio
class TestCertificateGateIntegration:
    async def _setup_completed_course(
        self, session: Session, user: User, course
    ) -> Activity:
        """Course with one activity, fully completed by `user`."""
        user.email_verified = True
        session.add(user)
        session.commit()

        activity = Activity(
            name="Lesson 1",
            activity_type=ActivityTypeEnum.TYPE_CUSTOM,
            activity_sub_type=ActivitySubTypeEnum.SUBTYPE_CUSTOM,
            points=100,
            published=True,
            org_id=course.org_id,
            course_id=course.id,
            activity_uuid=f"activity_{uuid4()}",
            creation_date=str(datetime.now(timezone.utc)),
            update_date=str(datetime.now(timezone.utc)),
        )
        session.add(activity)
        session.commit()
        session.refresh(activity)

        session.add(
            ChapterActivity(
                order=1,
                chapter_id=1,
                activity_id=activity.id,
                course_id=course.id,
                org_id=course.org_id,
                creation_date=str(datetime.now(timezone.utc)),
                update_date=str(datetime.now(timezone.utc)),
            )
        )
        session.commit()

        trail = Trail(
            org_id=course.org_id,
            user_id=user.id,
            trail_uuid=f"trail_{uuid4()}",
            creation_date=str(datetime.now(timezone.utc)),
            update_date=str(datetime.now(timezone.utc)),
        )
        session.add(trail)
        session.commit()
        session.refresh(trail)

        trail_run = TrailRun(
            trail_id=trail.id,
            course_id=course.id,
            org_id=course.org_id,
            user_id=user.id,
            creation_date=str(datetime.now(timezone.utc)),
            update_date=str(datetime.now(timezone.utc)),
        )
        session.add(trail_run)
        session.commit()
        session.refresh(trail_run)

        session.add(
            TrailStep(
                complete=True,
                teacher_verified=False,
                grade="",
                trailrun_id=trail_run.id,
                trail_id=trail.id,
                activity_id=activity.id,
                course_id=course.id,
                org_id=course.org_id,
                user_id=user.id,
                creation_date=str(datetime.now(timezone.utc)),
                update_date=str(datetime.now(timezone.utc)),
            )
        )
        session.commit()

        session.add(
            Certifications(
                course_id=course.id,
                certification_uuid=f"certification_{uuid4()}",
                creation_date=str(datetime.now(timezone.utc)),
                update_date=str(datetime.now(timezone.utc)),
            )
        )
        session.commit()

        return activity

    async def test_no_certificate_while_capstone_ungraded(
        self, session: Session, user: User, course
    ):
        await self._setup_completed_course(session, user, course)
        assignment = _make_assignment(session, course, required=True)
        _make_submission(
            session, user, assignment, AssignmentUserSubmissionStatus.SUBMITTED
        )

        created = await check_course_completion_and_create_certificate(
            None, user.id, course.id, session
        )

        assert created is False
        assert session.exec(select(CertificateUser)).first() is None

    async def test_certificate_issued_once_capstone_graded(
        self, session: Session, user: User, course
    ):
        await self._setup_completed_course(session, user, course)
        assignment = _make_assignment(session, course, required=True)
        _make_submission(
            session, user, assignment, AssignmentUserSubmissionStatus.GRADED
        )

        created = await check_course_completion_and_create_certificate(
            None, user.id, course.id, session
        )

        assert created is True
        assert session.exec(select(CertificateUser)).first() is not None

    async def test_certificate_issued_when_no_capstone_flagged(
        self, session: Session, user: User, course
    ):
        """Courses with no required_for_certificate assignment are unaffected."""
        await self._setup_completed_course(session, user, course)

        created = await check_course_completion_and_create_certificate(
            None, user.id, course.id, session
        )

        assert created is True
