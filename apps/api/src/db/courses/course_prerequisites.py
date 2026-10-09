from sqlalchemy import Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


class CoursePrerequisite(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    prerequisite_course_id: int = Field(
        sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    order: int = Field(default=0)
    creation_date: str = ""
    update_date: str = ""
