"""add grade_percentage to certificateuser

Revision ID: e1f2a3b4c5d6
Revises: c7d8e9f0a1b2
Create Date: 2026-06-27 12:00:00.000000

Adds the computed course grade (0-100) persisted on the certificate at
issuance time. The column is nullable because courses with no graded
activities cannot produce a numeric grade. Existing rows are intentionally
left NULL (not backfilled) — historical grades cannot be recomputed with
certainty after issuance.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "c8e7f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if not inspector.has_table(table_name):
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if _column_exists("certificateuser", "grade_percentage"):
        return
    op.add_column(
        "certificateuser",
        sa.Column("grade_percentage", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    if not _column_exists("certificateuser", "grade_percentage"):
        return
    op.drop_column("certificateuser", "grade_percentage")
