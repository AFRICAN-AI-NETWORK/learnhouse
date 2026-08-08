"""
Marketer Payment Method database models
Saved payout destinations (bank transfer or mobile money) so marketers do not
re-enter bank details on every payout. One active method per marketer at a time.
Account details are Fernet-encrypted; only masked summaries leave the API.
"""

from datetime import datetime
from enum import StrEnum

from sqlmodel import BigInteger, Column, Field, ForeignKey, Index, SQLModel, Text


class PaymentMethodType(StrEnum):
    """Supported payout destination types"""

    BANK_TRANSFER = "bank_transfer"
    MOBILE_MONEY = "mobile_money"


class MarketerPaymentMethodBase(SQLModel):
    """Base model for marketer payment methods"""

    payment_method_type: PaymentMethodType
    currency: str = Field(max_length=3)
    country_code: str = Field(max_length=2)
    is_active: bool = Field(default=True)
    verified_at: datetime | None = None


class MarketerPaymentMethod(MarketerPaymentMethodBase, table=True):
    """Marketer payment method table"""

    __tablename__ = "marketerpaymentmethod"
    __table_args__ = (
        Index("idx_payment_method_marketer_active", "marketer_id", "is_active"),
        Index("idx_payment_method_user", "user_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    marketer_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("marketer.id", ondelete="CASCADE"), nullable=False
        )
    )
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

    account_details: str = Field(sa_column=Column(Text, nullable=False))
    flutterwave_beneficiary_id: str | None = Field(default=None, max_length=255)
    creation_date: datetime = Field(default_factory=datetime.now)
    update_date: datetime = Field(default_factory=datetime.now)


class MarketerPaymentMethodCreate(SQLModel):
    """Model for saving a payment method"""

    payment_method_type: PaymentMethodType
    country_code: str = Field(max_length=2)
    account_details: dict  # Plaintext from client — encrypted before storage


class MarketerPaymentMethodRead(MarketerPaymentMethodBase):
    """Masked response model — never exposes full account details"""

    id: int
    marketer_id: int
    # Masked summary, e.g. "****1234" (bank) or "****5678" (mobile money)
    masked_account: str
    account_holder: str | None = None
    bank_name: str | None = None
    provider: str | None = None
    has_cached_recipient: bool = False
    creation_date: datetime
