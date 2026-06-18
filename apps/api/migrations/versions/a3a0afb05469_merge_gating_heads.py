"""merge gating heads

Revision ID: a3a0afb05469
Revises: a3c77189c18e, f5a6b7c8d9e0
Create Date: 2026-06-02 02:25:07.786113

"""

from typing import Sequence, Union

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401


# revision identifiers, used by Alembic.
revision: str = "a3a0afb05469"
down_revision: Union[str, None] = ("a3c77189c18e", "f5a6b7c8d9e0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
