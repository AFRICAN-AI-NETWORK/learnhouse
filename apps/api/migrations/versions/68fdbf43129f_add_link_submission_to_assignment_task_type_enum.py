"""add_link_submission_to_assignment_task_type_enum

Revision ID: 68fdbf43129f
Revises: 5c4fe3ba3606
Create Date: 2026-07-22 09:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401
from alembic_postgresql_enum import TableReference  # type: ignore


# revision identifiers, used by Alembic.
revision: str = "68fdbf43129f"
down_revision: Union[str, None] = "5c4fe3ba3606"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add LINK_SUBMISSION to AssignmentTaskTypeEnum
    op.sync_enum_values(
        "public",
        "assignmenttasktypeenum",
        ["FILE_SUBMISSION", "QUIZ", "FORM", "CODE_EDITOR", "LINK_SUBMISSION", "OTHER"],
        [
            TableReference(
                table_schema="public",
                table_name="assignmenttask",
                column_name="assignment_type",
            ),
            TableReference(
                table_schema="public",
                table_name="assignmenttasksubmission",
                column_name="assignment_type",
            ),
        ],
        enum_values_to_rename=[],
    )


def downgrade() -> None:
    # Remove LINK_SUBMISSION from AssignmentTaskTypeEnum
    op.sync_enum_values(
        "public",
        "assignmenttasktypeenum",
        ["FILE_SUBMISSION", "QUIZ", "FORM", "CODE_EDITOR", "OTHER"],
        [
            TableReference(
                table_schema="public",
                table_name="assignmenttask",
                column_name="assignment_type",
            ),
            TableReference(
                table_schema="public",
                table_name="assignmenttasksubmission",
                column_name="assignment_type",
            ),
        ],
        enum_values_to_rename=[],
    )
