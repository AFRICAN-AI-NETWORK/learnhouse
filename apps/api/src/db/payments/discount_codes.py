from datetime import datetime
from enum import StrEnum

from sqlmodel import BigInteger, Column, Field, ForeignKey, SQLModel


class DiscountTypeEnum(StrEnum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class DiscountCodeBase(SQLModel):
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    code: str = Field(index=True, max_length=50)
    discount_type: DiscountTypeEnum
    discount_value: float  # Percentage (0-100) or fixed amount
    max_uses: int | None = None  # None means unlimited
    current_uses: int = Field(default=0)
    valid_from: datetime
    valid_until: datetime | None = None
    is_active: bool = Field(default=True)
    description: str | None = None
    course_id: int | None = Field(
        default=None,
        sa_column=Column(
            BigInteger, ForeignKey("course.id", ondelete="CASCADE"), nullable=True
        ),
    )
    product_id: int | None = Field(
        default=None,
        sa_column=Column(
            BigInteger,
            ForeignKey("paymentsproduct.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )


class DiscountCode(DiscountCodeBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DiscountCodeCreate(SQLModel):
    code: str = Field(max_length=50)
    discount_type: DiscountTypeEnum
    discount_value: float
    max_uses: int | None = None
    valid_from: datetime
    valid_until: datetime | None = None
    description: str | None = None
    course_id: int | None = None
    product_id: int | None = None


class DiscountCodeRead(DiscountCodeBase):
    id: int
    created_at: datetime
    updated_at: datetime


class DiscountCodeUpdate(SQLModel):
    discount_value: float | None = None
    max_uses: int | None = None
    valid_until: datetime | None = None
    is_active: bool | None = None
    description: str | None = None
    course_id: int | None = None
    product_id: int | None = None


class DiscountCodeUsageBase(SQLModel):
    discount_code_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("discountcode.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("user.id", ondelete="CASCADE"))
    )
    course_id: int | None = Field(
        default=None,
        sa_column=Column(
            BigInteger, ForeignKey("course.id", ondelete="CASCADE"), nullable=True
        ),
    )
    product_id: int | None = Field(
        default=None,
        sa_column=Column(
            BigInteger,
            ForeignKey("paymentsproduct.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    payment_user_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("paymentsuser.id", ondelete="CASCADE"))
    )
    original_amount: float
    discount_amount: float
    final_amount: float


class DiscountCodeUsage(DiscountCodeUsageBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    used_at: datetime = Field(default_factory=datetime.utcnow)


class DiscountCodeUsageRead(DiscountCodeUsageBase):
    id: int
    used_at: datetime
