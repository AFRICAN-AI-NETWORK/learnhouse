"""
Tests for academic years, academic cohorts and course links
(src/services/academic_calendar.py).
"""

import pytest
from fastapi import HTTPException
from sqlmodel import select

from src.db.academic_calendar import (
    AcademicCohortCreate,
    AcademicCohortStatusEnum,
    AcademicCohortUpdate,
    AcademicYearCreate,
    AcademicYearUpdate,
    CourseAcademicCohort,
    CourseAcademicCohortsUpdate,
)
from src.db.users import AnonymousUser
from src.services.academic_calendar import (
    create_academic_cohort,
    create_academic_year,
    delete_academic_cohort,
    delete_academic_year,
    get_active_academic_year,
    list_academic_cohorts,
    list_academic_years,
    list_course_cohorts,
    set_course_cohorts,
    update_academic_cohort,
    update_academic_year,
)
from src.tests.academic_calendar.conftest import COURSE_UUID


def _year_payload(**overrides) -> AcademicYearCreate:
    data = {
        "name": "2026/2027",
        "region": "West Africa",
        "start_date": "2026-09-01",
        "end_date": "2027-07-31",
    }
    return AcademicYearCreate(**{**data, **overrides})


def _cohort_payload(academic_year_uuid: str, **overrides) -> AcademicCohortCreate:
    data = {
        "name": "Semester 1",
        "start_date": "2026-09-07",
        "end_date": "2026-12-18",
        "academic_year_uuid": academic_year_uuid,
    }
    return AcademicCohortCreate(**{**data, **overrides})


async def _status_of(coroutine) -> int:
    with pytest.raises(HTTPException) as exc:
        await coroutine
    return exc.value.status_code


@pytest.fixture
async def year(db, staff):
    return await create_academic_year(_year_payload(), staff, db)


@pytest.fixture
async def semester_one(db, staff, year):
    return await create_academic_cohort(
        _cohort_payload(year.academic_year_uuid), staff, db
    )


@pytest.fixture
async def semester_two(db, staff, year):
    return await create_academic_cohort(
        _cohort_payload(
            year.academic_year_uuid,
            name="Semester 2",
            start_date="2027-01-11",
            end_date="2027-05-28",
        ),
        staff,
        db,
    )


# ─────────────────────────── Academic years ────────────────────────


