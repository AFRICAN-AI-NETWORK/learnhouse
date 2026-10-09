"""Add Flutterwave to the payment provider enum.

Revision ID: 9f4a1b2c3d5e
Revises: f2b5d7e9a1c3
"""

from collections.abc import Sequence

from alembic import op

revision: str = "9f4a1b2c3d5e"
down_revision: str | None = "f2b5d7e9a1c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TYPE paymentproviderenum "
        "ADD VALUE IF NOT EXISTS 'flutterwave'"
    )


def downgrade() -> None:
    # PostgreSQL does not support removing an enum value safely.
    pass
