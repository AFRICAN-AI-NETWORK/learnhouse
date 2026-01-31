from datetime import datetime
from enum import Enum
from typing import  Optional
from sqlalchemy import JSON, TypeDecorator
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlmodel import Field, SQLModel, Column, BigInteger, ForeignKey

# PaymentsConfig 
class PaymentProviderEnum(str, Enum):
    PAYSTACK = "paystack"


class PaymentProviderEnumType(TypeDecorator):
    """Custom type to ensure enum values (not names) are stored in the database."""
    impl = PG_ENUM
    cache_ok = True
    
    def __init__(self):
        # Include all possible enum values that exist in the database
        # The database has 'STRIPE' and 'paystack', but we only use 'paystack'
        super().__init__(
            'STRIPE', 'paystack',  # All enum values in the database
            name='paymentproviderenum',
            create_type=False
        )
    
    def process_bind_param(self, value, dialect):
        """Convert enum to its value when storing."""
        if value is None:
            return None
        if isinstance(value, PaymentProviderEnum):
            return value.value  # Return 'paystack', not 'PAYSTACK'
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
        default=PaymentProviderEnum.PAYSTACK,
        sa_column=Column(
            PaymentProviderEnumType(),
            nullable=False
        )
    )
    provider_specific_id: str | None = None
    provider_config: dict = Field(default={}, sa_column=Column(JSON))


class PaymentsConfig(PaymentsConfigBase, table=True):
    __tablename__ = "payments_config"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: datetime = Field(default=datetime.now())
    update_date: datetime = Field(default=datetime.now())


class PaymentsConfigCreate(PaymentsConfigBase):
    pass


class PaymentsConfigUpdate(PaymentsConfigBase):
    enabled: Optional[bool] = True
    provider_config: Optional[dict] = None
    provider_specific_id: Optional[str] = None


class PaymentsConfigRead(PaymentsConfigBase):
    id: int
    org_id: int
    creation_date: datetime
    update_date: datetime


class PaymentsConfigDelete(SQLModel):
    id: int