from enum import StrEnum

from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel


class TimetableRecurrenceEnum(StrEnum):
    none = "none"
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"


class TimetableVisibilityEnum(StrEnum):
    draft = "draft"
    published = "published"


class TimetableStatusEnum(StrEnum):
    scheduled = "scheduled"
    cancelled = "cancelled"


class RegisterFrequencyEnum(StrEnum):
    weekly = "weekly"
    per_session = "per_session"
    daily = "daily"
    manual = "manual"


class RegisterEntryStatusEnum(StrEnum):
    marked = "marked"
    late = "late"
    missed = "missed"
    excused = "excused"


class RegisterEntryMethodEnum(StrEnum):
    student_self_mark = "student_self_mark"
    instructor_override = "instructor_override"


class CourseTimetableEventBase(SQLModel):
    title: str
    description: str | None = None
    instructor_name: str | None = None
    location: str | None = None
    meeting_url: str | None = None
    starts_at: str
    ends_at: str
    timezone: str
    recurrence: TimetableRecurrenceEnum = TimetableRecurrenceEnum.none
    visibility: TimetableVisibilityEnum = TimetableVisibilityEnum.draft
    status: TimetableStatusEnum = TimetableStatusEnum.scheduled
    register_required: bool = False


class CourseTimetableEvent(CourseTimetableEventBase, table=True):
    __tablename__ = "course_timetable_event"

    id: int | None = Field(default=None, primary_key=True)
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


class StudentTimetableEventRead(CourseTimetableEventRead):
    course_id: int
    course_name: str
    course_description: str | None = None


class CourseRegisterPolicyBase(SQLModel):
    enabled: bool = True
    frequency: RegisterFrequencyEnum = RegisterFrequencyEnum.weekly
    checkin_opens_minutes_before: int = 15
    checkin_closes_minutes_after: int = 30
    requires_enrollment: bool = True
    allow_late: bool = True
    linked_timetable_event_uuid: str | None = None


class CourseRegisterPolicy(CourseRegisterPolicyBase, table=True):
    __tablename__ = "course_register_policy"

    id: int | None = Field(default=None, primary_key=True)
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
    course_uuid: str | None = None


class CourseRegisterPolicyRead(CourseRegisterPolicyBase):
    id: int
    policy_uuid: str
    course_uuid: str
    creation_date: str
    update_date: str


class CourseRegisterEntryBase(SQLModel):
    timetable_event_uuid: str | None = None
    period_start: str
    period_end: str
    status: RegisterEntryStatusEnum
    marked_at: str | None = None
    method: RegisterEntryMethodEnum
    notes: str | None = None


class CourseRegisterEntry(CourseRegisterEntryBase, table=True):
    __tablename__ = "course_register_entry"

    id: int | None = Field(default=None, primary_key=True)
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
    status: RegisterEntryStatusEnum | None = None
    marked_at: str | None = None
    notes: str | None = None


class CourseRegisterPeriodRead(SQLModel):
    starts_at: str
    ends_at: str
    checkin_opens_at: str
    checkin_closes_at: str
    is_open: bool


class CourseRegisterSummaryRead(SQLModel):
    policy: CourseRegisterPolicyRead
    current_period: CourseRegisterPeriodRead
    current_entry: CourseRegisterEntryRead | None = None
    entries: list[CourseRegisterEntryRead]
