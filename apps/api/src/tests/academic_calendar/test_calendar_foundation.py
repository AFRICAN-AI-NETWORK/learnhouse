"""
Foundation tests for the academic calendar epic.

Layers covered:
  * Shared date helpers (src/services/utils/datetimes.py) — no DB.
  * Rights model backward compatibility for the academic_calendar resource.
  * Calendar guards (src/security/calendar_security.py) — DB-backed.
  * Intake cohort service baseline and the authorization on its router.
"""

from datetime import UTC, datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from src.db.cohorts import CohortCreate, CohortEnrollment, CohortStatusEnum
from src.db.courses.courses import Course  # noqa: F401
from src.db.organizations import Organization
from src.db.payments.payments_users import PaymentsUser  # noqa: F401
from src.db.roles import Rights, Role
from src.db.user_organizations import UserOrganization
from src.db.users import AnonymousUser, User
from src.routers.cohorts import api_create_cohort, api_unlock_cohort
from src.security import calendar_security
from src.security.calendar_security import (
    require_calendar_right,
    require_course_calendar_access,
)
from src.services.cohorts.cohorts import (
    create_cohort,
    enroll_user_in_cohort,
    get_current_cohort,
    unlock_cohort,
)
from src.services.courses.schedules import _validate_timetable_event
from src.services.setup.setup import install_default_elements
from src.services.utils.datetimes import (
    local_date,
    parse_instant,
    parse_instant_utc,
    resolve_zone,
)

_NOW = str(datetime.now(UTC))
_ORG_ID = 1

_MANAGE = {
    "action_create": True,
    "action_read": True,
    "action_update": True,
    "action_delete": True,
}
# Rights payload as stored before the academic_calendar resource existed.
_LEGACY_RIGHTS = {
    "courses": {
        "action_create": False,
        "action_read": True,
        "action_read_own": True,
        "action_update": False,
        "action_update_own": False,
        "action_delete": False,
        "action_delete_own": False,
    },
    **{
        resource: {
            "action_create": False,
            "action_read": True,
            "action_update": False,
            "action_delete": False,
        }
        for resource in (
            "users",
            "usergroups",
            "collections",
            "organizations",
            "coursechapters",
            "activities",
            "roles",
            "communications",
        )
    },
    "dashboard": {"action_access": False},
}


# ─────────────────────────── Fixtures ──────────────────────────────


@pytest.fixture(name="db")
def db_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(
            Organization(
                id=_ORG_ID,
                name="Org",
                description="",
                about="",
                logo_image="",
                thumbnail_image="",
                label="",
                slug="org",
                email="org@example.com",
            )
        )
        session.commit()
        yield session
    SQLModel.metadata.drop_all(engine)


def _add_user_with_role(db: Session, user_id: int, role_id: int, rights: dict) -> User:
    """Create a user holding a single role with the given rights payload."""
    if not db.get(Role, role_id):
        role = Role(id=role_id, name=f"role-{role_id}", description="")
        # Assigned after construction so the JSON column stores a plain dict.
        role.rights = rights
        db.add(role)
    user = User(
        id=user_id,
        username=f"user{user_id}",
        first_name="Test",
        last_name="User",
        email=f"user{user_id}@example.com",
    )
    db.add(user)
    db.add(
        UserOrganization(
            user_id=user_id,
            org_id=_ORG_ID,
            role_id=role_id,
            creation_date=_NOW,
            update_date=_NOW,
        )
    )
    db.commit()
    return user


@pytest.fixture
def staff(db):
    """A non-admin role that has been granted the calendar right."""
    return _add_user_with_role(
        db, 10, 3, {**_LEGACY_RIGHTS, "academic_calendar": _MANAGE}
    )


@pytest.fixture
def learner(db):
    return _add_user_with_role(db, 11, 4, _LEGACY_RIGHTS)


# ─────────────────────────── Date helpers ──────────────────────────


