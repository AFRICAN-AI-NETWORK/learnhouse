"""
Tests for the weekly operating schedule (src/services/courses/weekly_schedule.py).

Covers the lazily created organization default, course overrides and their
fallback, validation, and who may read or change a schedule.
"""

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from src.db.courses.weekly_schedule import (
    LearningPhaseEnum,
    WeeklyOperatingSchedule,
    WeeklyOperatingScheduleDay,
    WeeklyOperatingScheduleDayBase,
    WeeklyOperatingScheduleUpdate,
)
from src.db.users import AnonymousUser
from src.services.courses import weekly_schedule as service
from src.services.courses.weekly_schedule import (
    delete_course_schedule,
    get_course_schedule,
    get_default_schedule,
    get_or_create_default_schedule,
    resolve_schedule,
    update_default_schedule,
    upsert_course_schedule,
)
from src.tests.academic_calendar.conftest import COURSE_UUID, NOW, ORG_ID

FRIDAY, SATURDAY, SUNDAY = 4, 5, 6


def _day(weekday: int, phase: str, is_rest_day: bool = False):
    return WeeklyOperatingScheduleDayBase(
        weekday=weekday, phase=phase, is_rest_day=is_rest_day
    )


def _rest_weekdays(schedule_read) -> list[int]:
    return [day.weekday for day in schedule_read.days if day.is_rest_day]


def _count(db, model) -> int:
    return len(db.exec(select(model)).all())


# ─────────────────────────── Default schedule ──────────────────────


