"""
Referrer Payout Request database models
Manages payout requests from referrers with Paystack integration
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import (JSON, BigInteger, Column, Field, ForeignKey, Index,
                      SQLModel, Text)


class PayoutStatus(str, Enum):
    """Status of payout request"""

    REQUESTED = "requested"  # User submits payout request
    APPROVED = "APPROVED"  # Admin explicitly approves payout
    PROCESSING = "processing"  # Balance reserved, Paystack API called
    COMPLETED = "completed"  # Payout successful
    FAILED = "failed"  # Payout failed


class ReferrerPayoutRequestBase(SQLModel):
    """Base model for payout requests"""

    total_amount: float = Field(ge=1.0)  # Minimum $1 USD
    currency: str = Field(default="USD", max_length=3)
    converted_amount: Optional[float] = None
    status: PayoutStatus = Field(default=PayoutStatus.REQUESTED)
    paystack_transfer_recipient_code: Optional[str] = Field(
        default=None, max_length=255
    )
    paystack_transfer_code: Optional[str] = Field(default=None, max_length=255)
    bank_account_info: dict = Field(
        default={}, sa_column=Column(JSON)
    )  # Encrypted bank details
    request_date: datetime = Field(default_factory=datetime.now)
    completion_date: Optional[datetime] = None
    failure_reason: Optional[str] = Field(default=None, sa_column=Column(Text))


class ReferrerPayoutRequest(ReferrerPayoutRequestBase, table=True):
    """Referrer payout request table"""

    __tablename__ = "referrerpayoutrequest"
    __table_args__ = (
        Index("idx_payoutrequest_referrer_status", "referrer_user_id", "status"),
        Index("idx_payoutrequest_org", "org_id"),
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
    creation_date: datetime = Field(default_factory=datetime.now)
    update_date: datetime = Field(default_factory=datetime.now)


class ReferrerPayoutRequestRead(ReferrerPayoutRequestBase):
    """Response model for payout requests"""

    id: int
    org_id: int
    referrer_user_id: int
    creation_date: datetime
    update_date: datetime


class ReferrerPayoutRequestCreate(SQLModel):
    """Model for creating payout request"""

    org_id: int
    amount: float
    bank_details: (
        dict  # Contains bank_name, account_number, account_holder, account_type
    )
    currency: str = "USD"


class ReferrerPayoutRequestUpdate(SQLModel):
    """Model for updating payout request"""

    status: Optional[PayoutStatus] = None
    paystack_transfer_recipient_code: Optional[str] = None
    paystack_transfer_code: Optional[str] = None
    converted_amount: Optional[float] = None
    completion_date: Optional[datetime] = None
    failure_reason: Optional[str] = None


class BankDetails(SQLModel):
    """Bank account details for payouts"""

    bank_name: str
    account_number: str
    account_holder: str
    account_type: str  # "savings" or "current"
    bank_code: Optional[str] = (
        None  # Bank code for Paystack (e.g., "044" for Access Bank)
    )
