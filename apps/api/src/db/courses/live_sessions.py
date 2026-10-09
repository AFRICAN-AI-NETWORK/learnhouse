from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel


class LiveSessionRegistrationBase(SQLModel):
    activity_uuid: str = Field(index=True)
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )


class LiveSessionRegistration(LiveSessionRegistrationBase, table=True):
    __tablename__ = "live_session_registration"
    id: int | None = Field(default=None, primary_key=True)
    creation_date: str = ""

    __table_args__ = (
        UniqueConstraint("activity_uuid", "user_id", name="unique_live_registration"),
    )


class LiveSessionRegistrationCreate(LiveSessionRegistrationBase):
    pass


class LiveSessionRegistrationRead(LiveSessionRegistrationBase):
    id: int
    creation_date: str
