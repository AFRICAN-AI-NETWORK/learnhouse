from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from sqlmodel import Session, select

from src.db.chat.messages import MessageCreate, MessageUpdate, MessageRead
from src.db.chat.attachments import MessageAttachmentRead
from src.db.chat.conversations import Conversation
from src.db.organizations import Organization
from src.services.chat.message_service import MessageService
from src.core.events.database import get_db_session
from src.security.auth import get_current_user
from src.db.users import User

router = APIRouter()






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


@router.post("/{message_uuid}/attachments", response_model=MessageAttachmentRead, include_in_schema=False)
async def upload_attachment(
    message_uuid: str,
    file: UploadFile = File(...),
    org_id: int = Query(..., description="Organisation ID"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Upload a file attachment to a message.

    Stores the file using the shared upload pipeline (filesystem or S3)
    and returns the attachment metadata with a relative file_url that can
    be fetched from /content/...
    """
    from src.services.chat.attachment_service import AttachmentService
    from src.db.chat.messages import Message

    # ── Resolve org_uuid from org_id ─────────────────────────────────────────
    org = db.exec(select(Organization).where(Organization.id == org_id)).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found"
        )

    # ── Resolve conversation_uuid from the message ───────────────────────────
    message = db.exec(
        select(Message).where(Message.message_uuid == message_uuid)
    ).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Message not found"
        )

    conversation = db.exec(
        select(Conversation).where(Conversation.id == message.conversation_id)
    ).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    # ── Delegate to service ──────────────────────────────────────────────────
    attachment = await AttachmentService.upload_attachment(
        db=db,
        message_uuid=message_uuid,
        file=file,
        user_id=current_user.id,
        org_uuid=org.org_uuid,
        org_id=org.id,
        conversation_uuid=conversation.conversation_uuid,
    )

    return attachment


@router.post("/send", response_model=MessageRead)
async def send_message_with_attachment(
    org_id: int = Query(..., description="Organisation ID"),
    conversation_id: str = Query(..., description="Conversation UUID (conv_xxx) or integer ID"),
    receiver_id: int = Query(..., description="Recipient user ID"),
    content: str = Query(default="", description="Text content — optional when sending a file"),
    message_type: str = Query(default="auto", description="'text', 'file', 'image', 'video', 'document', or 'auto' (auto-detected)"),
    reply_to_message_id: Optional[int] = Query(default=None, description="ID of message being replied to (0 = no reply)"),
    file: Optional[UploadFile] = File(default=None, description="Optional file attachment"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Single unified send endpoint — replaces POST /messages/.

    Handles all cases in one request (WhatsApp-style):
    - Text only         : content="hello", no file
    - File only         : no content, file=<upload>
    - Text + file       : content="see this", file=<upload>
    - Reply             : reply_to_message_id=<id>
    - Start with a file : no pre-existing message_uuid needed

    message_type defaults to 'auto':
      - 'file'  when only a file is provided
      - 'text'  when content is provided (with or without a file)
    Set it explicitly to override (e.g. 'image', 'video', 'document').

    reply_to_message_id=0 is treated as no reply (same as null).
    """
    from src.services.chat.attachment_service import AttachmentService

    # ── Validate: need at least text or file ──────────────────────────────────
    if not content.strip() and file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide at least a text message or a file attachment",
        )

    # ── Resolve org ───────────────────────────────────────────────────────────
    org = db.exec(select(Organization).where(Organization.id == org_id)).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found")

    # ── Resolve conversation upfront (conversation_id can be int or UUID string) ──
    conversation = None
    if conversation_id:
        # Try to parse as integer first
        try:
            conv_int_id = int(conversation_id)
            conversation = db.exec(
                select(Conversation).where(Conversation.id == conv_int_id)
            ).first()
        except ValueError:
            # It's a UUID string (conv_xxx format)
            conversation = db.exec(
                select(Conversation).where(Conversation.conversation_uuid == conversation_id)
            ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Conversation not found"
            )

    # ── Normalise reply_to (0 → None, mirrors existing create_message logic) ──
    reply_to: Optional[int] = None if (reply_to_message_id is None or reply_to_message_id == 0) else reply_to_message_id

    # ── Auto-detect message_type ──────────────────────────────────────────────
    resolved_type = message_type
    if message_type == "auto":
        resolved_type = "file" if (file is not None and not content.strip()) else "text"

    # ── Create message ────────────────────────────────────────────────────────
    message_data = MessageCreate(
        conversation_id=conversation_id,
        receiver_id=receiver_id,
        content=content.strip() or "📎",  # placeholder for file-only messages
        message_type=resolved_type,
        reply_to_message_id=reply_to,
    )
    message = await MessageService.create_message(
        db=db,
        message_data=message_data,
        sender_id=current_user.id,
        org_id=org_id,
    )

    # ── Upload attachment if provided ─────────────────────────────────────────
    attachment_data = None
    if file is not None:
        # Use the conversation we already resolved upfront
        if conversation:
            attachment = await AttachmentService.upload_attachment(
                db=db,
                message_uuid=message.message_uuid,
                file=file,
                user_id=current_user.id,
                org_uuid=org.org_uuid,
                org_id=org.id,
                conversation_uuid=conversation.conversation_uuid,
            )
            attachment_data = {
                "attachment_uuid": attachment.attachment_uuid,
                "file_name": attachment.file_name,
                "file_type": attachment.file_type,
                "file_size": attachment.file_size,
                "file_url": attachment.file_url,
                "upload_status": attachment.upload_status,
            }
            
            # Update the message response to include the attachment
            message.attachments = [attachment_data]

    # ── WebSocket notification ────────────────────────────────────────────────
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
                    "message_type": message.message_type,
                    "reply_to_message_id": reply_to,
                    "attachment": attachment_data,
                    "created_at": message.created_at.isoformat(),
                },
            },
            message.receiver_id,
        )
    except Exception as e:
        import logging
        logging.warning(f"Failed to send WebSocket notification: {e}")

    return message

