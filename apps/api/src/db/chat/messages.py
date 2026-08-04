from datetime import datetime
from typing import List, Optional, Union

from pydantic import BaseModel
from sqlalchemy import CheckConstraint, ForeignKey, UniqueConstraint
from sqlmodel import JSON, Column, Field, Integer, SQLModel


class MessageBase(SQLModel):
    conversation_id: int = Field(foreign_key="conversation.id", ondelete="CASCADE")
    sender_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    receiver_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    content: str
    message_type: str = "text"  # text, file, image, video, document


class Message(MessageBase, table=True):
    __tablename__ = "message"

    id: Optional[int] = Field(default=None, primary_key=True)
    message_uuid: str = Field(unique=True, index=True)
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by_user_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")),
    )
    reply_to_message_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("message.id", ondelete="SET NULL")),
    )
    message_metadata: dict = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "sender_id != receiver_id", name="message_sender_receiver_different"
        ),
    )


class MessageCreate(BaseModel):
    conversation_id: Union[
        str, int
    ]  # Accepts conversation UUID (e.g., conv_xxx) or integer
    receiver_id: int
    content: str
    message_type: str = "text"
    reply_to_message_id: Optional[int] = None


class MessageUpdate(BaseModel):
    content: str


class MessageRead(MessageBase):
    conversation_id: str  # Override to return UUID instead of int
    id: int
    message_uuid: str
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    attachments: List[dict] = []
    read_receipt: Optional[dict] = None
    reply_to_message_id: Optional[int] = None
    replied_message: Optional[dict] = None


class MessageEditHistory(SQLModel, table=True):
    __tablename__ = "message_edit_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(foreign_key="message.id", ondelete="CASCADE")
    previous_content: str
    edited_by_user_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    edited_at: datetime = Field(default_factory=datetime.utcnow)


class MessageReadReceipt(SQLModel, table=True):
    __tablename__ = "message_read_receipt"

    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(foreign_key="message.id", ondelete="CASCADE")
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE")
    delivered_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: Optional[datetime] = None

    __table_args__ = (
        UniqueConstraint(
            "message_id", "user_id", name="unique_receipt_per_message_user"
        ),
    )
