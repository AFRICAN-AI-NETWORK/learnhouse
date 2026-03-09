"""Add chat system

Revision ID: e8f9a0b1c2d3
Revises: a1b2c3d4e5f6
Create Date: 2026-03-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    """Check if a table already exists in the database."""
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_name = :table_name)"
        ),
        {"table_name": table_name},
    )
    return result.scalar()


def _index_exists(index_name: str) -> bool:
    """Check if an index already exists in the database."""
    conn = op.get_bind()
    result = conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM pg_indexes "
            "WHERE indexname = :index_name)"
        ),
        {"index_name": index_name},
    )
    return result.scalar()


def _create_index_if_not_exists(index_name, table_name, columns, **kwargs):
    """Create an index only if it doesn't already exist."""
    if not _index_exists(index_name):
        op.create_index(index_name, table_name, columns, **kwargs)


def upgrade() -> None:
    # ### Idempotent chat system migration ###

    # Create conversation table
    if not _table_exists('conversation'):
        op.create_table('conversation',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_uuid', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('participant_one_id', sa.Integer(), nullable=False),
        sa.Column('participant_two_id', sa.Integer(), nullable=False),
        sa.Column('last_message_at', sa.DateTime(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False),
        sa.Column('archived_by_user_id', sa.Integer(), nullable=True),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['archived_by_user_id'], ['user.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['org_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['participant_one_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['participant_two_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'participant_one_id', 'participant_two_id', name='unique_conversation_pair')
        )
    _create_index_if_not_exists('ix_conversation_conversation_uuid', 'conversation', ['conversation_uuid'], unique=True)
    _create_index_if_not_exists('idx_conversation_org_id', 'conversation', ['org_id'], unique=False)
    _create_index_if_not_exists('idx_conversation_participant_one', 'conversation', ['participant_one_id'], unique=False)
    _create_index_if_not_exists('idx_conversation_participant_two', 'conversation', ['participant_two_id'], unique=False)
    _create_index_if_not_exists('idx_conversation_last_message', 'conversation', [sa.text('last_message_at DESC')], unique=False)
    _create_index_if_not_exists('idx_conversation_archived', 'conversation', ['is_archived', 'org_id'], unique=False)

    # Create message table
    if not _table_exists('message'):
        op.create_table('message',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('message_uuid', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('receiver_id', sa.Integer(), nullable=False),
        sa.Column('content', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('message_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('is_edited', sa.Boolean(), nullable=False),
        sa.Column('edited_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_by_user_id', sa.Integer(), nullable=True),
        sa.Column('reply_to_message_id', sa.BigInteger(), nullable=True),
        sa.Column('message_metadata', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('sender_id != receiver_id', name='message_sender_receiver_different'),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversation.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['deleted_by_user_id'], ['user.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['receiver_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reply_to_message_id'], ['message.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['sender_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
    _create_index_if_not_exists('ix_message_message_uuid', 'message', ['message_uuid'], unique=True)
    _create_index_if_not_exists('idx_message_conversation', 'message', ['conversation_id', sa.text('created_at DESC')], unique=False)
    _create_index_if_not_exists('idx_message_sender', 'message', ['sender_id'], unique=False)
    _create_index_if_not_exists('idx_message_receiver', 'message', ['receiver_id'], unique=False)
    _create_index_if_not_exists('idx_message_created_at', 'message', [sa.text('created_at DESC')], unique=False)
    _create_index_if_not_exists('idx_message_type', 'message', ['message_type'], unique=False)
    _create_index_if_not_exists('idx_message_deleted', 'message', ['is_deleted'], unique=False)
    # NOTE: GIN index on message_metadata skipped — JSON type doesn't support GIN.
    # If JSONB queries are needed later, change the column type to JSONB first.

    # Create message_edit_history table
    if not _table_exists('message_edit_history'):
        op.create_table('message_edit_history',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('message_id', sa.BigInteger(), nullable=False),
        sa.Column('previous_content', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('edited_by_user_id', sa.Integer(), nullable=False),
        sa.Column('edited_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['edited_by_user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['message_id'], ['message.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
    _create_index_if_not_exists('idx_message_edit_history_message', 'message_edit_history', ['message_id', sa.text('edited_at DESC')], unique=False)

    # Create message_attachment table
    if not _table_exists('message_attachment'):
        op.create_table('message_attachment',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('attachment_uuid', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('message_id', sa.BigInteger(), nullable=False),
        sa.Column('file_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('file_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('file_url', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('thumbnail_url', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('upload_status', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.CheckConstraint('file_size <= 104857600', name='file_size_limit'),
        sa.ForeignKeyConstraint(['message_id'], ['message.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
    _create_index_if_not_exists('ix_message_attachment_attachment_uuid', 'message_attachment', ['attachment_uuid'], unique=True)
    _create_index_if_not_exists('idx_message_attachment_message', 'message_attachment', ['message_id'], unique=False)
    _create_index_if_not_exists('idx_message_attachment_type', 'message_attachment', ['file_type'], unique=False)

    # Create message_read_receipt table
    if not _table_exists('message_read_receipt'):
        op.create_table('message_read_receipt',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('message_id', sa.BigInteger(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('delivered_at', sa.DateTime(), nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['message_id'], ['message.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('message_id', 'user_id', name='unique_receipt_per_message_user')
        )
    _create_index_if_not_exists('idx_message_read_receipt_message', 'message_read_receipt', ['message_id'], unique=False)
    _create_index_if_not_exists('idx_message_read_receipt_user', 'message_read_receipt', ['user_id'], unique=False)
    _create_index_if_not_exists('idx_message_read_receipt_read_at', 'message_read_receipt', ['read_at'], unique=False, postgresql_where=sa.text('read_at IS NOT NULL'))

    # Create conversation_participant_state table
    if not _table_exists('conversation_participant_state'):
        op.create_table('conversation_participant_state',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_muted', sa.Boolean(), nullable=False),
        sa.Column('last_read_message_id', sa.BigInteger(), nullable=True),
        sa.Column('last_read_at', sa.DateTime(), nullable=True),
        sa.Column('is_typing', sa.Boolean(), nullable=False),
        sa.Column('typing_updated_at', sa.DateTime(), nullable=True),
        sa.Column('notification_enabled', sa.Boolean(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversation.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['last_read_message_id'], ['message.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('conversation_id', 'user_id', name='unique_participant_state')
        )
    _create_index_if_not_exists('idx_participant_state_conversation', 'conversation_participant_state', ['conversation_id'], unique=False)
    _create_index_if_not_exists('idx_participant_state_user', 'conversation_participant_state', ['user_id'], unique=False)
    _create_index_if_not_exists('idx_participant_state_typing', 'conversation_participant_state', ['is_typing', 'typing_updated_at'], unique=False)

    # Create chat_notification table
    if not _table_exists('chat_notification'):
        op.create_table('chat_notification',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('notification_uuid', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.BigInteger(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('notification_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('delivery_status', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversation.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['message_id'], ['message.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )
    _create_index_if_not_exists('ix_chat_notification_notification_uuid', 'chat_notification', ['notification_uuid'], unique=True)
    _create_index_if_not_exists('idx_chat_notification_user', 'chat_notification', ['user_id', 'is_read', sa.text('created_at DESC')], unique=False)
    _create_index_if_not_exists('idx_chat_notification_message', 'chat_notification', ['message_id'], unique=False)
    _create_index_if_not_exists('idx_chat_notification_type', 'chat_notification', ['notification_type'], unique=False)
    _create_index_if_not_exists('idx_chat_notification_unread', 'chat_notification', ['user_id', 'is_read'], unique=False, postgresql_where=sa.text('is_read = false'))

    # Create chat_audit_log table
    if not _table_exists('chat_audit_log'):
        op.create_table('chat_audit_log',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('log_uuid', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('resource_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('resource_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('action_metadata', sa.JSON(), nullable=False),
        sa.Column('ip_address', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('user_agent', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
        )
    _create_index_if_not_exists('ix_chat_audit_log_log_uuid', 'chat_audit_log', ['log_uuid'], unique=True)
    _create_index_if_not_exists('idx_chat_audit_log_org', 'chat_audit_log', ['org_id', sa.text('created_at DESC')], unique=False)
    _create_index_if_not_exists('idx_chat_audit_log_user', 'chat_audit_log', ['user_id', sa.text('created_at DESC')], unique=False)
    _create_index_if_not_exists('idx_chat_audit_log_action', 'chat_audit_log', ['action'], unique=False)
    _create_index_if_not_exists('idx_chat_audit_log_resource', 'chat_audit_log', ['resource_type', 'resource_id'], unique=False)
    _create_index_if_not_exists('idx_chat_audit_log_created_at', 'chat_audit_log', [sa.text('created_at DESC')], unique=False)

    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    
    # Drop tables in reverse order
    op.drop_table('chat_audit_log')
    op.drop_table('chat_notification')
    op.drop_table('conversation_participant_state')
    op.drop_table('message_read_receipt')
    op.drop_table('message_attachment')
    op.drop_table('message_edit_history')
    op.drop_table('message')
    op.drop_table('conversation')
    
    # ### end Alembic commands ###
