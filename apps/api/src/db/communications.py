from enum import Enum
from typing import Optional

from sqlalchemy import JSON, Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


class CampaignTargetType(str, Enum):
    ALL = "ALL"
    WAITLIST = "WAITLIST"
    COURSE = "COURSE"
    ROLES = "ROLES"


class CampaignStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SENT = "SENT"
    FAILED = "FAILED"


class CampaignBase(SQLModel):
    subject: str
    body: str
    target_type: CampaignTargetType
    target_metadata: dict = Field(default={}, sa_column=Column(JSON))
    send_via_email: bool = True
    send_via_chat: bool = False


class Campaign(CampaignBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    created_by_user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    status: CampaignStatus = CampaignStatus.PENDING
    total_targets: int = 0
    sent_count: int = 0
    error_log: Optional[str] = None
    creation_date: str = ""
    update_date: str = ""


class CampaignCreate(CampaignBase):
    pass


class CampaignRead(CampaignBase):
    id: int
    org_id: int
    status: CampaignStatus
    total_targets: int
    sent_count: int
    creation_date: str
    update_date: str
