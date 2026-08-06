from enum import Enum

from pydantic import BaseModel
from sqlalchemy import JSON, Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


# Rights
class Permission(BaseModel):
    action_create: bool
    action_read: bool
    action_update: bool
    action_delete: bool

    def __getitem__(self, item):
        return getattr(self, item)


class PermissionsWithOwn(BaseModel):
    action_create: bool
    action_read: bool
    action_read_own: bool
    action_update: bool
    action_update_own: bool
    action_delete: bool
    action_delete_own: bool

    def __getitem__(self, item):
        return getattr(self, item)


class DashboardPermission(BaseModel):
    action_access: bool

    def __getitem__(self, item):
        return getattr(self, item)


class AffiliationPermission(BaseModel):
    action_read: bool = False

    def __getitem__(self, item):
        return getattr(self, item)


class Rights(BaseModel):
    courses: PermissionsWithOwn
    users: Permission
    usergroups: Permission
    collections: Permission
    organizations: Permission
    coursechapters: Permission
    activities: Permission
    roles: Permission
    communications: Permission
    # Defaulted (unlike the fields above) so already-stored role rows from
    # before this field existed still deserialize without a migration.
    announcements: Permission = Permission(
        action_create=False, action_read=True, action_update=False, action_delete=False
    )
    dashboard: DashboardPermission
    affiliation: AffiliationPermission = AffiliationPermission()

    def __getitem__(self, item):
        return getattr(self, item)


# Database Models


class RoleTypeEnum(str, Enum):
    TYPE_ORGANIZATION = "TYPE_ORGANIZATION"  # Organization roles are associated with an organization, they are used to define the rights of a user in an organization
    # Organization API Token roles are associated with an organization, they are used to define the rights of an API Token in an organization.
    TYPE_ORGANIZATION_API_TOKEN = "TYPE_ORGANIZATION_API_TOKEN"  # nosec B105
    TYPE_GLOBAL = "TYPE_GLOBAL"  # Global roles are not associated with an organization, they are used to define the default rights of a user


class RoleBase(SQLModel):
    name: str
    description: str | None
    rights: Rights | dict | None = Field(default={}, sa_column=Column(JSON))


class Role(RoleBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    org_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE")),
    )
    role_type: RoleTypeEnum = RoleTypeEnum.TYPE_GLOBAL
    role_uuid: str = ""
    creation_date: str = ""
    update_date: str = ""


class RoleRead(RoleBase):
    id: int | None = Field(default=None, primary_key=True)
    org_id: int = Field(default=None, foreign_key="organization.id")
    role_type: RoleTypeEnum = RoleTypeEnum.TYPE_GLOBAL
    role_uuid: str
    creation_date: str
    update_date: str


class RoleCreate(RoleBase):
    org_id: int | None = Field(default=None, foreign_key="organization.id")


class RoleUpdate(SQLModel):
    role_id: int = Field(default=None, foreign_key="role.id")
    name: str | None
    description: str | None
    rights: Rights | dict | None = Field(default={}, sa_column=Column(JSON))
