"""Add TYPE_SMART_ARTICLE enum values

Revision ID: a1b2c3d4e5f6
Revises: 376da94767ae
Create Date: 2026-03-02 13:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa  # noqa: F401
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "376da94767ae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add TYPE_SMART_ARTICLE to activitytypeenum and SUBTYPE_SMART_ARTICLE_PDF to activitysubtypeenum."""
    # Use raw SQL to add enum values idempotently
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'TYPE_SMART_ARTICLE'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activitytypeenum')
            ) THEN
                ALTER TYPE activitytypeenum ADD VALUE 'TYPE_SMART_ARTICLE';
            END IF;
        END
        $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'SUBTYPE_SMART_ARTICLE_PDF'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activitysubtypeenum')
            ) THEN
                ALTER TYPE activitysubtypeenum ADD VALUE 'SUBTYPE_SMART_ARTICLE_PDF';
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    """PostgreSQL does not support removing enum values easily.
    The values will remain but won't cause issues if unused."""
    pass
