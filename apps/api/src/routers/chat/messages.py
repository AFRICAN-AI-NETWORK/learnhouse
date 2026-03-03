from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlmodel import Session

from src.db.chat.messages import MessageCreate, MessageUpdate, MessageRead
from src.services.chat.message_service import MessageService
from src.core.events.database import get_db_session
from src.security.auth import get_current_user
from src.db.users import User

router = APIRouter()


@router.post("/", response_model=MessageRead)
async def send_message(
    message_data: MessageCreate,
    org_id: int = Query(..., description="Organization ID"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Send a new message."""
    message = await MessageService.create_message(
        db=db,
        message_data=message_data,
        sender_id=current_user.id,
        org_id=org_id
    )
    
    # Trigger WebSocket notification
    try:
        from src.services.chat.websocket_manager import connection_manager
        await connection_manager.send_personal_message(
            {
                "type": "new_message",
                "data": {
                    "message_uuid": message.message_uuid,
                    "conversation_id": message.conversation_id,
                    "sender_id": message.sender_id,
                    "content": message.content,
                    "created_at": message.created_at.isoformat()
                }
            },
            message.receiver_id
        )
    except Exception as e:
        # Don't fail the request if WebSocket notification fails
        import logging
        logging.warning(f"Failed to send WebSocket notification: {e}")
    
    return message


@router.get("/conversation/{conversation_uuid}", response_model=List[MessageRead])
async def get_conversation_messages(
    conversation_uuid: str,
    before_message_id: Optional[int] = Query(None, description="Get messages before this ID"),
    limit: int = Query(50, le=100, description="Number of messages to return"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Get messages for a conversation (paginated)."""
    messages = await MessageService.get_conversation_messages(
        db=db,
        conversation_uuid=conversation_uuid,
        user_id=current_user.id,
        limit=limit,
        before_message_id=before_message_id
    )
    return messages


@router.patch("/{message_uuid}", response_model=MessageRead)
async def edit_message(
    message_uuid: str,
    update_data: MessageUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Edit a message."""
    message = await MessageService.edit_message(
        db=db,
        message_uuid=message_uuid,
        user_id=current_user.id,
        update_data=update_data
    )
    
    # Notify via WebSocket
    try:
        from src.services.chat.websocket_manager import connection_manager
        await connection_manager.send_personal_message(
            {
                "type": "message_edited",
                "data": {
                    "message_uuid": message.message_uuid,
                    "content": message.content,
                    "is_edited": True,
                    "edited_at": message.edited_at.isoformat() if message.edited_at else None
                }
            },
            message.receiver_id
        )
    except Exception as e:
        import logging
        logging.warning(f"Failed to send WebSocket notification: {e}")
    
    return message


@router.delete("/{message_uuid}")
async def delete_message(
    message_uuid: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a message."""
    message = await MessageService.delete_message(
        db=db,
        message_uuid=message_uuid,
        user_id=current_user.id
    )
    
    # Notify via WebSocket
    try:
        from src.services.chat.websocket_manager import connection_manager
        await connection_manager.send_personal_message(
            {
                "type": "message_deleted",
                "data": {"message_uuid": message_uuid}
            },
            message.receiver_id
        )
    except Exception as e:
        import logging
        logging.warning(f"Failed to send WebSocket notification: {e}")
    
    return {"message": "Message deleted successfully"}


@router.post("/{message_uuid}/read")
async def mark_message_as_read(
    message_uuid: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Mark a message as read."""
    from src.services.chat.message_service import ReadReceiptService
    
    receipt = await ReadReceiptService.mark_as_read(
        db=db,
        message_uuid=message_uuid,
        user_id=current_user.id
    )
    
    if receipt:
        return {"message": "Message marked as read", "read_at": receipt.read_at}
    else:
        return {"message": "Message not found"}


@router.post("/{message_uuid}/attachments")
async def upload_attachment(
    message_uuid: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Upload file attachment to a message."""
    from src.services.chat.attachment_service import AttachmentService
    
    attachment = await AttachmentService.upload_attachment(
        db=db,
        message_uuid=message_uuid,
        file=file,
        user_id=current_user.id
    )
    
    return {
        "attachment_uuid": attachment.attachment_uuid,
        "file_name": attachment.file_name,
        "file_type": attachment.file_type,
        "file_size": attachment.file_size,
        "file_url": attachment.file_url,
        "thumbnail_url": attachment.thumbnail_url,
        "upload_status": attachment.upload_status
    }

