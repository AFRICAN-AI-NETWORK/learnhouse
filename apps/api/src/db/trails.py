from typing import Optional

from pydantic import BaseModel
from sqlalchemy import Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel

from src.db.trail_runs import TrailRunRead


class TrailBase(SQLModel):
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )


class Trail(TrailBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    trail_uuid: str = ""
    creation_date: str = ""
    update_date: str = ""


class TrailCreate(TrailBase):
    pass


# Read model – plain pydantic BaseModel, no SA columns needed.
class TrailRead(BaseModel):
    id: Optional[int] = None
    trail_uuid: Optional[str] = None
    org_id: int
    user_id: int
    creation_date: Optional[str] = None
    update_date: Optional[str] = None
    runs: list[TrailRunRead]

    class Config:
        orm_mode = True
