"""Fixtures for student dashboard (admin analytics) tests."""

from datetime import datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from src.db.courses.activities import (Activity,  # noqa: F401
                                       ActivitySubTypeEnum, ActivityTypeEnum)
from src.db.courses.certifications import (CertificateUser,  # noqa: F401
                                           Certifications)
from src.db.courses.chapter_activities import ChapterActivity  # noqa: F401
from src.db.courses.chapters import Chapter  # noqa: F401
from src.db.courses.courses import Course  # noqa: F401
from src.db.organizations import Organization  # noqa: F401
from src.db.roles import Role  # noqa: F401
from src.db.trail_runs import StatusEnum, TrailRun  # noqa: F401
from src.db.trail_sessions import TrailActivitySession  # noqa: F401
from src.db.trail_steps import TrailStep  # noqa: F401
from src.db.trails import Trail  # noqa: F401
from src.db.user_organizations import UserOrganization  # noqa: F401
# Import every table model so SQLModel.metadata registers them for create_all().
from src.db.users import User  # noqa: F401

NOW = str(datetime.utcnow())


@pytest.fixture(name="session", scope="function")
def session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="org")
def org_fixture(session: Session) -> Organization:
    org = Organization(
        org_uuid=f"org_{uuid4()}",
        name="Test Org",
        slug="test-org",
        email="org@test.com",
        creation_date=NOW,
        update_date=NOW,
    )
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


def _make_role(session: Session, name: str, rights: dict, role_id=None) -> Role:
    role = Role(
        id=role_id,
        name=name,
        description=f"{name} role",
        rights=rights,
        role_uuid=f"role_{uuid4()}",
        creation_date=NOW,
        update_date=NOW,
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@pytest.fixture(name="admin_role")
def admin_role_fixture(session: Session) -> Role:
    # id 1/2 are treated as admins (ADMIN_ROLE_IDS) and bypass rights checks.
    return _make_role(session, "Admin", {}, role_id=1)


@pytest.fixture(name="coordinator_role")
def coordinator_role_fixture(session: Session) -> Role:
    """A non-admin staff role granted dashboard + users-read rights."""
    # id must be outside ADMIN_ROLE_IDS ({1, 2}) so it is not treated as admin.
    return _make_role(
        session,
        "Student Coordinator",
        {"dashboard": {"action_access": True}, "users": {"action_read": True}},
        role_id=10,
    )


@pytest.fixture(name="student_role")
def student_role_fixture(session: Session) -> Role:
    """A plain student role with no dashboard rights."""
    return _make_role(
        session,
        "Student",
        {"courses": {"action_read": True}},
        role_id=11,
    )


def make_user(
    session: Session,
    org: Organization,
    role: Role,
    username: str,
    email: str,
    first_name: str = "Test",
    last_name: str = "User",
) -> User:
    user = User(
        user_uuid=f"user_{uuid4()}",
        username=username,
        email=email,
        password="hashed",
        first_name=first_name,
        last_name=last_name,
        creation_date=NOW,
        update_date=NOW,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    membership = UserOrganization(
        user_id=user.id,
        org_id=org.id,
        role_id=role.id,
        creation_date=NOW,
        update_date=NOW,
    )
    session.add(membership)
    session.commit()
    return user


@pytest.fixture(name="admin_user")
def admin_user_fixture(session, org, admin_role) -> User:
    return make_user(session, org, admin_role, "admin", "admin@test.com")


@pytest.fixture(name="coordinator_user")
def coordinator_user_fixture(session, org, coordinator_role) -> User:
    return make_user(session, org, coordinator_role, "coord", "coord@test.com")


@pytest.fixture(name="student_user")
def student_user_fixture(session, org, student_role) -> User:
    return make_user(
        session, org, student_role, "student", "student@test.com", "Jane", "Doe"
    )


def current_user(user: User) -> SimpleNamespace:
    """Minimal stand-in for PublicUser; services only read ``.id``."""
    return SimpleNamespace(id=user.id)


# ── Course content builders ───────────────────────────────────────────────────


def make_course(session: Session, org: Organization, name="Course") -> Course:
    course = Course(
        name=name,
        description="",
        about="",
        learnings="",
        tags="",
        public=True,
        open_to_contributors=False,
        org_id=org.id,
        course_uuid=f"course_{uuid4()}",
        creation_date=NOW,
        update_date=NOW,
    )
    session.add(course)
    session.commit()
    session.refresh(course)
    return course


def make_activity(
    session: Session,
    org: Organization,
    course: Course,
    chapter: Chapter,
    order: int,
    points=10.0,
) -> Activity:
    activity = Activity(
        name=f"Activity {order}",
        activity_type=ActivityTypeEnum.TYPE_DYNAMIC,
        activity_sub_type=ActivitySubTypeEnum.SUBTYPE_DYNAMIC_PAGE,
        published=True,
        points=points,
        org_id=org.id,
        course_id=course.id,
        activity_uuid=f"activity_{uuid4()}",
        content={},
        creation_date=NOW,
        update_date=NOW,
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)

    link = ChapterActivity(
        order=order,
        chapter_id=chapter.id,
        activity_id=activity.id,
        course_id=course.id,
        org_id=org.id,
        creation_date=NOW,
        update_date=NOW,
    )
    session.add(link)
    session.commit()
    return activity


def make_chapter(
    session: Session, org: Organization, course: Course, name="Chapter"
) -> Chapter:
    chapter = Chapter(
        name=name,
        description="",
        org_id=org.id,
        course_id=course.id,
        chapter_uuid=f"chapter_{uuid4()}",
        creation_date=NOW,
        update_date=NOW,
    )
    session.add(chapter)
    session.commit()
    session.refresh(chapter)
    return chapter


def enroll(session: Session, org: Organization, user: User, course: Course) -> TrailRun:
    trail = session.exec(
        select(Trail).where(Trail.org_id == org.id, Trail.user_id == user.id)
    ).first()
    if not trail:
        trail = Trail(
            org_id=org.id,
            user_id=user.id,
            trail_uuid=f"trail_{uuid4()}",
            creation_date=NOW,
            update_date=NOW,
        )
        session.add(trail)
        session.commit()
        session.refresh(trail)

    run = TrailRun(
        trail_id=trail.id,
        course_id=course.id,
        org_id=org.id,
        user_id=user.id,
        creation_date=NOW,
        update_date=NOW,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


def complete_activity(
    session: Session,
    org: Organization,
    user: User,
    course: Course,
    run: TrailRun,
    activity: Activity,
    points=10.0,
) -> TrailStep:
    step = TrailStep(
        complete=True,
        teacher_verified=False,
        grade="",
        points_earned=points,
        is_late=False,
        trailrun_id=run.id,
        trail_id=run.trail_id,
        activity_id=activity.id,
        course_id=course.id,
        org_id=org.id,
        user_id=user.id,
        creation_date=NOW,
        update_date=NOW,
    )
    session.add(step)
    session.commit()
    session.refresh(step)
    return step


def add_time(
    session: Session,
    org: Organization,
    user: User,
    course: Course,
    activity: Activity,
    seconds: int,
    last_heartbeat_at: str = NOW,
) -> TrailActivitySession:
    row = TrailActivitySession(
        seconds_spent=seconds,
        user_id=user.id,
        org_id=org.id,
        course_id=course.id,
        activity_id=activity.id,
        started_at=NOW,
        last_heartbeat_at=last_heartbeat_at,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@pytest.fixture(name="recent")
def recent_timestamp():
    return str(datetime.now() - timedelta(seconds=5))
