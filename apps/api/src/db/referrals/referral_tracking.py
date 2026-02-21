"""
Referral Tracking database models
Tracks signup events with referral codes for fraud prevention
"""
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Column, BigInteger, ForeignKey, Index, JSON


class ReferralTrackingBase(SQLModel):
    """Base model for referral tracking"""
    ip_address: str = Field(max_length=50, index=True)
    device_id: Optional[str] = Field(default=None, max_length=64, index=True)  # SHA-256 hash
    browser_fingerprint: dict = Field(default={}, sa_column=Column(JSON))
    registration_complete: bool = Field(default=False)


class ReferralTracking(ReferralTrackingBase, table=True):
    """Referral tracking table - tracks signup with fraud detection data"""
    __tablename__ = "referraltracking"
    __table_args__ = (
        Index("idx_referraltracking_referred", "referred_user_id"),
        Index("idx_referraltracking_code", "referral_code_id"),
        Index("idx_referraltracking_ip", "ip_address"),
        Index("idx_referraltracking_device", "device_id"),
        # Prevent same user from being referred multiple times
        Index("idx_referraltracking_unique_user", "referred_user_id", unique=True),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    referred_user_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    )
    referral_code_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("referralcode.id", ondelete="CASCADE"), nullable=False)
    )
    referrer_user_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    )
    signup_date: datetime = Field(default_factory=datetime.now)
    creation_date: datetime = Field(default_factory=datetime.now)


class ReferralTrackingRead(ReferralTrackingBase):
    """Response model for referral tracking"""
    id: int
    referred_user_id: int
    referral_code_id: int
    referrer_user_id: int
    signup_date: datetime
    creation_date: datetime


class ReferralTrackingCreate(SQLModel):
    """Model for creating referral tracking"""
    referred_user_id: int
    referral_code_id: int
    referrer_user_id: int
    ip_address: str
    device_id: Optional[str] = None
    browser_fingerprint: dict = {}
