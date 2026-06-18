from typing import List, Optional
from datetime import datetime
from uuid import uuid4
from sqlmodel import Session, select
from fastapi import HTTPException, status
import logging

from src.db.chat.messages import (
    Message,
    MessageCreate,
    MessageUpdate,
    MessageRead,
    MessageEditHistory,
    MessageReadReceipt,
)
from src.db.chat.conversations import Conversation
from src.db.chat.attachments import MessageAttachment

logger = logging.getLogger(__name__)


class ReadReceiptService:
    """Service for managing message read receipts."""

    @staticmethod
    async def create_delivery_receipt(
        db: Session, message_id: int, user_id: int
    ) -> MessageReadReceipt:
        """Create delivery receipt when message is sent."""

        receipt = MessageReadReceipt(
            message_id=message_id, user_id=user_id, delivered_at=datetime.utcnow()
        )

        db.add(receipt)
        db.commit()
        db.refresh(receipt)

        return receipt

    @staticmethod
    async def mark_as_read(
        db: Session, message_uuid: str, user_id: int
    ) -> Optional[MessageReadReceipt]:
        """Mark message as read."""

        # Get message
        message = db.exec(
            select(Message).where(Message.message_uuid == message_uuid)
        ).first()

        if not message:
            return None

        # Get or create receipt
        receipt = db.exec(
            select(MessageReadReceipt)
            .where(MessageReadReceipt.message_id == message.id)
            .where(MessageReadReceipt.user_id == user_id)
        ).first()

        if not receipt:
            receipt = MessageReadReceipt(
                message_id=message.id, user_id=user_id, delivered_at=datetime.utcnow()
            )

        receipt.read_at = datetime.utcnow()

        db.add(receipt)
        db.commit()
        db.refresh(receipt)

        return receipt

    @staticmethod
    async def get_read_receipt(
        db: Session, message_id: int, user_id: int
    ) -> Optional[MessageReadReceipt]:
        """Get read receipt for a message."""

        receipt = db.exec(
            select(MessageReadReceipt)
            .where(MessageReadReceipt.message_id == message_id)
            .where(MessageReadReceipt.user_id == user_id)
        ).first()

        return receipt


