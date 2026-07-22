"""merge notification and partner role branches

Revision ID: 9a1d729f0128
Revises: 68fdbf43129f, c2d3e4f5a6b7
Create Date: 2026-07-22 13:42:53.369207

"""

from typing import Sequence, Union

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401


# revision identifiers, used by Alembic.
revision: str = "9a1d729f0128"
down_revision: Union[str, None] = ("68fdbf43129f", "c2d3e4f5a6b7")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
