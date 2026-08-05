"""Merge waitlist and discounts

Revision ID: bb179eae5162
Revises: 280140aa1748, f1a2b3c4d5e6
Create Date: 2026-02-21 16:17:57.566711

"""

from collections.abc import Sequence

import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = "bb179eae5162"
down_revision: str | None = ("280140aa1748", "f1a2b3c4d5e6")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
