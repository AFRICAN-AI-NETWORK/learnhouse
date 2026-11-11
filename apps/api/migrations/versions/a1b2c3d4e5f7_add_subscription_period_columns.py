"""add_subscription_period_columns

Revision ID: a1b2c3d4e5f7
Revises: e3d4c5b6a7f8
Create Date: 2026-11-10 15:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f7"
down_revision: str | None = "e3d4c5b6a7f8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "paymentsuser" in tables:
        user_cols = {c["name"] for c in inspector.get_columns("paymentsuser")}
        columns_to_add = [
            (
                "auto_renew",
                sa.Column(
                    "auto_renew",
                    sa.Boolean(),
                    server_default=sa.false(),
                    nullable=False,
                ),
            ),
            (
                "current_period_start",
                sa.Column(
                    "current_period_start", sa.DateTime(timezone=True), nullable=True
                ),
            ),
            (
                "current_period_end",
                sa.Column(
                    "current_period_end", sa.DateTime(timezone=True), nullable=True
                ),
            ),
            (
                "last_payment_date",
                sa.Column(
                    "last_payment_date", sa.DateTime(timezone=True), nullable=True
                ),
            ),
            (
                "renewal_reminder_sent_at",
                sa.Column(
                    "renewal_reminder_sent_at",
                    sa.DateTime(timezone=True),
                    nullable=True,
                ),
            ),
            (
                "grace_notice_sent_at",
                sa.Column(
                    "grace_notice_sent_at", sa.DateTime(timezone=True), nullable=True
                ),
            ),
        ]
        for col_name, column in columns_to_add:
            if col_name not in user_cols:
                op.add_column("paymentsuser", column)


def downgrade() -> None:
    pass
