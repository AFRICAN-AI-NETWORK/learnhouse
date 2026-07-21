"""add required_for_certificate to assignment

Revision ID: 5c4fe3ba3606
Revises: eb0b6f06c6d3
Create Date: 2026-07-21 12:05:00.000000

Flags an assignment as required for certificate issuance (e.g. a capstone
project). Defaults to False so existing assignments are unaffected; the
certificate gate in check_course_completion_and_create_certificate() only
blocks issuance for courses that explicitly opt an assignment in.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5c4fe3ba3606"
down_revision: Union[str, None] = "eb0b6f06c6d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if not inspector.has_table(table_name):
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if _column_exists("assignment", "required_for_certificate"):
        return
    op.add_column(
        "assignment",
        sa.Column(
            "required_for_certificate",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    if not _column_exists("assignment", "required_for_certificate"):
        return
    op.drop_column("assignment", "required_for_certificate")
