from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from openai import BaseModel
from sqlmodel import JSON, BigInteger, Column, Field, ForeignKey, SQLModel


class PaymentStatusEnum(str, Enum):
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
    discount_code_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            BigInteger, ForeignKey("discountcode.id", ondelete="SET NULL")
        ),
    )
    referral_code_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            BigInteger, ForeignKey("referralcode.id", ondelete="SET NULL")
        ),
    )
    original_amount: Optional[float] = None
    discount_amount: Optional[float] = None
    final_amount: Optional[float] = None


class PaymentsUser(PaymentsUserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
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
    creation_date: datetime = Field(default=datetime.now(timezone.utc))
    update_date: datetime = Field(default=datetime.now(timezone.utc))
