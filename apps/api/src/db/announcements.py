from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Column, Field, ForeignKey, Integer, SQLModel


class AnnouncementBase(SQLModel):
    title: str
    content: str
    is_active: bool = True


class Announcement(AnnouncementBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    created_by_user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    creation_date: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat() + "Z"
    )
    update_date: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat() + "Z"
    )


class AnnouncementRead(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    announcement_id: int = Field(
        sa_column=Column(Integer, ForeignKey("announcement.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    creation_date: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat() + "Z"
    )


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(SQLModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None


class AnnouncementReadResponse(AnnouncementBase):
    id: int
    org_id: int
    created_by_user_id: int
    creation_date: str
    update_date: str
    is_read: bool = False
