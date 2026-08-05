"""Add trail activity session (learning time-tracking)

Revision ID: c7d8e9f0a1b2
Revises: b6c7d8e9f0a1
Create Date: 2026-06-16 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c7d8e9f0a1b2"
down_revision: str | None = "b6c7d8e9f0a1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(table_name: str) -> bool:
    conn = op.get_bind()
    return sa.inspect(conn).has_table(table_name)


def upgrade() -> None:
    if _table_exists("trailactivitysession"):
        return

    op.create_table(
        "trailactivitysession",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("seconds_spent", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("org_id", sa.Integer(), nullable=True),
        sa.Column("course_id", sa.Integer(), nullable=True),
        sa.Column("activity_id", sa.Integer(), nullable=True),
        sa.Column("trailrun_id", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.String(), nullable=False),
        sa.Column("last_heartbeat_at", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organization.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["course.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["activity_id"], ["activity.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trailrun_id"], ["trailrun.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_trailactivitysession_user_id",
        "trailactivitysession",
        ["user_id"],
    )
    op.create_index(
        "ix_trailactivitysession_org_id",
        "trailactivitysession",
        ["org_id"],
    )
    op.create_index(
        "ix_trailactivitysession_course_id",
        "trailactivitysession",
        ["course_id"],
    )


def downgrade() -> None:
    if not _table_exists("trailactivitysession"):
        return
    op.drop_index(
        "ix_trailactivitysession_course_id", table_name="trailactivitysession"
    )
    op.drop_index("ix_trailactivitysession_org_id", table_name="trailactivitysession")
    op.drop_index("ix_trailactivitysession_user_id", table_name="trailactivitysession")
    op.drop_table("trailactivitysession")
