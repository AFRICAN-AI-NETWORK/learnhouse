"""Tests for the core notification service: create, query, and read-state."""

import pytest
from unittest.mock import AsyncMock

from sqlmodel import Session

from src.db.notifications import EmailStatus, Notification, NotificationType
from src.db.users import User
from src.services.notifications import notification_service as svc
from src.services.notifications.notification_copy import chapter_added_copy


@pytest.mark.asyncio
class TestCreateNotification:
    async def test_persists_row_with_expected_fields(
        self, session: Session, user: User, org
    ):
        notification = await svc.create_notification(
            session,
            user_id=user.id,
            org_id=org.id,
            notification_type=NotificationType.CHAPTER_ADDED,
            target_type="chapter",
            target_id=42,
            target_uuid="chapter_abc",
            copy=chapter_added_copy("New Chapter", "Course A"),
        )

        assert notification.id is not None
        assert notification.notification_uuid.startswith("notif_")
        assert notification.user_id == user.id
        assert notification.org_id == org.id
        assert notification.is_read is False
        assert notification.email_status == EmailStatus.PENDING
        assert notification.email_retry_count == 0
        assert '"New Chapter"' in notification.message

    async def test_ws_push_failure_does_not_prevent_creation(
        self, session: Session, user: User, org, monkeypatch
    ):
        """
        A broken/unreachable WebSocket connection must never stop a
        notification from being persisted — only the real-time nudge is
        best-effort, the row itself is the source of truth.
        """
        from src.services.chat import websocket_manager

        monkeypatch.setattr(
            websocket_manager.connection_manager,
            "send_personal_message",
            AsyncMock(side_effect=RuntimeError("connection dropped")),
        )

        notification = await svc.create_notification(
            session,
            user_id=user.id,
            org_id=org.id,
            notification_type=NotificationType.CHAPTER_ADDED,
            target_type="chapter",
            copy=chapter_added_copy("New Chapter", "Course A"),
        )

        assert notification.id is not None
        persisted = session.get(Notification, notification.id)
        assert persisted is not None


@pytest.mark.asyncio
class TestNotifyWrappers:
    async def test_notify_assignment_reviewed_sets_metadata(
        self, session: Session, user: User, org
    ):
        notification = await svc.notify_assignment_reviewed(
            session,
            user_id=user.id,
            org_id=org.id,
            assignment_id=1,
            assignment_uuid="assignment_1",
            assignment_title="Capstone Project",
            instructor_name="Jane Doe",
            grade=90,
            max_grade=100,
            feedback="Great job",
            unlocks_certificate=True,
        )
        assert notification.notification_type == NotificationType.ASSIGNMENT_REVIEWED
        assert notification.metadata_json["grade"] == 90
        assert notification.metadata_json["unlocks_certificate"] is True

    async def test_notify_retake_requested_sets_target(
        self, session: Session, user: User, org
    ):
        notification = await svc.notify_retake_requested(
            session,
            user_id=user.id,
            org_id=org.id,
            assignment_id=1,
            assignment_uuid="assignment_1",
            assignment_title="Essay 1",
            instructor_name="Jane Doe",
            feedback="Missing references",
        )
        assert notification.notification_type == NotificationType.RETAKE_REQUESTED
        assert notification.target_type == "assignment"
        assert notification.target_id == 1


class TestReadQueries:
    def _make(self, session: Session, user: User, org, n: int) -> None:
        for i in range(n):
            session.add(
                Notification(
                    notification_uuid=f"notif_{user.id}_{i}",
                    user_id=user.id,
                    org_id=org.id,
                    notification_type=NotificationType.CHAPTER_ADDED,
                    target_type="chapter",
                    title=f"Title {i}",
                    message=f"Message {i}",
                )
            )
        session.commit()

    def test_get_notifications_paginated_orders_newest_first(
        self, session: Session, user: User, org
    ):
        self._make(session, user, org, 3)
        results = svc.get_notifications_paginated(session, user_id=user.id, limit=10)
        assert len(results) == 3
        assert results[0].created_at >= results[-1].created_at

    def test_get_notifications_paginated_scopes_to_user(
        self, session: Session, user: User, other_user: User, org
    ):
        self._make(session, user, org, 2)
        self._make(session, other_user, org, 5)
        results = svc.get_notifications_paginated(session, user_id=user.id, limit=10)
        assert len(results) == 2

    def test_get_unread_count(self, session: Session, user: User, org):
        self._make(session, user, org, 4)
        assert svc.get_unread_count(session, user_id=user.id) == 4

    def test_page_size_is_capped(self, session: Session, user: User, org):
        results = svc.get_notifications_paginated(
            session, user_id=user.id, limit=10_000
        )
        assert results == []  # no data, but call must not raise on the cap


class TestReadState:
    def _make_one(self, session: Session, user: User, org) -> Notification:
        notification = Notification(
            notification_uuid="notif_x",
            user_id=user.id,
            org_id=org.id,
            notification_type=NotificationType.CHAPTER_ADDED,
            target_type="chapter",
            title="Title",
            message="Message",
        )
        session.add(notification)
        session.commit()
        session.refresh(notification)
        return notification

    def test_mark_as_read_sets_read_at(self, session: Session, user: User, org):
        notification = self._make_one(session, user, org)
        updated = svc.mark_as_read(
            session, user_id=user.id, notification_id=notification.id
        )
        assert updated.is_read is True
        assert updated.read_at is not None

    def test_mark_as_read_rejects_wrong_user(
        self, session: Session, user: User, other_user: User, org
    ):
        notification = self._make_one(session, user, org)
        result = svc.mark_as_read(
            session, user_id=other_user.id, notification_id=notification.id
        )
        assert result is None

    def test_mark_all_as_read_returns_count(self, session: Session, user: User, org):
        for i in range(3):
            session.add(
                Notification(
                    notification_uuid=f"notif_{i}",
                    user_id=user.id,
                    org_id=org.id,
                    notification_type=NotificationType.CHAPTER_ADDED,
                    target_type="chapter",
                    title="Title",
                    message="Message",
                )
            )
        session.commit()

        count = svc.mark_all_as_read(session, user_id=user.id)
        assert count == 3
        assert svc.get_unread_count(session, user_id=user.id) == 0

    def test_delete_notification_removes_row(self, session: Session, user: User, org):
        notification = self._make_one(session, user, org)
        assert svc.delete_notification(
            session, user_id=user.id, notification_id=notification.id
        )
        assert session.get(Notification, notification.id) is None

    def test_delete_notification_rejects_wrong_user(
        self, session: Session, user: User, other_user: User, org
    ):
        notification = self._make_one(session, user, org)
        assert not svc.delete_notification(
            session, user_id=other_user.id, notification_id=notification.id
        )
        assert session.get(Notification, notification.id) is not None
