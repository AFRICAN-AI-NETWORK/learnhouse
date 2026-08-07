from datetime import UTC, datetime
from enum import StrEnum

from sqlmodel import BigInteger, Column, Field, ForeignKey, SQLModel, String


class PaymentProductTypeEnum(StrEnum):
    SUBSCRIPTION = "subscription"
    ONE_TIME = "one_time"


class PaymentPriceTypeEnum(StrEnum):
    CUSTOMER_CHOICE = "customer_choice"
    FIXED_PRICE = "fixed_price"


class PaymentIntervalEnum(StrEnum):
    MONTHLY = "monthly"
    YEARLY = "yearly"
    WEEKLY = "weekly"
    DAILY = "daily"


class PaymentsProductBase(SQLModel):
    name: str = ""
    description: str | None = ""
    product_type: PaymentProductTypeEnum = PaymentProductTypeEnum.ONE_TIME
    price_type: PaymentPriceTypeEnum = PaymentPriceTypeEnum.FIXED_PRICE
    benefits: str = ""
    amount: float = 0.0
    currency: str = "USD"
    interval: PaymentIntervalEnum | None = None
    trial_days: int = 0


class PaymentsProduct(PaymentsProductBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    payments_config_id: int = Field(
        sa_column=Column(
            BigInteger, ForeignKey("payments_config.id", ondelete="CASCADE")
        )
    )
    provider_product_id: str = Field(sa_column=Column(String))
    creation_date: datetime = Field(default=datetime.now(UTC))
    update_date: datetime = Field(default=datetime.now(UTC))


class PaymentsProductCreate(PaymentsProductBase):
    provider_product_id: str | None = None


class PaymentsProductUpdate(PaymentsProductBase):
    pass


class PaymentsProductRead(PaymentsProductBase):
    id: int
    org_id: int
    payments_config_id: int
    creation_date: datetime
    update_date: datetime
