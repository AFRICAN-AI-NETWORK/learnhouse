from enum import StrEnum

from sqlalchemy import JSON, Column, ForeignKey, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel


class JourneyPhaseEnum(StrEnum):
    onboarding = "onboarding"
    core_learning = "core_learning"
    capstone = "capstone"
    alumni = "alumni"


class MilestoneCriteriaEnum(StrEnum):
    """How a milestone is achieved. Each value reads one existing signal."""

    manual = "manual"
    course_started = "course_started"
    chapter_completed = "chapter_completed"  # config: {"chapter_id": int}
    course_grade_at_least = "course_grade_at_least"  # config: {"threshold": 0-100}
    required_assignments_graded = "required_assignments_graded"
    certificate_issued = "certificate_issued"


class MilestoneStatusEnum(StrEnum):
    not_started = "not_started"
    in_progress = "in_progress"
    achieved = "achieved"
    at_risk = "at_risk"


class StudentJourneyMilestoneBase(SQLModel):
    phase: JourneyPhaseEnum
    name: str
    description: str | None = None
    sequence_order: int
    criteria: MilestoneCriteriaEnum = MilestoneCriteriaEnum.manual
    criteria_config: dict = Field(default={}, sa_column=Column(JSON))


class StudentJourneyMilestone(StudentJourneyMilestoneBase, table=True):
    __tablename__ = "student_journey_milestone"

    id: int | None = Field(default=None, primary_key=True)
    milestone_uuid: str = Field(index=True, unique=True)
    course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: str = ""
    update_date: str = ""

    __table_args__ = (
        UniqueConstraint(
            "course_id", "sequence_order", name="uq_student_journey_milestone_order"
        ),
    )


class StudentJourneyMilestoneCreate(StudentJourneyMilestoneBase):
    pass


class StudentJourneyMilestoneUpdate(SQLModel):
    phase: JourneyPhaseEnum | None = None
    name: str | None = None
    description: str | None = None
    sequence_order: int | None = None
    criteria: MilestoneCriteriaEnum | None = None
    criteria_config: dict | None = None


class StudentJourneyMilestoneRead(StudentJourneyMilestoneBase):
    milestone_uuid: str
    course_uuid: str
    creation_date: str
    update_date: str


class UserMilestoneProgress(SQLModel, table=True):
    """A learner's standing on one milestone."""

    __tablename__ = "user_milestone_progress"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    milestone_id: int = Field(
        sa_column=Column(
            Integer, ForeignKey("student_journey_milestone.id", ondelete="CASCADE")
        )
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    status: MilestoneStatusEnum = MilestoneStatusEnum.not_started
    achieved_at: str | None = None
    # Set by staff; automatic evaluation never overwrites it.
    is_manual_override: bool = False
    notes: str | None = None
    creation_date: str = ""
    update_date: str = ""

    __table_args__ = (
        UniqueConstraint("user_id", "milestone_id", name="uq_user_milestone_progress"),
    )


class MilestoneProgressUpdate(SQLModel):
    """Staff override. A null status hands the milestone back to automatic evaluation."""

    status: MilestoneStatusEnum | None = None
    notes: str | None = None


class StudentMilestoneStatus(SQLModel):
    """One milestone together with a learner's standing on it."""

    milestone_uuid: str
    phase: JourneyPhaseEnum
    name: str
    description: str | None = None
    sequence_order: int
    criteria: MilestoneCriteriaEnum
    status: MilestoneStatusEnum
    achieved_at: str | None = None
    is_manual_override: bool = False
    notes: str | None = None
