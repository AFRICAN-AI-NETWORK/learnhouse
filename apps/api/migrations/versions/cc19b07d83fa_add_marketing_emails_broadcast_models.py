"""Add Marketing Emails Broadcast models

Revision ID: cc19b07d83fa
Revises: 777ba59f2a02
Create Date: 2026-08-29 12:57:44.812452

"""
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op
from alembic_postgresql_enum import TableReference
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'cc19b07d83fa'
down_revision: str | None = '777ba59f2a02'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    if not conn.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'unsubscribescope'")).scalar():
        sa.Enum('MARKETING', 'ALL_OPTIONAL', name='unsubscribescope').create(conn)
    if not conn.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'campaignrecipientstatus'")).scalar():
        sa.Enum('PENDING', 'SENDING', 'SENT', 'FAILED_RETRYABLE', 'FAILED_PERMANENT', 'SKIPPED', 'UNSUBSCRIBED', name='campaignrecipientstatus').create(conn)
    if not conn.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'campaigntype'")).scalar():
        sa.Enum('GENERAL', 'COURSE_MARKETING', name='campaigntype').create(conn)
    from sqlalchemy.engine.reflection import Inspector
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    
    if 'emailunsubscribe' not in tables:
        op.create_table('emailunsubscribe',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('scope', postgresql.ENUM('MARKETING', 'ALL_OPTIONAL', name='unsubscribescope', create_type=False), nullable=False),
        sa.Column('token_hash', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('unsubscribed_at', sa.DateTime(), nullable=True),
        sa.Column('creation_date', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'email', 'scope', name='uix_org_id_email_scope')
        )
        op.create_index(op.f('ix_emailunsubscribe_email'), 'emailunsubscribe', ['email'], unique=False)
        op.create_index(op.f('ix_emailunsubscribe_token_hash'), 'emailunsubscribe', ['token_hash'], unique=False)
        
    if 'campaignrecipient' not in tables:
        op.create_table('campaignrecipient',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=True),
        sa.Column('org_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('status', postgresql.ENUM('PENDING', 'SENDING', 'SENT', 'FAILED_RETRYABLE', 'FAILED_PERMANENT', 'SKIPPED', 'UNSUBSCRIBED', name='campaignrecipientstatus', create_type=False), nullable=False),
        sa.Column('attempt_count', sa.Integer(), nullable=False),
        sa.Column('last_attempt_at', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('last_error', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('provider_message_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('creation_date', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('update_date', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaign.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_campaign_recipient_campaign_id_status', 'campaignrecipient', ['campaign_id', 'status'], unique=False)
        op.create_index('ix_campaign_recipient_org_id_email', 'campaignrecipient', ['org_id', 'email'], unique=False)
        op.create_index('ix_campaign_recipient_status_last_attempt_at', 'campaignrecipient', ['status', 'last_attempt_at'], unique=False)
    if 'auditlog' in tables:
        op.drop_table('auditlog')
    campaign_columns = [c['name'] for c in inspector.get_columns('campaign')]
    if 'campaign_type' not in campaign_columns:
        op.add_column('campaign', sa.Column('campaign_type', postgresql.ENUM('GENERAL', 'COURSE_MARKETING', name='campaigntype', create_type=False), nullable=False, server_default='GENERAL'))
    if 'preheader' not in campaign_columns:
        op.add_column('campaign', sa.Column('preheader', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    if 'sender_name' not in campaign_columns:
        op.add_column('campaign', sa.Column('sender_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    if 'reply_to_email' not in campaign_columns:
        op.add_column('campaign', sa.Column('reply_to_email', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    if 'content_json' not in campaign_columns:
        op.add_column('campaign', sa.Column('content_json', sa.JSON(), nullable=True))
    if 'scheduled_at' not in campaign_columns:
        op.add_column('campaign', sa.Column('scheduled_at', sa.DateTime(), nullable=True))
    if 'started_at' not in campaign_columns:
        op.add_column('campaign', sa.Column('started_at', sa.DateTime(), nullable=True))
    if 'completed_at' not in campaign_columns:
        op.add_column('campaign', sa.Column('completed_at', sa.DateTime(), nullable=True))
    if 'failed_count' not in campaign_columns:
        op.add_column('campaign', sa.Column('failed_count', sa.Integer(), nullable=False, server_default='0'))
    if 'skipped_count' not in campaign_columns:
        op.add_column('campaign', sa.Column('skipped_count', sa.Integer(), nullable=False, server_default='0'))
    if 'retry_count' not in campaign_columns:
        op.add_column('campaign', sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'))
    if 'campaign_uuid' not in campaign_columns:
        op.add_column('campaign', sa.Column('campaign_uuid', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='legacy-uuid'))
        op.create_index(op.f('ix_campaign_campaign_uuid'), 'campaign', ['campaign_uuid'], unique=False)
    op.alter_column('campaign', 'body',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.sync_enum_values(
        enum_schema='public',
        enum_name='campaigntargettype',
        new_values=['ALL', 'WAITLIST', 'COURSE', 'ROLES', 'CUSTOM_EMAILS'],
        affected_columns=[TableReference(table_schema='public', table_name='campaign', column_name='target_type')],
        enum_values_to_rename=[],
    )
    op.sync_enum_values(
        enum_schema='public',
        enum_name='campaignstatus',
        new_values=['DRAFT', 'QUEUED', 'PENDING', 'PROCESSING', 'SENT', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED'],
        affected_columns=[TableReference(table_schema='public', table_name='campaign', column_name='status')],
        enum_values_to_rename=[],
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.sync_enum_values(
        enum_schema='public',
        enum_name='campaignstatus',
        new_values=['PENDING', 'PROCESSING', 'SENT', 'FAILED'],
        affected_columns=[TableReference(table_schema='public', table_name='campaign', column_name='status')],
        enum_values_to_rename=[],
    )
    op.sync_enum_values(
        enum_schema='public',
        enum_name='campaigntargettype',
        new_values=['ALL', 'WAITLIST', 'COURSE', 'ROLES'],
        affected_columns=[TableReference(table_schema='public', table_name='campaign', column_name='target_type')],
        enum_values_to_rename=[],
    )
    op.drop_index(op.f('ix_campaign_campaign_uuid'), table_name='campaign')
    op.alter_column('campaign', 'body',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.drop_column('campaign', 'campaign_uuid')
    op.drop_column('campaign', 'retry_count')
    op.drop_column('campaign', 'skipped_count')
    op.drop_column('campaign', 'failed_count')
    op.drop_column('campaign', 'completed_at')
    op.drop_column('campaign', 'started_at')
    op.drop_column('campaign', 'scheduled_at')
    op.drop_column('campaign', 'content_json')
    op.drop_column('campaign', 'reply_to_email')
    op.drop_column('campaign', 'sender_name')
    op.drop_column('campaign', 'preheader')
    op.drop_column('campaign', 'campaign_type')
    op.create_table('auditlog',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('org_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('action', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('resource', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('resource_id', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('method', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('path', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('status_code', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('payload', postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('ip_address', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('auditlog_pkey'))
    )
    op.drop_index('ix_campaign_recipient_status_last_attempt_at', table_name='campaignrecipient')
    op.drop_index('ix_campaign_recipient_org_id_email', table_name='campaignrecipient')
    op.drop_index('ix_campaign_recipient_campaign_id_status', table_name='campaignrecipient')
    op.drop_table('campaignrecipient')
    op.drop_index(op.f('ix_emailunsubscribe_token_hash'), table_name='emailunsubscribe')
    op.drop_index(op.f('ix_emailunsubscribe_email'), table_name='emailunsubscribe')
    op.drop_table('emailunsubscribe')
    sa.Enum('GENERAL', 'COURSE_MARKETING', name='campaigntype').drop(op.get_bind())
    sa.Enum('PENDING', 'SENDING', 'SENT', 'FAILED_RETRYABLE', 'FAILED_PERMANENT', 'SKIPPED', 'UNSUBSCRIBED', name='campaignrecipientstatus').drop(op.get_bind())
    sa.Enum('MARKETING', 'ALL_OPTIONAL', name='unsubscribescope').drop(op.get_bind())
    # ### end Alembic commands ###
