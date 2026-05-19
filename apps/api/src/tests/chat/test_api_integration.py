"""Integration tests for chat API endpoints.

These tests use FastAPI's dependency_overrides to mock authentication
and database session, enabling proper endpoint testing.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from unittest.mock import patch, AsyncMock

from app import app
from src.security.auth import get_current_user
from src.core.events.database import get_db_session
from src.db.users import User
from src.db.organizations import Organization


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
        instructor_user: User,
    ):
        """Test creating a new conversation."""
        response = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id},
        )

        assert response.status_code == 200
        data = response.json()
        assert "conversation_uuid" in data
        assert data["conversation_uuid"].startswith("conv_")

    def test_get_conversations(
        self, client_as_student: TestClient, org: Organization, student_user: User
    ):
        """Test getting user conversations."""
        response = client_as_student.get(f"/api/v1/chat/conversations/?org_id={org.id}")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            assert "role_name" in data[0]

    def test_archive_conversation(
        self,
        client_as_student: TestClient,
        org: Organization,
        student_user: User,
        instructor_user: User,
    ):
        """Test archiving a conversation."""
        # First create a conversation
        create_resp = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id},
        )
        conv_uuid = create_resp.json()["conversation_uuid"]

        # Archive it
        response = client_as_student.patch(
            f"/api/v1/chat/conversations/{conv_uuid}/archive?org_id={org.id}"
        )

        assert response.status_code == 200

    def test_get_chatable_users(
        self, client_as_student: TestClient, org: Organization, instructor_user: User
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
        instructor_user: User,
    ):
        """Test sending a message."""
        # Create conversation first
        conv_resp = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id},
        )
        conv_uuid = conv_resp.json()["conversation_uuid"]

        response = client_as_student.post(
            f"/api/v1/chat/messages/send?org_id={org.id}&conversation_id={conv_uuid}&receiver_id={instructor_user.id}&content=Test%20message&message_type=text"
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
        instructor_user: User,
    ):
        """Test getting messages from a conversation."""
        # Create conversation and send a message first
        conv_resp = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id},
        )
        conv_uuid = conv_resp.json()["conversation_uuid"]

        client_as_student.post(
            f"/api/v1/chat/messages/send?org_id={org.id}",
            json={
                "conversation_id": conv_uuid,
                "receiver_id": instructor_user.id,
                "content": "Test message",
                "message_type": "text",
            },
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
        instructor_user: User,
    ):
        """Test editing a message."""
        # Create conversation and message
        conv_resp = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id},
        )
        conv_uuid = conv_resp.json()["conversation_uuid"]

        msg_resp = client_as_student.post(
            f"/api/v1/chat/messages/send?org_id={org.id}&conversation_id={conv_uuid}&receiver_id={instructor_user.id}&content=Original%20content&message_type=text"
        )
        msg_uuid = msg_resp.json()["message_uuid"]

        response = client_as_student.patch(
            f"/api/v1/chat/messages/{msg_uuid}?org_id={org.id}",
            json={"content": "Updated content"},
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
        instructor_user: User,
    ):
        """Test deleting a message."""
        # Create conversation and message
        conv_resp = client_as_student.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id},
        )
        conv_uuid = conv_resp.json()["conversation_uuid"]

        msg_resp = client_as_student.post(
            f"/api/v1/chat/messages/send?org_id={org.id}&conversation_id={conv_uuid}&receiver_id={instructor_user.id}&content=Message%20to%20delete&message_type=text"
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
        instructor_user: User,
    ):
        """Test marking a message as read."""
        # Use student identity first
        app.dependency_overrides[get_current_user] = lambda: student_user
        app.dependency_overrides[get_db_session] = lambda: session
        student_client = TestClient(app)

        # Student creates conversation and sends a message
        conv_resp = student_client.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": instructor_user.id},
        )
        conv_uuid = conv_resp.json()["conversation_uuid"]

        msg_resp = student_client.post(
            f"/api/v1/chat/messages/send?org_id={org.id}&conversation_id={conv_uuid}&receiver_id={instructor_user.id}&content=Read%20this&message_type=text"
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


class TestAttachmentEndpoints:
    """Test file attachment upload endpoints.

    All file content is constructed in-memory so no real files are needed.
    Magic bytes match what file_validation.py checks to pass content validation.

    The upload_file() call inside the service is patched so no real filesystem
    writes happen — the patch returns a deterministic fake filename.
    """

    # Fake filename returned by the mocked upload_file
    _FAKE_FILENAME = "attachment_abc123.jpg"

    @pytest.fixture(autouse=True)
    def mock_upload(self):
        """Patch upload_file in the attachment service to avoid filesystem writes.

        This is the correct patch target because attachment_service.py does:
            from src.services.utils.upload_content import upload_file
        so we patch it where it is *used*, not where it is *defined*.
        """
        with patch(
            "src.services.chat.attachment_service.upload_file",
            new_callable=AsyncMock,
            return_value=self._FAKE_FILENAME,
        ):
            yield

    # ── Minimal valid file bytes ──────────────────────────────────────────────
    # JPEG: starts with FF D8 FF
    _JPEG_BYTES = b"\xff\xd8\xff" + b"\xe0" + b"\x00" * 200

    # PDF: starts with %PDF-
    _PDF_BYTES = b"%PDF-1.4\n" + b"\x00" * 200

    # MP4: bytes 4-7 == 'ftyp', bytes 8-11 contain 'mp4 '
    _MP4_BYTES = b"\x00\x00\x00\x18" + b"ftyp" + b"mp4 " + b"\x00" * 200

    # SVG (should be rejected)
    _SVG_BYTES = b"<svg xmlns='http://www.w3.org/2000/svg'/>"

    def _make_client(self, session: Session, user: User) -> TestClient:
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db_session] = lambda: session
        return TestClient(app)

    def _create_conversation_and_message(
        self,
        client: TestClient,
        org,
        sender_user,
        receiver_user,
    ) -> tuple[str, str]:
        """Helper: create a conversation then send a message; return (conv_uuid, msg_uuid)."""
        conv_resp = client.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": receiver_user.id},
        )
        assert conv_resp.status_code == 200
        conv_uuid = conv_resp.json()["conversation_uuid"]

        msg_resp = client.post(
            f"/api/v1/chat/messages/send?org_id={org.id}&conversation_id={conv_uuid}&receiver_id={receiver_user.id}&content=message%20with%20attachment&message_type=file"
        )
        assert msg_resp.status_code == 200
        msg_uuid = msg_resp.json()["message_uuid"]
        return conv_uuid, msg_uuid

    # ─────────────────────────────────────────────────────────────────────────

    def test_upload_image_attachment(
        self,
        session: Session,
        org,
        student_user: User,
        instructor_user: User,
    ):
        """Upload a JPEG image — should succeed and return file_url."""
        client = self._make_client(session, student_user)
        _, msg_uuid = self._create_conversation_and_message(
            client, org, student_user, instructor_user
        )

        response = client.post(
            f"/api/v1/chat/messages/{msg_uuid}/attachments?org_id={org.id}",
            files={"file": ("photo.jpg", self._JPEG_BYTES, "image/jpeg")},
        )

        app.dependency_overrides.clear()
        assert response.status_code == 200
        data = response.json()
        assert "file_url" in data
        assert "attachment_uuid" in data
        assert data["file_name"] == "photo.jpg"
        assert data["upload_status"] == "completed"
        assert "content/orgs/" in data["file_url"]

    def test_upload_pdf_attachment(
        self,
        session: Session,
        org,
        student_user: User,
        instructor_user: User,
    ):
        """Upload a PDF document — should succeed."""
        client = self._make_client(session, student_user)
        _, msg_uuid = self._create_conversation_and_message(
            client, org, student_user, instructor_user
        )

        response = client.post(
            f"/api/v1/chat/messages/{msg_uuid}/attachments?org_id={org.id}",
            files={"file": ("report.pdf", self._PDF_BYTES, "application/pdf")},
        )

        app.dependency_overrides.clear()
        assert response.status_code == 200
        data = response.json()
        assert data["file_name"] == "report.pdf"
        assert data["file_type"] == "application/pdf"

    def test_upload_video_attachment(
        self,
        session: Session,
        org,
        student_user: User,
        instructor_user: User,
    ):
        """Upload an MP4 video — should succeed."""
        client = self._make_client(session, student_user)
        _, msg_uuid = self._create_conversation_and_message(
            client, org, student_user, instructor_user
        )

        response = client.post(
            f"/api/v1/chat/messages/{msg_uuid}/attachments?org_id={org.id}",
            files={"file": ("clip.mp4", self._MP4_BYTES, "video/mp4")},
        )

        app.dependency_overrides.clear()
        assert response.status_code == 200
        data = response.json()
        assert data["file_name"] == "clip.mp4"

    def test_upload_invalid_type_svg_rejected(
        self,
        session: Session,
        org,
        student_user: User,
        instructor_user: User,
    ):
        """SVG file must be rejected (415) — security: XSS risk.

        The autouse mock normally bypasses validation, so we override it here
        with a side_effect that runs the real validate_upload (which explicitly
        blocks SVG files) without attempting any filesystem/S3 write.
        """
        from src.security.file_validation import validate_upload

        async def _real_validate_but_no_disk(
            file,
            *,
            directory,
            type_of_dir,
            uuid,
            allowed_types,
            filename_prefix,
            max_size=None,
        ):
            # This calls the real validation which raises HTTP 415 for SVGs
            validate_upload(file, allowed_types, max_size)
            return "fake_file.bin"

        client = self._make_client(session, student_user)
        _, msg_uuid = self._create_conversation_and_message(
            client, org, student_user, instructor_user
        )

        with patch(
            "src.services.chat.attachment_service.upload_file",
            side_effect=_real_validate_but_no_disk,
        ):
            response = client.post(
                f"/api/v1/chat/messages/{msg_uuid}/attachments?org_id={org.id}",
                files={"file": ("malicious.svg", self._SVG_BYTES, "image/svg+xml")},
            )

        app.dependency_overrides.clear()
        assert response.status_code == 415

    def test_upload_by_non_sender_rejected(
        self,
        session: Session,
        org,
        student_user: User,
        instructor_user: User,
    ):
        """Instructor trying to attach to student's message must get 403."""
        student_client = self._make_client(session, student_user)
        _, msg_uuid = self._create_conversation_and_message(
            student_client, org, student_user, instructor_user
        )

        # Now try as the instructor (who is NOT the sender)
        app.dependency_overrides[get_current_user] = lambda: instructor_user
        instructor_client = TestClient(app)

        response = instructor_client.post(
            f"/api/v1/chat/messages/{msg_uuid}/attachments?org_id={org.id}",
            files={"file": ("photo.jpg", self._JPEG_BYTES, "image/jpeg")},
        )

        app.dependency_overrides.clear()
        assert response.status_code == 403

    def test_attachment_appears_in_message_list(
        self,
        session: Session,
        org,
        student_user: User,
        instructor_user: User,
    ):
        """After upload, attachment must appear in the conversation message list."""
        client = self._make_client(session, student_user)
        conv_uuid, msg_uuid = self._create_conversation_and_message(
            client, org, student_user, instructor_user
        )

        # Upload
        upload_resp = client.post(
            f"/api/v1/chat/messages/{msg_uuid}/attachments?org_id={org.id}",
            files={"file": ("doc.pdf", self._PDF_BYTES, "application/pdf")},
        )
        assert upload_resp.status_code == 200

        # Retrieve messages and check attachment is included
        messages_resp = client.get(
            f"/api/v1/chat/messages/conversation/{conv_uuid}?org_id={org.id}"
        )

        app.dependency_overrides.clear()
        assert messages_resp.status_code == 200
        messages = messages_resp.json()
        assert len(messages) > 0

        # Find our message
        target = next((m for m in messages if m["message_uuid"] == msg_uuid), None)
        assert target is not None
        assert len(target["attachments"]) == 1
        assert target["attachments"][0]["file_name"] == "doc.pdf"


