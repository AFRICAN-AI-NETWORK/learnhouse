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
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    rc_indexes = [idx["name"] for idx in inspector.get_indexes("referralcommission")]
    if "idx_commission_refund_expiry" not in rc_indexes:
        op.create_index(
            "idx_commission_refund_expiry",
            "referralcommission",
            ["status", "refund_period_expiration_date"],
        )

    rpr_indexes = [
        idx["name"] for idx in inspector.get_indexes("referrerpayoutrequest")
    ]
    if "idx_payout_status" not in rpr_indexes:
        op.create_index(
            "idx_payout_status",
            "referrerpayoutrequest",
            ["status"],
        )

    # Payout retry system fields & Flutterwave transfer tracking fields
    op.get_bind().execute(
        sa.text(
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrerpayoutrequest' AND column_name='retry_count') THEN "
            "ALTER TABLE referrerpayoutrequest ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0; END IF; "
            "IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrerpayoutrequest' AND column_name='last_retry_at') THEN "
            "ALTER TABLE referrerpayoutrequest ADD COLUMN last_retry_at TIMESTAMP WITHOUT TIME ZONE NULL; END IF; "
            "IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrerpayoutrequest' AND column_name='flutterwave_beneficiary_id') THEN "
            "ALTER TABLE referrerpayoutrequest ADD COLUMN flutterwave_beneficiary_id VARCHAR(255) NULL; END IF; "
            "IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrerpayoutrequest' AND column_name='flutterwave_transfer_id') THEN "
            "ALTER TABLE referrerpayoutrequest ADD COLUMN flutterwave_transfer_id VARCHAR(255) NULL; END IF; "
            "END $$;"
        )
    )


def downgrade() -> None:
    op.drop_column("referrerpayoutrequest", "last_retry_at")
    op.drop_column("referrerpayoutrequest", "retry_count")
    op.drop_index("idx_payout_status", table_name="referrerpayoutrequest")
    op.drop_index("idx_commission_refund_expiry", table_name="referralcommission")
