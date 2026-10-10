"""grant academic calendar rights to staff roles

Revision ID: b8d1f3a5c7e9
Revises: cc19b07d83fa
Create Date: 2026-10-05 10:30:00.000000

Adds the "academic_calendar" resource to the rights payload of the roles that
manage the academic calendar. Every other role is unaffected:
Rights.academic_calendar defaults to read-only at the application layer for
rows that do not have this key.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b8d1f3a5c7e9"
down_revision: str | None = "cc19b07d83fa"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ROLE_UUIDS = (
    "role_global_admin",
    "role_global_maintainer",
    "role_global_instructor",
    "role_global_lead_instructor",
    "role_global_student_mentor",
)

_GRANT = (
    '{"academic_calendar": {"action_create": true, "action_read": true, '
    '"action_update": true, "action_delete": true}}'
)


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE role
            SET rights = (rights::jsonb || CAST(:grant AS jsonb))::json,
                update_date = CAST(NOW() AS TEXT)
            WHERE role_uuid IN :role_uuids
            """
        ).bindparams(sa.bindparam("role_uuids", expanding=True)),
        {"grant": _GRANT, "role_uuids": list(_ROLE_UUIDS)},
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE role
            SET rights = (rights::jsonb - 'academic_calendar')::json,
                update_date = CAST(NOW() AS TEXT)
            WHERE role_uuid IN :role_uuids
            """
        ).bindparams(sa.bindparam("role_uuids", expanding=True)),
        {"role_uuids": list(_ROLE_UUIDS)},
    )