class TestDatetimes:
    def test_parse_instant_keeps_the_written_offset(self):
        parsed = parse_instant("2026-10-04T00:30:00+01:00")
        assert parsed.utcoffset().total_seconds() == 3600
        assert parsed.hour == 0

    def test_parse_instant_accepts_z_suffix(self):
        assert parse_instant("2026-10-04T12:00:00Z").tzinfo is not None

    def test_naive_values_are_treated_as_utc(self):
        assert parse_instant("2026-10-04T12:00:00").utcoffset().total_seconds() == 0

    def test_parse_instant_utc_normalizes(self):
        parsed = parse_instant_utc("2026-10-04T00:30:00+01:00")
        assert (parsed.day, parsed.hour, parsed.minute) == (3, 23, 30)

    def test_invalid_value_raises(self):
        with pytest.raises(ValueError):
            parse_instant("not-a-date")

    @pytest.mark.parametrize("name", [None, "", "  ", "Mars/Olympus", "../etc"])
    def test_resolve_zone_rejects_unknown_names(self, name):
        assert resolve_zone(name) is None

    def test_resolve_zone_returns_known_zone(self):
        assert resolve_zone("Africa/Lagos") == ZoneInfo("Africa/Lagos")

    def test_local_date_differs_from_utc_date(self):
        # 00:30 Sunday in Lagos is still Saturday in UTC.
        instant = parse_instant("2026-10-04T00:30:00+01:00")
        assert local_date(instant, ZoneInfo("Africa/Lagos")).weekday() == 6
        assert local_date(instant, ZoneInfo("UTC")).weekday() == 5

    def test_local_date_follows_the_viewer_zone(self):
        # 22:30 Saturday in Lagos is already Sunday in Nairobi.
        instant = parse_instant("2026-10-03T22:30:00+01:00")
        assert local_date(instant, ZoneInfo("Africa/Lagos")).weekday() == 5
        assert local_date(instant, ZoneInfo("Africa/Nairobi")).weekday() == 6


# ─────────────────────────── Rights model ──────────────────────────


class TestRightsModel:
    def test_legacy_rights_default_to_read_only_calendar(self):
        rights = Rights(**_LEGACY_RIGHTS)
        assert rights.academic_calendar.action_read is True
        assert rights.academic_calendar.action_create is False
        assert rights.academic_calendar.action_update is False
        assert rights.academic_calendar.action_delete is False


# ─────────────────────────── Guards ────────────────────────────────


class TestRequireCalendarRight:
    async def test_role_with_the_right_passes(self, db, staff):
        await require_calendar_right(staff, "create", db)

    async def test_admin_role_passes_without_the_key(self, db):
        admin = _add_user_with_role(db, 12, 1, _LEGACY_RIGHTS)
        await require_calendar_right(admin, "delete", db)

    async def test_role_without_the_right_is_forbidden(self, db, learner):
        with pytest.raises(HTTPException) as exc:
            await require_calendar_right(learner, "create", db)
        assert exc.value.status_code == 403

    async def test_action_must_be_granted_individually(self, db):
        reader = _add_user_with_role(
            db,
            13,
            5,
            {
                **_LEGACY_RIGHTS,
                "academic_calendar": {**_MANAGE, "action_delete": False},
            },
        )
        await require_calendar_right(reader, "update", db)
        with pytest.raises(HTTPException) as exc:
            await require_calendar_right(reader, "delete", db)
        assert exc.value.status_code == 403

    async def test_anonymous_is_unauthorized(self, db):
        with pytest.raises(HTTPException) as exc:
            await require_calendar_right(AnonymousUser(), "read", db)
        assert exc.value.status_code == 401


class TestRequireCourseCalendarAccess:
    @pytest.fixture
    def ownership_calls(self, monkeypatch):
        """Replace the course ownership check and record how it was called."""
        calls = []

        async def fake_check(request, course_uuid, user, action, db_session, **kwargs):
            calls.append((course_uuid, action, kwargs))
            raise HTTPException(status_code=403, detail="not an owner")

        monkeypatch.setattr(calendar_security, "courses_rbac_check", fake_check)
        return calls

    async def test_calendar_right_skips_the_ownership_check(
        self, db, staff, ownership_calls
    ):
        await require_course_calendar_access(None, "course_1", staff, "update", db)
        assert ownership_calls == []

    async def test_falls_back_to_course_ownership(self, db, learner, ownership_calls):
        with pytest.raises(HTTPException) as exc:
            await require_course_calendar_access(
                None, "course_1", learner, "update", db
            )
        assert exc.value.status_code == 403
        assert ownership_calls == [
            ("course_1", "update", {"require_course_ownership": True})
        ]

    async def test_anonymous_is_unauthorized(self, db, ownership_calls):
        with pytest.raises(HTTPException) as exc:
            await require_course_calendar_access(
                None, "course_1", AnonymousUser(), "update", db
            )
        assert exc.value.status_code == 401
        assert ownership_calls == []


# ─────────────────────────── Intake cohorts ────────────────────────


def _cohort_payload(**overrides) -> CohortCreate:
    data = {
        "name": "",
        "cohort_number": 0,
        "start_date": "2026-11-01T00:00:00Z",
        "org_id": _ORG_ID,
    }
    return CohortCreate(**{**data, **overrides})