class MessageService:
    """Service for managing messages."""

    @staticmethod
    async def create_message(
        db: Session, message_data: MessageCreate, sender_id: int, org_id: int
    ) -> Message:
        """Create a new message."""

        # Resolve conversation ID (accept UUID or integer)
        conversation_identifier = message_data.conversation_id

        # Check if it's a UUID string (starts with 'conv_')
        if isinstance(conversation_identifier, str):
            if conversation_identifier.startswith("conv_"):
                # Look up by UUID
                conversation = db.exec(
                    select(Conversation)
                    .where(Conversation.conversation_uuid == conversation_identifier)
                    .where(Conversation.org_id == org_id)
                ).first()
            else:
                # String number, try to convert to integer
                try:
                    conv_id = int(conversation_identifier)
                    conversation = db.exec(
                        select(Conversation)
                        .where(Conversation.id == conv_id)
                        .where(Conversation.org_id == org_id)
                    ).first()
                except (ValueError, TypeError):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid conversation_id format. Must be a UUID (conv_xxx) or integer.",
                    )
        else:
            # Integer ID
            conversation = db.exec(
                select(Conversation)
                .where(Conversation.id == conversation_identifier)
                .where(Conversation.org_id == org_id)
            ).first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
            )

        # Verify sender is participant
        if sender_id not in [
            conversation.participant_one_id,
            conversation.participant_two_id,
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to send message in this conversation",
            )

        # Verify receiver is the other participant
        expected_receiver_id = (
            conversation.participant_two_id
            if conversation.participant_one_id == sender_id
            else conversation.participant_one_id
        )

        if message_data.receiver_id != expected_receiver_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid receiver for this conversation",
            )

        # Normalize reply_to_message_id: convert 0 to None
        reply_to_id = message_data.reply_to_message_id
        if reply_to_id == 0:
            reply_to_id = None

        # Create message with the resolved integer conversation ID
        new_message = Message(
            message_uuid=f"msg_{uuid4()}",
            conversation_id=conversation.id,  # Use the resolved integer ID
            sender_id=sender_id,
            receiver_id=message_data.receiver_id,
            content=message_data.content,
            message_type=message_data.message_type,
            reply_to_message_id=reply_to_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        db.add(new_message)

        # Update conversation last_message_at
        conversation.last_message_at = datetime.utcnow()
        conversation.updated_at = datetime.utcnow()
        db.add(conversation)

        db.commit()
        db.refresh(new_message)

        # Create delivery receipt
        await ReadReceiptService.create_delivery_receipt(
            db, new_message.id, message_data.receiver_id
        )

        # Send notification
        try:
            from src.services.chat.notification_service import NotificationService

            await NotificationService.send_message_notification(db, new_message)
        except Exception as e:
            # Don't fail message creation if notification fails
            logger.warning(f"Failed to send notification: {e}")

        # Log audit
        try:
            from src.services.chat.audit import log_chat_action

            await log_chat_action(
                db=db,
                org_id=org_id,
                user_id=sender_id,
                action="message_sent",
                resource_type="message",
                resource_id=new_message.message_uuid,
                metadata={
                    "conversation_id": conversation.conversation_uuid,
                    "message_type": message_data.message_type,
                },
            )
        except Exception as e:
            logger.warning(f"Failed to log audit: {e}")

        logger.info(
            f"Message {new_message.message_uuid} created in conversation {conversation.conversation_uuid}"
        )

        # Fetch replied message data if this is a reply
        replied_message_data = None
        if reply_to_id:
            replied_msg = db.exec(
                select(Message).where(Message.id == reply_to_id)
            ).first()
            if replied_msg:
                replied_message_data = {
                    "message_uuid": replied_msg.message_uuid,
                    "content": replied_msg.content
                    if not replied_msg.is_deleted
                    else "[Deleted message]",
                    "sender_id": replied_msg.sender_id,
                    "created_at": replied_msg.created_at.isoformat(),
                    "is_deleted": replied_msg.is_deleted,
                }

        # Return MessageRead with conversation UUID
        return MessageRead(
            id=new_message.id,
            conversation_id=conversation.conversation_uuid,  # Return UUID instead of int
            sender_id=new_message.sender_id,
            receiver_id=new_message.receiver_id,
            content=new_message.content,
            message_type=new_message.message_type,
            message_uuid=new_message.message_uuid,
            is_edited=new_message.is_edited,
            is_deleted=new_message.is_deleted,
            created_at=new_message.created_at,
            updated_at=new_message.updated_at,
            attachments=[],
            read_receipt=None,
            reply_to_message_id=reply_to_id,
            replied_message=replied_message_data,
        )

    @staticmethod
    async def get_conversation_messages(
        db: Session,
        conversation_id: str,
        user_id: int,
        limit: int = 50,
        before_message_id: Optional[int] = None,
    ) -> List[MessageRead]:
        """
        Get messages for a conversation with pagination.
        Accepts conversation UUID (conv_xxx) or integer ID.
        """

        # Get conversation - handle both UUID and integer ID
        conversation = None
        try:
            # Try as integer first
            conv_int_id = int(conversation_id)
            conversation = db.exec(
                select(Conversation).where(Conversation.id == conv_int_id)
            ).first()
        except ValueError:
            # It's a UUID string
            conversation = db.exec(
                select(Conversation).where(
                    Conversation.conversation_uuid == conversation_id
                )
            ).first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
            )

        # Verify user is participant
        if user_id not in [
            conversation.participant_one_id,
            conversation.participant_two_id,
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this conversation",
            )

        # Build query
        query = (
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .where(Message.is_deleted == False)
        )

        if before_message_id:
            query = query.where(Message.id < before_message_id)

        query = query.order_by(Message.created_at.desc()).limit(limit)

        messages = db.exec(query).all()

        # Get all message IDs for batch fetching
        message_ids = [msg.id for msg in messages]

        # Batch fetch attachments
        attachments_dict = {}
        if message_ids:
            attachments_query = select(MessageAttachment).where(
                MessageAttachment.message_id.in_(message_ids)
            )
            attachments = db.exec(attachments_query).all()
            for att in attachments:
                if att.message_id not in attachments_dict:
                    attachments_dict[att.message_id] = []
                attachments_dict[att.message_id].append(att.dict())

        # Batch fetch read receipts
        receipts_dict = {}
        if message_ids:
            # Get other participant ID
            other_participant_id = (
                conversation.participant_two_id
                if conversation.participant_one_id == user_id
                else conversation.participant_one_id
            )

            receipts_query = select(MessageReadReceipt).where(
                MessageReadReceipt.message_id.in_(message_ids),
                MessageReadReceipt.user_id == other_participant_id,
            )
            receipts = db.exec(receipts_query).all()
            for receipt in receipts:
                receipts_dict[receipt.message_id] = receipt.dict()

        # Batch fetch replied messages
        replied_messages_dict = {}
        reply_ids = [
            msg.reply_to_message_id for msg in messages if msg.reply_to_message_id
        ]
        if reply_ids:
            replied_query = select(Message).where(Message.id.in_(reply_ids))
            replied_messages = db.exec(replied_query).all()
            for replied_msg in replied_messages:
                replied_messages_dict[replied_msg.id] = {
                    "message_uuid": replied_msg.message_uuid,
                    "content": replied_msg.content
                    if not replied_msg.is_deleted
                    else "[Deleted message]",
                    "sender_id": replied_msg.sender_id,
                    "created_at": replied_msg.created_at.isoformat(),
                    "is_deleted": replied_msg.is_deleted,
                }

        # Enrich messages with conversation UUID and other data
        enriched_messages = []
        for msg in messages:
            enriched_msg = MessageRead(
                id=msg.id,
                conversation_id=conversation.conversation_uuid,  # Use UUID instead of integer ID
                sender_id=msg.sender_id,
                receiver_id=msg.receiver_id,
                content=msg.content,
                message_type=msg.message_type,
                message_uuid=msg.message_uuid,
                is_edited=msg.is_edited,
                is_deleted=msg.is_deleted,
                created_at=msg.created_at,
                updated_at=msg.updated_at,
                attachments=attachments_dict.get(msg.id, []),
                read_receipt=receipts_dict.get(msg.id),
                reply_to_message_id=msg.reply_to_message_id,
                replied_message=replied_messages_dict.get(msg.reply_to_message_id)
                if msg.reply_to_message_id
                else None,
            )
            enriched_messages.append(enriched_msg)

        return enriched_messages

    @staticmethod
    async def edit_message(
        db: Session, message_uuid: str, user_id: int, update_data: MessageUpdate
    ) -> Message:
        """Edit a message."""

        # Get message
        message = db.exec(
            select(Message).where(Message.message_uuid == message_uuid)
        ).first()

        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Message not found"
            )

        # Verify user is sender
        if message.sender_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to edit this message",
            )

        # Save edit history
        edit_history = MessageEditHistory(
            message_id=message.id,
            previous_content=message.content,
            edited_by_user_id=user_id,
            edited_at=datetime.utcnow(),
        )
        db.add(edit_history)

        # Update message
        message.content = update_data.content
        message.is_edited = True
        message.edited_at = datetime.utcnow()
        message.updated_at = datetime.utcnow()

        db.add(message)
        db.commit()
        db.refresh(message)

        logger.info(f"Message {message_uuid} edited by user {user_id}")

        return message

    @staticmethod
    async def delete_message(db: Session, message_uuid: str, user_id: int) -> Message:
        """Soft delete a message."""

        # Get message
        message = db.exec(
            select(Message).where(Message.message_uuid == message_uuid)
        ).first()

        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Message not found"
            )

        # Verify user is sender
        if message.sender_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this message",
            )

        # Soft delete
        message.is_deleted = True
        message.deleted_at = datetime.utcnow()
        message.deleted_by_user_id = user_id
        message.updated_at = datetime.utcnow()

        db.add(message)
        db.commit()
        db.refresh(message)

        logger.info(f"Message {message_uuid} deleted by user {user_id}")

        return message
