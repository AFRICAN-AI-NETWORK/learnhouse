"""Shared test fixtures for waitlist tests"""

from datetime import UTC, datetime, timedelta
from unittest.mock import Mock

import pytest
from sqlmodel import Session, SQLModel, create_engine

from src.db.courses.courses import Course
from src.db.organizations import Organization
from src.db.payments.payments import PaymentsConfig  # noqa: F401
from src.db.payments.payments_products import PaymentsProduct
from src.db.users import User
from src.db.waitlist import (
    UserStatusEnum,
    WaitlistConfig,
    WaitlistCoursePreference,
    WaitlistEmailLog,
    WaitlistStatusEnum,
)


@pytest.fixture
def test_db_engine():
    """Create a test database engine"""
    engine = create_engine("sqlite:///:memory:")

    from sqlalchemy import String

    payments_config_table = SQLModel.metadata.tables.get("payments_config")
    if payments_config_table is not None:
        for column in payments_config_table.columns:
            if column.name == "provider":
                column.type = String()
                break

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
    from datetime import datetime

    from src.db.organization_config import OrganizationConfig

    org = Organization(
        id=1,
        name="Test Organization",
        slug="test-org",
        email="test@testorg.com",
        org_uuid="test-org-uuid",
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    # Add organization config to prevent "Organization has no config" error
    org_config = OrganizationConfig(
        org_id=org.id,
        config={
            "features": {
                "members": {"enabled": True, "limit": 1000},
                "courses": {"enabled": True, "limit": 100},
                "storage": {"enabled": True, "limit": 10000},
            }
        },
        creation_date=datetime.now(UTC).isoformat(),
        update_date=datetime.now(UTC).isoformat(),
    )
    db_session.add(org_config)
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
        org_id=sample_org.id,
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
        waitlist_interest="Programming",
        waitlist_joined_date=datetime.now(UTC).isoformat(),
        org_id=sample_org.id,
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
        public=True,
        open_to_contributors=False,
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)
    return course


@pytest.fixture
def sample_waitlist_config(db_session, sample_org, sample_user):
    """Create a sample waitlist configuration for testing"""
    future_date = (datetime.now(UTC) + timedelta(days=7)).isoformat()
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
        creation_date=datetime.now(UTC).isoformat(),
        update_date=datetime.now(UTC).isoformat(),
    )
    db_session.add(config)
    db_session.commit()
    db_session.refresh(config)
    return config


@pytest.fixture
def expired_waitlist_config(db_session, sample_org, sample_user):
    """Create an expired waitlist configuration for testing"""
    past_date = (datetime.now(UTC) - timedelta(days=1)).isoformat()
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
        creation_date=datetime.now(UTC).isoformat(),
        update_date=datetime.now(UTC).isoformat(),
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
        email_sent=True,
        email_sent_date=datetime.now(UTC).isoformat(),
        retry_count=0,
        creation_date=datetime.now(UTC).isoformat(),
        update_date=datetime.now(UTC).isoformat(),
    )
    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)
    return log


@pytest.fixture
def sample_payment_product(db_session, sample_org):
    """Create a sample payment product for testing"""

    product = PaymentsProduct(
        id=100, name="Test Package", amount=1000, currency="USD", org_id=sample_org.id
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


@pytest.fixture
def sample_course_preference(
    db_session,
    waitlist_user,
    sample_payment_product,
    sample_waitlist_config,
    sample_org,
):
    """Create a sample course preference for testing"""
    preference = WaitlistCoursePreference(
        id=1,
        user_id=waitlist_user.id,
        payments_product_id=sample_payment_product.id,
        waitlist_config_id=sample_waitlist_config.id,
        org_id=sample_org.id,
        creation_date=datetime.now(UTC).isoformat(),
    )
    db_session.add(preference)
    db_session.commit()
    db_session.refresh(preference)
    return preference


@pytest.fixture
def mock_request(sample_user):
    """Create a mock request object with user"""
    request = Mock()
    request.app = Mock()
    request.app.state = Mock()
    request.state = Mock()
    request.state.user = sample_user
    return request
