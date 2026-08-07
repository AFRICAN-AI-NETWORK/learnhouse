from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import JSON, TypeDecorator
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlmodel import BigInteger, Column, Field, ForeignKey, SQLModel


# PaymentsConfig
class PaymentProviderEnum(StrEnum):
    FLUTTERWAVE = "flutterwave"


class PaymentProviderEnumType(TypeDecorator):
    """Custom type to ensure enum values (not names) are stored in the database."""

    impl = PG_ENUM
    cache_ok = True

    def __init__(self):
        # Only include 'flutterwave' since that's the only value in the database
        super().__init__(
            "flutterwave",  # Only flutterwave is valid in the database enum
            name="paymentproviderenum",
            create_type=True,
        )

    def process_bind_param(self, value, dialect):
        """Convert enum to its value when storing."""
        if value is None:
            return None
        if isinstance(value, PaymentProviderEnum):
            return value.value  # Return 'flutterwave', not 'FLUTTERWAVE'
        return value

    def process_result_value(self, value, dialect):
        """Convert string from DB back to enum."""
        if value is None:
            return None
        # Find the enum member by value
        for member in PaymentProviderEnum:
            if member.value == value:
                return member
        return value


class PaymentsConfigBase(SQLModel):
    enabled: bool = True
    active: bool = False
    provider: PaymentProviderEnum = Field(
        default=PaymentProviderEnum.FLUTTERWAVE,
        sa_column=Column(PaymentProviderEnumType(), nullable=False),
    )
    provider_specific_id: str | None = None
    provider_config: dict = Field(default={}, sa_column=Column(JSON))


class PaymentsConfig(PaymentsConfigBase, table=True):
    __tablename__ = "payments_config"

    id: int | None = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: datetime = Field(default=datetime.now(UTC))
    update_date: datetime = Field(default=datetime.now(UTC))


class PaymentsConfigCreate(PaymentsConfigBase):
    pass


class PaymentsConfigUpdate(PaymentsConfigBase):
    enabled: bool | None = None
    active: bool | None = None
    provider_config: dict | None = None
    provider_specific_id: str | None = None


class PaymentsConfigRead(PaymentsConfigBase):
    id: int
    org_id: int
    creation_date: datetime
    update_date: datetime


class PaymentsConfigDelete(SQLModel):
    id: int
