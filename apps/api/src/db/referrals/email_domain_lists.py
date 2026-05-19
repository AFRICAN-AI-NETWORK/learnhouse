"""
Database Models for Email Domain Lists (Fraud Prevention)
Stores disposable and legitimate email domains dynamically
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from sqlmodel import Field, SQLModel


class DomainListType(str, Enum):
    """Type of domain list"""

    DISPOSABLE = "disposable"  # Known disposable/temporary email providers
    LEGITIMATE = "legitimate"  # Trusted legitimate email providers


class EmailDomainList(SQLModel, table=True):
    """
    Email domain list for fraud prevention
    Stores both disposable and legitimate email domains
    """

    __tablename__ = "emaildomainlist"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Domain name (e.g., "gmail.com", "10minutemail.com")
    domain: str = Field(index=True, max_length=255)

    # Type of domain (disposable or legitimate)
    list_type: DomainListType = Field(index=True)

    # Source of this entry (e.g., "github:disposable", "manual", "config")
    source: str = Field(default="manual", max_length=100)

    # Is this entry active (allows soft deletion)
    is_active: bool = Field(default=True, index=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Last verified date (when external source was last checked)
    last_verified_at: Optional[datetime] = None

    class Config:
        use_enum_values = True
