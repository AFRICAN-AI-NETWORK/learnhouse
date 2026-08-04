"""Merge phone and live-session migration heads

Revision ID: f4d5e6f7a8b9
Revises: c4d5e6f7a8b9, f3c4d5e6f7a8
Create Date: 2026-03-24 12:20:00.000000

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "f4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = ("c4d5e6f7a8b9", "f3c4d5e6f7a8")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
