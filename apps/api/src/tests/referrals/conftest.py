"""
Pytest configuration for referral tests
"""

import pytest
from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy.pool import StaticPool


@pytest.fixture(name="test_db_session")
def test_db_session_fixture():
    """
    Create an in-memory SQLite database for testing
    Each test gets a fresh database
    """
    # Create in-memory SQLite database
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        yield session
    
    # Cleanup
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="mock_request")
def mock_request_fixture():
    """Create a mock FastAPI request"""
    from unittest.mock import Mock
    from fastapi import Request
    
    request = Mock(spec=Request)
    request.headers = Mock()
    request.headers.get = Mock(return_value=None)
    request.client = Mock(host="127.0.0.1")
    
    return request


@pytest.fixture(name="mock_user")
def mock_user_fixture():
    """Create a mock authenticated user"""
    from unittest.mock import Mock
    from src.db.users import PublicUser
    
    user = Mock(spec=PublicUser)
    user.id = 500
    user.email = "test@example.com"
    user.username = "testuser"
    
    return user
