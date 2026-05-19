"""Make Community Manager match Instructor rights

Revision ID: b3c4d5e6f7a8
Revises: a9b8c7d6e5f4
Create Date: 2026-03-16 00:00:00.000000

"""

from typing import Sequence, Union
import json
from datetime import datetime

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "a9b8c7d6e5f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: str | Sequence[str] | None = None


_READ_ONLY_RIGHTS = {
    "courses": {
        "action_create": False,
        "action_read": True,
        "action_read_own": True,
        "action_update": False,
        "action_update_own": False,
        "action_delete": False,
        "action_delete_own": False,
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
}


def upgrade() -> None:
    conn = op.get_bind()
    now = str(datetime.utcnow())

    instructor_rights = conn.execute(
        sa.text("SELECT rights FROM role WHERE role_uuid = :uuid"),
        {"uuid": "role_global_instructor"},
    ).scalar()

    if instructor_rights is None:
        return

    serialized_rights = (
        json.dumps(instructor_rights)
        if isinstance(instructor_rights, dict)
        else instructor_rights
    )

    conn.execute(
        sa.text(
            """
            UPDATE role
            SET rights = :rights,
                update_date = :update_date
            WHERE role_uuid = :role_uuid
            """
        ),
        {
            "rights": serialized_rights,
            "update_date": now,
            "role_uuid": "role_global_community_manager",
        },
    )


def downgrade() -> None:
    conn = op.get_bind()
    now = str(datetime.utcnow())

    conn.execute(
        sa.text(
            """
            UPDATE role
            SET rights = :rights,
                update_date = :update_date
            WHERE role_uuid = :role_uuid
            """
        ),
        {
            "rights": json.dumps(_READ_ONLY_RIGHTS),
            "update_date": now,
            "role_uuid": "role_global_community_manager",
        },
    )
