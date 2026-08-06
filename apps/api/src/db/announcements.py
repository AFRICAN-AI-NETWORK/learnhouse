from datetime import UTC, datetime

from sqlmodel import Column, Field, ForeignKey, Integer, SQLModel


class AnnouncementBase(SQLModel):
    title: str
    content: str
    is_active: bool = True


class Announcement(AnnouncementBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    created_by_user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    creation_date: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat() + "Z"
    )
    update_date: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat() + "Z"
    )


class AnnouncementRead(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    announcement_id: int = Field(
        sa_column=Column(Integer, ForeignKey("announcement.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    creation_date: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat() + "Z"
    )


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(SQLModel):
    title: str | None = None
    content: str | None = None
    is_active: bool | None = None


class AnnouncementReadResponse(AnnouncementBase):
    id: int
    org_id: int
    created_by_user_id: int
    creation_date: str
    update_date: str
    is_read: bool = False
