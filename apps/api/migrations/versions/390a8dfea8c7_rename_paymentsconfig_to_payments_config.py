"""rename paymentsconfig to payments_config

Revision ID: 390a8dfea8c7
Revises: 9e031a0358d1
Create Date: 2026-01-31 02:43:47.252703

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa # noqa: F401
import sqlmodel # noqa: F401
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '390a8dfea8c7'
down_revision: Union[str, None] = '9e031a0358d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if paymentsconfig table exists
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()
    
    if 'paymentsconfig' in tables:
        # Table exists, check if target already exists before renaming
        if 'payments_config' not in tables:
            op.rename_table('paymentsconfig', 'payments_config')
        
        # Add 'paystack' to the enum if it doesn't exist
        # Check if enum exists and if 'paystack' value is already in it
        enum_exists = False
        paystack_exists = False
        try:
            result = conn.execute(sa.text(
                "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentproviderenum')"
            ))
            enum_exists = result.scalar()
            if enum_exists:
                # Check if 'paystack' value exists in the enum
                result = conn.execute(sa.text(
                    "SELECT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'paystack' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'paymentproviderenum'))"
                ))
                paystack_exists = result.scalar()
        except Exception:
            pass
        
        if enum_exists and not paystack_exists:
            # Add 'paystack' to the existing enum
            conn.execute(sa.text("ALTER TYPE paymentproviderenum ADD VALUE IF NOT EXISTS 'paystack'"))
            conn.commit()
        
        # Update foreign key constraint in paymentsproduct table if it exists
        if 'paymentsproduct' in tables:
            # Find the foreign key constraint name dynamically
            fk_constraints = inspector.get_foreign_keys('paymentsproduct')
            for fk in fk_constraints:
                if 'payments_config_id' in fk['constrained_columns']:
                    # Drop the old foreign key constraint
                    op.drop_constraint(
                        fk['name'],
                        'paymentsproduct',
                        type_='foreignkey'
                    )
                    # Recreate it with the new table name
                    op.create_foreign_key(
                        fk['name'],
                        'paymentsproduct',
                        'payments_config',
                        ['payments_config_id'],
                        ['id'],
                        ondelete='CASCADE'
                    )
                    break
    elif 'payments_config' not in tables:
        # Table doesn't exist at all, create it with the correct name
        # This handles the case where the original migration hasn't been run
        # Check if enum type exists, create if not
        enum_exists = False
        try:
            result = conn.execute(sa.text(
                "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentproviderenum')"
            ))
            enum_exists = result.scalar()
        except Exception:
            pass
        
        if not enum_exists:
            # Create the enum type with paystack value
            payment_provider_enum = postgresql.ENUM('paystack', name='paymentproviderenum')
            payment_provider_enum.create(op.get_bind())
        
        op.create_table('payments_config',
            sa.Column('enabled', sa.Boolean(), nullable=False),
            sa.Column('active', sa.Boolean(), nullable=False),
            sa.Column('provider', postgresql.ENUM('paystack', name='paymentproviderenum', create_type=False), nullable=False),
            sa.Column('provider_specific_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
            sa.Column('provider_config', sa.JSON(), nullable=True),
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('org_id', sa.BigInteger(), nullable=True),
            sa.Column('creation_date', sa.DateTime(), nullable=False),
            sa.Column('update_date', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['org_id'], ['organization.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade() -> None:
    # Check if payments_config table exists
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()
    
    if 'payments_config' in tables:
        # Rename back to paymentsconfig
        op.rename_table('payments_config', 'paymentsconfig')
        
        # Update foreign key constraint back
        if 'paymentsproduct' in tables:
            inspector = inspect(conn)
            fk_constraints = inspector.get_foreign_keys('paymentsproduct')
            for fk in fk_constraints:
                if 'payments_config_id' in fk['constrained_columns']:
                    op.drop_constraint(
                        fk['name'],
                        'paymentsproduct',
                        type_='foreignkey'
                    )
                    op.create_foreign_key(
                        fk['name'],
                        'paymentsproduct',
                        'paymentsconfig',
                        ['payments_config_id'],
                        ['id'],
                        ondelete='CASCADE'
                    )
                    break
