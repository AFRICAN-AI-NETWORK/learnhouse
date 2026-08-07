from enum import StrEnum

from sqlalchemy import Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


class ResourceAuthorshipEnum(StrEnum):
    CREATOR = "CREATOR"
    CONTRIBUTOR = "CONTRIBUTOR"
    MAINTAINER = "MAINTAINER"
    REPORTER = "REPORTER"


class ResourceAuthorshipStatusEnum(StrEnum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    INACTIVE = "INACTIVE"


class ResourceAuthor(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    resource_uuid: str
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    authorship: ResourceAuthorshipEnum
    authorship_status: ResourceAuthorshipStatusEnum
    creation_date: str = ""
    update_date: str = ""
