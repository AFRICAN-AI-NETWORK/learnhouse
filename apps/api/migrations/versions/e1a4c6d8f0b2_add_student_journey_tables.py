"""add student journey tables

Revision ID: e1a4c6d8f0b2
Revises: d0f3b5c7e9a1
Create Date: 2026-10-05 13:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e1a4c6d8f0b2"
down_revision: str | None = "d0f3b5c7e9a1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ENUMS = {
    "journeyphaseenum": ("onboarding", "core_learning", "capstone", "alumni"),
    "milestonecriteriaenum": (
        "manual",
        "course_started",
        "chapter_completed",
        "course_grade_at_least",
        "required_assignments_graded",
        "certificate_issued",
    ),
    "milestonestatusenum": ("not_started", "in_progress", "achieved", "at_risk"),
}


def _text(name: str, nullable: bool = False) -> sa.Column:
    return sa.Column(name, sqlmodel.sql.sqltypes.AutoString(), nullable=nullable)


def _enum(name: str) -> postgresql.ENUM:
    return postgresql.ENUM(*_ENUMS[name], name=name, create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    # Tables may already exist when the app created them from the models.
    tables = sa.inspect(bind).get_table_names()

    for name, values in _ENUMS.items():
        postgresql.ENUM(*values, name=name).create(bind, checkfirst=True)

    if "student_journey_milestone" not in tables:
        op.create_table(
            "student_journey_milestone",
            sa.Column("phase", _enum("journeyphaseenum"), nullable=False),
            _text("name"),
            _text("description", nullable=True),
            sa.Column("sequence_order", sa.Integer(), nullable=False),
            sa.Column("criteria", _enum("milestonecriteriaenum"), nullable=False),
            sa.Column("criteria_config", sa.JSON(), nullable=True),
            sa.Column("id", sa.Integer(), nullable=False),
            _text("milestone_uuid"),
            sa.Column("course_id", sa.Integer(), nullable=True),
            sa.Column("org_id", sa.Integer(), nullable=True),
            _text("creation_date"),
            _text("update_date"),
            sa.ForeignKeyConstraint(["course_id"], ["course.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "course_id",
                "sequence_order",
                name="uq_student_journey_milestone_order",
            ),
        )
        op.create_index(
            op.f("ix_student_journey_milestone_milestone_uuid"),
            "student_journey_milestone",
            ["milestone_uuid"],
            unique=True,
        )

    if "user_milestone_progress" not in tables:
        op.create_table(
            "user_milestone_progress",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("milestone_id", sa.Integer(), nullable=True),
            sa.Column("org_id", sa.Integer(), nullable=True),
            sa.Column("status", _enum("milestonestatusenum"), nullable=False),
            _text("achieved_at", nullable=True),
            sa.Column("is_manual_override", sa.Boolean(), nullable=False),
            _text("notes", nullable=True),
            _text("creation_date"),
            _text("update_date"),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["milestone_id"], ["student_journey_milestone.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "user_id", "milestone_id", name="uq_user_milestone_progress"
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_table("user_milestone_progress")
    op.drop_table("student_journey_milestone")
    for name in _ENUMS:
        postgresql.ENUM(name=name).drop(bind, checkfirst=True)
