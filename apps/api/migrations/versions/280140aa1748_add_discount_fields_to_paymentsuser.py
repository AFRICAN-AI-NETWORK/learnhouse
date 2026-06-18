"""add_discount_fields_to_paymentsuser

Revision ID: 280140aa1748
Revises: 2a3b4c5d6e7f
Create Date: 2026-02-06 12:03:23.832719

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401


# revision identifiers, used by Alembic.
revision: str = "280140aa1748"
down_revision: Union[str, None] = "2a3b4c5d6e7f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add discount-related columns to paymentsuser table
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    paymentsuser_cols = [c["name"] for c in inspector.get_columns("paymentsuser")]

    if "discount_code_id" not in paymentsuser_cols:
        op.add_column(
            "paymentsuser",
            sa.Column("discount_code_id", sa.BigInteger(), nullable=True),
        )
    if "original_amount" not in paymentsuser_cols:
        op.add_column(
            "paymentsuser", sa.Column("original_amount", sa.Float(), nullable=True)
        )
    if "discount_amount" not in paymentsuser_cols:
        op.add_column(
            "paymentsuser", sa.Column("discount_amount", sa.Float(), nullable=True)
        )
    if "final_amount" not in paymentsuser_cols:
        op.add_column(
            "paymentsuser", sa.Column("final_amount", sa.Float(), nullable=True)
        )

    # Check foreign keys
    fks = inspector.get_foreign_keys("paymentsuser")
    fk_names = [fk["name"] for fk in fks if fk["name"] is not None]

    if "fk_paymentsuser_discount_code" not in fk_names:
        # Add foreign key constraint to discount_code table
        op.create_foreign_key(
            "fk_paymentsuser_discount_code",
            "paymentsuser",
            "discountcode",
            ["discount_code_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint(
        "fk_paymentsuser_discount_code", "paymentsuser", type_="foreignkey"
    )

    # Remove discount columns
    op.drop_column("paymentsuser", "final_amount")
    op.drop_column("paymentsuser", "discount_amount")
    op.drop_column("paymentsuser", "original_amount")
    op.drop_column("paymentsuser", "discount_code_id")
