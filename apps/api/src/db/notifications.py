from datetime import datetime
from enum import StrEnum

from sqlalchemy import Enum as SAEnum
from sqlmodel import JSON, Column, Field, SQLModel


class NotificationType(StrEnum):
    ASSIGNMENT_REVIEWED = "assignment_reviewed"
    RETAKE_REQUESTED = "retake_requested"
    CHAPTER_ADDED = "chapter_added"
    ACTIVITY_ADDED = "activity_added"
    APP_UPDATE = "app_update"


class EmailStatus(StrEnum):
    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    SENT = "sent"
    FAILED_PERMANENT = "failed_permanent"


class NotificationBase(SQLModel):
    notification_type: NotificationType = Field(
        sa_column=Column(
            SAEnum(
                NotificationType,
                name="notificationtype",
                values_callable=lambda obj: [e.value for e in obj],
                metadata=SQLModel.metadata,
            )
        )
    )
    target_type: str  # 'assignment' | 'chapter' | 'activity' | 'app'
    target_id: int | None = None
    target_uuid: str | None = None
    title: str
    message: str


class Notification(NotificationBase, table=True):
    """
    A single in-app + email notification for a user.

    Deliberately generic (one row type, discriminated by ``notification_type``)
    rather than one table per trigger, so creation/query/read-state logic lives
    in exactly one place. ``email_status``/``email_retry_count``/``email_last_error``
    track the bounded-retry email delivery attempt directly on the row, mirroring
    the existing ``WaitlistEmailLog`` pattern instead of a separate audit-log table.
    """

    __tablename__ = "notification"

    id: int | None = Field(default=None, primary_key=True)
    notification_uuid: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    org_id: int = Field(foreign_key="organization.id", ondelete="CASCADE")

    # metadata is reserved by SQLAlchemy's declarative base — stored under the
    # "metadata" column but exposed on the Python side as metadata_json.
    metadata_json: dict = Field(default={}, sa_column=Column("metadata", JSON))

    is_read: bool = False
    read_at: datetime | None = None

    email_status: EmailStatus = Field(
        default=EmailStatus.PENDING,
        sa_column=Column(
            SAEnum(
                EmailStatus,
                name="emailstatus",
                values_callable=lambda obj: [e.value for e in obj],
                metadata=SQLModel.metadata,
            ),
            nullable=False,
            default=EmailStatus.PENDING,
        ),
    )
    email_retry_count: int = 0
    email_last_error: str | None = None
    email_sent_at: datetime | None = None

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class NotificationCreate(NotificationBase):
    user_id: int
    org_id: int
    metadata_json: dict = Field(default={})


class NotificationRead(NotificationBase):
    id: int
    notification_uuid: str
    metadata_json: dict
    is_read: bool
    read_at: datetime | None
    created_at: datetime
