from enum import Enum

from sqlalchemy import Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


class CohortStatusEnum(str, Enum):
    UPCOMING = "upcoming"
    ACTIVE = "active"
    COMPLETED = "completed"


class CohortBase(SQLModel):
    name: str
    cohort_number: int
    start_date: str
    end_date: str | None = None
    status: CohortStatusEnum = CohortStatusEnum.UPCOMING


class Cohort(CohortBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    cohort_uuid: str = Field(default="", index=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: str = ""
    update_date: str = ""


class CohortCreate(CohortBase):
    org_id: int = Field(default=None, foreign_key="organization.id")


class CohortUpdate(SQLModel):
    name: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    status: CohortStatusEnum | None = None


class CohortRead(CohortBase):
    id: int
    cohort_uuid: str
    org_id: int = Field(default=None, foreign_key="organization.id")
    creation_date: str
    update_date: str


class CohortEnrollmentBase(SQLModel):
    enrollment_type: str = "paid"
    enrolled_date: str
    is_locked: bool = True


class CohortEnrollment(CohortEnrollmentBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    cohort_id: int = Field(
        sa_column=Column(Integer, ForeignKey("cohort.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    payment_user_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("paymentsuser.id", ondelete="SET NULL")),
    )


class CohortEnrollmentCreate(CohortEnrollmentBase):
    pass


class CohortEnrollmentRead(CohortEnrollmentBase):
    id: int
    cohort_id: int
    user_id: int
    course_id: int
    payment_user_id: int | None = None
