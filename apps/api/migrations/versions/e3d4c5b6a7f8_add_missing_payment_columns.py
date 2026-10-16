"""add_missing_payment_columns

Revision ID: e3d4c5b6a7f8
Revises: 9f4a1b2c3d5e
Create Date: 2026-10-16 15:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e3d4c5b6a7f8"
down_revision: str | None = "9f4a1b2c3d5e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. paymentsproduct table
    if "paymentsproduct" in tables:
        product_cols = [c["name"] for c in inspector.get_columns("paymentsproduct")]
        if "interval" not in product_cols:
            op.add_column(
                "paymentsproduct",
                sa.Column("interval", sa.String(), nullable=True),
            )
        if "trial_days" not in product_cols:
            op.add_column(
                "paymentsproduct",
                sa.Column("trial_days", sa.Integer(), server_default="0", nullable=False),
            )

    # 2. paymentsuser table
    if "paymentsuser" in tables:
        user_cols = [c["name"] for c in inspector.get_columns("paymentsuser")]
        if "grace_period_start_date" not in user_cols:
            op.add_column(
                "paymentsuser",
                sa.Column("grace_period_start_date", sa.DateTime(timezone=True), nullable=True),
            )
        if "discount_code_id" not in user_cols:
            op.add_column(
                "paymentsuser",
                sa.Column("discount_code_id", sa.BigInteger(), nullable=True),
            )
        if "referral_code_id" not in user_cols:
            op.add_column(
                "paymentsuser",
                sa.Column("referral_code_id", sa.BigInteger(), nullable=True),
            )
        if "original_amount" not in user_cols:
            op.add_column(
                "paymentsuser",
                sa.Column("original_amount", sa.Float(), nullable=True),
            )
        if "discount_amount" not in user_cols:
            op.add_column(
                "paymentsuser",
                sa.Column("discount_amount", sa.Float(), nullable=True),
            )
        if "final_amount" not in user_cols:
            op.add_column(
                "paymentsuser",
                sa.Column("final_amount", sa.Float(), nullable=True),
            )

    # 3. notification table: normalize uppercase enum values
    if "notification" in tables:
        try:
            op.execute("UPDATE notification SET notification_type = lower(notification_type) WHERE notification_type IS NOT NULL")
        except Exception:  # noqa: BLE001
            pass


def downgrade() -> None:
    pass
