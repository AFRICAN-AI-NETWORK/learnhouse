import logging
from datetime import UTC, datetime
from uuid import uuid4

from sqlmodel import Session

from src.db.chat.audit import ChatAuditLog

logger = logging.getLogger(__name__)


async def log_chat_action(
    db: Session,
    org_id: int,
    user_id: int | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
):
    """
    Create an audit log entry for a chat action.

    Args:
        db: Database session
        org_id: Organization ID
        user_id: User who performed the action (optional for system actions)
        action: Action type (e.g., 'message_sent', 'message_edited', 'message_deleted')
        resource_type: Type of resource (e.g., 'message', 'conversation', 'attachment')
        resource_id: UUID of the resource affected
        metadata: Additional context data
        ip_address: IP address of the user
        user_agent: User agent string
    """

    try:
        audit_log = ChatAuditLog(
            log_uuid=f"audit_{uuid4()}",
            org_id=org_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            action_metadata=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.now(UTC),
        )

        db.add(audit_log)
        db.commit()

        logger.debug(
            f"Audit log created: {action} on {resource_type} by user {user_id}"
        )

    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to create audit log: {e}")
        # Don't raise exception - audit logging should not break functionality


async def get_audit_logs(
    db: Session,
    org_id: int,
    user_id: int | None = None,
    action: str | None = None,
    resource_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    """
    Retrieve audit logs with filtering.

    Args:
        db: Database session
        org_id: Organization ID
        user_id: Filter by specific user
        action: Filter by action type
        resource_type: Filter by resource type
        limit: Maximum number of records
        offset: Pagination offset

    Returns:
        List of audit log records
    """
    from sqlmodel import select

    query = select(ChatAuditLog).where(ChatAuditLog.org_id == org_id)

    if user_id:
        query = query.where(ChatAuditLog.user_id == user_id)

    if action:
        query = query.where(ChatAuditLog.action == action)

    if resource_type:
        query = query.where(ChatAuditLog.resource_type == resource_type)

    query = query.order_by(ChatAuditLog.created_at.desc()).offset(offset).limit(limit)

    results = db.exec(query).all()
    return list(results)
