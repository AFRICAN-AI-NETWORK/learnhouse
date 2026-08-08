"""merge marketer and announcements heads

Revision ID: e9f8a7b6c5d4
Revises: 3d709ae438f2, d4e5f6a7b8c9
Create Date: 2026-08-07 14:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401
from alembic import op  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = "e9f8a7b6c5d4"
down_revision: str | Sequence[str] | None = ("3d709ae438f2", "d4e5f6a7b8c9")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
