"""
Test fixtures for payment and discount code tests.

This module provides PostgreSQL database fixtures and test data helpers
for comprehensive discount code testing.
"""
import pytest
import os
from datetime import datetime, timedelta
from sqlmodel import Session, create_engine
from sqlalchemy.pool import StaticPool
from src.db.payments.discount_codes import DiscountCode, DiscountCodeUsage, DiscountTypeEnum
from src.db.organizations import Organization
from src.db.users import User
from src.db.courses.courses import Course
from src.db.payments.payments_users import PaymentsUser


# PostgreSQL test database configuration
# Uses the same database as development but with transaction rollback for isolation
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://learnhouse:learnhouse@localhost:5432/learnhouse"
)



@pytest.fixture(scope="session")
def test_engine():
    """
    Create a test database engine for the entire test session.
    Uses PostgreSQL for production-identical behavior.
    """
    engine = create_engine(
        TEST_DATABASE_URL,
        echo=False,  # Set to True for SQL debugging
        poolclass=StaticPool,
    )
    
    # Note: Tables already exist in database via Alembic migrations
    # No need to create/drop tables for tests
    # SQLModel.metadata.create_all(engine)
    
    yield engine
    
    # Cleanup: Not dropping tables since we're using the shared learnhouse database
    # SQLModel.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_engine):
    """
    Provide a database session for each test with automatic rollback.
    Each test runs in an isolated transaction that rolls back after completion.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    
    yield session
    
    # Rollback transaction to ensure test isolation
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def mock_org(db_session: Session) -> Organization:
    """Create a test organization."""
    org = Organization(
        org_uuid="test-org-uuid",
        name="Test Organization",
        slug="test-org",
        email="test@testorg.com",  # Required field
        creation_date="2024-01-01",  # Required NOT NULL field
        update_date="2024-01-01"  # Required NOT NULL field
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def mock_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        username="testuser",
        email="test@example.com",
        password="hashed_password",  # Required NOT NULL field
        user_uuid="test-user-uuid",
        first_name="Test",  # Required NOT NULL field
        last_name="User",  # Required NOT NULL field
        email_verified=True,  # Required NOT NULL field
        creation_date="2024-01-01",  # Required NOT NULL field
        update_date="2024-01-01"  # Required NOT NULL field
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def mock_course(db_session: Session, mock_org: Organization) -> Course:
    """Create a test course."""
    course = Course(
        name="Test Course",
        course_uuid="test-course-uuid",
        org_id=mock_org.id,
        description="A test course for discount code testing",
        public=True,  # Required NOT NULL field
        open_to_contributors=False,  # Required NOT NULL field
        creation_date="2024-01-01",  # Required NOT NULL field
        update_date="2024-01-01"  # Required NOT NULL field
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)
    return course


@pytest.fixture
def sample_discount_code(db_session: Session, mock_org: Organization) -> DiscountCode:
    """
    Create a sample active discount code for testing.
    20% off, max 100 uses, valid for 30 days from now.
    """
    code = DiscountCode(
        org_id=mock_org.id,
        code="TEST2026",
        discount_type=DiscountTypeEnum.PERCENTAGE,
        discount_value=20.0,
        max_uses=100,
        current_uses=0,
        valid_from=datetime.utcnow() - timedelta(days=1),
        valid_until=datetime.utcnow() + timedelta(days=30),
        is_active=True,
        description="Test discount code - 20% off"
    )
    db_session.add(code)
    db_session.commit()
    db_session.refresh(code)
    return code


@pytest.fixture
def expired_discount_code(db_session: Session, mock_org: Organization) -> DiscountCode:
    """
    Create an expired discount code for testing expiry validation.
    Valid until yesterday.
    """
    code = DiscountCode(
        org_id=mock_org.id,
        code="EXPIRED2025",
        discount_type=DiscountTypeEnum.PERCENTAGE,
        discount_value=15.0,
        max_uses=50,
        current_uses=10,
        valid_from=datetime.utcnow() - timedelta(days=60),
        valid_until=datetime.utcnow() - timedelta(days=1),  # Expired yesterday
        is_active=True,
        description="Expired discount code for testing"
    )
    db_session.add(code)
    db_session.commit()
    db_session.refresh(code)
    return code


@pytest.fixture
def max_uses_discount_code(db_session: Session, mock_org: Organization) -> DiscountCode:
    """
    Create a discount code at max usage for testing enforcement.
    Current uses = max_uses (100/100).
    """
    code = DiscountCode(
        org_id=mock_org.id,
        code="MAXED2026",
        discount_type=DiscountTypeEnum.FIXED,
        discount_value=50.0,
        max_uses=100,
        current_uses=100,  # Already at max
        valid_from=datetime.utcnow() - timedelta(days=10),
        valid_until=datetime.utcnow() + timedelta(days=20),
        is_active=True,
        description="Maxed out discount code for testing"
    )
    db_session.add(code)
    db_session.commit()
    db_session.refresh(code)
    return code


@pytest.fixture
def mock_payments_config(db_session: Session, mock_org: Organization):
    """Create a test payments configuration."""
    from src.db.payments.payments import PaymentsConfig, PaymentProviderEnum
    from datetime import datetime
    
    config = PaymentsConfig(
        org_id=mock_org.id,
        enabled=True,  # Required NOT NULL
        active=True,  # Required NOT NULL
        provider=PaymentProviderEnum.PAYSTACK,  # Required NOT NULL
        provider_specific_id="test_provider_id",
        provider_config={"test_key": "test_value"},
        creation_date=datetime.now(),  # Required NOT NULL
        update_date=datetime.now()  # Required NOT NULL
    )
    db_session.add(config)
    db_session.commit()
    db_session.refresh(config)
    return config


@pytest.fixture
def mock_payments_product(db_session: Session, mock_org: Organization, mock_payments_config):
    """Create a test payments product."""
    from src.db.payments.payments_products import PaymentsProduct, PaymentProductTypeEnum, PaymentPriceTypeEnum
    from datetime import datetime
    
    product = PaymentsProduct(
        org_id=mock_org.id,
        payments_config_id=mock_payments_config.id,
        name="Test Course Product",
        description="Test product for discount code testing",
        product_type=PaymentProductTypeEnum.ONE_TIME,  # Required NOT NULL
        price_type=PaymentPriceTypeEnum.FIXED_PRICE,  # Required NOT NULL
        amount=500.0,  # Required NOT NULL
        currency="USD",  # Required NOT NULL
        provider_product_id="test_product_paystack_id",
        benefits="Access to test course",  # Required NOT NULL
        creation_date=datetime.now(),  # Required NOT NULL
        update_date=datetime.now()  # Required NOT NULL
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


@pytest.fixture
def mock_payment_user(db_session: Session, mock_user: User, mock_org: Organization, mock_payments_product):
    """Create a test payment user record."""
    from datetime import datetime
    from src.db.payments.payments_users import PaymentStatusEnum
    
    payment = PaymentsUser(
        user_id=mock_user.id,
        org_id=mock_org.id,
        payment_product_id=mock_payments_product.id,
        status=PaymentStatusEnum.ACTIVE,  # Required NOT NULL - use enum
        original_amount=500.0,
        discount_amount=100.0,
        final_amount=400.0,
        creation_date=datetime.now(),  # Required NOT NULL
        update_date=datetime.now()  # Required NOT NULL
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)
    return payment



# Helper functions for test data creation

def create_discount_code_helper(
    db_session: Session,
    org_id: int,
    code: str = "HELPER2026",
    discount_type: DiscountTypeEnum = DiscountTypeEnum.PERCENTAGE,
    discount_value: float = 10.0,
    max_uses: int = None,
    current_uses: int = 0,
    is_active: bool = True
) -> DiscountCode:
    """
    Helper function to create discount codes in tests.
    Simplifies test setup for specific scenarios.
    """
    discount_code = DiscountCode(
        org_id=org_id,
        code=code,
        discount_type=discount_type,
        discount_value=discount_value,
        max_uses=max_uses,
        current_uses=current_uses,
        valid_from=datetime.utcnow() - timedelta(days=1),
        valid_until=datetime.utcnow() + timedelta(days=30),
        is_active=is_active,
        description=f"Helper-created code: {code}"
    )
    db_session.add(discount_code)
    db_session.commit()
    db_session.refresh(discount_code)
    return discount_code


def create_usage_record_helper(
    db_session: Session,
    discount_code_id: int,
    user_id: int,
    course_id: int,
    payment_user_id: int,
    original_amount: float = 500.0,
    discount_amount: float = 100.0,
    final_amount: float = 400.0
) -> DiscountCodeUsage:
    """
    Helper function to create discount code usage records in tests.
    """
    usage = DiscountCodeUsage(
        discount_code_id=discount_code_id,
        user_id=user_id,
        course_id=course_id,
        payment_user_id=payment_user_id,
        original_amount=original_amount,
        discount_amount=discount_amount,
        final_amount=final_amount
    )
    db_session.add(usage)
    db_session.commit()
    db_session.refresh(usage)
    return usage
