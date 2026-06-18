"""allow_float_activity_points

Revision ID: b6c7d8e9f0a1
Revises: a3a0afb05469
Create Date: 2026-06-04 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b6c7d8e9f0a1"
down_revision: Union[str, Sequence[str], None] = "a3a0afb05469"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "activity",
        "points",
        existing_type=sa.Integer(),
        type_=sa.Float(),
        existing_nullable=False,
        existing_server_default="0",
        postgresql_using="points::double precision",
    )
    op.alter_column(
        "trailstep",
        "points_earned",
        existing_type=sa.Integer(),
        type_=sa.Float(),
        existing_nullable=False,
        existing_server_default="0",
        postgresql_using="points_earned::double precision",
    )


def downgrade() -> None:
    op.alter_column(
        "trailstep",
        "points_earned",
        existing_type=sa.Float(),
        type_=sa.Integer(),
        existing_nullable=False,
        existing_server_default="0",
        postgresql_using="round(points_earned)::integer",
    )
    op.alter_column(
        "activity",
        "points",
        existing_type=sa.Float(),
        type_=sa.Integer(),
        existing_nullable=False,
        existing_server_default="0",
        postgresql_using="round(points)::integer",
    )
