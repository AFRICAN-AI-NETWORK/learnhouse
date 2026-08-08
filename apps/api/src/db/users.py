from pydantic import BaseModel, EmailStr, validator
from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

from src.db.roles import RoleRead
from src.security.phone_validation import validate_e164_phone_number


class UserBase(SQLModel):
    username: str
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str | None = None
    avatar_image: str | None = ""
    bio: str | None = ""
    details: dict | None = Field(default={}, sa_column=Column(JSON))
    profile: dict | None = Field(default={}, sa_column=Column(JSON))

    @validator("phone_number", pre=True, always=False)
    def validate_phone_number(cls, value):
        return validate_e164_phone_number(value, required=False)


class UserCreate(UserBase):
    first_name: str = ""
    last_name: str = ""
    password: str
    is_waitlist: bool | None = False
    waitlist_interest: str | None = None
    # Referral system fields
    referral_code: str | None = None  # Optional referral code during signup
    device_id: str | None = None  # Device fingerprint hash
    browser_fingerprint: dict | None = None  # Full browser fingerprint
    signup_type: str | None = "student"  # "student" or "partner"


class SignupUserCreate(UserCreate):
    phone_number: str

    @validator("phone_number", pre=True, always=True)
    def validate_required_phone_number(cls, value):
        return validate_e164_phone_number(value, required=True)


class UserUpdate(UserBase):
    username: str
    first_name: str | None
    last_name: str | None
    email: str
    phone_number: str | None = None
    avatar_image: str | None = ""
    bio: str | None = ""
    details: dict | None = {}
    profile: dict | None = {}


class UserUpdatePassword(SQLModel):
    old_password: str
    new_password: str


class UserRead(UserBase):
    id: int
    user_uuid: str
    user_status: str | None = "ACTIVE"
    email_verified: bool = False
    waitlist_interest: str | None = None


class PublicUser(UserRead):
    pass


class UserRoleWithOrg(BaseModel):
    from src.db.organizations import OrganizationRead

    role: RoleRead
    org: OrganizationRead


class UserSession(BaseModel):
    user: UserRead
    roles: list[UserRoleWithOrg]


class AnonymousUser(SQLModel):
    id: int = 0
    user_uuid: str = "user_anonymous"
    username: str = "anonymous"


class InternalUser(SQLModel):
    id: int = 0
    user_uuid: str = "user_internal"
    username: str = "internal"


class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    password: str = ""
    user_uuid: str = ""
    email_verified: bool = False
    user_status: str = Field(default="ACTIVE", index=True)
    waitlist_interest: str | None = None
    waitlist_joined_date: str | None = None
    waitlist_activated_date: str | None = None
    # Referral system fields
    referral_commission_balance: float = Field(default=0.0)
    has_referral_code: bool = Field(default=False)
    creation_date: str = ""
    update_date: str = ""
