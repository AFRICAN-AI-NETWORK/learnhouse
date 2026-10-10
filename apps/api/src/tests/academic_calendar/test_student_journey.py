"""
Tests for the student journey (src/services/student_journey.py): milestone
definitions, automatic evaluation from existing signals, staff overrides and
the staff analytics view.
"""

import pytest
from fastapi import HTTPException
from sqlmodel import select

from src.db.academic_calendar import (
    AcademicCohortCreate,
    AcademicYearCreate,
    CourseAcademicCohortsUpdate,
)
from src.db.courses.assignments import (
    Assignment,
    AssignmentUserSubmission,
    AssignmentUserSubmissionStatus,
    GradingTypeEnum,
)
from src.db.courses.certifications import CertificateUser, Certifications
from src.db.courses.programme_weeks import ProgrammeWeeksGenerate, ProgrammeWeekUpdate
from src.db.courses.schedules import (
    CourseRegisterEntry,
    RegisterEntryMethodEnum,
    RegisterEntryStatusEnum,
)
from src.db.roles import Role
from src.db.student_journey import (
    JourneyPhaseEnum,
    MilestoneCriteriaEnum,
    MilestoneProgressUpdate,
    MilestoneStatusEnum,
    StudentJourneyMilestoneCreate,
    StudentJourneyMilestoneUpdate,
    UserMilestoneProgress,
)
from src.db.trail_steps import TrailStep
from src.db.users import AnonymousUser
from src.services.academic_calendar import (
    create_academic_cohort,
    create_academic_year,
    set_course_cohorts,
)
from src.services.admin_analytics.students import get_student_course_detail
from src.services.courses.programme_weeks import (
    generate_programme_weeks,
    update_programme_week,
)
from src.services.student_journey import (
    create_milestone,
    delete_milestone,
    get_learner_journey,
    get_my_journey,
    list_course_milestones,
    seed_course_journey,
    set_milestone_progress,
    update_milestone,
)
from src.tests.academic_calendar.conftest import (
    COURSE_ID,
    COURSE_UUID,
    LEGACY_RIGHTS,
    NOW,
    ORG_ID,
    add_activity,
    add_chapter,
    add_user_with_role,
    complete_activity,
    enroll,
)

ACHIEVED = MilestoneStatusEnum.achieved
IN_PROGRESS = MilestoneStatusEnum.in_progress
NOT_STARTED = MilestoneStatusEnum.not_started
AT_RISK = MilestoneStatusEnum.at_risk


async def _status_of(coroutine) -> int:
    with pytest.raises(HTTPException) as exc:
        await coroutine
    return exc.value.status_code


def _statuses(journey) -> list[MilestoneStatusEnum]:
    return [item.status for item in journey]


def _milestone_payload(**overrides) -> StudentJourneyMilestoneCreate:
    data = {
        "phase": JourneyPhaseEnum.core_learning,
        "name": "Mentor sign-off",
        "sequence_order": 5,
    }
    return StudentJourneyMilestoneCreate(**{**data, **overrides})


def _add_capstone(db, *, activity_id: int = 2) -> Assignment:
    assignment = Assignment(
        id=1,
        title="Capstone",
        description="",
        due_date="2026-12-01",
        published=True,
        grading_type=GradingTypeEnum.PERCENTAGE,
        required_for_certificate=True,
        org_id=ORG_ID,
        course_id=COURSE_ID,
        chapter_id=1,
        activity_id=activity_id,
        assignment_uuid="assignment_capstone",
        creation_date=NOW,
        update_date=NOW,
    )
    db.add(assignment)
    db.commit()
    return assignment


def _submit_capstone(db, user_id: int, status: AssignmentUserSubmissionStatus) -> None:
    db.add(
        AssignmentUserSubmission(
            submission_status=status,
            grade=80,
            user_id=user_id,
            assignment_id=1,
            assignmentusersubmission_uuid=f"submission_{user_id}",
            creation_date=NOW,
            update_date=NOW,
        )
    )
    db.commit()


def _issue_certificate(db, user_id: int) -> None:
    db.add(
        Certifications(id=1, certification_uuid="certification_1", course_id=COURSE_ID)
    )
    db.add(
        CertificateUser(
            user_id=user_id, certification_id=1, user_certification_uuid="cert_user_1"
        )
    )
    db.commit()


@pytest.fixture
async def journey(db, course, staff):
    """Default four-milestone journey plus a chapter with one graded activity."""
    add_chapter(db, 1, order=1)
    add_activity(db, 1, chapter_id=1, points=100)
    return await seed_course_journey(None, COURSE_UUID, staff, db)


