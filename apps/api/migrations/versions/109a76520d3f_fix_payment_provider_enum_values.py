"""fix_payment_provider_enum_values

Revision ID: 109a76520d3f
Revises: 390a8dfea8c7
Create Date: 2026-01-31 02:57:51.417600

"""

from collections.abc import Sequence

import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = "109a76520d3f"
down_revision: str | None = "390a8dfea8c7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
