"""grant announcements create to admin, maintainer, instructor

Revision ID: 3d709ae438f2
Revises: 9a1d729f0128
Create Date: 2026-07-22 13:50:00.000000

Adds the new "announcements" resource to the rights payload of the three
global roles that should be able to post announcements: Admin (full CRUD,
matching its other resources) and Maintainer/Instructor (create + read
only — matching the scope of the feature request, not full parity with
Admin's edit/delete rights). Every other role is unaffected: Rights.announcements
defaults to create=False at the application layer for rows that don't have
this key at all, so leaving them untouched is safe.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3d709ae438f2"
down_revision: Union[str, None] = "9a1d729f0128"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE role
            SET rights = (rights::jsonb || '{"announcements": {"action_create": true, "action_read": true, "action_update": true, "action_delete": true}}'::jsonb)::json,
                update_date = CAST(NOW() AS TEXT)
            WHERE role_uuid = 'role_global_admin'
            """
        )
    )
    op.get_bind().execute(
        sa.text(
            """
            UPDATE role
            SET rights = (rights::jsonb || '{"announcements": {"action_create": true, "action_read": true, "action_update": false, "action_delete": false}}'::jsonb)::json,
                update_date = CAST(NOW() AS TEXT)
            WHERE role_uuid IN ('role_global_maintainer', 'role_global_instructor')
            """
        )
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE role
            SET rights = (rights::jsonb - 'announcements')::json,
                update_date = CAST(NOW() AS TEXT)
            WHERE role_uuid IN (
                'role_global_admin', 'role_global_maintainer', 'role_global_instructor'
            )
            """
        )
    )
