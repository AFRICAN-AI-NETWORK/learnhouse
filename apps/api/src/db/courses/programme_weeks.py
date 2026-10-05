from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel


class ProgrammeWeek(SQLModel, table=True):
    """
    One calendar week of a course run (a course under an academic cohort).

    ``starts_on`` and ``ends_on`` are calendar dates (YYYY-MM-DD) with no
    timezone, so a week covers the same days for every learner.
    """

    __tablename__ = "programme_week"

    id: int | None = Field(default=None, primary_key=True)
    programme_week_uuid: str = Field(index=True, unique=True)
    course_academic_cohort_id: int = Field(
        sa_column=Column(
            Integer, ForeignKey("course_academic_cohort.id", ondelete="CASCADE")
        )
    )
    # Denormalized from the course run for direct course queries.
    course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    week_number: int  # 1-indexed
    starts_on: str
    ends_on: str
    chapter_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("chapter.id", ondelete="SET NULL")),
    )
    milestone_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer, ForeignKey("student_journey_milestone.id", ondelete="SET NULL")
        ),
    )
    creation_date: str = ""
    update_date: str = ""

    __table_args__ = (
        UniqueConstraint(
            "course_academic_cohort_id", "week_number", name="uq_programme_week_number"
        ),
    )


class ProgrammeWeeksGenerate(SQLModel):
    academic_cohort_uuid: str
    number_of_weeks: int


class ProgrammeWeekUpdate(SQLModel):
    """Fields that are sent replace the mapping; a null clears it."""

    chapter_id: int | None = None
    milestone_uuid: str | None = None


class ProgrammeWeekRead(SQLModel):
    id: int
    programme_week_uuid: str
    academic_cohort_uuid: str
    week_number: int
    starts_on: str
    ends_on: str
    chapter_id: int | None = None
    milestone_uuid: str | None = None
