from datetime import UTC, datetime
from enum import StrEnum

from openai import BaseModel
from sqlmodel import JSON, BigInteger, Column, Field, ForeignKey, SQLModel


class PaymentStatusEnum(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    ACTIVE = "active"
    CANCELLED = "cancelled"
    FAILED = "failed"
    REFUNDED = "refunded"


class ProviderSpecificData(BaseModel):
    flutterwave_customer: dict | None = None
    customer_code: str | None = None
    flutterwave_tx_ref: str | None = None
    custom_customer: dict | None = None


class PaymentsUserBase(SQLModel):
    status: PaymentStatusEnum = PaymentStatusEnum.PENDING
    provider_specific_data: dict = Field(default={}, sa_column=Column(JSON))
    discount_code_id: int | None = Field(
        default=None,
        sa_column=Column(
            BigInteger, ForeignKey("discountcode.id", ondelete="SET NULL")
        ),
    )
    referral_code_id: int | None = Field(
        default=None,
        sa_column=Column(
            BigInteger, ForeignKey("referralcode.id", ondelete="SET NULL")
        ),
    )
    original_amount: float | None = None
    discount_amount: float | None = None
    final_amount: float | None = None


class PaymentsUser(PaymentsUserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("user.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    payment_product_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("paymentsproduct.id", ondelete="CASCADE")
        )
    )
    creation_date: datetime = Field(default=datetime.now(UTC))
    update_date: datetime = Field(default=datetime.now(UTC))
