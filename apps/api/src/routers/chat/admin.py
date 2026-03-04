from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, func
from sqlalchemy.orm import aliased
from datetime import datetime

from src.db.chat.conversations import Conversation
from src.db.chat.messages import Message
from src.core.events.database import get_db_session
from src.security.auth import get_current_user
from src.db.users import User
from src.services.chat.audit import get_audit_logs

router = APIRouter()


async def verify_admin_permission(
    current_user: User,
    org_id: int,
    db: Session
) -> bool:
    """Verify user has admin privileges in the organization."""
    from src.db.user_organizations import UserOrganization
    from src.db.roles import Role
    
    # Get user's role in organization
    user_org = db.exec(
        select(UserOrganization)
        .where(UserOrganization.user_id == current_user.id)
        .where(UserOrganization.org_id == org_id)
    ).first()
    
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this organization"
        )
    
    # Get role details
    role = db.get(Role, user_org.role_id)
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not found"
        )
    
    # Check if user has admin or maintainer role
    role_name = role.name.lower()
    if role_name not in ['admin', 'maintainer']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or maintainer privileges required"
        )
    
    return True


@router.get("/conversations", response_model=List[dict])
async def get_all_org_conversations(
    org_id: int = Query(..., description="Organization ID"),
    limit: int = Query(50, le=100, description="Number of conversations to return"),
    offset: int = Query(0, description="Offset for pagination"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get all conversations in organization (Admin only).
    """
    
    # Verify admin permission
    await verify_admin_permission(current_user, org_id, db)
    
    # Use a single joined query to avoid N+1 problem
    ParticipantOne = aliased(User)
    ParticipantTwo = aliased(User)

    query = (
        select(
            Conversation,
            ParticipantOne,
            ParticipantTwo,
            func.count(Message.id).label('message_count')
        )
        .join(ParticipantOne, Conversation.participant_one_id == ParticipantOne.id)
        .join(ParticipantTwo, Conversation.participant_two_id == ParticipantTwo.id)
        .outerjoin(
            Message,
            (Message.conversation_id == Conversation.id) & (Message.is_deleted == False)
        )
        .where(Conversation.org_id == org_id)
        .group_by(Conversation.id, ParticipantOne.id, ParticipantTwo.id)
        .order_by(Conversation.last_message_at.desc().nullslast())
        .offset(offset)
        .limit(limit)
    )

    results = db.exec(query).all()

    enriched = []
    for conv, p1, p2, message_count in results:
        enriched.append({
            "conversation_uuid": conv.conversation_uuid,
            "participant_one": {
                "id": p1.id,
                "username": p1.username,
                "name": f"{p1.first_name} {p1.last_name}".strip()
            },
            "participant_two": {
                "id": p2.id,
                "username": p2.username,
                "name": f"{p2.first_name} {p2.last_name}".strip()
            },
            "message_count": message_count,
            "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
            "is_archived": conv.is_archived,
            "created_at": conv.created_at.isoformat()
        })

    return enriched


@router.get("/conversations/{conversation_uuid}/export")
async def export_conversation(
    conversation_uuid: str,
    org_id: int = Query(..., description="Organization ID"),
    format: str = Query("json", regex="^(json|csv)$", description="Export format"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """
    Export conversation for compliance/archival (Admin only).
    """
    
    # Verify admin permission
    await verify_admin_permission(current_user, org_id, db)
    
    # Get conversation
    conversation = db.exec(
        select(Conversation)
        .where(Conversation.conversation_uuid == conversation_uuid)
        .where(Conversation.org_id == org_id)
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Get all messages (including deleted ones for audit)
    messages = db.exec(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    ).all()
    
    # Get participants
    participant_one = db.get(User, conversation.participant_one_id)
    participant_two = db.get(User, conversation.participant_two_id)
    
    if format == "json":
        export_data = {
            "conversation_uuid": conversation.conversation_uuid,
            "exported_at": datetime.utcnow().isoformat(),
            "exported_by": current_user.username,
            "participants": [
                {
                    "id": participant_one.id,
                    "username": participant_one.username,
                    "name": f"{participant_one.first_name} {participant_one.last_name}".strip()
                },
                {
                    "id": participant_two.id,
                    "username": participant_two.username,
                    "name": f"{participant_two.first_name} {participant_two.last_name}".strip()
                }
            ] if participant_one and participant_two else [],
            "messages": [
                {
                    "message_uuid": msg.message_uuid,
                    "sender_id": msg.sender_id,
                    "content": msg.content if not msg.is_deleted else "[Deleted]",
                    "message_type": msg.message_type,
                    "is_edited": msg.is_edited,
                    "is_deleted": msg.is_deleted,
                    "created_at": msg.created_at.isoformat(),
                    "edited_at": msg.edited_at.isoformat() if msg.edited_at else None
                }
                for msg in messages
            ]
        }
        
        return JSONResponse(content=export_data)
    
    elif format == "csv":
        # CSV format implementation
        import csv
        from io import StringIO
        from fastapi.responses import StreamingResponse
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow([
            "Message UUID", "Sender ID", "Content", "Type", 
            "Created At", "Is Edited", "Is Deleted"
        ])
        
        # Write data
        for msg in messages:
            writer.writerow([
                msg.message_uuid,
                msg.sender_id,
                msg.content if not msg.is_deleted else "[Deleted]",
                msg.message_type,
                msg.created_at.isoformat(),
                msg.is_edited,
                msg.is_deleted
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=conversation_{conversation_uuid}.csv"
            }
        )


@router.get("/audit-logs", response_model=List[dict])
async def get_chat_audit_logs(
    org_id: int = Query(..., description="Organization ID"),
    action: str = Query(None, description="Filter by action type"),
    user_id: int = Query(None, description="Filter by user ID"),
    limit: int = Query(100, le=500, description="Number of logs to return"),
    offset: int = Query(0, description="Offset for pagination"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get chat audit logs (Admin only).
    """
    
    # Verify admin permission
    await verify_admin_permission(current_user, org_id, db)
    
    # Get audit logs
    logs = await get_audit_logs(
        db=db,
        org_id=org_id,
        user_id=user_id,
        action=action,
        limit=limit,
        offset=offset
    )
    
    return [
        {
            "log_uuid": log.log_uuid,
            "user_id": log.user_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "metadata": log.action_metadata,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]


@router.get("/stats", response_model=dict)
async def get_chat_statistics(
    org_id: int = Query(..., description="Organization ID"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get chat statistics for the organization (Admin only).
    """
    
    # Verify admin permission
    await verify_admin_permission(current_user, org_id, db)
    
    # Get statistics
    total_conversations = db.exec(
        select(func.count(Conversation.id))
        .where(Conversation.org_id == org_id)
    ).one()
    
    active_conversations = db.exec(
        select(func.count(Conversation.id))
        .where(Conversation.org_id == org_id)
        .where(Conversation.is_archived == False)
    ).one()
    
    total_messages = db.exec(
        select(func.count(Message.id))
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.org_id == org_id)
    ).one()
    
    messages_today = db.exec(
        select(func.count(Message.id))
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(Conversation.org_id == org_id)
        .where(Message.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0))
    ).one()
    
    return {
        "total_conversations": total_conversations,
        "active_conversations": active_conversations,
        "archived_conversations": total_conversations - active_conversations,
        "total_messages": total_messages,
        "messages_today": messages_today
    }
