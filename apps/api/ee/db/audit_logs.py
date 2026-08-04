from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlmodel import JSON, Column, Field, ForeignKey, Integer, SQLModel


class AuditLogBase(SQLModel):
    user_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")),
    )
    org_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("organization.id", ondelete="SET NULL")),
    )
    action: str
    resource: str
    resource_id: Optional[str] = None
    method: str
    path: str
    status_code: int
    payload: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AuditLog(AuditLogBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)


class AuditLogRead(AuditLogBase):
    id: int
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class AuditLogPaginated(SQLModel):
    items: List[AuditLogRead]
    total: int
    limit: int
    offset: int