class TestAcademicYears:
    async def test_staff_can_create_a_year(self, year):
        assert year.academic_year_uuid.startswith("academic_year_")
        assert (year.name, year.region) == ("2026/2027", "West Africa")
        assert (year.start_date, year.end_date) == ("2026-09-01", "2027-07-31")
        assert year.is_active is True

    async def test_learner_cannot_create(self, db, learner):
        assert (
            await _status_of(create_academic_year(_year_payload(), learner, db)) == 403
        )

    async def test_anonymous_cannot_list(self, db):
        assert await _status_of(list_academic_years(AnonymousUser(), db)) == 401

    @pytest.mark.parametrize(
        "overrides",
        [
            {"start_date": "2026/09/01"},
            {"start_date": "20260901"},
            {"end_date": "2026-09-01T00:00:00Z"},
            {"start_date": "2027-07-31", "end_date": "2026-09-01"},
            {"start_date": "2026-09-01", "end_date": "2026-09-01"},
            {"name": "  "},
        ],
        ids=["slashes", "compact", "datetime", "reversed", "same-day", "blank-name"],
    )
    async def test_invalid_years_are_rejected(self, db, staff, overrides):
        status = await _status_of(
            create_academic_year(_year_payload(**overrides), staff, db)
        )
        assert status == 422

    async def test_active_years_cannot_overlap(self, db, staff, year):
        overlapping = _year_payload(
            name="Overlap", start_date="2027-07-31", end_date="2028-07-31"
        )
        assert await _status_of(create_academic_year(overlapping, staff, db)) == 409

    async def test_adjacent_and_inactive_years_are_allowed(self, db, staff, year):
        following = await create_academic_year(
            _year_payload(
                name="2027/2028", start_date="2027-08-01", end_date="2028-07-31"
            ),
            staff,
            db,
        )
        archived = await create_academic_year(
            _year_payload(name="Draft", is_active=False), staff, db
        )
        assert following.is_active is True
        assert archived.is_active is False

    async def test_years_are_listed_most_recent_first(self, db, staff, learner, year):
        await create_academic_year(
            _year_payload(
                name="2027/2028", start_date="2027-08-01", end_date="2028-07-31"
            ),
            staff,
            db,
        )
        names = [item.name for item in await list_academic_years(learner, db)]
        assert names == ["2027/2028", "2026/2027"]

    async def test_active_year_prefers_active_then_latest(self, db, staff, learner):
        assert await _status_of(get_active_academic_year(learner, db)) == 404

        old = await create_academic_year(
            _year_payload(
                name="2025/2026", start_date="2025-09-01", end_date="2026-07-31"
            ),
            staff,
            db,
        )
        await create_academic_year(
            _year_payload(name="Planned", is_active=False), staff, db
        )
        assert (await get_active_academic_year(learner, db)).name == "2025/2026"

        await update_academic_year(
            old.academic_year_uuid, AcademicYearUpdate(is_active=False), staff, db
        )
        assert (await get_active_academic_year(learner, db)).name == "Planned"

    async def test_update_changes_only_the_sent_fields(self, db, staff, year):
        updated = await update_academic_year(
            year.academic_year_uuid, AcademicYearUpdate(region="Pan-African"), staff, db
        )
        assert updated.region == "Pan-African"
        assert updated.name == "2026/2027"
        assert updated.start_date == "2026-09-01"

    async def test_rejected_update_leaves_the_year_unchanged(self, db, staff, year):
        status = await _status_of(
            update_academic_year(
                year.academic_year_uuid,
                AcademicYearUpdate(end_date="2026-01-01"),
                staff,
                db,
            )
        )
        assert status == 422
        assert (await list_academic_years(staff, db))[0].end_date == "2027-07-31"

    async def test_year_cannot_shrink_past_its_cohorts(
        self, db, staff, year, semester_one
    ):
        status = await _status_of(
            update_academic_year(
                year.academic_year_uuid,
                AcademicYearUpdate(start_date="2026-10-01"),
                staff,
                db,
            )
        )
        assert status == 422

    async def test_delete_requires_an_empty_year(self, db, staff, year, semester_one):
        uuid = year.academic_year_uuid
        assert await _status_of(delete_academic_year(uuid, staff, db)) == 409

        await delete_academic_cohort(semester_one.academic_cohort_uuid, staff, db)
        await delete_academic_year(uuid, staff, db)
        assert await list_academic_years(staff, db) == []

    async def test_unknown_year_is_not_found(self, db, staff):
        status = await _status_of(
            update_academic_year(
                "academic_year_missing", AcademicYearUpdate(), staff, db
            )
        )
        assert status == 404


# ─────────────────────────── Academic cohorts ──────────────────────


class TestAcademicCohorts:
    async def test_staff_can_create_a_cohort(self, year, semester_one):
        assert semester_one.academic_cohort_uuid.startswith("academic_cohort_")
        assert semester_one.academic_year_uuid == year.academic_year_uuid
        assert semester_one.status == AcademicCohortStatusEnum.upcoming

    async def test_learner_cannot_create(self, db, learner, year):
        payload = _cohort_payload(year.academic_year_uuid)
        assert await _status_of(create_academic_cohort(payload, learner, db)) == 403

    async def test_unknown_year_is_not_found(self, db, staff):
        payload = _cohort_payload("academic_year_missing")
        assert await _status_of(create_academic_cohort(payload, staff, db)) == 404

    @pytest.mark.parametrize(
        "overrides",
        [
            {"start_date": "2026-08-31"},
            {"end_date": "2027-08-01"},
            {"start_date": "2026-12-18", "end_date": "2026-09-07"},
            {"start_date": "07/09/2026"},
            {"name": ""},
            {
                "enrollment_window_start": "2026-09-01",
                "enrollment_window_end": "2026-08-01",
            },
            {"enrollment_window_end": "2026-12-19"},
            {"enrollment_window_start": "soon"},
        ],
        ids=[
            "before-year",
            "after-year",
            "reversed",
            "format",
            "blank-name",
            "window-reversed",
            "window-after-end",
            "window-format",
        ],
    )
    async def test_invalid_cohorts_are_rejected(self, db, staff, year, overrides):
        payload = _cohort_payload(year.academic_year_uuid, **overrides)
        assert await _status_of(create_academic_cohort(payload, staff, db)) == 422

    async def test_enrollment_window_may_open_before_the_cohort(self, db, staff, year):
        cohort = await create_academic_cohort(
            _cohort_payload(
                year.academic_year_uuid,
                enrollment_window_start="2026-07-01",
                enrollment_window_end="2026-09-14",
            ),
            staff,
            db,
        )
        assert cohort.enrollment_window_start == "2026-07-01"

    async def test_cohorts_are_listed_in_start_order(
        self, db, learner, year, semester_two, semester_one
    ):
        cohorts = await list_academic_cohorts(year.academic_year_uuid, learner, db)
        assert [cohort.name for cohort in cohorts] == ["Semester 1", "Semester 2"]

    async def test_update_changes_only_the_sent_fields(self, db, staff, semester_one):
        updated = await update_academic_cohort(
            semester_one.academic_cohort_uuid,
            AcademicCohortUpdate(status=AcademicCohortStatusEnum.active),
            staff,
            db,
        )
        assert updated.status == AcademicCohortStatusEnum.active
        assert updated.name == "Semester 1"

    async def test_rejected_update_leaves_the_cohort_unchanged(
        self, db, staff, year, semester_one
    ):
        status = await _status_of(
            update_academic_cohort(
                semester_one.academic_cohort_uuid,
                AcademicCohortUpdate(end_date="2028-01-01"),
                staff,
                db,
            )
        )
        assert status == 422
        cohorts = await list_academic_cohorts(year.academic_year_uuid, staff, db)
        assert cohorts[0].end_date == "2026-12-18"


