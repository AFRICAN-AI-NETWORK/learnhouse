from enum import Enum
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel


class TimetableRecurrenceEnum(str, Enum):
    none = "none"
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"


class TimetableVisibilityEnum(str, Enum):
    draft = "draft"
    published = "published"


class TimetableStatusEnum(str, Enum):
    scheduled = "scheduled"
    cancelled = "cancelled"


class RegisterFrequencyEnum(str, Enum):
    weekly = "weekly"
    per_session = "per_session"
    daily = "daily"
    manual = "manual"


class RegisterEntryStatusEnum(str, Enum):
    marked = "marked"
    late = "late"
    missed = "missed"
    excused = "excused"


class RegisterEntryMethodEnum(str, Enum):
    student_self_mark = "student_self_mark"
    instructor_override = "instructor_override"


class CourseTimetableEventBase(SQLModel):
    title: str
    description: Optional[str] = None
    instructor_name: Optional[str] = None
    location: Optional[str] = None
    meeting_url: Optional[str] = None
    starts_at: str
    ends_at: str
    timezone: str
    recurrence: TimetableRecurrenceEnum = TimetableRecurrenceEnum.none
    visibility: TimetableVisibilityEnum = TimetableVisibilityEnum.draft
    status: TimetableStatusEnum = TimetableStatusEnum.scheduled
    register_required: bool = False


class CourseTimetableEvent(CourseTimetableEventBase, table=True):
    __tablename__ = "course_timetable_event"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_uuid: str = Field(index=True, unique=True)
    course_uuid: str = Field(index=True)
    course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: str = ""
    update_date: str = ""


class CourseTimetableEventCreate(CourseTimetableEventBase):
    pass


class CourseTimetableEventUpdate(CourseTimetableEventBase):
    pass


class CourseTimetableEventRead(CourseTimetableEventBase):
    id: int
    event_uuid: str
    course_uuid: str
    creation_date: str
    update_date: str


class CourseRegisterPolicyBase(SQLModel):
    enabled: bool = True
    frequency: RegisterFrequencyEnum = RegisterFrequencyEnum.weekly
    checkin_opens_minutes_before: int = 15
    checkin_closes_minutes_after: int = 30
    requires_enrollment: bool = True
    allow_late: bool = True
    linked_timetable_event_uuid: Optional[str] = None


class CourseRegisterPolicy(CourseRegisterPolicyBase, table=True):
    __tablename__ = "course_register_policy"

    id: Optional[int] = Field(default=None, primary_key=True)
    policy_uuid: str = Field(index=True, unique=True)
    course_uuid: str = Field(index=True, unique=True)
    course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: str = ""
    update_date: str = ""


class CourseRegisterPolicyUpdate(CourseRegisterPolicyBase):
    course_uuid: Optional[str] = None


class CourseRegisterPolicyRead(CourseRegisterPolicyBase):
    id: int
    policy_uuid: str
    course_uuid: str
    creation_date: str
    update_date: str


class CourseRegisterEntryBase(SQLModel):
    timetable_event_uuid: Optional[str] = None
    period_start: str
    period_end: str
    status: RegisterEntryStatusEnum
    marked_at: Optional[str] = None
    method: RegisterEntryMethodEnum
    notes: Optional[str] = None


class CourseRegisterEntry(CourseRegisterEntryBase, table=True):
    __tablename__ = "course_register_entry"

    id: Optional[int] = Field(default=None, primary_key=True)
    entry_uuid: str = Field(index=True, unique=True)
    course_uuid: str = Field(index=True)
    course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    creation_date: str = ""
    update_date: str = ""

    __table_args__ = (
        UniqueConstraint(
            "course_uuid",
            "user_id",
            "period_start",
            "period_end",
            "timetable_event_uuid",
            name="unique_course_register_entry",
        ),
    )


class CourseRegisterEntryRead(CourseRegisterEntryBase):
    id: int
    entry_uuid: str
    course_uuid: str
    user_id: int


class CourseRegisterEntryUpdate(SQLModel):
    status: Optional[RegisterEntryStatusEnum] = None
    marked_at: Optional[str] = None
    notes: Optional[str] = None


class CourseRegisterPeriodRead(SQLModel):
    starts_at: str
    ends_at: str
    checkin_opens_at: str
    checkin_closes_at: str
    is_open: bool


class CourseRegisterSummaryRead(SQLModel):
    policy: CourseRegisterPolicyRead
    current_period: CourseRegisterPeriodRead
    current_entry: Optional[CourseRegisterEntryRead] = None
    entries: list[CourseRegisterEntryRead]
