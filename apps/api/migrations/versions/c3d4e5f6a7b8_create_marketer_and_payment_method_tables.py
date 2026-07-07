"""create_marketer_and_payment_method_tables

Creates the marketer table (marketer tier on top of the referral system) and
the marketerpaymentmethod table (saved encrypted payout destinations).

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-03 00:00:03.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    sa.Enum(
        "PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "REJECTED", name="marketerstatus"
    ).create(op.get_bind())
    sa.Enum("BANK_TRANSFER", "MOBILE_MONEY", name="paymentmethodtype").create(
        op.get_bind()
    )

    op.create_table(
        "marketer",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("org_id", sa.BigInteger(), nullable=False),
        sa.Column("referral_code_id", sa.BigInteger(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "PENDING_APPROVAL",
                "ACTIVE",
                "SUSPENDED",
                "REJECTED",
                name="marketerstatus",
                create_type=False,
            ),
            nullable=False,
            server_default="PENDING_APPROVAL",
        ),
        sa.Column(
            "commission_rate_usd",
            sa.Float(),
            nullable=False,
            server_default="7.70",
        ),
        sa.Column(
            "phone_number", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True
        ),
        sa.Column("approved_by_user_id", sa.BigInteger(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column(
            "needs_review", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "total_students_referred",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "total_courses_sold", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "total_earned_usd", sa.Float(), nullable=False, server_default="0.0"
        ),
        sa.Column("total_paid_usd", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("creation_date", sa.DateTime(), nullable=False),
        sa.Column("update_date", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organization.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["referral_code_id"], ["referralcode.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["approved_by_user_id"], ["user.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "org_id", name="uq_marketer_user_org"),
        sa.UniqueConstraint("org_id", "phone_number", name="uq_marketer_phone_org"),
    )
    op.create_index("idx_marketer_status", "marketer", ["org_id", "status"])
    op.create_index("idx_marketer_referral_code", "marketer", ["referral_code_id"])

    op.create_table(
        "marketerpaymentmethod",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("marketer_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("org_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "payment_method_type",
            postgresql.ENUM(
                "BANK_TRANSFER",
                "MOBILE_MONEY",
                name="paymentmethodtype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("currency", sqlmodel.sql.sqltypes.AutoString(length=3), nullable=False),
        sa.Column(
            "country_code", sqlmodel.sql.sqltypes.AutoString(length=2), nullable=False
        ),
        sa.Column("account_details", sa.Text(), nullable=False),
        sa.Column(
            "paystack_recipient_code",
            sqlmodel.sql.sqltypes.AutoString(length=255),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("creation_date", sa.DateTime(), nullable=False),
        sa.Column("update_date", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["marketer_id"], ["marketer.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organization.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_payment_method_marketer_active",
        "marketerpaymentmethod",
        ["marketer_id", "is_active"],
    )
    op.create_index("idx_payment_method_user", "marketerpaymentmethod", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_payment_method_user", table_name="marketerpaymentmethod")
    op.drop_index(
        "idx_payment_method_marketer_active", table_name="marketerpaymentmethod"
    )
    op.drop_table("marketerpaymentmethod")
    op.drop_index("idx_marketer_referral_code", table_name="marketer")
    op.drop_index("idx_marketer_status", table_name="marketer")
    op.drop_table("marketer")
    sa.Enum(name="paymentmethodtype").drop(op.get_bind())
    sa.Enum(name="marketerstatus").drop(op.get_bind())