class TestSendEndpoint:
    """Tests for POST /api/v1/chat/messages/send — the unified send endpoint.

    Replaces the old two-step POST /messages/ + POST /messages/{uuid}/attachments flow.
    upload_file is mocked to avoid filesystem writes (same pattern as TestAttachmentEndpoints).
    """

    _JPEG_BYTES = b"\xff\xd8\xff" + b"\xe0" + b"\x00" * 200
    _PDF_BYTES = b"%PDF-1.4\n" + b"\x00" * 200
    _FAKE_FILENAME = "attachment_send_test.jpg"

    @pytest.fixture(autouse=True)
    def mock_upload(self):
        with patch(
            "src.services.chat.attachment_service.upload_file",
            new_callable=AsyncMock,
            return_value=self._FAKE_FILENAME,
        ):
            yield

    def _make_client(self, session: Session, user) -> TestClient:
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db_session] = lambda: session
        return TestClient(app)

    def _create_conversation(self, client: TestClient, org, receiver) -> str:
        """Helper: create a conversation, return conversation_uuid."""
        resp = client.post(
            f"/api/v1/chat/conversations/?org_id={org.id}",
            json={"participant_two_id": receiver.id},
        )
        assert resp.status_code == 200
        return resp.json()["conversation_uuid"]

    # ─────────────────────────────────────────────────────────────────────────

    def test_send_text_only(self, session, org, student_user, instructor_user):
        """Text-only send — equivalent to the old POST /messages/."""
        client = self._make_client(session, student_user)
        conv_uuid = self._create_conversation(client, org, instructor_user)

        resp = client.post(
            f"/api/v1/chat/messages/send"
            f"?org_id={org.id}&conversation_id={conv_uuid}"
            f"&receiver_id={instructor_user.id}&content=Hello+there",
        )

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"] == "Hello there"
        assert data["message_type"] == "text"
        assert "message_uuid" in data

    def test_send_file_only_no_preexisting_message(
        self, session, org, student_user, instructor_user
    ):
        """File-only — user starts a conversation with just an attachment. No message_uuid pre-required."""
        client = self._make_client(session, student_user)
        conv_uuid = self._create_conversation(client, org, instructor_user)

        resp = client.post(
            f"/api/v1/chat/messages/send"
            f"?org_id={org.id}&conversation_id={conv_uuid}"
            f"&receiver_id={instructor_user.id}",
            files={"file": ("photo.jpg", self._JPEG_BYTES, "image/jpeg")},
        )

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        data = resp.json()
        # Auto-detected as "file" type
        assert data["message_type"] == "file"
        # Placeholder content set automatically
        assert data["content"] == "📎"

    def test_send_text_and_file_together(
        self, session, org, student_user, instructor_user
    ):
        """Text + file in one request — message_type stays 'text'."""
        client = self._make_client(session, student_user)
        conv_uuid = self._create_conversation(client, org, instructor_user)

        resp = client.post(
            f"/api/v1/chat/messages/send"
            f"?org_id={org.id}&conversation_id={conv_uuid}"
            f"&receiver_id={instructor_user.id}&content=Check+this+pdf",
            files={"file": ("report.pdf", self._PDF_BYTES, "application/pdf")},
        )

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"] == "Check this pdf"
        assert data["message_type"] == "text"

    def test_send_with_reply_to(self, session, org, student_user, instructor_user):
        """Send a reply — reply_to_message_id=0 normalises to None (no error)."""
        client = self._make_client(session, student_user)
        conv_uuid = self._create_conversation(client, org, instructor_user)

        # First message to reply to
        first = client.post(
            f"/api/v1/chat/messages/send"
            f"?org_id={org.id}&conversation_id={conv_uuid}"
            f"&receiver_id={instructor_user.id}&content=First+message",
        )
        assert first.status_code == 200
        first_id = first.json()["id"]

        # Reply to that message
        reply = client.post(
            f"/api/v1/chat/messages/send"
            f"?org_id={org.id}&conversation_id={conv_uuid}"
            f"&receiver_id={instructor_user.id}&content=Reply&reply_to_message_id={first_id}",
        )

        app.dependency_overrides.clear()
        assert reply.status_code == 200

    def test_send_reply_to_zero_treated_as_no_reply(
        self, session, org, student_user, instructor_user
    ):
        """reply_to_message_id=0 treated as None — must not error."""
        client = self._make_client(session, student_user)
        conv_uuid = self._create_conversation(client, org, instructor_user)

        resp = client.post(
            f"/api/v1/chat/messages/send"
            f"?org_id={org.id}&conversation_id={conv_uuid}"
            f"&receiver_id={instructor_user.id}&content=Hi&reply_to_message_id=0",
        )

        app.dependency_overrides.clear()
        assert resp.status_code == 200

    def test_send_empty_rejected(self, session, org, student_user, instructor_user):
        """Empty content is now allowed (sends empty string message)."""
        client = self._make_client(session, student_user)
        conv_uuid = self._create_conversation(client, org, instructor_user)

        resp = client.post(
            f"/api/v1/chat/messages/send"
            f"?org_id={org.id}&conversation_id={conv_uuid}"
            f"&receiver_id={instructor_user.id}&content=",
        )

        app.dependency_overrides.clear()
        assert resp.status_code == 200  # Empty content is now allowed

    def test_send_file_appears_in_conversation_history(
        self, session, org, student_user, instructor_user
    ):
        """After /send with a file, the attachment must appear in GET /messages/conversation/."""
        client = self._make_client(session, student_user)
        conv_uuid = self._create_conversation(client, org, instructor_user)

        send_resp = client.post(
            f"/api/v1/chat/messages/send"
            f"?org_id={org.id}&conversation_id={conv_uuid}"
            f"&receiver_id={instructor_user.id}",
            files={"file": ("slide.pdf", self._PDF_BYTES, "application/pdf")},
        )
        assert send_resp.status_code == 200
        msg_uuid = send_resp.json()["message_uuid"]

        history = client.get(
            f"/api/v1/chat/messages/conversation/{conv_uuid}?org_id={org.id}"
        )
        app.dependency_overrides.clear()
        assert history.status_code == 200
        messages = history.json()
        target = next((m for m in messages if m["message_uuid"] == msg_uuid), None)
        assert target is not None
        assert len(target["attachments"]) == 1
        assert target["attachments"][0]["file_name"] == "slide.pdf"