# ─────────────────────────── Definitions ───────────────────────────


class TestMilestoneDefinitions:
    async def test_seed_creates_the_default_journey(self, journey):
        assert [item.sequence_order for item in journey] == [1, 2, 3, 4]
        assert [item.phase for item in journey] == list(JourneyPhaseEnum)
        assert [item.criteria for item in journey] == [
            MilestoneCriteriaEnum.course_started,
            MilestoneCriteriaEnum.course_grade_at_least,
            MilestoneCriteriaEnum.required_assignments_graded,
            MilestoneCriteriaEnum.certificate_issued,
        ]
        assert journey[1].criteria_config == {"threshold": 50}

    async def test_seed_does_nothing_when_milestones_exist(self, db, staff, journey):
        again = await seed_course_journey(None, COURSE_UUID, staff, db)
        assert [item.milestone_uuid for item in again] == [
            item.milestone_uuid for item in journey
        ]

    async def test_learner_can_list_but_not_seed(self, db, learner, journey):
        assert len(await list_course_milestones(None, COURSE_UUID, learner, db)) == 4
        assert (
            await _status_of(seed_course_journey(None, COURSE_UUID, learner, db)) == 403
        )

    async def test_course_owner_can_seed(self, db, course, course_owner):
        assert len(await seed_course_journey(None, COURSE_UUID, course_owner, db)) == 4

    async def test_staff_can_add_a_milestone(self, db, staff, journey):
        created = await create_milestone(
            None, COURSE_UUID, _milestone_payload(), staff, db
        )
        assert created.criteria == MilestoneCriteriaEnum.manual
        assert created.course_uuid == COURSE_UUID

    @pytest.mark.parametrize(
        ("overrides", "expected"),
        [
            ({"name": " "}, 422),
            ({"sequence_order": 0}, 422),
            ({"sequence_order": 2}, 409),
            ({"criteria": "chapter_completed", "criteria_config": {}}, 422),
            (
                {
                    "criteria": "chapter_completed",
                    "criteria_config": {"chapter_id": 99},
                },
                422,
            ),
            ({"criteria": "course_grade_at_least", "criteria_config": {}}, 422),
            (
                {
                    "criteria": "course_grade_at_least",
                    "criteria_config": {"threshold": 101},
                },
                422,
            ),
        ],
        ids=[
            "blank-name",
            "order-zero",
            "order-taken",
            "chapter-missing",
            "chapter-foreign",
            "threshold-missing",
            "threshold-range",
        ],
    )
    async def test_invalid_milestones_are_rejected(
        self, db, staff, journey, overrides, expected
    ):
        payload = _milestone_payload(**overrides)
        status = await _status_of(
            create_milestone(None, COURSE_UUID, payload, staff, db)
        )
        assert status == expected

    async def test_update_validates_before_saving(self, db, staff, journey):
        grade_uuid = journey[1].milestone_uuid
        updated = await update_milestone(
            None,
            grade_uuid,
            StudentJourneyMilestoneUpdate(criteria_config={"threshold": 70}),
            staff,
            db,
        )
        assert updated.criteria_config == {"threshold": 70}

        status = await _status_of(
            update_milestone(
                None,
                grade_uuid,
                StudentJourneyMilestoneUpdate(sequence_order=1),
                staff,
                db,
            )
        )
        assert status == 409
        listed = await list_course_milestones(None, COURSE_UUID, staff, db)
        assert listed[1].milestone_uuid == grade_uuid

    async def test_delete_removes_learner_progress(self, db, staff, learner, journey):
        await get_my_journey(None, COURSE_UUID, learner, db)
        assert len(db.exec(select(UserMilestoneProgress)).all()) == 4

        await delete_milestone(None, journey[3].milestone_uuid, staff, db)
        assert len(db.exec(select(UserMilestoneProgress)).all()) == 3
        assert len(await list_course_milestones(None, COURSE_UUID, staff, db)) == 3


# ─────────────────────────── Evaluation ────────────────────────────


