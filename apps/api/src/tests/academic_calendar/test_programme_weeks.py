"""
Tests for programme weeks (src/services/courses/programme_weeks.py) and the
calendar fields and permissions on timetable events.
"""

import pytest
from fastapi import HTTPException

from src.db.academic_calendar import (
    AcademicCohortCreate,
    AcademicYearCreate,
    CourseAcademicCohortsUpdate,
)
from src.db.courses.courses import Course
from src.db.courses.programme_weeks import ProgrammeWeeksGenerate, ProgrammeWeekUpdate
from src.db.courses.schedules import CourseTimetableEventCreate
from src.db.courses.weekly_schedule import (
    LearningPhaseEnum,
    WeeklyOperatingScheduleDayBase,
    WeeklyOperatingScheduleUpdate,
)
from src.db.users import AnonymousUser
from src.services.academic_calendar import (
    create_academic_cohort,
    create_academic_year,
    set_course_cohorts,
)
from src.services.courses.programme_weeks import (
    generate_programme_weeks,
    list_programme_weeks,
    update_programme_week,
)
from src.services.courses.schedules import (
    create_timetable_event,
    delete_timetable_event,
    get_timetable_events,
    update_timetable_event,
)
from src.services.courses.weekly_schedule import update_default_schedule
from src.services.student_journey import delete_milestone, seed_course_journey
from src.tests.academic_calendar.conftest import (
    COURSE_UUID,
    NOW,
    ORG_ID,
    add_chapter,
)

OTHER_COURSE_ID = 200


async def _status_of(coroutine) -> int:
    with pytest.raises(HTTPException) as exc:
        await coroutine
    return exc.value.status_code


def _generate(cohort, weeks: int) -> ProgrammeWeeksGenerate:
    return ProgrammeWeeksGenerate(
        academic_cohort_uuid=cohort.academic_cohort_uuid, number_of_weeks=weeks
    )


@pytest.fixture
async def cohorts(db, course, staff):
    """Two cohorts of one year, both linked to the test course."""
    year = await create_academic_year(
        AcademicYearCreate(
            name="2026/2027", start_date="2026-09-01", end_date="2027-07-31"
        ),
        staff,
        db,
    )
    created = [
        await create_academic_cohort(
            AcademicCohortCreate(
                name=name,
                start_date=start,
                end_date=end,
                academic_year_uuid=year.academic_year_uuid,
            ),
            staff,
            db,
        )
        for name, start, end in (
            ("Semester 1", "2026-09-07", "2026-10-04"),  # exactly four weeks
            ("Semester 2", "2027-01-11", "2027-05-28"),
        )
    ]
    await set_course_cohorts(
        None,
        COURSE_UUID,
        CourseAcademicCohortsUpdate(
            academic_cohort_uuids=[cohort.academic_cohort_uuid for cohort in created]
        ),
        staff,
        db,
    )
    return created


@pytest.fixture
def other_course(db):
    course = Course(
        id=OTHER_COURSE_ID,
        org_id=ORG_ID,
        course_uuid="course_other",
        name="Other course",
        description="",
        about="",
        learnings="",
        tags="",
        public=False,
        open_to_contributors=False,
        creation_date=NOW,
        update_date=NOW,
    )
    db.add(course)
    db.commit()
    return course


# ─────────────────────────── Programme weeks ───────────────────────


