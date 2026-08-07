"""add_indexes_and_payout_retry_fields

Adds missing performance indexes used by the nightly eligibility job and the
payout background job, plus retry tracking fields for the payout retry system.

Revision ID: f7a8b9c0d1e2
Revises: c7d8e9f0a1b2
Create Date: 2026-07-03 00:00:01.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f7a8b9c0d1e2"
down_revision: str | None = "c7d8e9f0a1b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nightly eligibility job currently full-scans referralcommission
    op.create_index(
        "idx_commission_refund_expiry",
        "referralcommission",
        ["status", "refund_period_expiration_date"],
    )

    # Payout background job queries APPROVED payouts by status alone
    op.create_index(
        "idx_payout_status",
        "referrerpayoutrequest",
        ["status"],
    )

    # Payout retry system fields
    op.add_column(
        "referrerpayoutrequest",
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "referrerpayoutrequest",
        sa.Column("last_retry_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("referrerpayoutrequest", "last_retry_at")
    op.drop_column("referrerpayoutrequest", "retry_count")
    op.drop_index("idx_payout_status", table_name="referrerpayoutrequest")
    op.drop_index("idx_commission_refund_expiry", table_name="referralcommission")
