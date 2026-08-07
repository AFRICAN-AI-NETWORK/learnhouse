"""add_commission_type_to_referralcommission

Adds commission_type (STANDARD | MARKETER) so admin analytics can separate
marketer earnings from standard referrer earnings without joining Marketer.
server_default backfills all existing rows atomically as STANDARD.

Revision ID: b2c3d4e5f6a7
Revises: f7a8b9c0d1e2
Create Date: 2026-07-03 00:00:02.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "f7a8b9c0d1e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commissiontype') "
            "THEN CREATE TYPE commissiontype AS ENUM ('STANDARD', 'MARKETER'); END IF; END $$;"
        )
    )

    inspector = sa.inspect(bind)
    columns = [c["name"] for c in inspector.get_columns("referralcommission")]

    if "commission_type" not in columns:
        op.add_column(
            "referralcommission",
            sa.Column(
                "commission_type",
                postgresql.ENUM(
                    "STANDARD", "MARKETER", name="commissiontype", create_type=False
                ),
                nullable=False,
                server_default="STANDARD",
            ),
        )

    indexes = [idx["name"] for idx in inspector.get_indexes("referralcommission")]
    if "idx_commission_type_referrer" not in indexes:
        op.create_index(
            "idx_commission_type_referrer",
            "referralcommission",
            ["referrer_user_id", "commission_type", "status"],
        )


def downgrade() -> None:
    op.drop_index("idx_commission_type_referrer", table_name="referralcommission")
    op.drop_column("referralcommission", "commission_type")
    sa.Enum(name="commissiontype").drop(op.get_bind())
