"""
Referral Commission database models
Tracks commission earned from successful referrals
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel, Column, BigInteger, ForeignKey, Index


class CommissionStatus(str, Enum):
    """Status of referral commission"""

    PENDING = "pending"  # Payment confirmed, refund period active (14 days)
    ELIGIBLE = "eligible"  # Refund period expired, ready for payout
    PAID = "paid"  # Commission paid to referrer
    FORFEITED = "forfeited"  # Refund issued, commission revoked
    PENDING_REVIEW = "pending_review"  # Flagged for fraud review


class ReferralCommissionBase(SQLModel):
    """Base model for referral commissions"""

    commission_amount: float = Field(default=4.00)  # Fixed $4 USD commission
    status: CommissionStatus = Field(default=CommissionStatus.PENDING)
    payment_completion_date: Optional[datetime] = None
    refund_period_expiration_date: Optional[datetime] = None
    payout_date: Optional[datetime] = None
    payout_request_id: Optional[int] = None  # Links to ReferrerPayoutRequest when paid


class ReferralCommission(ReferralCommissionBase, table=True):
    """Referral commission table"""

    __tablename__ = "referralcommission"
    __table_args__ = (
        Index("idx_referralcommission_referrer_status", "referrer_user_id", "status"),
        Index("idx_referralcommission_referred", "referred_user_id"),
        Index("idx_referralcommission_org", "org_id"),
        Index("idx_referralcommission_payment_user", "payment_user_id"),
        # Unique constraint to prevent duplicate commissions
        Index(
            "idx_referralcommission_unique",
            "payment_user_id",
            "referral_code_id",
            unique=True,
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(
            BigInteger,
            ForeignKey("organization.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    referrer_user_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
        )
    )
    referred_user_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
        )
    )
    payment_user_id: int = Field(
        sa_column=Column(
            BigInteger,
            ForeignKey("paymentsuser.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    course_id: Optional[int] = Field(
        sa_column=Column(BigInteger, ForeignKey("course.id", ondelete="SET NULL"))
    )
    referral_code_id: int = Field(
        sa_column=Column(
            BigInteger,
            ForeignKey("referralcode.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    creation_date: datetime = Field(default_factory=datetime.now)
    update_date: datetime = Field(default_factory=datetime.now)


class ReferralCommissionRead(ReferralCommissionBase):
    """Response model for referral commissions"""

    id: int
    org_id: int
    referrer_user_id: int
    referred_user_id: int
    payment_user_id: int
    course_id: Optional[int]
    referral_code_id: int
    creation_date: datetime
    update_date: datetime


class ReferralCommissionCreate(SQLModel):
    """Model for creating referral commission"""

    org_id: int
    referrer_user_id: int
    referred_user_id: int
    payment_user_id: int
    course_id: Optional[int] = None
    referral_code_id: int
    commission_amount: float = 4.00
    payment_completion_date: datetime
    refund_period_expiration_date: datetime


class ReferralCommissionUpdate(SQLModel):
    """Model for updating referral commission"""

    status: Optional[CommissionStatus] = None
    payout_date: Optional[datetime] = None
