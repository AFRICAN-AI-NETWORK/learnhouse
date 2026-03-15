"""Fixtures for chat tests."""
import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from datetime import datetime
from uuid import uuid4

from src.db.users import User
from src.db.organizations import Organization
from src.db.user_organizations import UserOrganization
from src.db.roles import Role
from src.db.chat.conversations import Conversation
from src.db.chat.messages import Message


@pytest.fixture(name="session", scope="function")
def session_fixture():
    """Create a new database session for each test."""
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
    """Create test organization."""
    org = Organization(
        org_uuid=f"org_{uuid4()}",
        name="Test Organization",
        slug="test-org",
        email="test@testorg.com",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@pytest.fixture(name="student_role")
def student_role_fixture(session: Session):
    """Create student role."""
    role = Role(
        name="Student",
        description="Student role",
        role_uuid=f"role_{uuid4()}",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@pytest.fixture(name="instructor_role")
def instructor_role_fixture(session: Session):
    """Create instructor role."""
    role = Role(
        name="Instructor",
        description="Instructor role",
        role_uuid=f"role_{uuid4()}",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@pytest.fixture(name="admin_role")
def admin_role_fixture(session: Session):
    """Create admin role."""
    role = Role(
        name="Admin",
        description="Admin role",
        role_uuid=f"role_{uuid4()}",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@pytest.fixture(name="student_user")
def student_user_fixture(session: Session, org: Organization, student_role: Role):
    """Create student user."""
    user = User(
        user_uuid=f"usr_{uuid4()}",
        username="student_test",
        email="student@test.com",
        password="hashed_password",
        first_name="Student",
        last_name="Test",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Add user to organization
    user_org = UserOrganization(
        user_id=user.id,
        org_id=org.id,
        role_id=student_role.id,
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(user_org)
    session.commit()
    
    return user


@pytest.fixture(name="instructor_user")
def instructor_user_fixture(session: Session, org: Organization, instructor_role: Role):
    """Create instructor user."""
    user = User(
        user_uuid=f"usr_{uuid4()}",
        username="instructor_test",
        email="instructor@test.com",
        password="hashed_password",
        first_name="Instructor",
        last_name="Test",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Add user to organization
    user_org = UserOrganization(
        user_id=user.id,
        org_id=org.id,
        role_id=instructor_role.id,
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(user_org)
    session.commit()
    
    return user


@pytest.fixture(name="admin_user")
def admin_user_fixture(session: Session, org: Organization, admin_role: Role):
    """Create admin user."""
    user = User(
        user_uuid=f"usr_{uuid4()}",
        username="admin_test",
        email="admin@test.com",
        password="hashed_password",
        first_name="Admin",
        last_name="Test",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Add user to organization
    user_org = UserOrganization(
        user_id=user.id,
        org_id=org.id,
        role_id=admin_role.id,
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(user_org)
    session.commit()
    
    return user


@pytest.fixture(name="student_user_two")
def student_user_two_fixture(session: Session, org: Organization, student_role: Role):
    """Create second student user."""
    user = User(
        user_uuid=f"usr_{uuid4()}",
        username="student_two",
        email="student2@test.com",
        password="hashed_password",
        first_name="Student",
        last_name="Two",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Add user to organization
    user_org = UserOrganization(
        user_id=user.id,
        org_id=org.id,
        role_id=student_role.id,
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(user_org)
    session.commit()
    
    return user


# ── Support / staff role fixtures ─────────────────────────────────────────────

@pytest.fixture(name="teaching_assistant_role")
def teaching_assistant_role_fixture(session: Session):
    """Create Teaching Assistant role."""
    role = Role(
        name="Teaching Assistant",
        description="Teaching Assistant role",
        role_uuid=f"role_{uuid4()}",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@pytest.fixture(name="student_success_coordinator_role")
def student_success_coordinator_role_fixture(session: Session):
    """Create Students Success Coordinator role."""
    role = Role(
        name="Students Success Coordinator",
        description="Students Success Coordinator role",
        role_uuid=f"role_{uuid4()}",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@pytest.fixture(name="student_mentor_role")
def student_mentor_role_fixture(session: Session):
    """Create Students Mentor role."""
    role = Role(
        name="Students Mentor",
        description="Students Mentor role",
        role_uuid=f"role_{uuid4()}",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@pytest.fixture(name="community_manager_role")
def community_manager_role_fixture(session: Session):
    """Create Community Manager role."""
    role = Role(
        name="Community Manager",
        description="Community Manager role",
        role_uuid=f"role_{uuid4()}",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@pytest.fixture(name="lead_instructor_role")
def lead_instructor_role_fixture(session: Session):
    """Create Lead Instructor role."""
    role = Role(
        name="Lead Instructor",
        description="Lead Instructor role",
        role_uuid=f"role_{uuid4()}",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


def _make_user_with_role(session: Session, org: Organization, role: Role,
                         username: str, email: str, first_name: str) -> User:
    """Helper: create a user and associate them with the given role in the org."""
    user = User(
        user_uuid=f"usr_{uuid4()}",
        username=username,
        email=email,
        password="hashed_password",
        first_name=first_name,
        last_name="Test",
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    user_org = UserOrganization(
        user_id=user.id,
        org_id=org.id,
        role_id=role.id,
        creation_date=str(datetime.utcnow()),
        update_date=str(datetime.utcnow())
    )
    session.add(user_org)
    session.commit()
    return user


@pytest.fixture(name="teaching_assistant_user")
def teaching_assistant_user_fixture(session: Session, org: Organization, teaching_assistant_role: Role):
    return _make_user_with_role(session, org, teaching_assistant_role,
                                "ta_test", "ta@test.com", "TeachingAssistant")


@pytest.fixture(name="student_success_coordinator_user")
def student_success_coordinator_user_fixture(session: Session, org: Organization,
                                              student_success_coordinator_role: Role):
    return _make_user_with_role(session, org, student_success_coordinator_role,
                                "ssc_test", "ssc@test.com", "SuccessCoordinator")


@pytest.fixture(name="student_mentor_user")
def student_mentor_user_fixture(session: Session, org: Organization, student_mentor_role: Role):
    return _make_user_with_role(session, org, student_mentor_role,
                                "mentor_test", "mentor@test.com", "StudentMentor")


@pytest.fixture(name="community_manager_user")
def community_manager_user_fixture(session: Session, org: Organization, community_manager_role: Role):
    return _make_user_with_role(session, org, community_manager_role,
                                "cm_test", "cm@test.com", "CommunityManager")


@pytest.fixture(name="lead_instructor_user")
def lead_instructor_user_fixture(session: Session, org: Organization, lead_instructor_role: Role):
    return _make_user_with_role(session, org, lead_instructor_role,
                                "lead_instructor_test", "lead_instructor@test.com", "LeadInstructor")


@pytest.fixture(name="conversation")
def conversation_fixture(session: Session, org: Organization, student_user: User, instructor_user: User):
    """Create test conversation."""
    conversation = Conversation(
        conversation_uuid=f"conv_{uuid4()}",
        org_id=org.id,
        participant_one_id=min(student_user.id, instructor_user.id),
        participant_two_id=max(student_user.id, instructor_user.id),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


@pytest.fixture(name="message")
def message_fixture(session: Session, conversation: Conversation, student_user: User, instructor_user: User):
    """Create test message."""
    message = Message(
        message_uuid=f"msg_{uuid4()}",
        conversation_id=conversation.id,
        sender_id=student_user.id,
        receiver_id=instructor_user.id,
        content="Test message",
        message_type="text",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return message
