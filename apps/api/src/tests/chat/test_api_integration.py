"""Integration tests for chat API endpoints.

These tests use FastAPI's dependency_overrides to mock authentication
and database session, enabling proper endpoint testing.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from datetime import datetime
from uuid import uuid4

from app import app
from src.security.auth import get_current_user
from src.core.events.database import get_db_session
from src.db.users import User
from src.db.organizations import Organization
from src.db.chat.conversations import Conversation
from src.db.chat.messages import Message


@pytest.fixture(name="client_as_student")
def client_as_student_fixture(session: Session, student_user: User):
    """Create test client with student auth and test DB session."""
    app.dependency_overrides[get_current_user] = lambda: student_user
    app.dependency_overrides[get_db_session] = lambda: session
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="client_as_instructor")
def client_as_instructor_fixture(session: Session, instructor_user: User):
    """Create test client with instructor auth and test DB session."""
    app.dependency_overrides[get_current_user] = lambda: instructor_user
    app.dependency_overrides[get_db_session] = lambda: session
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


class TestConversationEndpoints:
    """Test conversation API endpoints."""

    def test_create_conversation(
        self,
        client_as_student: TestClient,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test creating a new conversation."""
        response = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id}
        )

        assert response.status_code == 200
        data = response.json()
        assert "conversation_uuid" in data
        assert data["conversation_uuid"].startswith("conv_")

    def test_get_conversations(
        self,
        client_as_student: TestClient,
        org: Organization,
        student_user: User
    ):
        """Test getting user conversations."""
        response = client_as_student.get(
            f"/api/v1/chat/conversations/?org_id={org.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_archive_conversation(
        self,
        client_as_student: TestClient,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test archiving a conversation."""
        # First create a conversation
        create_resp = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id}
        )
        conv_uuid = create_resp.json()["conversation_uuid"]

        # Archive it
        response = client_as_student.patch(
            f"/api/v1/chat/conversations/{conv_uuid}/archive?org_id={org.id}"
        )

        assert response.status_code == 200

    def test_get_chatable_users(
        self,
        client_as_student: TestClient,
        org: Organization,
        instructor_user: User
    ):
        """Test getting list of users to chat with."""
        response = client_as_student.get(
            f"/api/v1/chat/conversations/chatable-users?org_id={org.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestMessageEndpoints:
    """Test message API endpoints."""

    def test_send_message(
        self,
        client_as_student: TestClient,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test sending a message."""
        # Create conversation first
        conv_resp = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id}
        )
        conv_uuid = conv_resp.json()["conversation_uuid"]

        response = client_as_student.post(
            f"/api/v1/chat/messages/?org_id={org.id}",
            json={
                "conversation_id": conv_uuid,
                "receiver_id": instructor_user.id,
                "content": "Test message",
                "message_type": "text"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Test message"
        assert data["sender_id"] == student_user.id

    def test_get_conversation_messages(
        self,
        client_as_student: TestClient,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test getting messages from a conversation."""
        # Create conversation and send a message first
        conv_resp = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id}
        )
        conv_uuid = conv_resp.json()["conversation_uuid"]

        client_as_student.post(
            f"/api/v1/chat/messages/?org_id={org.id}",
            json={
                "conversation_id": conv_uuid,
                "receiver_id": instructor_user.id,
                "content": "Test message",
                "message_type": "text"
            }
        )

        response = client_as_student.get(
            f"/api/v1/chat/messages/conversation/{conv_uuid}?org_id={org.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_edit_message(
        self,
        client_as_student: TestClient,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test editing a message."""
        # Create conversation and message
        conv_resp = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id}
        )
        conv_uuid = conv_resp.json()["conversation_uuid"]

        msg_resp = client_as_student.post(
            f"/api/v1/chat/messages/?org_id={org.id}",
            json={
                "conversation_id": conv_uuid,
                "receiver_id": instructor_user.id,
                "content": "Original content",
                "message_type": "text"
            }
        )
        msg_uuid = msg_resp.json()["message_uuid"]

        response = client_as_student.patch(
            f"/api/v1/chat/messages/{msg_uuid}?org_id={org.id}",
            json={"content": "Updated content"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Updated content"
        assert data["is_edited"] is True

    def test_delete_message(
        self,
        client_as_student: TestClient,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test deleting a message."""
        # Create conversation and message
        conv_resp = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id}
        )
        conv_uuid = conv_resp.json()["conversation_uuid"]

        msg_resp = client_as_student.post(
            f"/api/v1/chat/messages/?org_id={org.id}",
            json={
                "conversation_id": conv_uuid,
                "receiver_id": instructor_user.id,
                "content": "Message to delete",
                "message_type": "text"
            }
        )
        msg_uuid = msg_resp.json()["message_uuid"]

        response = client_as_student.delete(
            f"/api/v1/chat/messages/{msg_uuid}?org_id={org.id}"
        )

        assert response.status_code == 200

    def test_mark_message_as_read(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test marking a message as read."""
        # Use student identity first
        app.dependency_overrides[get_current_user] = lambda: student_user
        app.dependency_overrides[get_db_session] = lambda: session
        student_client = TestClient(app)

        # Student creates conversation and sends a message
        conv_resp = student_client.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id}
        )
        conv_uuid = conv_resp.json()["conversation_uuid"]

        msg_resp = student_client.post(
            f"/api/v1/chat/messages/?org_id={org.id}",
            json={
                "conversation_id": conv_uuid,
                "receiver_id": instructor_user.id,
                "content": "Read this",
                "message_type": "text"
            }
        )
        assert msg_resp.status_code == 200
        msg_uuid = msg_resp.json()["message_uuid"]

        # Switch to instructor identity
        app.dependency_overrides[get_current_user] = lambda: instructor_user
        instructor_client = TestClient(app)

        # Instructor marks as read
        response = instructor_client.post(
            f"/api/v1/chat/messages/{msg_uuid}/read?org_id={org.id}"
        )

        assert response.status_code == 200

        # Clean up
        app.dependency_overrides.clear()
