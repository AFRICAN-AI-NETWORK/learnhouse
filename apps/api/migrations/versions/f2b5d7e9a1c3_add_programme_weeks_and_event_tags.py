"""add programme weeks and timetable event calendar tags

Revision ID: f2b5d7e9a1c3
Revises: e1a4c6d8f0b2
Create Date: 2026-10-05 13:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f2b5d7e9a1c3"
down_revision: str | None = "e1a4c6d8f0b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_EVENT_TABLE = "course_timetable_event"
_EVENT_WEEK_FK = "course_timetable_event_programme_week_id_fkey"
_PHASES = ("learn", "practice", "connect", "apply", "build", "support", "rest")


def _text(name: str, nullable: bool = False) -> sa.Column:
    return sa.Column(name, sqlmodel.sql.sqltypes.AutoString(), nullable=nullable)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    # Tables and columns may already exist when the app created them from the models.
    tables = inspector.get_table_names()

    if "programme_week" not in tables:
        op.create_table(
            "programme_week",
            sa.Column("id", sa.Integer(), nullable=False),
            _text("programme_week_uuid"),
            sa.Column("course_academic_cohort_id", sa.Integer(), nullable=True),
            sa.Column("course_id", sa.Integer(), nullable=True),
            sa.Column("org_id", sa.Integer(), nullable=True),
            sa.Column("week_number", sa.Integer(), nullable=False),
            _text("starts_on"),
            _text("ends_on"),
            sa.Column("chapter_id", sa.Integer(), nullable=True),
            sa.Column("milestone_id", sa.Integer(), nullable=True),
            _text("creation_date"),
            _text("update_date"),
            sa.ForeignKeyConstraint(
                ["course_academic_cohort_id"],
                ["course_academic_cohort.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(["course_id"], ["course.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["chapter_id"], ["chapter.id"], ondelete="SET NULL"
            ),
            sa.ForeignKeyConstraint(
                ["milestone_id"], ["student_journey_milestone.id"], ondelete="SET NULL"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "course_academic_cohort_id",
                "week_number",
                name="uq_programme_week_number",
            ),
        )
        op.create_index(
            op.f("ix_programme_week_programme_week_uuid"),
            "programme_week",
            ["programme_week_uuid"],
            unique=True,
        )

    event_columns = {column["name"] for column in inspector.get_columns(_EVENT_TABLE)}
    if "weekly_schedule_phase" not in event_columns:
        op.add_column(
            _EVENT_TABLE,
            sa.Column(
                "weekly_schedule_phase",
                postgresql.ENUM(*_PHASES, name="learningphaseenum", create_type=False),
                nullable=True,
            ),
        )
    if "programme_week_id" not in event_columns:
        op.add_column(
            _EVENT_TABLE, sa.Column("programme_week_id", sa.Integer(), nullable=True)
        )
        op.create_foreign_key(
            _EVENT_WEEK_FK,
            _EVENT_TABLE,
            "programme_week",
            ["programme_week_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    op.drop_constraint(_EVENT_WEEK_FK, _EVENT_TABLE, type_="foreignkey")
    op.drop_column(_EVENT_TABLE, "programme_week_id")
    op.drop_column(_EVENT_TABLE, "weekly_schedule_phase")
    op.drop_table("programme_week")
