from typing import Any

from pydantic import BaseModel
from sqlmodel import Column, Field, ForeignKey, Integer, SQLModel

from src.db.courses.activities import ActivityRead


class ChapterBase(SQLModel):
    name: str
    description: str | None = ""
    thumbnail_image: str | None = ""
    due_date: str | None = None
    published: bool = False
    org_id: int = Field(
        sa_column=Column(
            "org_id", Integer, ForeignKey("organization.id", ondelete="CASCADE")
        )
    )
    course_id: int = Field(
        sa_column=Column(
            "course_id", Integer, ForeignKey("course.id", ondelete="CASCADE")
        )
    )


class Chapter(ChapterBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    chapter_uuid: str = ""
    creation_date: str = ""
    update_date: str = ""


class ChapterCreate(ChapterBase):
    # referenced order here will be ignored and just used for validation
    # used order will be the next available.
    pass


class ChapterUpdate(ChapterBase):
    name: str | None
    description: str | None = ""
    thumbnail_image: str | None = ""
    due_date: str | None = None
    published: bool | None = None
    course_id: int | None
    org_id: int | None  # type: ignore


class ChapterRead(ChapterBase):
    id: int
    activities: list[ActivityRead]
    chapter_uuid: str
    creation_date: str
    update_date: str
    is_locked: bool | None = False


class ActivityOrder(BaseModel):
    activity_id: int


class ChapterOrder(BaseModel):
    chapter_id: int
    activities_order_by_ids: list[ActivityOrder]


class ChapterUpdateOrder(BaseModel):
    chapter_order_by_ids: list[ChapterOrder]


class DepreceatedChaptersRead(BaseModel):
    chapterOrder: Any
    chapters: Any
    activities: Any
