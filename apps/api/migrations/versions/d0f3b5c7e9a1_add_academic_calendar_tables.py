"""add academic calendar tables

Revision ID: d0f3b5c7e9a1
Revises: c9e2a4b6d8f0
Create Date: 2026-10-05 12:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d0f3b5c7e9a1"
down_revision: str | None = "c9e2a4b6d8f0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_STATUSES = ("upcoming", "active", "completed")


def _text(name: str, nullable: bool = False) -> sa.Column:
    return sa.Column(name, sqlmodel.sql.sqltypes.AutoString(), nullable=nullable)


def upgrade() -> None:
    bind = op.get_bind()
    # Tables may already exist when the app created them from the models.
    tables = sa.inspect(bind).get_table_names()

    postgresql.ENUM(*_STATUSES, name="academiccohortstatusenum").create(
        bind, checkfirst=True
    )
    status_enum = postgresql.ENUM(
        *_STATUSES, name="academiccohortstatusenum", create_type=False
    )

    if "academicyear" not in tables:
        op.create_table(
            "academicyear",
            _text("name"),
            _text("region", nullable=True),
            _text("start_date"),
            _text("end_date"),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("id", sa.Integer(), nullable=False),
            _text("academic_year_uuid"),
            sa.Column("org_id", sa.Integer(), nullable=True),
            _text("creation_date"),
            _text("update_date"),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_academicyear_academic_year_uuid"),
            "academicyear",
            ["academic_year_uuid"],
            unique=True,
        )

    if "academiccohort" not in tables:
        op.create_table(
            "academiccohort",
            _text("name"),
            _text("start_date"),
            _text("end_date"),
            _text("enrollment_window_start", nullable=True),
            _text("enrollment_window_end", nullable=True),
            sa.Column("status", status_enum, nullable=False),
            sa.Column("id", sa.Integer(), nullable=False),
            _text("academic_cohort_uuid"),
            sa.Column("academic_year_id", sa.Integer(), nullable=True),
            sa.Column("org_id", sa.Integer(), nullable=True),
            _text("creation_date"),
            _text("update_date"),
            sa.ForeignKeyConstraint(
                ["academic_year_id"], ["academicyear.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_academiccohort_academic_cohort_uuid"),
            "academiccohort",
            ["academic_cohort_uuid"],
            unique=True,
        )

    if "course_academic_cohort" not in tables:
        op.create_table(
            "course_academic_cohort",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=True),
            sa.Column("academic_cohort_id", sa.Integer(), nullable=True),
            sa.Column("org_id", sa.Integer(), nullable=True),
            _text("creation_date"),
            sa.ForeignKeyConstraint(["course_id"], ["course.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["academic_cohort_id"], ["academiccohort.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["org_id"], ["organization.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "course_id", "academic_cohort_id", name="uq_course_academic_cohort"
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_table("course_academic_cohort")
    op.drop_table("academiccohort")
    op.drop_table("academicyear")
    postgresql.ENUM(name="academiccohortstatusenum").drop(bind, checkfirst=True)
