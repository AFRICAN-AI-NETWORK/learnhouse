"""Shared test fixtures for waitlist tests"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
from sqlmodel import Session, create_engine, SQLModel
from src.db.users import User
from src.db.organizations import Organization
from src.db.courses import Course
from src.db.waitlist import (
    WaitlistConfig,
    WaitlistEmailLog,
    WaitlistCoursePreference,
    UserStatusEnum,
    WaitlistStatusEnum,
)


@pytest.fixture
def test_db_engine():
    """Create a test database engine"""
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def db_session(test_db_engine):
    """Create a test database session"""
    with Session(test_db_engine) as session:
        yield session


@pytest.fixture
def sample_org(db_session):
    """Create a sample organization for testing"""
    org = Organization(
        id=1,
        org_name="Test Organization",
        org_uuid="test-org-uuid",
        org_slug="test-org"
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def sample_user(db_session, sample_org):
    """Create a sample user for testing"""
    user = User(
        id=1,
        username="testuser",
        email="test@example.com",
        hashed_password="hashed_password",
        first_name="Test",
        last_name="User",
        user_status=UserStatusEnum.ACTIVE.value,
        org_id=sample_org.id
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def waitlist_user(db_session, sample_org):
    """Create a user on waitlist for testing"""
    user = User(
        id=2,
        username="waitlistuser",
        email="waitlist@example.com",
        hashed_password="hashed_password",
        first_name="Waitlist",
        last_name="User",
        user_status=UserStatusEnum.WAITLIST.value,
        waitlist_interest="Python Programming",
        waitlist_joined_date=datetime.now(timezone.utc).isoformat(),
        org_id=sample_org.id
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_course(db_session, sample_org):
    """Create a sample course for testing"""
    course = Course(
        id=1,
        name="Test Course",
        course_uuid="test-course-uuid",
        description="A test course",
        org_id=sample_org.id,
        author_id=1
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)
    return course


@pytest.fixture
def sample_waitlist_config(db_session, sample_org, sample_user):
    """Create a sample waitlist configuration for testing"""
    future_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    config = WaitlistConfig(
        id=1,
        waitlist_uuid="test-waitlist-uuid",
        org_id=sample_org.id,
        created_by_user_id=sample_user.id,
        name="Test Waitlist",
        description="A test waitlist campaign",
        interest_category="Programming",
        launch_datetime=future_date,
        status=WaitlistStatusEnum.ACTIVE.value,
        batch_size=50,
        batch_delay_seconds=2,
        total_registrations=0,
        emails_sent_count=0,
        creation_date=datetime.now(timezone.utc).isoformat(),
        update_date=datetime.now(timezone.utc).isoformat()
    )
    db_session.add(config)
    db_session.commit()
    db_session.refresh(config)
    return config


@pytest.fixture
def expired_waitlist_config(db_session, sample_org, sample_user):
    """Create an expired waitlist configuration for testing"""
    past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    config = WaitlistConfig(
        id=2,
        waitlist_uuid="expired-waitlist-uuid",
        org_id=sample_org.id,
        created_by_user_id=sample_user.id,
        name="Expired Waitlist",
        description="An expired waitlist campaign",
        interest_category="Programming",
        launch_datetime=past_date,
        status=WaitlistStatusEnum.ACTIVE.value,
        batch_size=10,
        batch_delay_seconds=1,
        total_registrations=5,
        emails_sent_count=0,
        creation_date=datetime.now(timezone.utc).isoformat(),
        update_date=datetime.now(timezone.utc).isoformat()
    )
    db_session.add(config)
    db_session.commit()
    db_session.refresh(config)
    return config


@pytest.fixture
def sample_email_log(db_session, waitlist_user, sample_waitlist_config):
    """Create a sample email log for testing"""
    log = WaitlistEmailLog(
        id=1,
        user_id=waitlist_user.id,
        waitlist_config_id=sample_waitlist_config.id,
        email_type="activation",
        email_sent=True,
        sent_datetime=datetime.now(timezone.utc).isoformat(),
        retry_count=0
    )
    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)
    return log


@pytest.fixture
def sample_course_preference(db_session, waitlist_user, sample_course, sample_waitlist_config):
    """Create a sample course preference for testing"""
    preference = WaitlistCoursePreference(
        id=1,
        user_id=waitlist_user.id,
        course_id=sample_course.id,
        waitlist_config_id=sample_waitlist_config.id,
        selected_date=datetime.now(timezone.utc).isoformat()
    )
    db_session.add(preference)
    db_session.commit()
    db_session.refresh(preference)
    return preference


@pytest.fixture
def mock_request():
    """Create a mock request object"""
    request = Mock()
    request.app = Mock()
    request.app.state = Mock()
    return request
