"""create_marketer_kyc_table

Creates the marketerkyc table. Government ID numbers are stored only as
SHA-256 hashes with a DB-level unique constraint (anti-duplication guarantee).
Document files are stored as S3 keys, signed on demand for admin review.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-03 00:00:04.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: str | None = "c3d4e5f6a7b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kycstatus') "
            "THEN CREATE TYPE kycstatus AS ENUM ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED'); END IF; END $$;"
        )
    )
    op.get_bind().execute(
        sa.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kycdocumenttype') "
            "THEN CREATE TYPE kycdocumenttype AS ENUM ('NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE'); END IF; END $$;"
        )
    )

    op.create_table(
        "marketerkyc",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("marketer_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("org_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "document_type",
            postgresql.ENUM(
                "NATIONAL_ID",
                "PASSPORT",
                "DRIVERS_LICENSE",
                name="kycdocumenttype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "id_number_hash",
            sqlmodel.sql.sqltypes.AutoString(length=64),
            nullable=False,
        ),
        sa.Column(
            "document_front_url",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=False,
        ),
        sa.Column(
            "document_back_url",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=True,
        ),
        sa.Column(
            "selfie_url", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "UNVERIFIED",
                "PENDING_REVIEW",
                "VERIFIED",
                "REJECTED",
                name="kycstatus",
                create_type=False,
            ),
            nullable=False,
            server_default="UNVERIFIED",
        ),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.BigInteger(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("submission_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("creation_date", sa.DateTime(), nullable=False),
        sa.Column("update_date", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["marketer_id"], ["marketer.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organization.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["reviewed_by_user_id"], ["user.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id_number_hash", name="uq_kyc_id_number_hash"),
    )
    op.create_index("idx_kyc_marketer", "marketerkyc", ["marketer_id"])
    op.create_index("idx_kyc_status_org", "marketerkyc", ["org_id", "status"])


def downgrade() -> None:
    op.drop_index("idx_kyc_status_org", table_name="marketerkyc")
    op.drop_index("idx_kyc_marketer", table_name="marketerkyc")
    op.drop_table("marketerkyc")
    sa.Enum(name="kycdocumenttype").drop(op.get_bind())
    sa.Enum(name="kycstatus").drop(op.get_bind())
