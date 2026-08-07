from enum import StrEnum

from sqlalchemy import JSON, Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


class TrailStepTypeEnum(StrEnum):
    STEP_TYPE_READABLE_ACTIVITY = "STEP_TYPE_READABLE_ACTIVITY"
    STEP_TYPE_ASSIGNMENT_ACTIVITY = "STEP_TYPE_ASSIGNMENT_ACTIVITY"
    STEP_TYPE_CUSTOM_ACTIVITY = "STEP_TYPE_CUSTOM_ACTIVITY"


class TrailStep(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    complete: bool
    teacher_verified: bool
    grade: str
    points_earned: float = Field(default=0)
    is_late: bool = Field(default=False)
    data: dict = Field(default={}, sa_column=Column(JSON))
    # foreign keys
    trailrun_id: int = Field(
        sa_column=Column(Integer, ForeignKey("trailrun.id", ondelete="CASCADE"))
    )
    trail_id: int = Field(
        sa_column=Column(Integer, ForeignKey("trail.id", ondelete="CASCADE"))
    )
    activity_id: int = Field(
        sa_column=Column(Integer, ForeignKey("activity.id", ondelete="CASCADE"))
    )
    course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    # timestamps
    creation_date: str
    update_date: str


# note: assignments support
# `grade` stores the normalized assignment score string (e.g. "0.80") for
# gradeable (assignment-backed) activities, so the per-activity weighting is
# auditable without re-joining the assignment tables. It is "" for
# completion-based activities. `points_earned` stores the effective,
# performance- and lateness-weighted points the user earned for this activity.
# Both fields are written by
# src.services.courses.grade.compute_and_store_trail_step_grade.
