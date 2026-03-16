"""Add TYPE_LIVE_SESSION and live session subtype enum values

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-03-16 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add TYPE_LIVE_SESSION to activitytypeenum and SUBTYPE_LIVE_JITSI/SUBTYPE_LIVE_HOSTED to activitysubtypeenum."""
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'TYPE_LIVE_SESSION'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activitytypeenum')
            ) THEN
                ALTER TYPE activitytypeenum ADD VALUE 'TYPE_LIVE_SESSION';
            END IF;
        END
        $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'SUBTYPE_LIVE_JITSI'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activitysubtypeenum')
            ) THEN
                ALTER TYPE activitysubtypeenum ADD VALUE 'SUBTYPE_LIVE_JITSI';
            END IF;
        END
        $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'SUBTYPE_LIVE_HOSTED'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activitysubtypeenum')
            ) THEN
                ALTER TYPE activitysubtypeenum ADD VALUE 'SUBTYPE_LIVE_HOSTED';
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    """PostgreSQL does not support removing enum values easily.
    The values will remain but won't cause issues if unused."""
    pass