# ─────────────────────────── Course links ──────────────────────────


def _uuids(cohorts) -> list[str]:
    return [cohort.academic_cohort_uuid for cohort in cohorts]


def _links(*cohorts) -> CourseAcademicCohortsUpdate:
    return CourseAcademicCohortsUpdate(academic_cohort_uuids=_uuids(cohorts))


class TestCourseCohortLinks:
    async def test_course_can_run_under_several_cohorts(
        self, db, course, staff, learner, semester_one, semester_two
    ):
        linked = await set_course_cohorts(
            None, COURSE_UUID, _links(semester_two, semester_one), staff, db
        )
        assert _uuids(linked) == _uuids([semester_one, semester_two])

        listed = await list_course_cohorts(None, COURSE_UUID, learner, db)
        assert _uuids(listed) == _uuids(linked)

    async def test_setting_replaces_the_previous_set(
        self, db, course, staff, semester_one, semester_two
    ):
        await set_course_cohorts(None, COURSE_UUID, _links(semester_one), staff, db)
        linked = await set_course_cohorts(
            None, COURSE_UUID, _links(semester_two), staff, db
        )

        assert _uuids(linked) == _uuids([semester_two])
        assert len(db.exec(select(CourseAcademicCohort)).all()) == 1

    async def test_setting_the_same_set_keeps_existing_links(
        self, db, course, staff, semester_one
    ):
        await set_course_cohorts(None, COURSE_UUID, _links(semester_one), staff, db)
        first_id = db.exec(select(CourseAcademicCohort)).one().id

        await set_course_cohorts(None, COURSE_UUID, _links(semester_one), staff, db)
        assert db.exec(select(CourseAcademicCohort)).one().id == first_id

    async def test_empty_set_unlinks_everything(self, db, course, staff, semester_one):
        await set_course_cohorts(None, COURSE_UUID, _links(semester_one), staff, db)
        assert await set_course_cohorts(None, COURSE_UUID, _links(), staff, db) == []

    async def test_unknown_cohort_changes_nothing(
        self, db, course, staff, semester_one
    ):
        await set_course_cohorts(None, COURSE_UUID, _links(semester_one), staff, db)
        payload = CourseAcademicCohortsUpdate(
            academic_cohort_uuids=["academic_cohort_missing"]
        )

        status = await _status_of(
            set_course_cohorts(None, COURSE_UUID, payload, staff, db)
        )
        assert status == 404
        assert _uuids(
            await list_course_cohorts(None, COURSE_UUID, staff, db)
        ) == _uuids([semester_one])

    async def test_linked_cohort_cannot_be_deleted(
        self, db, course, staff, semester_one
    ):
        await set_course_cohorts(None, COURSE_UUID, _links(semester_one), staff, db)
        uuid = semester_one.academic_cohort_uuid
        assert await _status_of(delete_academic_cohort(uuid, staff, db)) == 409

    async def test_course_owner_can_link_without_the_calendar_right(
        self, db, course, course_owner, semester_one
    ):
        linked = await set_course_cohorts(
            None, COURSE_UUID, _links(semester_one), course_owner, db
        )
        assert _uuids(linked) == _uuids([semester_one])

    async def test_learner_cannot_link(self, db, course, learner, semester_one):
        status = await _status_of(
            set_course_cohorts(None, COURSE_UUID, _links(semester_one), learner, db)
        )
        assert status == 403

    async def test_unknown_course_is_not_found(self, db, staff):
        status = await _status_of(
            list_course_cohorts(None, "course_missing", staff, db)
        )
        assert status == 404
