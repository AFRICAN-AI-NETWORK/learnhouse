from enum import StrEnum

from sqlalchemy import JSON, Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


class ActivityTypeEnum(StrEnum):
    TYPE_VIDEO = "TYPE_VIDEO"
    TYPE_DOCUMENT = "TYPE_DOCUMENT"
    TYPE_DYNAMIC = "TYPE_DYNAMIC"
    TYPE_ASSIGNMENT = "TYPE_ASSIGNMENT"
    TYPE_CUSTOM = "TYPE_CUSTOM"
    TYPE_SMART_ARTICLE = "TYPE_SMART_ARTICLE"
    TYPE_LIVE_SESSION = "TYPE_LIVE_SESSION"
    TYPE_ATTENDANCE = "TYPE_ATTENDANCE"


class ActivitySubTypeEnum(StrEnum):
    # Dynamic
    SUBTYPE_DYNAMIC_PAGE = "SUBTYPE_DYNAMIC_PAGE"
    # Video
    SUBTYPE_VIDEO_YOUTUBE = "SUBTYPE_VIDEO_YOUTUBE"
    SUBTYPE_VIDEO_HOSTED = "SUBTYPE_VIDEO_HOSTED"
    # Document
    SUBTYPE_DOCUMENT_PDF = "SUBTYPE_DOCUMENT_PDF"
    SUBTYPE_DOCUMENT_DOC = "SUBTYPE_DOCUMENT_DOC"
    # Assignment
    SUBTYPE_ASSIGNMENT_ANY = "SUBTYPE_ASSIGNMENT_ANY"
    # Custom
    SUBTYPE_CUSTOM = "SUBTYPE_CUSTOM"
    # Smart Article
    SUBTYPE_SMART_ARTICLE_PDF = "SUBTYPE_SMART_ARTICLE_PDF"
    # Live Session
    SUBTYPE_LIVE_JITSI = "SUBTYPE_LIVE_JITSI"
    SUBTYPE_LIVE_HOSTED = "SUBTYPE_LIVE_HOSTED"
    # Attendance
    SUBTYPE_ATTENDANCE_WEEKLY = "SUBTYPE_ATTENDANCE_WEEKLY"
    SUBTYPE_ATTENDANCE_ONETIME = "SUBTYPE_ATTENDANCE_ONETIME"


class ActivityBase(SQLModel):
    name: str
    activity_type: ActivityTypeEnum
    activity_sub_type: ActivitySubTypeEnum
    content: dict = Field(default={}, sa_column=Column(JSON))
    details: dict | None = Field(default=None, sa_column=Column(JSON))
    published: bool = False
    points: float = Field(default=0)


class Activity(ActivityBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    course_id: int = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE")),
    )
    activity_uuid: str = ""
    creation_date: str = ""
    update_date: str = ""


class ActivityCreate(ActivityBase):
    chapter_id: int
    activity_type: ActivityTypeEnum = ActivityTypeEnum.TYPE_CUSTOM
    activity_sub_type: ActivitySubTypeEnum = ActivitySubTypeEnum.SUBTYPE_CUSTOM
    details: dict = Field(default={}, sa_column=Column(JSON))  # type: ignore


class ActivityUpdate(ActivityBase):
    name: str | None = None  # type: ignore
    content: dict | None = Field(default=None, sa_column=Column(JSON))
    activity_type: ActivityTypeEnum | None = None  # type: ignore
    activity_sub_type: ActivitySubTypeEnum | None = None  # type: ignore
    details: dict | None = Field(default=None, sa_column=Column(JSON))  # type: ignore
    published_version: int | None = None
    version: int | None = None
    points: float | None = None


class ActivityRead(ActivityBase):
    id: int
    org_id: int
    org_slug: str | None = None
    course_id: int
    course_uuid: str | None = None
    activity_uuid: str
    creation_date: str
    update_date: str
    details: dict | None = Field(default=None, sa_column=Column(JSON))
    is_locked: bool | None = False
