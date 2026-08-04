"""align partner role with user permissions

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
Create Date: 2026-07-15 00:00:00.000000
"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PARTNER_RIGHTS = {
    "courses": {
        "action_create": False,
        "action_read": True,
        "action_read_own": True,
        "action_update": False,
        "action_update_own": False,
        "action_delete": True,
        "action_delete_own": True,
    },
    "users": {
        "action_create": False,
        "action_read": False,
        "action_update": False,
        "action_delete": False,
    },
    "usergroups": {
        "action_create": False,
        "action_read": True,
        "action_update": False,
        "action_delete": False,
    },
    "collections": {
        "action_create": False,
        "action_read": True,
        "action_update": False,
        "action_delete": False,
    },
    "organizations": {
        "action_create": False,
        "action_read": False,
        "action_update": False,
        "action_delete": False,
    },
    "coursechapters": {
        "action_create": False,
        "action_read": True,
        "action_update": False,
        "action_delete": False,
    },
    "activities": {
        "action_create": False,
        "action_read": True,
        "action_update": False,
        "action_delete": False,
    },
    "roles": {
        "action_create": False,
        "action_read": False,
        "action_update": False,
        "action_delete": False,
    },
    "communications": {
        "action_create": False,
        "action_read": True,
        "action_update": False,
        "action_delete": False,
    },
    "dashboard": {"action_access": False},
    "affiliation": {"action_read": True},
}


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE role SET rights = CAST(:rights AS JSON) "
            "WHERE role_uuid = 'partner_role'"
        ),
        {"rights": json.dumps(PARTNER_RIGHTS)},
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE role "
            "SET rights = jsonb_set(rights::jsonb, '{affiliation}', "
            "'{\"action_read\": true}'::jsonb)::json "
            "WHERE role_uuid = 'partner_role'"
        )
    )
