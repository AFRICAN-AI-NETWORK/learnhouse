"""add partner role

Revision ID: a0b1c2d3e4f5
Revises: f9a8b7c6d5e4
Create Date: 2026-07-15 00:00:00.000000
"""

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a0b1c2d3e4f5"
down_revision: str | None = "f9a8b7c6d5e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


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
    conn = op.get_bind()
    partner_role_id = conn.execute(
        sa.text("SELECT id FROM role WHERE role_uuid = 'partner_role'")
    ).scalar()

    if partner_role_id is None:
        preferred_id_in_use = conn.execute(
            sa.text("SELECT 1 FROM role WHERE id = 10")
        ).scalar()
        partner_role_id = 10
        if preferred_id_in_use:
            partner_role_id = conn.execute(
                sa.text("SELECT COALESCE(MAX(id), 0) + 1 FROM role")
            ).scalar()

        conn.execute(
            sa.text(
                """
                INSERT INTO role (
                    id, name, description, rights, org_id, role_type, role_uuid,
                    creation_date, update_date
                )
                VALUES (
                    :id, 'Partner',
                    'Referral partner with access to affiliation dashboard',
                    CAST(:rights AS JSON), NULL, 'TYPE_GLOBAL', 'partner_role',
                    CAST(NOW() AS TEXT), CAST(NOW() AS TEXT)
                )
                """
            ),
            {"id": partner_role_id, "rights": json.dumps(PARTNER_RIGHTS)},
        )

    conn.execute(
        sa.text(
            "UPDATE role SET rights = CAST(:rights AS JSON) "
            "WHERE role_uuid = 'partner_role'"
        ),
        {"rights": json.dumps(PARTNER_RIGHTS)},
    )

    conn.execute(
        sa.text(
            """
            UPDATE userorganization
            SET role_id = :partner_role_id, update_date = CAST(NOW() AS TEXT)
            WHERE role_id = 4
              AND user_id IN (
                  SELECT id FROM "user" WHERE bio = 'African AI Partner'
              )
            """
        ),
        {"partner_role_id": partner_role_id},
    )


def downgrade() -> None:
    conn = op.get_bind()
    partner_role_id = conn.execute(
        sa.text("SELECT id FROM role WHERE role_uuid = 'partner_role'")
    ).scalar()
    if partner_role_id is None:
        return

    conn.execute(
        sa.text(
            """
            UPDATE userorganization
            SET role_id = 4, update_date = CAST(NOW() AS TEXT)
            WHERE role_id = :partner_role_id
            """
        ),
        {"partner_role_id": partner_role_id},
    )
    conn.execute(sa.text("DELETE FROM role WHERE role_uuid = 'partner_role'"))
