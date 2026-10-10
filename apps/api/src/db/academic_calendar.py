from enum import StrEnum

from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel

# Dates in this module are calendar dates (YYYY-MM-DD) and carry no timezone.


class AcademicYearBase(SQLModel):
    name: str
    region: str | None = None
    start_date: str
    end_date: str
    is_active: bool = True


class AcademicYear(AcademicYearBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    academic_year_uuid: str = Field(index=True, unique=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: str = ""
    update_date: str = ""


class AcademicYearCreate(AcademicYearBase):
    pass


class AcademicYearUpdate(SQLModel):
    name: str | None = None
    region: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_active: bool | None = None


class AcademicYearRead(AcademicYearBase):
    academic_year_uuid: str
    creation_date: str
    update_date: str


class AcademicCohortStatusEnum(StrEnum):
    upcoming = "upcoming"
    active = "active"
    completed = "completed"


class AcademicCohortBase(SQLModel):
    name: str
    start_date: str
    end_date: str
    enrollment_window_start: str | None = None
    enrollment_window_end: str | None = None
    status: AcademicCohortStatusEnum = AcademicCohortStatusEnum.upcoming


class AcademicCohort(AcademicCohortBase, table=True):
    """
    An academic period inside an academic year that courses run under.

    Distinct from ``Cohort`` (src/db/cohorts.py), which is the intake batch
    that gates when a student's enrollment unlocks.
    """

    id: int | None = Field(default=None, primary_key=True)
    academic_cohort_uuid: str = Field(index=True, unique=True)
    academic_year_id: int = Field(
        sa_column=Column(Integer, ForeignKey("academicyear.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: str = ""
    update_date: str = ""


class AcademicCohortCreate(AcademicCohortBase):
    academic_year_uuid: str


class AcademicCohortUpdate(SQLModel):
    name: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    enrollment_window_start: str | None = None
    enrollment_window_end: str | None = None
    status: AcademicCohortStatusEnum | None = None


class AcademicCohortRead(AcademicCohortBase):
    academic_cohort_uuid: str
    academic_year_uuid: str
    creation_date: str
    update_date: str


class CourseAcademicCohort(SQLModel, table=True):
    """One row is one run of a course under an academic cohort."""

    __tablename__ = "course_academic_cohort"

    id: int | None = Field(default=None, primary_key=True)
    course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    academic_cohort_id: int = Field(
        sa_column=Column(Integer, ForeignKey("academiccohort.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: str = ""

    __table_args__ = (
        UniqueConstraint(
            "course_id", "academic_cohort_id", name="uq_course_academic_cohort"
        ),
    )


class CourseAcademicCohortsUpdate(SQLModel):
    """The complete set of cohorts the course should run under."""

    academic_cohort_uuids: list[str]
