"""
Pytest configuration for marketer tests
"""

import os

# Environment must be configured before any service module is imported:
# payouts.py fails fast without an encryption key, and Redis must be disabled
# so caching degrades to DB-only mode in tests.
os.environ.setdefault("REDIS_ENABLED", "false")
if not os.environ.get("BANK_DATA_ENCRYPTION_KEY"):
    from cryptography.fernet import Fernet

    os.environ["BANK_DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

import pytest
from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy.pool import StaticPool

# Import all models so SQLModel.metadata knows every table
import src.db.users  # noqa: F401
import src.db.organizations  # noqa: F401
import src.db.courses.courses  # noqa: F401
import src.db.payments.payments  # noqa: F401
import src.db.payments.payments_products  # noqa: F401
import src.db.payments.payments_users  # noqa: F401
import src.db.referrals  # noqa: F401

from src.db.users import User
from src.db.referrals.marketers import Marketer, MarketerStatus
from src.db.referrals.referral_codes import ReferralCode, ReferralCodeStatus


@pytest.fixture(name="test_db_session")
def test_db_session_fixture():
    """In-memory SQLite database — each test gets a fresh schema"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        yield session

    SQLModel.metadata.drop_all(engine)


def make_user(db_session, user_id=None, email=None, country=None, **kwargs):
    """Create a persisted User row for tests"""
    from uuid import uuid4

    suffix = user_id if user_id is not None else uuid4().hex[:8]
    user = User(
        id=user_id,
        username=kwargs.get("username", f"user{suffix}"),
        first_name=kwargs.get("first_name", "Test"),
        last_name=kwargs.get("last_name", f"User{suffix}"),
        email=email or f"user{suffix}@example.com",
        user_uuid=f"user_{suffix}",
        profile={"country": country} if country else {},
        referral_commission_balance=kwargs.get("balance", 0.0),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def make_marketer(
    db_session,
    user,
    org_id=1,
    status=MarketerStatus.ACTIVE,
    commission_rate=7.70,
    with_code=True,
    phone="+2348000000001",
):
    """Create a persisted Marketer (optionally with an active referral code)"""
    marketer = Marketer(
        user_id=user.id,
        org_id=org_id,
        status=status,
        commission_rate_usd=commission_rate,
        phone_number=phone,
    )
    db_session.add(marketer)
    db_session.commit()
    db_session.refresh(marketer)

    code = None
    if with_code:
        code = ReferralCode(
            org_id=org_id,
            referrer_user_id=user.id,
            code=f"MKT-TEST{marketer.id}",
            referral_link=f"https://example.com/ref/MKT-TEST{marketer.id}",
            status=ReferralCodeStatus.ACTIVE,
        )
        db_session.add(code)
        db_session.commit()
        db_session.refresh(code)
        marketer.referral_code_id = code.id
        db_session.add(marketer)
        db_session.commit()
        db_session.refresh(marketer)

    return marketer, code