class TestGenerateProgrammeWeeks:
    async def test_weeks_are_contiguous_from_the_cohort_start(self, db, staff, cohorts):
        weeks = await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[0], 4), staff, db
        )

        assert [week.week_number for week in weeks] == [1, 2, 3, 4]
        assert [(week.starts_on, week.ends_on) for week in weeks] == [
            ("2026-09-07", "2026-09-13"),
            ("2026-09-14", "2026-09-20"),
            ("2026-09-21", "2026-09-27"),
            ("2026-09-28", "2026-10-04"),
        ]

    async def test_new_weeks_follow_published_chapter_order(self, db, staff, cohorts):
        add_chapter(db, 1, order=2)
        add_chapter(db, 2, order=1)
        add_chapter(db, 3, order=3, published=False)

        weeks = await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[0], 3), staff, db
        )
        assert [week.chapter_id for week in weeks] == [2, 1, None]

    async def test_generating_again_extends_and_keeps_existing_weeks(
        self, db, staff, cohorts
    ):
        first = await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[0], 2), staff, db
        )
        add_chapter(db, 1, order=1)
        extended = await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[0], 3), staff, db
        )

        assert [week.programme_week_uuid for week in extended[:2]] == [
            week.programme_week_uuid for week in first
        ]
        # Existing weeks keep their (empty) mapping; only the new week is mapped.
        assert [week.chapter_id for week in extended] == [None, None, None]
        assert len(extended) == 3

    async def test_each_cohort_gets_its_own_week_one(self, db, staff, cohorts):
        await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[0], 2), staff, db
        )
        await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[1], 2), staff, db
        )

        all_weeks = await list_programme_weeks(None, COURSE_UUID, None, staff, db)
        assert [(week.week_number, week.starts_on) for week in all_weeks] == [
            (1, "2026-09-07"),
            (2, "2026-09-14"),
            (1, "2027-01-11"),
            (2, "2027-01-18"),
        ]

        second = await list_programme_weeks(
            None, COURSE_UUID, cohorts[1].academic_cohort_uuid, staff, db
        )
        assert [week.starts_on for week in second] == ["2027-01-11", "2027-01-18"]

    @pytest.mark.parametrize("weeks", [0, 5, 105], ids=["zero", "past-end", "too-many"])
    async def test_invalid_week_counts_are_rejected(self, db, staff, cohorts, weeks):
        status = await _status_of(
            generate_programme_weeks(
                None, COURSE_UUID, _generate(cohorts[0], weeks), staff, db
            )
        )
        assert status == 422

    async def test_cohort_must_be_linked_to_the_course(self, db, staff, cohorts):
        await set_course_cohorts(
            None,
            COURSE_UUID,
            CourseAcademicCohortsUpdate(
                academic_cohort_uuids=[cohorts[0].academic_cohort_uuid]
            ),
            staff,
            db,
        )
        status = await _status_of(
            generate_programme_weeks(
                None, COURSE_UUID, _generate(cohorts[1], 2), staff, db
            )
        )
        assert status == 404

    async def test_learner_can_list_but_not_generate(self, db, staff, learner, cohorts):
        await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[0], 1), staff, db
        )
        assert (
            len(await list_programme_weeks(None, COURSE_UUID, None, learner, db)) == 1
        )

        status = await _status_of(
            generate_programme_weeks(
                None, COURSE_UUID, _generate(cohorts[0], 2), learner, db
            )
        )
        assert status == 403

    async def test_cohort_with_weeks_cannot_be_unlinked(self, db, staff, cohorts):
        await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[0], 1), staff, db
        )
        status = await _status_of(
            set_course_cohorts(
                None,
                COURSE_UUID,
                CourseAcademicCohortsUpdate(academic_cohort_uuids=[]),
                staff,
                db,
            )
        )
        assert status == 409


class TestUpdateProgrammeWeek:
    @pytest.fixture
    async def week(self, db, staff, cohorts):
        weeks = await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[0], 1), staff, db
        )
        return weeks[0]

    async def test_week_can_be_mapped_and_cleared(self, db, staff, week):
        add_chapter(db, 1, order=1)
        milestones = await seed_course_journey(None, COURSE_UUID, staff, db)

        mapped = await update_programme_week(
            None,
            COURSE_UUID,
            week.programme_week_uuid,
            ProgrammeWeekUpdate(
                chapter_id=1, milestone_uuid=milestones[0].milestone_uuid
            ),
            staff,
            db,
        )
        assert mapped.chapter_id == 1
        assert mapped.milestone_uuid == milestones[0].milestone_uuid

        # Only the field that is sent changes; null clears it.
        cleared = await update_programme_week(
            None,
            COURSE_UUID,
            week.programme_week_uuid,
            ProgrammeWeekUpdate(chapter_id=None),
            staff,
            db,
        )
        assert cleared.chapter_id is None
        assert cleared.milestone_uuid == milestones[0].milestone_uuid

    async def test_deleting_a_milestone_unmaps_its_week(self, db, staff, week):
        milestones = await seed_course_journey(None, COURSE_UUID, staff, db)
        uuid = milestones[0].milestone_uuid
        await update_programme_week(
            None,
            COURSE_UUID,
            week.programme_week_uuid,
            ProgrammeWeekUpdate(milestone_uuid=uuid),
            staff,
            db,
        )

        await delete_milestone(None, uuid, staff, db)
        weeks = await list_programme_weeks(None, COURSE_UUID, None, staff, db)
        assert weeks[0].milestone_uuid is None

    async def test_chapter_and_milestone_must_belong_to_the_course(
        self, db, staff, week, other_course
    ):
        add_chapter(db, 9, order=1, course_id=OTHER_COURSE_ID)
        foreign = await seed_course_journey(None, "course_other", staff, db)

        for payload in (
            ProgrammeWeekUpdate(chapter_id=9),
            ProgrammeWeekUpdate(milestone_uuid=foreign[0].milestone_uuid),
        ):
            status = await _status_of(
                update_programme_week(
                    None, COURSE_UUID, week.programme_week_uuid, payload, staff, db
                )
            )
            assert status == 422

    async def test_unknown_week_is_not_found(self, db, staff, cohorts):
        status = await _status_of(
            update_programme_week(
                None,
                COURSE_UUID,
                "programme_week_missing",
                ProgrammeWeekUpdate(),
                staff,
                db,
            )
        )
        assert status == 404


