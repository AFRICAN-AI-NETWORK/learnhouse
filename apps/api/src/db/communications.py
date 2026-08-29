from enum import StrEnum
from datetime import datetime

from sqlalchemy import JSON, Column, ForeignKey, Integer, String, Index, UniqueConstraint
from sqlmodel import Field, SQLModel


class CampaignTargetType(StrEnum):
    ALL = "ALL"
    WAITLIST = "WAITLIST"
    COURSE = "COURSE"
    ROLES = "ROLES"
    CUSTOM_EMAILS = "CUSTOM_EMAILS"


class CampaignType(StrEnum):
    GENERAL = "GENERAL"
    COURSE_MARKETING = "COURSE_MARKETING"


class CampaignStatus(StrEnum):
    DRAFT = "DRAFT"
    QUEUED = "QUEUED"
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SENT = "SENT"
    PARTIALLY_FAILED = "PARTIALLY_FAILED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class CampaignRecipientStatus(StrEnum):
    PENDING = "PENDING"
    SENDING = "SENDING"
    SENT = "SENT"
    FAILED_RETRYABLE = "FAILED_RETRYABLE"
    FAILED_PERMANENT = "FAILED_PERMANENT"
    SKIPPED = "SKIPPED"
    UNSUBSCRIBED = "UNSUBSCRIBED"


class UnsubscribeScope(StrEnum):
    MARKETING = "MARKETING"
    ALL_OPTIONAL = "ALL_OPTIONAL"


class CampaignBase(SQLModel):
    subject: str
    body: str | None = None
    target_type: CampaignTargetType
    target_metadata: dict = Field(default={}, sa_column=Column(JSON))
    send_via_email: bool = True
    send_via_chat: bool = False
    
    # New broadcast fields
    campaign_type: CampaignType = CampaignType.COURSE_MARKETING
    preheader: str | None = None
    sender_name: str | None = None
    reply_to_email: str | None = None
    content_json: dict = Field(default={}, sa_column=Column(JSON))
    scheduled_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    failed_count: int = 0
    skipped_count: int = 0
    retry_count: int = 0


class Campaign(CampaignBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    created_by_user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    campaign_uuid: str = Field(index=True)
    status: CampaignStatus = CampaignStatus.DRAFT
    total_targets: int = 0
    sent_count: int = 0
    error_log: str | None = None
    creation_date: str = ""
    update_date: str = ""


class CampaignRecipient(SQLModel, table=True):
    __table_args__ = (
        Index("ix_campaign_recipient_campaign_id_status", "campaign_id", "status"),
        Index("ix_campaign_recipient_org_id_email", "org_id", "email"),
        Index("ix_campaign_recipient_status_last_attempt_at", "status", "last_attempt_at"),
    )

    id: int | None = Field(default=None, primary_key=True)
    campaign_id: int = Field(
        sa_column=Column(Integer, ForeignKey("campaign.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    user_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL"))
    )
    email: str
    status: CampaignRecipientStatus = CampaignRecipientStatus.PENDING
    attempt_count: int = 0
    last_attempt_at: datetime | None = None
    sent_at: datetime | None = None
    last_error: str | None = None
    provider_message_id: str | None = None
    creation_date: str = ""
    update_date: str = ""


class EmailUnsubscribe(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("org_id", "email", "scope", name="uix_org_id_email_scope"),
    )

    id: int | None = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    user_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL"))
    )
    email: str = Field(index=True)
    scope: UnsubscribeScope = UnsubscribeScope.MARKETING
    token_hash: str = Field(index=True)
    unsubscribed_at: datetime | None = None
    creation_date: str = ""


class CampaignCreate(CampaignBase):
    pass


class CampaignRead(CampaignBase):
    id: int
    org_id: int
    campaign_uuid: str
    status: CampaignStatus
    total_targets: int
    sent_count: int
    creation_date: str
    update_date: str
