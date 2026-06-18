"""add_assignment_revision_state

Revision ID: f5a6b7c8d9e0
Revises: 0f1e2d3c4b5a
Create Date: 2026-05-30 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401
from alembic_postgresql_enum import TableReference  # type: ignore


# revision identifiers, used by Alembic.
revision: str = "f5a6b7c8d9e0"
down_revision: Union[str, Sequence[str], None] = "0f1e2d3c4b5a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    try:
        op.sync_enum_values(
            "public",
            "assignmentusersubmissionstatus",
            [
                "PENDING",
                "SUBMITTED",
                "GRADED",
                "NEEDS_REVISION",
                "LATE",
                "NOT_SUBMITTED",
            ],
            [
                TableReference(
                    table_schema="public",
                    table_name="assignmentusersubmission",
                    column_name="submission_status",
                ),
            ],
            enum_values_to_rename=[],
        )
    except Exception:
        pass

    if not any(
        c["name"] == "submission_feedback"
        for c in inspector.get_columns("assignmentusersubmission")
    ):
        op.add_column(
            "assignmentusersubmission",
            sa.Column(
                "submission_feedback",
                sqlmodel.sql.sqltypes.AutoString(),
                nullable=True,
            ),
        )


def downgrade() -> None:
    op.drop_column("assignmentusersubmission", "submission_feedback")

    op.sync_enum_values(
        "public",
        "assignmentusersubmissionstatus",
        ["PENDING", "SUBMITTED", "GRADED", "LATE", "NOT_SUBMITTED"],
        [
            TableReference(
                table_schema="public",
                table_name="assignmentusersubmission",
                column_name="submission_status",
            ),
        ],
        enum_values_to_rename=[],
    )
