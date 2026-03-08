"""add_code_editor_to_assignment_task_type_enum

Revision ID: 376da94767ae
Revises: 62a6b8a08322
Create Date: 2026-02-18 00:40:50.475203

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa # noqa: F401
import sqlmodel # noqa: F401
from alembic_postgresql_enum import TableReference # type: ignore


# revision identifiers, used by Alembic.
revision: str = '376da94767ae'
down_revision: Union[str, None] = '62a6b8a08322'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add CODE_EDITOR to AssignmentTaskTypeEnum
    op.sync_enum_values(
        'public',
        'assignmenttasktypeenum',
        ['FILE_SUBMISSION', 'QUIZ', 'FORM', 'CODE_EDITOR', 'OTHER'],
        [
            TableReference(table_schema='public', table_name='assignmenttask', column_name='assignment_type'),
            TableReference(table_schema='public', table_name='assignmenttasksubmission', column_name='assignment_type'),
        ],
        enum_values_to_rename=[]
    )


def downgrade() -> None:
    # Remove CODE_EDITOR from AssignmentTaskTypeEnum
    op.sync_enum_values(
        'public',
        'assignmenttasktypeenum',
        ['FILE_SUBMISSION', 'QUIZ', 'FORM', 'OTHER'],
        [
            TableReference(table_schema='public', table_name='assignmenttask', column_name='assignment_type'),
            TableReference(table_schema='public', table_name='assignmenttasksubmission', column_name='assignment_type'),
        ],
        enum_values_to_rename=[]
    )
