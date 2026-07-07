"""
Marketer KYC database models
Identity verification — KYC must be VERIFIED before a marketer can request a
payout. Government ID number is stored only as a SHA-256 hash and enforced
unique at the DB level so one person cannot create two marketer accounts.
Document files are stored as S3 keys (never public URLs).
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import (
    Field,
    SQLModel,
    Column,
    BigInteger,
    ForeignKey,
    Index,
    Text,
    UniqueConstraint,
)

MAX_KYC_SUBMISSIONS = 3


class KYCStatus(str, Enum):
    """KYC verification status"""

    UNVERIFIED = "unverified"
    PENDING_REVIEW = "pending_review"
    VERIFIED = "verified"
    REJECTED = "rejected"


class KYCDocumentType(str, Enum):
    """Accepted government ID document types"""

    NATIONAL_ID = "national_id"
    PASSPORT = "passport"
    DRIVERS_LICENSE = "drivers_license"


class MarketerKYCBase(SQLModel):
    """Base model for marketer KYC records"""

    document_type: KYCDocumentType
    status: KYCStatus = Field(default=KYCStatus.UNVERIFIED)
    submission_count: int = Field(default=0)
    reviewed_at: Optional[datetime] = None


class MarketerKYC(MarketerKYCBase, table=True):
    """Marketer KYC table"""

    __tablename__ = "marketerkyc"
    __table_args__ = (
        # Hard anti-duplication guarantee: same government ID cannot appear twice
        UniqueConstraint("id_number_hash", name="uq_kyc_id_number_hash"),
        Index("idx_kyc_marketer", "marketer_id"),
        Index("idx_kyc_status_org", "org_id", "status"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
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
    # SHA-256 hex of the government ID number (uppercase, trimmed). Never plaintext.
    id_number_hash: str = Field(max_length=64)
    # S3 keys, not public URLs — signed on demand for admin review only
    document_front_url: str = Field(max_length=500)
    document_back_url: Optional[str] = Field(default=None, max_length=500)
    selfie_url: str = Field(max_length=500)
    rejection_reason: Optional[str] = Field(default=None, sa_column=Column(Text))
    reviewed_by_user_id: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("user.id", ondelete="SET NULL")),
    )
    creation_date: datetime = Field(default_factory=datetime.now)
    update_date: datetime = Field(default_factory=datetime.now)


class MarketerKYCRead(MarketerKYCBase):
    """Response model for marketers — no document URLs, no hash"""

    id: int
    marketer_id: int
    rejection_reason: Optional[str]
    creation_date: datetime
    update_date: datetime


class MarketerKYCAdminRead(MarketerKYCRead):
    """Response model for admin review — includes reviewer attribution"""

    user_id: int
    org_id: int
    reviewed_by_user_id: Optional[int]
