from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey
from sqlmodel import JSON, Column, Field, Integer, SQLModel


class ChatAuditLog(SQLModel, table=True):
    __tablename__ = "chat_audit_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    log_uuid: str = Field(unique=True, index=True)
    org_id: int = Field(foreign_key="organization.id", ondelete="CASCADE")
    user_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")),
    )
    action: str  # 'message_sent', 'message_edited', 'message_deleted', etc.
    resource_type: str  # 'message', 'conversation', 'attachment'
    resource_id: Optional[str] = None  # UUID of the resource
    action_metadata: dict = Field(default={}, sa_column=Column(JSON))
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
