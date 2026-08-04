from enum import Enum
from typing import Optional

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
    end_date: Optional[str] = None
    status: CohortStatusEnum = CohortStatusEnum.UPCOMING


class Cohort(CohortBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cohort_uuid: str = Field(default="", index=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: str = ""
    update_date: str = ""


class CohortCreate(CohortBase):
    org_id: int = Field(default=None, foreign_key="organization.id")
    pass


class CohortUpdate(SQLModel):
    name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[CohortStatusEnum] = None


class CohortRead(CohortBase):
    id: int
    cohort_uuid: str
    org_id: int = Field(default=None, foreign_key="organization.id")
    creation_date: str
    update_date: str
    pass


class CohortEnrollmentBase(SQLModel):
    enrollment_type: str = "paid"
    enrolled_date: str
    is_locked: bool = True


class CohortEnrollment(CohortEnrollmentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cohort_id: int = Field(
        sa_column=Column(Integer, ForeignKey("cohort.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    payment_user_id: Optional[int] = Field(
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
    payment_user_id: Optional[int] = None
    pass
