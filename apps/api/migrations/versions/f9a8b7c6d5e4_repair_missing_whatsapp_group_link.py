"""repair missing whatsapp_group_link column

Revision ID: f9a8b7c6d5e4
Revises: e1f2a3b4c5d6
Create Date: 2026-07-15 00:00:00.000000

Some databases were already stamped at e1f2a3b4c5d6 before the
c8e7f9a0b1c2 migration was inserted into its ancestry. Those databases will
not run c8e7f9a0b1c2 during a normal upgrade, so repair the schema at the
current head.
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f9a8b7c6d5e4"
down_revision: str | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if not inspector.has_table(table_name):
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    if _column_exists("course", "whatsapp_group_link"):
        return
    op.add_column(
        "course",
        sa.Column(
            "whatsapp_group_link",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    if not _column_exists("course", "whatsapp_group_link"):
        return
    op.drop_column("course", "whatsapp_group_link")
