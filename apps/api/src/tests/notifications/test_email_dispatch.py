"""
Tests for the notification email retry sweep.

Covers the explicit requirement: on failure, retry, and after
MAX_EMAIL_ATTEMPTS failures give up permanently without raising.
"""

from unittest.mock import patch

from sqlmodel import Session

from src.db.notifications import EmailStatus, Notification, NotificationType
from src.db.users import User
from src.services.notifications.email_dispatch import (
    MAX_EMAIL_ATTEMPTS,
    process_pending_notification_emails,
)


def _make_notification(session: Session, user: User, org, **overrides) -> Notification:
    defaults = {
        "notification_uuid": f"notif_{overrides.pop('suffix', 'x')}",
        "user_id": user.id,
        "org_id": org.id,
        "notification_type": NotificationType.CHAPTER_ADDED,
        "target_type": "chapter",
        "title": "New chapter available",
        "message": "A new chapter was added.",
    }
    defaults.update(overrides)
    notification = Notification(**defaults)
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


class TestProcessPendingNotificationEmails:
    def test_successful_send_marks_sent(self, session: Session, user: User, org):
        notification = _make_notification(session, user, org, suffix="1")

        with patch("src.services.notifications.email_dispatch.send_email") as mock_send:
            mock_send.return_value = {"id": "ok"}
            result = process_pending_notification_emails(session)

        session.refresh(notification)
        assert result == {"sent": 1, "failed": 0, "total": 1}
        assert notification.email_status == EmailStatus.SENT
        assert notification.email_sent_at is not None
        mock_send.assert_called_once()

    def test_failure_increments_retry_count_and_stays_pending(
        self, session: Session, user: User, org
    ):
        notification = _make_notification(session, user, org, suffix="2")

        with patch(
            "src.services.notifications.email_dispatch.send_email",
            side_effect=Exception("SMTP down"),
        ):
            process_pending_notification_emails(session)

        session.refresh(notification)
        assert notification.email_status == EmailStatus.PENDING
        assert notification.email_retry_count == 1
        assert "SMTP down" in notification.email_last_error

    def test_gives_up_after_max_attempts_without_raising(
        self, session: Session, user: User, org
    ):
        notification = _make_notification(session, user, org, suffix="3")

        with patch(
            "src.services.notifications.email_dispatch.send_email",
            side_effect=Exception("SMTP down"),
        ):
            for _ in range(MAX_EMAIL_ATTEMPTS):
                process_pending_notification_emails(session)

        session.refresh(notification)
        assert notification.email_retry_count == MAX_EMAIL_ATTEMPTS
        assert notification.email_status == EmailStatus.FAILED_PERMANENT

        # A permanently-failed row must never be picked up again.
        with patch("src.services.notifications.email_dispatch.send_email") as mock_send:
            result = process_pending_notification_emails(session)
            mock_send.assert_not_called()
        assert result == {"sent": 0, "failed": 0, "total": 0}

    def test_one_failure_does_not_block_other_notifications(
        self, session: Session, user: User, org
    ):
        _make_notification(session, user, org, suffix="fail")
        _make_notification(session, user, org, suffix="ok")

        with patch(
            "src.services.notifications.email_dispatch.send_email",
        ) as mock_send:
            mock_send.side_effect = [Exception("boom"), {"id": "ok"}]
            result = process_pending_notification_emails(session)

        assert result["total"] == 2
        assert result["sent"] == 1
        assert result["failed"] == 1

    def test_deleted_user_fails_permanently_immediately(self, session: Session, org):
        # Notification survives independently of the user row (no cascading
        # delete wired between user and notification in this scenario).
        notification = Notification(
            notification_uuid="notif_deleted_user",
            user_id=999_999,
            org_id=org.id,
            notification_type=NotificationType.CHAPTER_ADDED,
            target_type="chapter",
            title="New chapter available",
            message="A new chapter was added.",
        )
        session.add(notification)
        session.commit()
        session.refresh(notification)

        with patch("src.services.notifications.email_dispatch.send_email") as mock_send:
            process_pending_notification_emails(session)
            mock_send.assert_not_called()

        session.refresh(notification)
        assert notification.email_status == EmailStatus.FAILED_PERMANENT
