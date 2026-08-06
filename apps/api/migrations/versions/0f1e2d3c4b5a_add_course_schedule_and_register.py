"""Add course timetable and register tables

Revision ID: 0f1e2d3c4b5a
Revises: f4d5e6f7a8b9
Create Date: 2026-05-21 14:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0f1e2d3c4b5a"
down_revision: str | Sequence[str] | None = "f4d5e6f7a8b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


timetable_recurrence_enum = postgresql.ENUM(
    "none",
    "weekly",
    "biweekly",
    "monthly",
    name="timetablerecurrenceenum",
)
timetable_visibility_enum = postgresql.ENUM(
    "draft",
    "published",
    name="timetablevisibilityenum",
)
timetable_status_enum = postgresql.ENUM(
    "scheduled",
    "cancelled",
    name="timetablestatusenum",
)
register_frequency_enum = postgresql.ENUM(
    "weekly",
    "per_session",
    "daily",
    "manual",
    name="registerfrequencyenum",
)
register_entry_status_enum = postgresql.ENUM(
    "marked",
    "late",
    "missed",
    "excused",
    name="registerentrystatusenum",
)
register_entry_method_enum = postgresql.ENUM(
    "student_self_mark",
    "instructor_override",
    name="registerentrymethodenum",
)

timetable_recurrence_column_enum = postgresql.ENUM(
    "none",
    "weekly",
    "biweekly",
    "monthly",
    name="timetablerecurrenceenum",
    create_type=False,
)
timetable_visibility_column_enum = postgresql.ENUM(
    "draft",
    "published",
    name="timetablevisibilityenum",
    create_type=False,
)
timetable_status_column_enum = postgresql.ENUM(
    "scheduled",
    "cancelled",
    name="timetablestatusenum",
    create_type=False,
)
register_frequency_column_enum = postgresql.ENUM(
    "weekly",
    "per_session",
    "daily",
    "manual",
    name="registerfrequencyenum",
    create_type=False,
)
register_entry_status_column_enum = postgresql.ENUM(
    "marked",
    "late",
    "missed",
    "excused",
    name="registerentrystatusenum",
    create_type=False,
)
register_entry_method_column_enum = postgresql.ENUM(
    "student_self_mark",
    "instructor_override",
    name="registerentrymethodenum",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    timetable_recurrence_enum.create(bind, checkfirst=True)
    timetable_visibility_enum.create(bind, checkfirst=True)
    timetable_status_enum.create(bind, checkfirst=True)
    register_frequency_enum.create(bind, checkfirst=True)
    register_entry_status_enum.create(bind, checkfirst=True)
    register_entry_method_enum.create(bind, checkfirst=True)

    if "course_timetable_event" not in tables:
        op.create_table(
            "course_timetable_event",
            sa.Column("title", sa.String(), nullable=False),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column("instructor_name", sa.String(), nullable=True),
            sa.Column("location", sa.String(), nullable=True),
            sa.Column("meeting_url", sa.String(), nullable=True),
            sa.Column("starts_at", sa.String(), nullable=False),
            sa.Column("ends_at", sa.String(), nullable=False),
            sa.Column("timezone", sa.String(), nullable=False),
            sa.Column("recurrence", timetable_recurrence_column_enum, nullable=False),
            sa.Column("visibility", timetable_visibility_column_enum, nullable=False),
            sa.Column("status", timetable_status_column_enum, nullable=False),
            sa.Column("register_required", sa.Boolean(), nullable=False),
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("event_uuid", sa.String(), nullable=False),
            sa.Column("course_uuid", sa.String(), nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=True),
            sa.Column("org_id", sa.Integer(), nullable=True),
            sa.Column("creation_date", sa.String(), nullable=False),
            sa.Column("update_date", sa.String(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["course.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("event_uuid"),
        )
        op.create_index(
            op.f("ix_course_timetable_event_course_uuid"),
            "course_timetable_event",
            ["course_uuid"],
            unique=False,
        )
        op.create_index(
            op.f("ix_course_timetable_event_event_uuid"),
            "course_timetable_event",
            ["event_uuid"],
            unique=True,
        )

    if "course_register_policy" not in tables:
        op.create_table(
            "course_register_policy",
            sa.Column("enabled", sa.Boolean(), nullable=False),
            sa.Column("frequency", register_frequency_column_enum, nullable=False),
            sa.Column("checkin_opens_minutes_before", sa.Integer(), nullable=False),
            sa.Column("checkin_closes_minutes_after", sa.Integer(), nullable=False),
            sa.Column("requires_enrollment", sa.Boolean(), nullable=False),
            sa.Column("allow_late", sa.Boolean(), nullable=False),
            sa.Column("linked_timetable_event_uuid", sa.String(), nullable=True),
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("policy_uuid", sa.String(), nullable=False),
            sa.Column("course_uuid", sa.String(), nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=True),
            sa.Column("org_id", sa.Integer(), nullable=True),
            sa.Column("creation_date", sa.String(), nullable=False),
            sa.Column("update_date", sa.String(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["course.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("course_uuid"),
            sa.UniqueConstraint("policy_uuid"),
        )
        op.create_index(
            op.f("ix_course_register_policy_course_uuid"),
            "course_register_policy",
            ["course_uuid"],
            unique=True,
        )
        op.create_index(
            op.f("ix_course_register_policy_policy_uuid"),
            "course_register_policy",
            ["policy_uuid"],
            unique=True,
        )

    if "course_register_entry" not in tables:
        op.create_table(
            "course_register_entry",
            sa.Column("timetable_event_uuid", sa.String(), nullable=True),
            sa.Column("period_start", sa.String(), nullable=False),
            sa.Column("period_end", sa.String(), nullable=False),
            sa.Column("status", register_entry_status_column_enum, nullable=False),
            sa.Column("marked_at", sa.String(), nullable=True),
            sa.Column("method", register_entry_method_column_enum, nullable=False),
            sa.Column("notes", sa.String(), nullable=True),
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("entry_uuid", sa.String(), nullable=False),
            sa.Column("course_uuid", sa.String(), nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=True),
            sa.Column("org_id", sa.Integer(), nullable=True),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("creation_date", sa.String(), nullable=False),
            sa.Column("update_date", sa.String(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["course.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("entry_uuid"),
            sa.UniqueConstraint(
                "course_uuid",
                "user_id",
                "period_start",
                "period_end",
                "timetable_event_uuid",
                name="unique_course_register_entry",
            ),
        )
        op.create_index(
            op.f("ix_course_register_entry_course_uuid"),
            "course_register_entry",
            ["course_uuid"],
            unique=False,
        )
        op.create_index(
            op.f("ix_course_register_entry_entry_uuid"),
            "course_register_entry",
            ["entry_uuid"],
            unique=True,
        )


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_index(
        op.f("ix_course_register_entry_entry_uuid"),
        table_name="course_register_entry",
    )
    op.drop_index(
        op.f("ix_course_register_entry_course_uuid"),
        table_name="course_register_entry",
    )
    op.drop_table("course_register_entry")

    op.drop_index(
        op.f("ix_course_register_policy_policy_uuid"),
        table_name="course_register_policy",
    )
    op.drop_index(
        op.f("ix_course_register_policy_course_uuid"),
        table_name="course_register_policy",
    )
    op.drop_table("course_register_policy")

    op.drop_index(
        op.f("ix_course_timetable_event_event_uuid"),
        table_name="course_timetable_event",
    )
    op.drop_index(
        op.f("ix_course_timetable_event_course_uuid"),
        table_name="course_timetable_event",
    )
    op.drop_table("course_timetable_event")

    register_entry_method_enum.drop(bind, checkfirst=True)
    register_entry_status_enum.drop(bind, checkfirst=True)
    register_frequency_enum.drop(bind, checkfirst=True)
    timetable_status_enum.drop(bind, checkfirst=True)
    timetable_visibility_enum.drop(bind, checkfirst=True)
    timetable_recurrence_enum.drop(bind, checkfirst=True)