# ─────────────────────────── Timetable events ──────────────────────


def _event(**overrides) -> CourseTimetableEventCreate:
    data = {
        "title": "Live class",
        # Monday 5 October 2026, 10:00 in Lagos.
        "starts_at": "2026-10-05T10:00:00+01:00",
        "ends_at": "2026-10-05T11:00:00+01:00",
        "timezone": "Africa/Lagos",
    }
    return CourseTimetableEventCreate(**{**data, **overrides})


class TestTimetableCalendarFields:
    async def test_phase_defaults_to_the_local_weekday(self, db, course, staff):
        monday = await create_timetable_event(None, COURSE_UUID, _event(), staff, db)
        assert monday.weekly_schedule_phase == LearningPhaseEnum.learn

        # 00:30 on Sunday in Lagos is still Saturday in UTC.
        sunday = await create_timetable_event(
            None,
            COURSE_UUID,
            _event(
                starts_at="2026-10-04T00:30:00+01:00",
                ends_at="2026-10-04T01:30:00+01:00",
            ),
            staff,
            db,
        )
        assert sunday.weekly_schedule_phase == LearningPhaseEnum.rest

    async def test_explicit_phase_is_kept(self, db, course, staff):
        event = await create_timetable_event(
            None, COURSE_UUID, _event(weekly_schedule_phase="connect"), staff, db
        )
        assert event.weekly_schedule_phase == LearningPhaseEnum.connect

    async def test_phase_survives_rhythm_changes_and_plain_updates(
        self, db, course, staff
    ):
        event = await create_timetable_event(None, COURSE_UUID, _event(), staff, db)
        await update_default_schedule(
            WeeklyOperatingScheduleUpdate(
                days=[WeeklyOperatingScheduleDayBase(weekday=0, phase="build")]
            ),
            staff,
            db,
        )

        updated = await update_timetable_event(
            None, COURSE_UUID, event.event_uuid, _event(title="Renamed"), staff, db
        )
        assert updated.title == "Renamed"
        assert updated.weekly_schedule_phase == LearningPhaseEnum.learn

    async def test_event_can_join_a_programme_week_of_its_course(
        self, db, staff, cohorts
    ):
        weeks = await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[0], 1), staff, db
        )
        event = await create_timetable_event(
            None, COURSE_UUID, _event(programme_week_id=weeks[0].id), staff, db
        )
        assert event.programme_week_id == weeks[0].id

    async def test_programme_week_of_another_course_is_rejected(
        self, db, staff, cohorts, other_course
    ):
        weeks = await generate_programme_weeks(
            None, COURSE_UUID, _generate(cohorts[0], 1), staff, db
        )
        other_event = _event(programme_week_id=weeks[0].id)
        status = await _status_of(
            create_timetable_event(None, "course_other", other_event, staff, db)
        )
        assert status == 422


class TestTimetablePermissions:
    async def test_staff_with_the_calendar_right_manage_any_course(
        self, db, course, staff
    ):
        event = await create_timetable_event(None, COURSE_UUID, _event(), staff, db)
        # Drafts are visible to those who can manage the timetable.
        assert len(await get_timetable_events(None, COURSE_UUID, staff, db)) == 1

        await delete_timetable_event(None, COURSE_UUID, event.event_uuid, staff, db)
        assert await get_timetable_events(None, COURSE_UUID, staff, db) == []

    async def test_course_owner_still_manages_their_course(
        self, db, course, course_owner
    ):
        event = await create_timetable_event(
            None, COURSE_UUID, _event(), course_owner, db
        )
        assert event.title == "Live class"

    async def test_learner_cannot_manage_and_sees_no_drafts(
        self, db, course, staff, learner
    ):
        await create_timetable_event(None, COURSE_UUID, _event(), staff, db)

        assert await get_timetable_events(None, COURSE_UUID, learner, db) == []
        status = await _status_of(
            create_timetable_event(None, COURSE_UUID, _event(), learner, db)
        )
        assert status == 403

    async def test_anonymous_cannot_manage(self, db, course):
        status = await _status_of(
            create_timetable_event(None, COURSE_UUID, _event(), AnonymousUser(), db)
        )
        assert status == 401
