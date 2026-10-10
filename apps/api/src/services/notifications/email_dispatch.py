"""
Notification email delivery with a bounded retry sweep.

Mirrors the retry_count / last_error pattern already proven by
WaitlistEmailLog (src/services/waitlist/emails.py) instead of introducing a
new retry mechanism: a periodic sweep picks up EmailStatus.PENDING rows
(which covers both "never attempted yet" and "failed once or twice"),
attempts delivery for each in isolation, and permanently gives up once a
row has failed MAX_EMAIL_ATTEMPTS times — without ever raising back into
whatever created the notification.
"""

import logging
from datetime import UTC, datetime

from sqlmodel import Session, select

from src.db.notifications import EmailStatus, Notification
from src.db.users import User
from src.services.email.utils import send_email

logger = logging.getLogger(__name__)

MAX_EMAIL_ATTEMPTS = 3


def _build_email_body(notification: Notification) -> str:
    return f"""
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1F2937; line-height: 1.6;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 12px 0; font-size: 18px;">{notification.title}</h2>
      <p style="margin: 0; color: #4B5563;">{notification.message}</p>
    </div>
  </body>
</html>
"""


def _send_one(db_session: Session, notification: Notification) -> None:
    """
    Attempt delivery for a single notification.

    Never lets a send_email() failure propagate — every outcome (success,
    provider error, missing email) is recorded on the row and committed
    here, so the caller's sweep loop can always move on to the next one.
    """
    user = db_session.get(User, notification.user_id)
    if not user:
        notification.email_status = EmailStatus.FAILED_PERMANENT
        notification.email_last_error = "User no longer exists"
        db_session.add(notification)
        db_session.commit()
        return

    try:
        send_email(
            to=user.email,
            subject=notification.title,
            body=_build_email_body(notification),
        )
        notification.email_status = EmailStatus.SENT
        notification.email_sent_at = datetime.now(UTC)
        notification.email_last_error = None
    except Exception as e:  # noqa: BLE001
        notification.email_retry_count += 1
        notification.email_last_error = str(e)[:500]
        if notification.email_retry_count >= MAX_EMAIL_ATTEMPTS:
            notification.email_status = EmailStatus.FAILED_PERMANENT
            logger.warning(
                "Notification %s email permanently failed after %d attempt(s): %s",
                notification.notification_uuid,
                notification.email_retry_count,
                e,
            )
        else:
            logger.warning(
                "Notification %s email attempt %d failed, will retry: %s",
                notification.notification_uuid,
                notification.email_retry_count,
                e,
            )

    db_session.add(notification)
    db_session.commit()


def process_pending_notification_emails(db_session: Session) -> dict:
    """
    Sweep pending notification emails (first attempt or retry) and attempt
    delivery for each, in isolation, so one failure never blocks the rest
    of the batch and never affects the request path that created them.

    Safe to call on a fixed interval — rows that exceed MAX_EMAIL_ATTEMPTS
    fall out of the PENDING filter permanently and are never revisited.
    """
    statement = select(Notification).where(
        Notification.email_status == EmailStatus.PENDING,
        Notification.email_retry_count < MAX_EMAIL_ATTEMPTS,
    )
    pending = db_session.exec(statement).all()

    sent = 0
    failed = 0
    for notification in pending:
        try:
            _send_one(db_session, notification)
        except Exception as e:
            # _send_one already isolates send_email() failures; this guards
            # against anything unexpected (e.g. a DB error) so the sweep
            # always continues to the next notification.
            logger.exception(
                "Unexpected error processing notification %s email: %s",
                notification.notification_uuid,
                e,
            )
            continue

        if notification.email_status == EmailStatus.SENT:
            sent += 1
        else:
            failed += 1

    return {"sent": sent, "failed": failed, "total": len(pending)}
