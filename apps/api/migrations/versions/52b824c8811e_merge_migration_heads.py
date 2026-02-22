"""merge_migration_heads

Revision ID: 52b824c8811e
Revises: 280140aa1748, f1a2b3c4d5e6
Create Date: 2026-02-21 15:14:21.863285

"""
from typing import Sequence, Union

import sqlalchemy as sa # noqa: F401
import sqlmodel # noqa: F401


# revision identifiers, used by Alembic.
revision: str = '52b824c8811e'
down_revision: Union[str, None] = ('280140aa1748', 'f1a2b3c4d5e6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
