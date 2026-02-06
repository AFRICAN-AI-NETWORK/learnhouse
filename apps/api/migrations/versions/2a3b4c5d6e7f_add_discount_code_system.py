"""add_discount_code_system

Revision ID: 2a3b4c5d6e7f
Revises: 109a76520d3f
Create Date: 2026-02-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '2a3b4c5d6e7f'
down_revision: Union[str, None] = '109a76520d3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create discount_code table
    op.create_table(
        'discountcode',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('org_id', sa.BigInteger(), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('discount_type', sa.String(), nullable=False),
        sa.Column('discount_value', sa.Float(), nullable=False),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('current_uses', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('valid_from', sa.DateTime(), nullable=False),
        sa.Column('valid_until', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['org_id'], ['organization.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_discountcode_code'), 'discountcode', ['code'], unique=False)
    
    # Create discount_code_usage table
    op.create_table(
        'discountcodeusage',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('discount_code_id', sa.BigInteger(), nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('course_id', sa.BigInteger(), nullable=False),
        sa.Column('payment_user_id', sa.BigInteger(), nullable=False),
        sa.Column('original_amount', sa.Float(), nullable=False),
        sa.Column('discount_amount', sa.Float(), nullable=False),
        sa.Column('final_amount', sa.Float(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['discount_code_id'], ['discountcode.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['course.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['payment_user_id'], ['paymentsuser.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create unique constraint to prevent duplicate usage per user per course
    op.create_index(
        'ix_discountcodeusage_user_course_unique',
        'discountcodeusage',
        ['user_id', 'course_id', 'discount_code_id'],
        unique=True
    )
    
    # Add discount fields to paymentsuser table (if not already added)
    # These columns already exist based on the model, but we need to add the foreign key
    try:
        with op.batch_alter_table('paymentsuser', schema=None) as batch_op:
            batch_op.create_foreign_key(
                'fk_paymentsuser_discount_code_id',
                'discountcode',
                ['discount_code_id'],
                ['id'],
                ondelete='SET NULL'
            )
    except Exception:
        # Foreign key may already exist or columns may not exist
        # This is safe to ignore
        pass


def downgrade() -> None:
    # Remove foreign key from paymentsuser (columns are kept as they may contain data)
    try:
        with op.batch_alter_table('paymentsuser', schema=None) as batch_op:
            batch_op.drop_constraint('fk_paymentsuser_discount_code_id', type_='foreignkey')
    except Exception:
        pass
    
    # Drop discount_code_usage table
    op.drop_index('ix_discountcodeusage_user_course_unique', table_name='discountcodeusage')
    op.drop_table('discountcodeusage')
    
    # Drop discount_code table
    op.drop_index(op.f('ix_discountcode_code'), table_name='discountcode')
    op.drop_table('discountcode')