class TestEvaluation:
    async def test_nothing_is_started_before_enrollment(self, db, learner, journey):
        mine = await get_my_journey(None, COURSE_UUID, learner, db)
        assert _statuses(mine) == [NOT_STARTED] * 4

    async def test_enrollment_achieves_onboarding(self, db, learner, journey):
        enroll(db, learner.id)
        mine = await get_my_journey(None, COURSE_UUID, learner, db)

        assert _statuses(mine) == [ACHIEVED, IN_PROGRESS, NOT_STARTED, NOT_STARTED]
        assert mine[0].achieved_at is not None
        assert mine[1].achieved_at is None

    async def test_grade_threshold_achieves_core_learning(self, db, learner, journey):
        enroll(db, learner.id)
        complete_activity(db, learner.id, 1)  # the only graded activity: 100%

        mine = await get_my_journey(None, COURSE_UUID, learner, db)
        assert _statuses(mine) == [ACHIEVED, ACHIEVED, IN_PROGRESS, NOT_STARTED]

    async def test_capstone_needs_a_graded_required_assignment(
        self, db, learner, journey
    ):
        enroll(db, learner.id)
        complete_activity(db, learner.id, 1)
        # No required assignment exists yet, so there is no capstone to pass.
        assert (await get_my_journey(None, COURSE_UUID, learner, db))[
            2
        ].status == IN_PROGRESS

        _add_capstone(db)
        _submit_capstone(db, learner.id, AssignmentUserSubmissionStatus.GRADED)
        assert (await get_my_journey(None, COURSE_UUID, learner, db))[
            2
        ].status == ACHIEVED

    async def test_submitted_capstone_is_not_enough(self, db, learner, journey):
        enroll(db, learner.id)
        complete_activity(db, learner.id, 1)
        _add_capstone(db)
        _submit_capstone(db, learner.id, AssignmentUserSubmissionStatus.SUBMITTED)

        assert (await get_my_journey(None, COURSE_UUID, learner, db))[
            2
        ].status == IN_PROGRESS

    async def test_certificate_achieves_alumni(self, db, learner, journey):
        enroll(db, learner.id)
        _issue_certificate(db, learner.id)

        mine = await get_my_journey(None, COURSE_UUID, learner, db)
        assert mine[3].status == ACHIEVED

    async def test_achievement_is_sticky(self, db, learner, journey):
        enroll(db, learner.id)
        step = complete_activity(db, learner.id, 1)
        await get_my_journey(None, COURSE_UUID, learner, db)

        db.delete(db.get(TrailStep, step.id))
        db.commit()
        assert (await get_my_journey(None, COURSE_UUID, learner, db))[
            1
        ].status == ACHIEVED

    async def test_chapter_completed_needs_every_activity(
        self, db, staff, learner, journey
    ):
        add_activity(db, 2, chapter_id=1)
        await create_milestone(
            None,
            COURSE_UUID,
            _milestone_payload(
                criteria="chapter_completed", criteria_config={"chapter_id": 1}
            ),
            staff,
            db,
        )
        enroll(db, learner.id)
        complete_activity(db, learner.id, 1)
        assert (await get_my_journey(None, COURSE_UUID, learner, db))[
            4
        ].status != ACHIEVED

        complete_activity(db, learner.id, 2)
        assert (await get_my_journey(None, COURSE_UUID, learner, db))[
            4
        ].status == ACHIEVED

    async def test_anonymous_cannot_read_a_journey(self, db, journey):
        assert (
            await _status_of(get_my_journey(None, COURSE_UUID, AnonymousUser(), db))
            == 401
        )


class TestAtRisk:
    @pytest.fixture
    async def past_run(self, db, staff, journey):
        """Course run in 2020 whose first week is mapped to the grade milestone."""
        year = await create_academic_year(
            AcademicYearCreate(
                name="2020", start_date="2020-01-01", end_date="2020-12-31"
            ),
            staff,
            db,
        )
        cohort = await create_academic_cohort(
            AcademicCohortCreate(
                name="Past",
                start_date="2020-01-06",
                end_date="2020-06-30",
                academic_year_uuid=year.academic_year_uuid,
            ),
            staff,
            db,
        )
        await set_course_cohorts(
            None,
            COURSE_UUID,
            CourseAcademicCohortsUpdate(
                academic_cohort_uuids=[cohort.academic_cohort_uuid]
            ),
            staff,
            db,
        )
        weeks = await generate_programme_weeks(
            None,
            COURSE_UUID,
            ProgrammeWeeksGenerate(
                academic_cohort_uuid=cohort.academic_cohort_uuid, number_of_weeks=2
            ),
            staff,
            db,
        )
        await update_programme_week(
            None,
            COURSE_UUID,
            weeks[0].programme_week_uuid,
            ProgrammeWeekUpdate(milestone_uuid=journey[1].milestone_uuid),
            staff,
            db,
        )
        return cohort

    async def test_milestone_past_its_week_is_at_risk(self, db, learner, past_run):
        enroll(db, learner.id, enrolled_at="2020-01-02 09:00:00+00:00")

        mine = await get_my_journey(None, COURSE_UUID, learner, db)
        assert _statuses(mine) == [ACHIEVED, AT_RISK, NOT_STARTED, NOT_STARTED]

    async def test_achieving_it_clears_the_risk(self, db, learner, past_run):
        enroll(db, learner.id, enrolled_at="2020-01-02 09:00:00+00:00")
        await get_my_journey(None, COURSE_UUID, learner, db)

        complete_activity(db, learner.id, 1)
        assert (await get_my_journey(None, COURSE_UUID, learner, db))[
            1
        ].status == ACHIEVED

    async def test_learner_from_a_later_intake_is_not_at_risk(
        self, db, learner, past_run
    ):
        # Enrolled after the 2020 run ended, so its weeks do not apply.
        enroll(db, learner.id)

        mine = await get_my_journey(None, COURSE_UUID, learner, db)
        assert mine[1].status == IN_PROGRESS


