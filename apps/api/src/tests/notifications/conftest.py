"""Fixtures for notification service tests."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# Importing this registers every model module (via import_all_models()) in
# SQLModel.metadata before create_all() below — without it, models reached
# only indirectly (e.g. trail -> cohorts -> paymentsuser) can be missing
# from metadata depending on which modules a given test file imports.
import src.core.events.database  # noqa: F401
from src.db.courses.courses import Course
from src.db.organizations import Organization
from src.db.users import User


@pytest.fixture(name="session", scope="function")
def session_fixture():
    """Create a new in-memory database for each test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="org")
def organization_fixture(session: Session):
    org = Organization(
        org_uuid=f"org_{uuid4()}",
        name="Test Organization",
        slug="test-org",
        email="test@testorg.com",
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@pytest.fixture(name="user")
def user_fixture(session: Session):
    user = User(
        user_uuid=f"usr_{uuid4()}",
        username="notif_test_user",
        email="notif_test_user@test.com",
        password="hashed_password",
        first_name="Notif",
        last_name="Test",
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="course")
def course_fixture(session: Session, org: Organization):
    course = Course(
        course_uuid=f"course_{uuid4()}",
        org_id=org.id,
        name="Test Course",
        description="A course used for notification tests",
        about="",
        learnings="",
        tags="",
        public=True,
        open_to_contributors=False,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )
    session.add(course)
    session.commit()
    session.refresh(course)
    return course


@pytest.fixture(name="other_user")
def other_user_fixture(session: Session):
    user = User(
        user_uuid=f"usr_{uuid4()}",
        username="notif_other_user",
        email="notif_other_user@test.com",
        password="hashed_password",
        first_name="Other",
        last_name="Test",
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
