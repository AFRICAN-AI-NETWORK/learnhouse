"""copy user rights to partner role

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-07-15 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE role AS partner
            SET rights = (
                user_role.rights::jsonb
                || '{"affiliation": {"action_read": true}}'::jsonb
            )::json,
                update_date = CAST(NOW() AS TEXT)
            FROM role AS user_role
            WHERE partner.role_uuid = 'partner_role'
              AND user_role.role_uuid = 'role_global_user'
            """
        )
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE role
            SET rights = (rights::jsonb - 'affiliation')::json,
                update_date = CAST(NOW() AS TEXT)
            WHERE role_uuid = 'partner_role'
            """
        )
    )