# ─────────────────────────── Staff actions ─────────────────────────


class TestStaffOverride:
    async def test_override_wins_until_it_is_cleared(self, db, staff, learner, journey):
        capstone_uuid = journey[2].milestone_uuid
        overridden = await set_milestone_progress(
            None,
            capstone_uuid,
            learner.id,
            MilestoneProgressUpdate(status=ACHIEVED, notes="Presented live"),
            staff,
            db,
        )
        assert overridden[2].status == ACHIEVED
        assert overridden[2].is_manual_override is True
        assert overridden[2].notes == "Presented live"

        mine = await get_my_journey(None, COURSE_UUID, learner, db)
        assert mine[2].status == ACHIEVED

        cleared = await set_milestone_progress(
            None, capstone_uuid, learner.id, MilestoneProgressUpdate(), staff, db
        )
        assert cleared[2].status == NOT_STARTED
        assert cleared[2].is_manual_override is False
        assert cleared[2].notes == "Presented live"

    async def test_staff_can_view_a_learner_but_learners_cannot_view_each_other(
        self, db, staff, learner, journey
    ):
        other = add_user_with_role(db, 30, 4, LEGACY_RIGHTS)
        assert (
            len(await get_learner_journey(None, COURSE_UUID, other.id, staff, db)) == 4
        )

        status = await _status_of(
            get_learner_journey(None, COURSE_UUID, other.id, learner, db)
        )
        assert status == 403

    async def test_learner_cannot_override(self, db, learner, journey):
        status = await _status_of(
            set_milestone_progress(
                None,
                journey[0].milestone_uuid,
                learner.id,
                MilestoneProgressUpdate(status=ACHIEVED),
                learner,
                db,
            )
        )
        assert status == 403

    async def test_unknown_learner_is_not_found(self, db, staff, journey):
        status = await _status_of(
            get_learner_journey(None, COURSE_UUID, 999, staff, db)
        )
        assert status == 404


class TestAnalytics:
    async def test_course_detail_shows_milestones_next_to_attendance(
        self, db, learner, journey
    ):
        admin = add_user_with_role(db, 40, 1, LEGACY_RIGHTS)
        # The dashboard only lists members whose role is named User or Student.
        db.get(Role, 4).name = "User"
        enroll(db, learner.id)
        for number, status in enumerate(
            [
                RegisterEntryStatusEnum.marked,
                RegisterEntryStatusEnum.marked,
                RegisterEntryStatusEnum.late,
            ]
        ):
            db.add(
                CourseRegisterEntry(
                    entry_uuid=f"register_entry_{number}",
                    course_uuid=COURSE_UUID,
                    course_id=COURSE_ID,
                    org_id=ORG_ID,
                    user_id=learner.id,
                    period_start=f"2026-10-0{number + 1}T00:00:00Z",
                    period_end=f"2026-10-0{number + 1}T23:59:59Z",
                    status=status,
                    method=RegisterEntryMethodEnum.student_self_mark,
                )
            )
        db.commit()

        detail = await get_student_course_detail(
            ORG_ID, learner.id, COURSE_ID, admin, db
        )

        assert _statuses(detail.milestones) == [
            ACHIEVED,
            IN_PROGRESS,
            NOT_STARTED,
            NOT_STARTED,
        ]
        assert detail.attendance.marked == 2
        assert detail.attendance.late == 1
        assert detail.attendance.missed == 0
