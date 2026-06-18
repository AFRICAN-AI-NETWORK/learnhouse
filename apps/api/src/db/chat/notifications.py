from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Column, JSON


class ChatNotification(SQLModel, table=True):
    __tablename__ = "chat_notification"

    id: Optional[int] = Field(default=None, primary_key=True)
    notification_uuid: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    message_id: int = Field(foreign_key="message.id", ondelete="CASCADE")
    conversation_id: int = Field(foreign_key="conversation.id", ondelete="CASCADE")
    notification_type: str  # 'new_message', 'message_edited', etc.
    is_read: bool = False
    read_at: Optional[datetime] = None
    delivery_status: dict = Field(
        default={"email": "pending", "push": "pending", "in_app": "delivered"},
        sa_column=Column(JSON),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