class TestCohortServiceBaseline:
    async def test_numbers_and_names_are_generated(self, db):
        first = await create_cohort(_cohort_payload(), db)
        second = await create_cohort(_cohort_payload(name="Autumn"), db)
        assert (first.cohort_number, first.name) == (1, "Cohort 1")
        assert (second.cohort_number, second.name) == (2, "Autumn")

    async def test_current_cohort_prefers_open_then_falls_back_to_latest(self, db):
        done = await create_cohort(
            _cohort_payload(status=CohortStatusEnum.COMPLETED), db
        )
        assert (await get_current_cohort(_ORG_ID, db)).id == done.id

        upcoming = await create_cohort(_cohort_payload(), db)
        assert (await get_current_cohort(_ORG_ID, db)).id == upcoming.id

    async def test_enrollment_is_locked_until_the_cohort_is_unlocked(self, db):
        cohort = await create_cohort(_cohort_payload(), db)
        enrollment = await enroll_user_in_cohort(7, _ORG_ID, 100, db)
        assert enrollment.is_locked is True
        assert enrollment.enrollment_type == "free"

        again = await enroll_user_in_cohort(7, _ORG_ID, 100, db)
        assert again.id == enrollment.id

        unlocked = await unlock_cohort(cohort.id, db)
        assert unlocked.status == CohortStatusEnum.ACTIVE
        assert db.get(CohortEnrollment, enrollment.id).is_locked is False

    async def test_enrolling_without_any_cohort_fails(self, db):
        with pytest.raises(HTTPException) as exc:
            await enroll_user_in_cohort(7, _ORG_ID, 100, db)
        assert exc.value.status_code == 400


class TestCohortRouterAuthorization:
    async def test_staff_can_create_and_unlock(self, db, staff):
        cohort = await api_create_cohort(_cohort_payload(), db, staff)
        unlocked = await api_unlock_cohort(cohort.id, db, staff)
        assert unlocked.status == CohortStatusEnum.ACTIVE

    async def test_learner_cannot_create(self, db, learner):
        with pytest.raises(HTTPException) as exc:
            await api_create_cohort(_cohort_payload(), db, learner)
        assert exc.value.status_code == 403

    async def test_learner_cannot_unlock(self, db, staff, learner):
        cohort = await api_create_cohort(_cohort_payload(), db, staff)
        with pytest.raises(HTTPException) as exc:
            await api_unlock_cohort(cohort.id, db, learner)
        assert exc.value.status_code == 403
        current = await get_current_cohort(_ORG_ID, db)
        assert current.status == CohortStatusEnum.UPCOMING

    async def test_anonymous_cannot_create(self, db):
        with pytest.raises(HTTPException) as exc:
            await api_create_cohort(_cohort_payload(), db, AnonymousUser())
        assert exc.value.status_code == 401


# ─────────────────────────── Timetable baseline ────────────────────


class TestTimetableValidationBaseline:
    @staticmethod
    def _event(**overrides):
        data = {
            "title": "Live class",
            "starts_at": "2026-10-05T10:00:00+01:00",
            "ends_at": "2026-10-05T11:00:00+01:00",
        }
        return SimpleNamespace(**{**data, **overrides})

    def test_valid_event_passes(self):
        _validate_timetable_event(self._event())

    def test_blank_title_is_rejected(self):
        with pytest.raises(HTTPException) as exc:
            _validate_timetable_event(self._event(title="  "))
        assert exc.value.status_code == 422

    def test_end_must_follow_start_across_offsets(self):
        # 10:00+01:00 and 09:00Z are the same instant.
        with pytest.raises(HTTPException) as exc:
            _validate_timetable_event(self._event(ends_at="2026-10-05T09:00:00Z"))
        assert exc.value.status_code == 422


# ─────────────────────────── Role seeds ────────────────────────────


class TestDefaultRoleSeeds:
    @pytest.fixture
    def seeded_rights(self, db):
        install_default_elements(db)
        return {role.role_uuid: role.rights for role in db.exec(select(Role)).all()}

    @pytest.mark.parametrize(
        "role_uuid",
        [
            "role_global_admin",
            "role_global_maintainer",
            "role_global_instructor",
            "role_global_lead_instructor",
            "role_global_student_mentor",
        ],
    )
    def test_calendar_roles_can_manage(self, seeded_rights, role_uuid):
        assert seeded_rights[role_uuid]["academic_calendar"] == _MANAGE

    @pytest.mark.parametrize(
        "role_uuid",
        [
            "role_global_user",
            "role_global_teaching_assistant",
            "role_global_community_manager",
            "role_global_student_success_coordinator",
        ],
    )
    def test_other_roles_stay_read_only(self, seeded_rights, role_uuid):
        calendar = seeded_rights[role_uuid]["academic_calendar"]
        assert calendar["action_read"] is True
        assert not any(
            calendar[f"action_{action}"] for action in ("create", "update", "delete")
        )
