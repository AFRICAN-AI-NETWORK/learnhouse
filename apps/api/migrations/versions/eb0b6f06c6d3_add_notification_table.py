"""add notification table

Revision ID: eb0b6f06c6d3
Revises: e1f2a3b4c5d6
Create Date: 2026-07-21 12:00:00.000000

Adds a single generic ``notification`` table covering assignment-reviewed,
retake-requested, chapter-added, activity-added, and app-update notifications.
Chat's existing ``chat_notification`` table is left untouched — chat already
delivers over the same WebSocket and isn't part of this feature's scope.
"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "eb0b6f06c6d3"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    notification_type_enum = postgresql.ENUM(
        "assignment_reviewed",
        "retake_requested",
        "chapter_added",
        "activity_added",
        "app_update",
        name="notificationtype",
        create_type=False,
    )
    notification_type_enum.create(bind, checkfirst=True)

    email_status_enum = postgresql.ENUM(
        "not_required",
        "pending",
        "sent",
        "failed_permanent",
        name="emailstatus",
        create_type=False,
    )
    email_status_enum.create(bind, checkfirst=True)

    if "notification" not in inspector.get_table_names():
        op.create_table(
            "notification",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column(
                "notification_uuid", sqlmodel.sql.sqltypes.AutoString(), nullable=False
            ),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("org_id", sa.Integer(), nullable=False),
            sa.Column("notification_type", notification_type_enum, nullable=False),
            sa.Column(
                "target_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False
            ),
            sa.Column("target_id", sa.Integer(), nullable=True),
            sa.Column("target_uuid", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
            sa.Column("title", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("message", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("metadata", sa.JSON(), nullable=False),
            sa.Column("is_read", sa.Boolean(), nullable=False),
            sa.Column("read_at", sa.DateTime(), nullable=True),
            sa.Column("email_status", email_status_enum, nullable=False),
            sa.Column("email_retry_count", sa.Integer(), nullable=False),
            sa.Column(
                "email_last_error", sqlmodel.sql.sqltypes.AutoString(), nullable=True
            ),
            sa.Column("email_sent_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_notification_notification_uuid"),
            "notification",
            ["notification_uuid"],
            unique=True,
        )
        # Matches the actual read pattern: "my unread notifications, newest first".
        op.create_index(
            "ix_notification_user_unread_created",
            "notification",
            ["user_id", "is_read", "created_at"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "notification" in inspector.get_table_names():
        op.drop_index("ix_notification_user_unread_created", table_name="notification")
        op.drop_index(
            op.f("ix_notification_notification_uuid"), table_name="notification"
        )
        op.drop_table("notification")

    postgresql.ENUM(name="notificationtype").drop(bind, checkfirst=True)
    postgresql.ENUM(name="emailstatus").drop(bind, checkfirst=True)
