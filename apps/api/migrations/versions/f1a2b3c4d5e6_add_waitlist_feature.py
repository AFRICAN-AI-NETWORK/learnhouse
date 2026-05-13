"""Add waitlist feature

Revision ID: f1a2b3c4d5e6
Revises: adb944cc8bec
Create Date: 2026-02-16 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "adb944cc8bec"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums for user and waitlist status
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userstatusenum') THEN
                CREATE TYPE userstatusenum AS ENUM (
                    'ACTIVE', 'WAITLIST', 'WAITLIST_ACTIVATED', 'SUSPENDED', 'PENDING_VERIFICATION'
                );
            END IF;
        END $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waitliststatusenum') THEN
                CREATE TYPE waitliststatusenum AS ENUM (
                    'ACTIVE', 'COMPLETED', 'CANCELLED', 'SCHEDULED'
                );
            END IF;
        END $$;
    """)

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    user_cols = [c["name"] for c in inspector.get_columns("user")]

    # Add waitlist fields to user table
    if "user_status" not in user_cols:
        op.add_column(
            "user",
            sa.Column(
                "user_status", sa.String(), nullable=False, server_default="ACTIVE"
            ),
        )
        # Create index on user_status for query performance
        op.create_index("ix_user_user_status", "user", ["user_status"])
        # Data migration: Set all existing users to ACTIVE status
        op.execute(
            "UPDATE \"user\" SET user_status = 'ACTIVE' WHERE user_status IS NULL"
        )

    if "waitlist_interest" not in user_cols:
        op.add_column(
            "user", sa.Column("waitlist_interest", sa.String(), nullable=True)
        )
    if "waitlist_joined_date" not in user_cols:
        op.add_column(
            "user", sa.Column("waitlist_joined_date", sa.String(), nullable=True)
        )
    if "waitlist_activated_date" not in user_cols:
        op.add_column(
            "user", sa.Column("waitlist_activated_date", sa.String(), nullable=True)
        )

    if "waitlist_config" not in tables:
        # Create waitlist_config table
        op.create_table(
            "waitlist_config",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("waitlist_uuid", sa.String(), nullable=False),
            sa.Column("org_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column("interest_category", sa.String(), nullable=False),
            sa.Column("launch_datetime", sa.String(), nullable=False),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(), nullable=False, server_default="ACTIVE"),
            sa.Column(
                "total_registrations", sa.Integer(), nullable=False, server_default="0"
            ),
            sa.Column(
                "emails_sent_count", sa.Integer(), nullable=False, server_default="0"
            ),
            sa.Column("batch_size", sa.Integer(), nullable=False, server_default="50"),
            sa.Column(
                "batch_delay_seconds", sa.Integer(), nullable=False, server_default="2"
            ),
            sa.Column("creation_date", sa.String(), nullable=False),
            sa.Column("update_date", sa.String(), nullable=False),
            sa.Column("activation_date", sa.String(), nullable=True),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["created_by_user_id"], ["user.id"], ondelete="SET NULL"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("waitlist_uuid"),
        )

        # Create indexes for waitlist_config
        op.create_index(
            "ix_waitlist_config_waitlist_uuid", "waitlist_config", ["waitlist_uuid"]
        )
        op.create_index(
            "ix_waitlist_config_org_status", "waitlist_config", ["org_id", "status"]
        )
        op.create_index(
            "ix_waitlist_config_launch_datetime", "waitlist_config", ["launch_datetime"]
        )

    if "waitlist_email_log" not in tables:
        # Create waitlist_email_log table
        op.create_table(
            "waitlist_email_log",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("waitlist_config_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column(
                "email_sent", sa.Boolean(), nullable=False, server_default="false"
            ),
            sa.Column("email_sent_date", sa.String(), nullable=True),
            sa.Column("email_error", sa.String(), nullable=True),
            sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("creation_date", sa.String(), nullable=False),
            sa.Column("update_date", sa.String(), nullable=False),
            sa.ForeignKeyConstraint(
                ["waitlist_config_id"], ["waitlist_config.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

        # Create indexes for waitlist_email_log
        op.create_index(
            "ix_waitlist_email_log_user_id", "waitlist_email_log", ["user_id"]
        )
        op.create_index(
            "ix_waitlist_email_log_waitlist_config_id",
            "waitlist_email_log",
            ["waitlist_config_id"],
        )
        op.create_index(
            "ix_waitlist_email_log_status", "waitlist_email_log", ["email_sent"]
        )

    if "waitlist_course_preference" not in tables:
        # Create waitlist_course_preference table
        op.create_table(
            "waitlist_course_preference",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("waitlist_config_id", sa.Integer(), nullable=False),
            sa.Column("org_id", sa.Integer(), nullable=False),
            sa.Column("creation_date", sa.String(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["course_id"], ["course.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["waitlist_config_id"], ["waitlist_config.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
        )

        # Create indexes for waitlist_course_preference
        op.create_index("ix_wcp_user_id", "waitlist_course_preference", ["user_id"])
        op.create_index(
            "ix_wcp_waitlist_config_id",
            "waitlist_course_preference",
            ["waitlist_config_id"],
        )
        op.create_index("ix_wcp_course_id", "waitlist_course_preference", ["course_id"])
        op.create_index(
            "ix_wcp_unique",
            "waitlist_course_preference",
            ["user_id", "course_id", "waitlist_config_id"],
            unique=True,
        )


def downgrade() -> None:
    # Drop indexes for waitlist_course_preference
    op.drop_index("ix_wcp_unique", "waitlist_course_preference")
    op.drop_index("ix_wcp_course_id", "waitlist_course_preference")
    op.drop_index("ix_wcp_waitlist_config_id", "waitlist_course_preference")
    op.drop_index("ix_wcp_user_id", "waitlist_course_preference")

    # Drop waitlist_course_preference table
    op.drop_table("waitlist_course_preference")

    # Drop indexes for waitlist_email_log
    op.drop_index("ix_waitlist_email_log_status", "waitlist_email_log")
    op.drop_index("ix_waitlist_email_log_waitlist_config_id", "waitlist_email_log")
    op.drop_index("ix_waitlist_email_log_user_id", "waitlist_email_log")

    # Drop waitlist_email_log table
    op.drop_table("waitlist_email_log")

    # Drop indexes for waitlist_config
    op.drop_index("ix_waitlist_config_launch_datetime", "waitlist_config")
    op.drop_index("ix_waitlist_config_org_status", "waitlist_config")
    op.drop_index("ix_waitlist_config_waitlist_uuid", "waitlist_config")

    # Drop waitlist_config table
    op.drop_table("waitlist_config")

    # Drop index on user_status
    op.drop_index("ix_user_user_status", "user")

    # Drop waitlist columns from user table
    op.drop_column("user", "waitlist_activated_date")
    op.drop_column("user", "waitlist_joined_date")
    op.drop_column("user", "waitlist_interest")
    op.drop_column("user", "user_status")

    # Drop enums
    op.execute("DROP TYPE waitliststatusenum")
    op.execute("DROP TYPE userstatusenum")
