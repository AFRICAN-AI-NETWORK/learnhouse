"""Add org_id to message_attachment

Revision ID: f2b3c4d5e6f7
Revises: e8f9a0b1c2d3
Create Date: 2026-03-04 21:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f2b3c4d5e6f7"
down_revision: Union[str, None] = "e8f9a0b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :table_name AND column_name = :column_name)"
        ),
        {"table_name": table_name, "column_name": column_name},
    )
    return result.scalar()


def _index_exists(index_name: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM pg_indexes "
            "WHERE indexname = :index_name)"
        ),
        {"index_name": index_name},
    )
    return result.scalar()


def upgrade() -> None:
    # Add org_id column to message_attachment for path namespacing
    if not _column_exists("message_attachment", "org_id"):
        op.add_column(
            "message_attachment",
            sa.Column(
                "org_id",
                sa.Integer(),
                sa.ForeignKey("organization.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )
    if not _index_exists("idx_message_attachment_org"):
        op.create_index(
            "idx_message_attachment_org",
            "message_attachment",
            ["org_id"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index("idx_message_attachment_org", table_name="message_attachment")
    op.drop_column("message_attachment", "org_id")
