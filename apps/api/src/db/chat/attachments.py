from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import CheckConstraint
from pydantic import BaseModel


class MessageAttachmentBase(SQLModel):
    message_id: int = Field(foreign_key="message.id", ondelete="CASCADE")
    file_name: str
    file_type: str
    file_size: int
    file_url: str
    thumbnail_url: Optional[str] = None


class MessageAttachment(MessageAttachmentBase, table=True):
    __tablename__ = "message_attachment"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    attachment_uuid: str = Field(unique=True, index=True)
    upload_status: str = "completed"
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint('file_size <= 104857600', name='file_size_limit'),  # 100MB
    )


class MessageAttachmentCreate(BaseModel):
    file_name: str
    file_type: str
    file_size: int


class MessageAttachmentRead(MessageAttachmentBase):
    id: int
    attachment_uuid: str
    upload_status: str
    uploaded_at: datetime
