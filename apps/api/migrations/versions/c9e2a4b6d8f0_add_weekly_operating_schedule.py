"""add weekly operating schedule tables

Revision ID: c9e2a4b6d8f0
Revises: b8d1f3a5c7e9
Create Date: 2026-10-05 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c9e2a4b6d8f0"
down_revision: str | None = "b8d1f3a5c7e9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PHASES = ("learn", "practice", "connect", "apply", "build", "support", "rest")


def upgrade() -> None:
    bind = op.get_bind()
    # Tables may already exist when the app created them from the models.
    tables = sa.inspect(bind).get_table_names()

    postgresql.ENUM(*_PHASES, name="learningphaseenum").create(bind, checkfirst=True)
    phase_enum = postgresql.ENUM(*_PHASES, name="learningphaseenum", create_type=False)

    if "weekly_operating_schedule" not in tables:
        op.create_table(
            "weekly_operating_schedule",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("timezone", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column("rest_day_enforced", sa.Boolean(), nullable=False),
            sa.Column(
                "schedule_uuid", sqlmodel.sql.sqltypes.AutoString(), nullable=False
            ),
            sa.Column("org_id", sa.Integer(), nullable=True),
            sa.Column("course_id", sa.Integer(), nullable=True),
            sa.Column(
                "creation_date", sqlmodel.sql.sqltypes.AutoString(), nullable=False
            ),
            sa.Column(
                "update_date", sqlmodel.sql.sqltypes.AutoString(), nullable=False
            ),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["course_id"], ["course.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_weekly_operating_schedule_schedule_uuid"),
            "weekly_operating_schedule",
            ["schedule_uuid"],
            unique=True,
        )
        op.create_index(
            "uq_weekly_operating_schedule_org_default",
            "weekly_operating_schedule",
            ["org_id"],
            unique=True,
            postgresql_where=sa.text("course_id IS NULL"),
        )
        op.create_index(
            "uq_weekly_operating_schedule_course",
            "weekly_operating_schedule",
            ["course_id"],
            unique=True,
        )

    if "weekly_operating_schedule_day" not in tables:
        op.create_table(
            "weekly_operating_schedule_day",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("weekday", sa.Integer(), nullable=False),
            sa.Column("phase", phase_enum, nullable=False),
            sa.Column("is_rest_day", sa.Boolean(), nullable=False),
            sa.Column("schedule_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(
                ["schedule_id"], ["weekly_operating_schedule.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "schedule_id", "weekday", name="uq_weekly_operating_schedule_day"
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_table("weekly_operating_schedule_day")
    op.drop_table("weekly_operating_schedule")
    postgresql.ENUM(name="learningphaseenum").drop(bind, checkfirst=True)
