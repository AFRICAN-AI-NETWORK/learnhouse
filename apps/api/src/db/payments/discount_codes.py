from sqlmodel import SQLModel, Field, Column, BigInteger, ForeignKey
from typing import Optional
from datetime import datetime
from enum import Enum


class DiscountTypeEnum(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class DiscountCodeBase(SQLModel):
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    code: str = Field(index=True, max_length=50)
    discount_type: DiscountTypeEnum
    discount_value: float  # Percentage (0-100) or fixed amount
    max_uses: Optional[int] = None  # None means unlimited
    current_uses: int = Field(default=0)
    valid_from: datetime
    valid_until: Optional[datetime] = None
    is_active: bool = Field(default=True)
    description: Optional[str] = None
    course_id: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("course.id", ondelete="CASCADE"), nullable=True)
    )


class DiscountCode(DiscountCodeBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DiscountCodeCreate(SQLModel):
    code: str = Field(max_length=50)
    discount_type: DiscountTypeEnum
    discount_value: float
    max_uses: Optional[int] = None
    valid_from: datetime
    valid_until: Optional[datetime] = None
    description: Optional[str] = None
    course_id: Optional[int] = None


class DiscountCodeRead(DiscountCodeBase):
    id: int
    created_at: datetime
    updated_at: datetime


class DiscountCodeUpdate(SQLModel):
    discount_value: Optional[float] = None
    max_uses: Optional[int] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None
    course_id: Optional[int] = None


class DiscountCodeUsageBase(SQLModel):
    discount_code_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("discountcode.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("user.id", ondelete="CASCADE"))
    )
    course_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("course.id", ondelete="CASCADE"))
    )
    payment_user_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("paymentsuser.id", ondelete="CASCADE"))
    )
    original_amount: float
    discount_amount: float
    final_amount: float


class DiscountCodeUsage(DiscountCodeUsageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    used_at: datetime = Field(default_factory=datetime.utcnow)


class DiscountCodeUsageRead(DiscountCodeUsageBase):
    id: int
    used_at: datetime
