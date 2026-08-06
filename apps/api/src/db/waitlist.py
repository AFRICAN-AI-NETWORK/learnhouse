from enum import Enum

from sqlalchemy import Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


class UserStatusEnum(str, Enum):
    """User account status enumeration"""

    ACTIVE = "ACTIVE"
    WAITLIST = "WAITLIST"
    WAITLIST_ACTIVATED = "WAITLIST_ACTIVATED"
    SUSPENDED = "SUSPENDED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


class WaitlistStatusEnum(str, Enum):
    """Waitlist campaign status enumeration"""

    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    SCHEDULED = "SCHEDULED"


# ==================== WaitlistConfig Models ====================


class WaitlistConfigBase(SQLModel):
    """Base model for waitlist configuration"""

    name: str
    description: str | None = None
    interest_category: str
    launch_datetime: str  # ISO 8601 format
    batch_size: int = Field(default=50, ge=1, le=1000)
    batch_delay_seconds: int = Field(default=2, ge=0, le=60)


class WaitlistConfig(WaitlistConfigBase, table=True):
    """Database model for waitlist configuration"""

    __tablename__ = "waitlist_config"

    id: int | None = Field(default=None, primary_key=True)
    waitlist_uuid: str = Field(unique=True, index=True)
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    created_by_user_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")),
    )
    status: str = Field(default=WaitlistStatusEnum.ACTIVE.value)
    total_registrations: int = Field(default=0)
    emails_sent_count: int = Field(default=0)
    creation_date: str = ""
    update_date: str = ""
    activation_date: str | None = None


class WaitlistConfigCreate(SQLModel):
    """Request model for creating a waitlist"""

    org_id: int
    name: str
    interest_category: str
    launch_datetime: str
    description: str | None = None
    batch_size: int | None = 50
    batch_delay_seconds: int | None = 2


class WaitlistConfigUpdate(SQLModel):
    """Request model for updating a waitlist"""

    name: str | None = None
    description: str | None = None
    launch_datetime: str | None = None
    batch_size: int | None = None
    batch_delay_seconds: int | None = None
    status: str | None = None


class WaitlistConfigRead(WaitlistConfigBase):
    """Response model for reading waitlist configuration"""

    id: int
    waitlist_uuid: str
    org_id: int
    created_by_user_id: int | None
    status: str
    total_registrations: int
    emails_sent_count: int
    creation_date: str
    update_date: str
    activation_date: str | None


# ==================== WaitlistEmailLog Models ====================


class WaitlistEmailLogBase(SQLModel):
    """Base model for email log tracking"""

    email_sent: bool = False
    email_error: str | None = None
    retry_count: int = 0


class WaitlistEmailLog(WaitlistEmailLogBase, table=True):
    """Database model for tracking email delivery"""

    __tablename__ = "waitlist_email_log"

    id: int | None = Field(default=None, primary_key=True)
    waitlist_config_id: int = Field(
        sa_column=Column(Integer, ForeignKey("waitlist_config.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    email_sent_date: str | None = None
    creation_date: str = ""
    update_date: str = ""


class WaitlistEmailLogCreate(SQLModel):
    """Request model for creating email log entry"""

    waitlist_config_id: int
    user_id: int


class WaitlistEmailLogRead(WaitlistEmailLogBase):
    """Response model for reading email log"""

    id: int
    waitlist_config_id: int
    user_id: int
    email_sent_date: str | None
    creation_date: str
    update_date: str


# ==================== WaitlistCoursePreference Models ====================


class WaitlistCoursePreferenceBase(SQLModel):
    """Base model for course preference tracking"""



class WaitlistCoursePreference(WaitlistCoursePreferenceBase, table=True):
    """Database model for storing user course preferences during waitlist registration"""

    __tablename__ = "waitlist_course_preference"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))
    )
    payments_product_id: int = Field(
        sa_column=Column(Integer, ForeignKey("paymentsproduct.id", ondelete="CASCADE"))
    )
    waitlist_config_id: int = Field(
        sa_column=Column(Integer, ForeignKey("waitlist_config.id", ondelete="CASCADE"))
    )
    org_id: int = Field(
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: str = ""


class WaitlistCoursePreferenceCreate(SQLModel):
    """Request model for creating course preference"""

    user_id: int
    payments_product_id: int
    waitlist_config_id: int
    org_id: int


class WaitlistCoursePreferenceRead(WaitlistCoursePreferenceBase):
    """Response model for reading course preference"""

    id: int
    user_id: int
    payments_product_id: int
    waitlist_config_id: int
    org_id: int
    product_name: str | None = None  # Denormalized for display
    creation_date: str
