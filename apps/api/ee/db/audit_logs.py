from datetime import datetime
from typing import Any

from sqlmodel import JSON, Column, Field, ForeignKey, Integer, SQLModel


class AuditLogBase(SQLModel):
    user_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")),
    )
    org_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="SET NULL")),
    )
    action: str
    resource: str
    resource_id: str | None = None
    method: str
    path: str
    status_code: int
    payload: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    ip_address: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AuditLog(AuditLogBase, table=True):
    id: int | None = Field(default=None, primary_key=True)


class AuditLogRead(AuditLogBase):
    id: int
    username: str | None = None
    avatar_url: str | None = None


class AuditLogPaginated(SQLModel):
    items: list[AuditLogRead]
    total: int
    limit: int
    offset: int
