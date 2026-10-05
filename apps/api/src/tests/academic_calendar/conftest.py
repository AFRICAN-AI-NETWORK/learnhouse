"""Shared fixtures for the academic calendar tests: in-memory DB, users, course."""

from datetime import UTC, datetime

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from src.db.cohorts import Cohort  # noqa: F401
from src.db.courses.courses import Course
from src.db.courses.weekly_schedule import WeeklyOperatingSchedule  # noqa: F401
from src.db.organizations import Organization
from src.db.payments.payments_users import PaymentsUser  # noqa: F401
from src.db.resource_authors import (
    ResourceAuthor,
    ResourceAuthorshipEnum,
    ResourceAuthorshipStatusEnum,
)
from src.db.roles import Role
from src.db.user_organizations import UserOrganization
from src.db.users import User

NOW = str(datetime.now(UTC))
ORG_ID = 1
COURSE_ID = 100
COURSE_UUID = "course_calendar"

MANAGE_RIGHTS = {
    "action_create": True,
    "action_read": True,
    "action_update": True,
    "action_delete": True,
}
# Rights payload as stored before the academic_calendar resource existed.
LEGACY_RIGHTS = {
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


def add_user_with_role(db: Session, user_id: int, role_id: int, rights: dict) -> User:
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
            org_id=ORG_ID,
            role_id=role_id,
            creation_date=NOW,
            update_date=NOW,
        )
    )
    db.commit()
    return user


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
                id=ORG_ID,
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


@pytest.fixture
def staff(db):
    """A non-admin role that has been granted the calendar right."""
    return add_user_with_role(
        db, 10, 3, {**LEGACY_RIGHTS, "academic_calendar": MANAGE_RIGHTS}
    )


@pytest.fixture
def learner(db):
    return add_user_with_role(db, 11, 4, LEGACY_RIGHTS)


@pytest.fixture
def course(db):
    course = Course(
        id=COURSE_ID,
        org_id=ORG_ID,
        course_uuid=COURSE_UUID,
        name="Calendar course",
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


@pytest.fixture
def course_owner(db, course):
    """Course creator whose role does not hold the calendar right."""
    user = add_user_with_role(db, 20, 4, LEGACY_RIGHTS)
    db.add(
        ResourceAuthor(
            resource_uuid=course.course_uuid,
            user_id=user.id,
            authorship=ResourceAuthorshipEnum.CREATOR,
            authorship_status=ResourceAuthorshipStatusEnum.ACTIVE,
            creation_date=NOW,
            update_date=NOW,
        )
    )
    db.commit()
    return user
