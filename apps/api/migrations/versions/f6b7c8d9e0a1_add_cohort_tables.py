"""add cohort tables

Revision ID: f6b7c8d9e0a1
Revises: c7d8e9f0a1b2
Create Date: 2026-07-08 22:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f6b7c8d9e0a1'
down_revision = 'c7d8e9f0a1b2'
branch_labels = None
depends_on = None


def upgrade():
    # Create cohortstatusenum
    cohort_status_enum = postgresql.ENUM('UPCOMING', 'ACTIVE', 'COMPLETED', name='cohortstatusenum', create_type=False)
    cohort_status_enum.create(op.get_bind(), checkfirst=True)

    # Create cohort table
    op.create_table('cohort',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cohort_uuid', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('cohort_number', sa.Integer(), nullable=False),
        sa.Column('start_date', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('end_date', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('status', cohort_status_enum, nullable=False),
        sa.Column('creation_date', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('update_date', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organization.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cohort_cohort_uuid'), 'cohort', ['cohort_uuid'], unique=False)

    # Create cohortenrollment table
    op.create_table('cohortenrollment',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cohort_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('payment_user_id', sa.Integer(), nullable=True),
        sa.Column('enrollment_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('enrolled_date', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('is_locked', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['cohort_id'], ['cohort.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['course.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['payment_user_id'], ['paymentsuser.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('cohortenrollment')
    op.drop_index(op.f('ix_cohort_cohort_uuid'), table_name='cohort')
    op.drop_table('cohort')
    cohort_status_enum = postgresql.ENUM('UPCOMING', 'ACTIVE', 'COMPLETED', name='cohortstatusenum', create_type=False)
    cohort_status_enum.drop(op.get_bind(), checkfirst=True)
