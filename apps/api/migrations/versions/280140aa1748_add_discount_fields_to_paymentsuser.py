"""add_discount_fields_to_paymentsuser

Revision ID: 280140aa1748
Revises: 2a3b4c5d6e7f
Create Date: 2026-02-06 12:03:23.832719

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa # noqa: F401
import sqlmodel # noqa: F401


# revision identifiers, used by Alembic.
revision: str = '280140aa1748'
down_revision: Union[str, None] = '2a3b4c5d6e7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add discount-related columns to paymentsuser table
    op.add_column('paymentsuser', sa.Column('discount_code_id', sa.BigInteger(), nullable=True))
    op.add_column('paymentsuser', sa.Column('original_amount', sa.Float(), nullable=True))
    op.add_column('paymentsuser', sa.Column('discount_amount', sa.Float(), nullable=True))
    op.add_column('paymentsuser', sa.Column('final_amount', sa.Float(), nullable=True))
    
    # Add foreign key constraint to discount_code table
    op.create_foreign_key(
        'fk_paymentsuser_discount_code',
        'paymentsuser', 
        'discountcode',
        ['discount_code_id'], 
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint('fk_paymentsuser_discount_code', 'paymentsuser', type_='foreignkey')
    
    # Remove discount columns
    op.drop_column('paymentsuser', 'final_amount')
    op.drop_column('paymentsuser', 'discount_amount')
    op.drop_column('paymentsuser', 'original_amount')
    op.drop_column('paymentsuser', 'discount_code_id')
