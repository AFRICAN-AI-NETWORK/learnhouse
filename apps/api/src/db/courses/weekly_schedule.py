from enum import StrEnum

from sqlalchemy import Column, ForeignKey, Index, Integer, UniqueConstraint, text
from sqlmodel import Field, SQLModel

DEFAULT_SCHEDULE_TIMEZONE = "Africa/Lagos"


class LearningPhaseEnum(StrEnum):
    learn = "learn"
    practice = "practice"
    connect = "connect"
    apply = "apply"
    build = "build"
    support = "support"
    rest = "rest"


class WeeklyOperatingScheduleBase(SQLModel):
    name: str = "Weekly Operating Schedule"
    # Fallback zone for dates that carry no timezone of their own.
    timezone: str = DEFAULT_SCHEDULE_TIMEZONE
    rest_day_enforced: bool = True


class WeeklyOperatingSchedule(WeeklyOperatingScheduleBase, table=True):
    """Weekly rhythm for the organization, or an override for one course."""

    __tablename__ = "weekly_operating_schedule"

    id: int | None = Field(default=None, primary_key=True)
    schedule_uuid: str = Field(index=True, unique=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    # Null marks the organization default.
    course_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE")),
    )
    creation_date: str = ""
    update_date: str = ""

    __table_args__ = (
        Index(
            "uq_weekly_operating_schedule_org_default",
            "org_id",
            unique=True,
            postgresql_where=text("course_id IS NULL"),
            sqlite_where=text("course_id IS NULL"),
        ),
        Index("uq_weekly_operating_schedule_course", "course_id", unique=True),
    )


class WeeklyOperatingScheduleDayBase(SQLModel):
    weekday: int  # 0 = Monday .. 6 = Sunday
    phase: LearningPhaseEnum
    # Enforced rule, kept separate from the phase label.
    is_rest_day: bool = False


class WeeklyOperatingScheduleDay(WeeklyOperatingScheduleDayBase, table=True):
    __tablename__ = "weekly_operating_schedule_day"

    id: int | None = Field(default=None, primary_key=True)
    schedule_id: int = Field(
        sa_column=Column(
            Integer, ForeignKey("weekly_operating_schedule.id", ondelete="CASCADE")
        )
    )

    __table_args__ = (
        UniqueConstraint(
            "schedule_id", "weekday", name="uq_weekly_operating_schedule_day"
        ),
    )


class WeeklyOperatingScheduleDayRead(WeeklyOperatingScheduleDayBase):
    pass


class WeeklyOperatingScheduleUpdate(SQLModel):
    """Partial update; listed days replace the matching weekdays only."""

    name: str | None = None
    timezone: str | None = None
    rest_day_enforced: bool | None = None
    days: list[WeeklyOperatingScheduleDayBase] | None = None


class WeeklyOperatingScheduleRead(WeeklyOperatingScheduleBase):
    schedule_uuid: str
    course_uuid: str | None = None
    is_course_override: bool = False
    days: list[WeeklyOperatingScheduleDayRead]
    creation_date: str
    update_date: str
