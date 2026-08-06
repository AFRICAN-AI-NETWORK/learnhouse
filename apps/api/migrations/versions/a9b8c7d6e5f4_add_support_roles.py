"""Add support staff roles (Teaching Assistant, Students Success Coordinator,
Students Mentor, Community Manager, Lead Instructor)

Revision ID: a9b8c7d6e5f4
Revises: f2b3c4d5e6f7
Create Date: 2026-03-15 00:00:00.000000

"""

import json
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a9b8c7d6e5f4"
down_revision: str | None = "f2b3c4d5e6f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# ── Rights JSON payloads ───────────────────────────────────────────────────────

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

_TEACHING_RIGHTS = {
    "courses": {
        "action_create": True,
        "action_read": True,
        "action_read_own": True,
        "action_update": False,
        "action_update_own": True,
        "action_delete": False,
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
        "action_create": True,
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
        "action_create": True,
        "action_read": True,
        "action_update": False,
        "action_delete": False,
    },
    "activities": {
        "action_create": True,
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
        "action_create": True,
        "action_read": True,
        "action_update": True,
        "action_delete": False,
    },
    "dashboard": {"action_access": True},
}

_COORDINATOR_RIGHTS = {
    **_READ_ONLY_RIGHTS,
    "users": {
        "action_create": False,
        "action_read": True,
        "action_update": False,
        "action_delete": False,
    },
    "communications": {
        "action_create": True,
        "action_read": True,
        "action_update": True,
        "action_delete": False,
    },
    "dashboard": {"action_access": True},
}

_NOW = str(datetime.now(UTC))

_NEW_ROLES = [
    {
        "id": 5,
        "name": "Teaching Assistant",
        "description": "Assists instructors with course content and student queries",
        "role_uuid": "role_global_teaching_assistant",
        "role_type": "TYPE_GLOBAL",
        "rights": json.dumps(_TEACHING_RIGHTS),
    },
    {
        "id": 6,
        "name": "Students Success Coordinator",
        "description": "Monitors and supports student progress and success",
        "role_uuid": "role_global_student_success_coordinator",
        "role_type": "TYPE_GLOBAL",
        "rights": json.dumps(_COORDINATOR_RIGHTS),
    },
    {
        "id": 7,
        "name": "Students Mentor",
        "description": "Provides guidance and mentorship to individual students",
        "role_uuid": "role_global_student_mentor",
        "role_type": "TYPE_GLOBAL",
        "rights": json.dumps(_READ_ONLY_RIGHTS),
    },
    {
        "id": 8,
        "name": "Community Manager",
        "description": "Manages community engagement and communication",
        "role_uuid": "role_global_community_manager",
        "role_type": "TYPE_GLOBAL",
        "rights": json.dumps(_READ_ONLY_RIGHTS),
    },
    {
        "id": 9,
        "name": "Lead Instructor",
        "description": "Senior instructor who leads courses and mentors other instructors",
        "role_uuid": "role_global_lead_instructor",
        "role_type": "TYPE_GLOBAL",
        "rights": json.dumps(_TEACHING_RIGHTS),
    },
]


def upgrade() -> None:
    conn = op.get_bind()

    for role in _NEW_ROLES:
        # Idempotent: skip if role_uuid already exists
        exists = conn.execute(
            sa.text("SELECT 1 FROM role WHERE role_uuid = :uuid"),
            {"uuid": role["role_uuid"]},
        ).scalar()

        if not exists:
            conn.execute(
                sa.text(
                    "INSERT INTO role (id, name, description, role_uuid, role_type, rights, "
                    "org_id, creation_date, update_date) "
                    "VALUES (:id, :name, :description, :role_uuid, :role_type, :rights, "
                    "NULL, :creation_date, :update_date)"
                ),
                {
                    "id": role["id"],
                    "name": role["name"],
                    "description": role["description"],
                    "role_uuid": role["role_uuid"],
                    "role_type": role["role_type"],
                    "rights": role["rights"],
                    "creation_date": _NOW,
                    "update_date": _NOW,
                },
            )


def downgrade() -> None:
    conn = op.get_bind()
    for role in _NEW_ROLES:
        conn.execute(
            sa.text("DELETE FROM role WHERE role_uuid = :uuid"),
            {"uuid": role["role_uuid"]},
        )
