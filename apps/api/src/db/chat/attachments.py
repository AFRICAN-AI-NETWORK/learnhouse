from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


class MessageAttachmentBase(SQLModel):
    message_id: int = Field(
        sa_column=Column(Integer, ForeignKey("message.id", ondelete="CASCADE"))
    )
    # org_id for path namespace + future cascade cleanup
    org_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="SET NULL")),
    )
    file_name: str
    file_type: str
    file_size: int
    # Relative path served by StaticFiles at /content
    # e.g. "content/orgs/{org_uuid}/chat/conversations/{uuid}/attachments/{uuid}/attachment_xxx.pdf"
    file_url: str
    thumbnail_url: Optional[str] = None


class MessageAttachment(MessageAttachmentBase, table=True):
    __tablename__ = "message_attachment"

    id: Optional[int] = Field(default=None, primary_key=True)
    attachment_uuid: str = Field(unique=True, index=True)
    upload_status: str = "completed"
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("file_size <= 104857600", name="file_size_limit"),  # 100 MB
    )


class MessageAttachmentCreate(BaseModel):
    file_name: str
    file_type: str
    file_size: int


class MessageAttachmentRead(BaseModel):
    id: int
    attachment_uuid: str
    message_id: int
    org_id: Optional[int]
    file_name: str
    file_type: str
    file_size: int
    file_url: str
    thumbnail_url: Optional[str]
    upload_status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True
