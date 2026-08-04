"""add_fraud_score_and_approved_payout_status

Revision ID: 8f6cadfa1061
Revises: d7d2e818da81
Create Date: 2026-02-24 01:31:36.785541

"""

from typing import Sequence, Union

import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401
from alembic import op
from alembic_postgresql_enum import TableReference

# revision identifiers, used by Alembic.
revision: str = "8f6cadfa1061"
down_revision: Union[str, None] = "d7d2e818da81"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add fraud_score column to referraltracking (default 0 for existing rows)
    op.add_column(
        "referraltracking",
        sa.Column("fraud_score", sa.Integer(), nullable=False, server_default="0"),
    )

    # 2. Add APPROVED to payoutstatus enum
    op.sync_enum_values(
        enum_schema="public",
        enum_name="payoutstatus",
        new_values=["REQUESTED", "APPROVED", "PROCESSING", "COMPLETED", "FAILED"],
        affected_columns=[
            TableReference(
                table_schema="public",
                table_name="referrerpayoutrequest",
                column_name="status",
            )
        ],
        enum_values_to_rename=[],
    )


def downgrade() -> None:
    # 1. Remove APPROVED from payoutstatus enum
    op.sync_enum_values(
        enum_schema="public",
        enum_name="payoutstatus",
        new_values=["REQUESTED", "PROCESSING", "COMPLETED", "FAILED"],
        affected_columns=[
            TableReference(
                table_schema="public",
                table_name="referrerpayoutrequest",
                column_name="status",
            )
        ],
        enum_values_to_rename=[],
    )

    # 2. Drop fraud_score column
    op.drop_column("referraltracking", "fraud_score")
