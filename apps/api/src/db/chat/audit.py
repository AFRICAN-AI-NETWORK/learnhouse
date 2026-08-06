from datetime import datetime

from sqlalchemy import ForeignKey
from sqlmodel import JSON, Column, Field, Integer, SQLModel


class ChatAuditLog(SQLModel, table=True):
    __tablename__ = "chat_audit_log"

    id: int | None = Field(default=None, primary_key=True)
    log_uuid: str = Field(unique=True, index=True)
    org_id: int = Field(foreign_key="organization.id", ondelete="CASCADE")
    user_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")),
    )
    action: str  # 'message_sent', 'message_edited', 'message_deleted', etc.
    resource_type: str  # 'message', 'conversation', 'attachment'
    resource_id: str | None = None  # UUID of the resource
    action_metadata: dict = Field(default={}, sa_column=Column(JSON))
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
