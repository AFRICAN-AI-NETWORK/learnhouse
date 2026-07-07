"""
Marketer database models
Marketers are users who register specifically to promote the platform and earn
a higher commission ($7.70 default) per paid course from students they refer.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import (
    Field,
    SQLModel,
    Column,
    BigInteger,
    ForeignKey,
    Index,
    Text,
    UniqueConstraint,
)

# Default commission for marketer-owned referral codes (USD)
MARKETER_COMMISSION_RATE_USD = 7.70


class MarketerStatus(str, Enum):
    """Lifecycle status of a marketer account"""

    PENDING_APPROVAL = "pending_approval"  # Registered, awaiting admin review
    ACTIVE = "active"  # Approved — earns marketer commission rate
    SUSPENDED = "suspended"  # Temporarily disabled by admin
    REJECTED = "rejected"  # Application rejected by admin


class MarketerBase(SQLModel):
    """Base model for marketers"""

    status: MarketerStatus = Field(default=MarketerStatus.PENDING_APPROVAL)
    commission_rate_usd: float = Field(default=MARKETER_COMMISSION_RATE_USD)
    phone_number: Optional[str] = Field(default=None, max_length=20)
    # Denormalized counters — refreshed by daily background job
    total_students_referred: int = Field(default=0)
    total_courses_sold: int = Field(default=0)
    total_earned_usd: float = Field(default=0.0)
    total_paid_usd: float = Field(default=0.0)


class Marketer(MarketerBase, table=True):
    """Marketer table"""

    __tablename__ = "marketer"
    __table_args__ = (
        UniqueConstraint("user_id", "org_id", name="uq_marketer_user_org"),
        UniqueConstraint("org_id", "phone_number", name="uq_marketer_phone_org"),
        Index("idx_marketer_status", "org_id", "status"),
        Index("idx_marketer_referral_code", "referral_code_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
        )
    )
    org_id: int = Field(
        sa_column=Column(
            BigInteger,
            ForeignKey("organization.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    referral_code_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            BigInteger, ForeignKey("referralcode.id", ondelete="SET NULL")
        ),
    )
    approved_by_user_id: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("user.id", ondelete="SET NULL")),
    )
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = Field(default=None, sa_column=Column(Text))
    needs_review: bool = Field(default=False)  # Fraud flag (shared device fingerprint)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))  # Admin-only
    creation_date: datetime = Field(default_factory=datetime.now)
    update_date: datetime = Field(default_factory=datetime.now)


class MarketerCreate(SQLModel):
    """Model for registering a marketer"""

    phone_number: str = Field(max_length=20)
    country_code: Optional[str] = Field(default=None, max_length=2)
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class MarketerRead(MarketerBase):
    """Full response model (admin)"""

    id: int
    user_id: int
    org_id: int
    referral_code_id: Optional[int]
    approved_by_user_id: Optional[int]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]
    needs_review: bool
    notes: Optional[str]
    creation_date: datetime
    update_date: datetime


class MarketerPublicRead(MarketerBase):
    """Response model for marketers themselves — hides admin-only fields"""

    id: int
    user_id: int
    org_id: int
    referral_code_id: Optional[int]
    approved_at: Optional[datetime]
    creation_date: datetime


class MarketerUpdate(SQLModel):
    """Model for updating a marketer (admin)"""

    status: Optional[MarketerStatus] = None
    commission_rate_usd: Optional[float] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
