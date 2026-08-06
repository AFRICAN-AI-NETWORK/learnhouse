"""Add product_id to discount codes and usage

Revision ID: 62a6b8a08322
Revises: 8f6cadfa1061
Create Date: 2026-02-24 21:50:40.044521

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "62a6b8a08322"
down_revision: str | None = "8f6cadfa1061"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add product_id column to discountcode
    op.add_column(
        "discountcode", sa.Column("product_id", sa.BigInteger(), nullable=True)
    )
    op.create_foreign_key(
        op.f("fk_discountcode_product_id_paymentsproduct"),
        "discountcode",
        "paymentsproduct",
        ["product_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Add product_id column to discountcodeusage
    op.add_column(
        "discountcodeusage", sa.Column("product_id", sa.BigInteger(), nullable=True)
    )
    op.create_foreign_key(
        op.f("fk_discountcodeusage_product_id_paymentsproduct"),
        "discountcodeusage",
        "paymentsproduct",
        ["product_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_discountcodeusage_product_id_paymentsproduct"),
        "discountcodeusage",
        type_="foreignkey",
    )
    op.drop_column("discountcodeusage", "product_id")
    op.drop_constraint(
        op.f("fk_discountcode_product_id_paymentsproduct"),
        "discountcode",
        type_="foreignkey",
    )
    op.drop_column("discountcode", "product_id")
