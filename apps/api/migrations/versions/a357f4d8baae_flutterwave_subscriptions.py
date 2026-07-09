"""flutterwave_subscriptions

Revision ID: a357f4d8baae
Revises: f6b7c8d9e0a1
Create Date: 2026-07-08 22:55:28.544428

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa # noqa: F401
import sqlmodel # noqa: F401


# revision identifiers, used by Alembic.
revision: str = 'a357f4d8baae'
down_revision: Union[str, None] = 'f6b7c8d9e0a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update PaymentProviderEnum from 'paystack' to 'flutterwave'
    # PostgreSQL requires a workaround to rename enum values or we can just ALTER TYPE.
    # Note: If changing enum values in PostgreSQL is tricky, we can just alter the type.
    op.execute("ALTER TYPE paymentproviderenum RENAME VALUE 'paystack' TO 'flutterwave'")

    # 2. Add interval and trial_days to paymentsproduct
    # Create the interval enum first
    payment_interval_enum = sa.Enum('MONTHLY', 'YEARLY', 'WEEKLY', 'DAILY', name='paymentintervalenum')
    payment_interval_enum.create(op.get_bind())
    
    op.add_column('paymentsproduct', sa.Column('interval', payment_interval_enum, nullable=True))
    op.add_column('paymentsproduct', sa.Column('trial_days', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    # 1. Revert interval and trial_days
    op.drop_column('paymentsproduct', 'trial_days')
    op.drop_column('paymentsproduct', 'interval')
    
    payment_interval_enum = sa.Enum('MONTHLY', 'YEARLY', 'WEEKLY', 'DAILY', name='paymentintervalenum')
    payment_interval_enum.drop(op.get_bind())

    # 2. Revert enum
    op.execute("ALTER TYPE paymentproviderenum RENAME VALUE 'flutterwave' TO 'paystack'")