class TestDefaultSchedule:
    async def test_default_is_created_with_sunday_as_the_rest_day(self, db, learner):
        schedule = await get_default_schedule(learner, db)

        assert [day.weekday for day in schedule.days] == list(range(7))
        assert [day.phase for day in schedule.days] == [
            LearningPhaseEnum.learn,
            LearningPhaseEnum.practice,
            LearningPhaseEnum.connect,
            LearningPhaseEnum.apply,
            LearningPhaseEnum.build,
            LearningPhaseEnum.support,
            LearningPhaseEnum.rest,
        ]
        assert _rest_weekdays(schedule) == [SUNDAY]
        assert schedule.timezone == "Africa/Lagos"
        assert schedule.rest_day_enforced is True
        assert schedule.is_course_override is False
        assert schedule.course_uuid is None

    async def test_default_is_created_once(self, db, learner):
        first = await get_default_schedule(learner, db)
        second = await get_default_schedule(learner, db)

        assert first.schedule_uuid == second.schedule_uuid
        assert _count(db, WeeklyOperatingSchedule) == 1
        assert _count(db, WeeklyOperatingScheduleDay) == 7

    async def test_anonymous_cannot_read_the_default(self, db):
        with pytest.raises(HTTPException) as exc:
            await get_default_schedule(AnonymousUser(), db)
        assert exc.value.status_code == 401

    def test_database_rejects_a_second_default(self, db):
        get_or_create_default_schedule(db)
        db.add(
            WeeklyOperatingSchedule(
                schedule_uuid="weekly_schedule_duplicate",
                org_id=ORG_ID,
                creation_date=NOW,
                update_date=NOW,
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

    def test_losing_a_creation_race_returns_the_existing_default(self, db, monkeypatch):
        existing_id = get_or_create_default_schedule(db).id
        real_lookup = service._get_default_schedule
        calls = []

        def lookup(session):
            # First lookup misses, as it would for the slower of two requests.
            calls.append(1)
            return None if len(calls) == 1 else real_lookup(session)

        monkeypatch.setattr(service, "_get_default_schedule", lookup)

        assert get_or_create_default_schedule(db).id == existing_id
        assert len(calls) == 2
        assert _count(db, WeeklyOperatingSchedule) == 1
        assert _count(db, WeeklyOperatingScheduleDay) == 7


class TestUpdateDefaultSchedule:
    async def test_staff_can_move_the_rest_day(self, db, staff):
        updated = await update_default_schedule(
            WeeklyOperatingScheduleUpdate(
                name="Friday rest",
                timezone="Africa/Nairobi",
                days=[_day(FRIDAY, "rest", True), _day(SUNDAY, "support")],
            ),
            staff,
            db,
        )

        assert updated.name == "Friday rest"
        assert updated.timezone == "Africa/Nairobi"
        assert _rest_weekdays(updated) == [FRIDAY]
        # Days that were not listed keep their phase.
        assert updated.days[0].phase == LearningPhaseEnum.learn
        assert _count(db, WeeklyOperatingScheduleDay) == 7

    async def test_phase_and_rest_flag_are_independent(self, db, staff):
        updated = await update_default_schedule(
            WeeklyOperatingScheduleUpdate(days=[_day(SATURDAY, "support", True)]),
            staff,
            db,
        )
        saturday = updated.days[SATURDAY]
        assert (saturday.phase, saturday.is_rest_day) == ("support", True)

    async def test_enforcement_can_be_switched_off(self, db, staff):
        updated = await update_default_schedule(
            WeeklyOperatingScheduleUpdate(rest_day_enforced=False), staff, db
        )
        assert updated.rest_day_enforced is False
        assert _rest_weekdays(updated) == [SUNDAY]

    async def test_learner_cannot_update(self, db, learner):
        with pytest.raises(HTTPException) as exc:
            await update_default_schedule(
                WeeklyOperatingScheduleUpdate(name="Mine"), learner, db
            )
        assert exc.value.status_code == 403

    @pytest.mark.parametrize(
        "payload",
        [
            {"timezone": "Mars/Olympus"},
            {"name": "   "},
            {"days": [{"weekday": 7, "phase": "learn"}]},
            {"days": [{"weekday": -1, "phase": "learn"}]},
            {
                "days": [
                    {"weekday": 1, "phase": "learn"},
                    {"weekday": 1, "phase": "build"},
                ]
            },
        ],
        ids=["timezone", "blank-name", "weekday-high", "weekday-low", "duplicate"],
    )
    async def test_invalid_updates_are_rejected(self, db, staff, payload):
        with pytest.raises(HTTPException) as exc:
            await update_default_schedule(
                WeeklyOperatingScheduleUpdate(**payload), staff, db
            )
        assert exc.value.status_code == 422

    async def test_every_day_cannot_be_a_rest_day(self, db, staff):
        all_rest = [_day(weekday, "rest", True) for weekday in range(7)]
        with pytest.raises(HTTPException) as exc:
            await update_default_schedule(
                WeeklyOperatingScheduleUpdate(days=all_rest), staff, db
            )
        assert exc.value.status_code == 422
        assert _rest_weekdays(await get_default_schedule(staff, db)) == [SUNDAY]


# ─────────────────────────── Course schedule ───────────────────────


class TestCourseSchedule:
    async def test_course_follows_the_default_without_an_override(
        self, db, course, learner
    ):
        schedule = await get_course_schedule(None, COURSE_UUID, learner, db)

        assert schedule.is_course_override is False
        assert schedule.course_uuid == COURSE_UUID
        assert _rest_weekdays(schedule) == [SUNDAY]

    async def test_override_starts_as_a_copy_and_leaves_the_default_alone(
        self, db, course, staff
    ):
        override = await upsert_course_schedule(
            None,
            COURSE_UUID,
            WeeklyOperatingScheduleUpdate(
                days=[_day(FRIDAY, "rest", True), _day(SUNDAY, "build")]
            ),
            staff,
            db,
        )

        assert override.is_course_override is True
        assert len(override.days) == 7
        assert _rest_weekdays(override) == [FRIDAY]
        assert _rest_weekdays(await get_default_schedule(staff, db)) == [SUNDAY]

        resolved = await get_course_schedule(None, COURSE_UUID, staff, db)
        assert resolved.schedule_uuid == override.schedule_uuid

    async def test_second_upsert_updates_the_same_override(self, db, course, staff):
        first = await upsert_course_schedule(
            None, COURSE_UUID, WeeklyOperatingScheduleUpdate(name="One"), staff, db
        )
        second = await upsert_course_schedule(
            None, COURSE_UUID, WeeklyOperatingScheduleUpdate(name="Two"), staff, db
        )

        assert first.schedule_uuid == second.schedule_uuid
        assert second.name == "Two"
        assert _count(db, WeeklyOperatingSchedule) == 2  # default + override

    async def test_resolve_schedule_prefers_the_override(self, db, course, staff):
        default = get_or_create_default_schedule(db)
        assert resolve_schedule(course, db).id == default.id

        await upsert_course_schedule(
            None, COURSE_UUID, WeeklyOperatingScheduleUpdate(), staff, db
        )
        assert resolve_schedule(course, db).course_id == course.id

    async def test_deleting_the_override_falls_back_to_the_default(
        self, db, course, staff
    ):
        await upsert_course_schedule(
            None,
            COURSE_UUID,
            WeeklyOperatingScheduleUpdate(
                days=[_day(FRIDAY, "rest", True), _day(SUNDAY, "build")]
            ),
            staff,
            db,
        )

        await delete_course_schedule(None, COURSE_UUID, staff, db)

        schedule = await get_course_schedule(None, COURSE_UUID, staff, db)
        assert schedule.is_course_override is False
        assert _rest_weekdays(schedule) == [SUNDAY]
        assert _count(db, WeeklyOperatingScheduleDay) == 7

    async def test_deleting_a_missing_override_is_not_found(self, db, course, staff):
        with pytest.raises(HTTPException) as exc:
            await delete_course_schedule(None, COURSE_UUID, staff, db)
        assert exc.value.status_code == 404

    async def test_unknown_course_is_not_found(self, db, staff):
        with pytest.raises(HTTPException) as exc:
            await get_course_schedule(None, "course_missing", staff, db)
        assert exc.value.status_code == 404


class TestCourseScheduleAuthorization:
    async def test_course_owner_can_override_without_the_calendar_right(
        self, db, course, course_owner
    ):
        override = await upsert_course_schedule(
            None,
            COURSE_UUID,
            WeeklyOperatingScheduleUpdate(name="Owner rhythm"),
            course_owner,
            db,
        )
        assert override.name == "Owner rhythm"

    async def test_learner_cannot_override(self, db, course, learner):
        with pytest.raises(HTTPException) as exc:
            await upsert_course_schedule(
                None, COURSE_UUID, WeeklyOperatingScheduleUpdate(), learner, db
            )
        assert exc.value.status_code == 403
        assert _count(db, WeeklyOperatingSchedule) == 0

    async def test_learner_cannot_delete(self, db, course, staff, learner):
        await upsert_course_schedule(
            None, COURSE_UUID, WeeklyOperatingScheduleUpdate(), staff, db
        )
        with pytest.raises(HTTPException) as exc:
            await delete_course_schedule(None, COURSE_UUID, learner, db)
        assert exc.value.status_code == 403

    async def test_anonymous_cannot_override(self, db, course):
        with pytest.raises(HTTPException) as exc:
            await upsert_course_schedule(
                None, COURSE_UUID, WeeklyOperatingScheduleUpdate(), AnonymousUser(), db
            )
        assert exc.value.status_code == 401
