"""merge gating heads

Revision ID: a3a0afb05469
Revises: a3c77189c18e, f5a6b7c8d9e0
Create Date: 2026-06-02 02:25:07.786113

"""

from collections.abc import Sequence

import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401
from alembic import op  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = "a3a0afb05469"
down_revision: str | None = ("a3c77189c18e", "f5a6b7c8d9e0")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
