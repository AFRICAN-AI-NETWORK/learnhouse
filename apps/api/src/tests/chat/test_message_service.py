"""Unit tests for message service."""

from datetime import datetime

import pytest
from fastapi import HTTPException
from sqlmodel import Session

from src.db.chat.conversations import Conversation
from src.db.chat.messages import Message, MessageCreate, MessageUpdate
from src.db.organizations import Organization
from src.db.users import User
from src.services.chat.message_service import (MessageService,
                                               ReadReceiptService)


class TestCreateMessage:
    """Test message creation."""

    @pytest.mark.asyncio
    async def test_create_message_success(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation,
    ):
        """Test creating a new message."""
        message_data = MessageCreate(
            conversation_id=conversation.conversation_uuid,
            receiver_id=instructor_user.id,
            content="Hello, instructor!",
            message_type="text",
        )

        message = await MessageService.create_message(
            db=session,
            message_data=message_data,
            sender_id=student_user.id,
            org_id=org.id,
        )

        assert message is not None
        assert message.message_uuid.startswith("msg_")
        assert message.sender_id == student_user.id
        assert message.receiver_id == instructor_user.id
        assert message.content == "Hello, instructor!"
        assert message.is_edited is False
        assert message.is_deleted is False

    @pytest.mark.asyncio
    async def test_create_message_with_integer_conversation_id(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation,
    ):
        """Test creating message with integer conversation ID."""
        message_data = MessageCreate(
            conversation_id=conversation.id,  # Integer ID
            receiver_id=instructor_user.id,
            content="Test message",
            message_type="text",
        )

        message = await MessageService.create_message(
            db=session,
            message_data=message_data,
            sender_id=student_user.id,
            org_id=org.id,
        )

        assert message is not None
        # Service resolves integer conversation_id to UUID in the response
        assert message.conversation_id == conversation.conversation_uuid

    @pytest.mark.asyncio
    async def test_create_message_normalizes_reply_to_zero(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation,
    ):
        """Test that reply_to_message_id of 0 is normalized to None."""
        message_data = MessageCreate(
            conversation_id=conversation.conversation_uuid,
            receiver_id=instructor_user.id,
            content="Test reply",
            message_type="text",
            reply_to_message_id=0,  # Should be normalized to None
        )

        message = await MessageService.create_message(
            db=session,
            message_data=message_data,
            sender_id=student_user.id,
            org_id=org.id,
        )

        # MessageRead doesn't expose reply_to_message_id, verify via DB lookup
        from sqlmodel import select

        db_message = session.exec(
            select(Message).where(Message.message_uuid == message.message_uuid)
        ).first()
        assert db_message.reply_to_message_id is None

    @pytest.mark.asyncio
    async def test_create_message_with_valid_reply_to(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation,
        message: Message,
    ):
        """Test creating a reply to an existing message."""
        message_data = MessageCreate(
            conversation_id=conversation.conversation_uuid,
            receiver_id=student_user.id,
            content="Reply message",
            message_type="text",
            reply_to_message_id=message.id,
        )

        reply = await MessageService.create_message(
            db=session,
            message_data=message_data,
            sender_id=instructor_user.id,
            org_id=org.id,
        )

        # MessageRead doesn't expose reply_to_message_id, verify via DB lookup
        from sqlmodel import select

        db_reply = session.exec(
            select(Message).where(Message.message_uuid == reply.message_uuid)
        ).first()
        assert db_reply.reply_to_message_id == message.id

    @pytest.mark.asyncio
    async def test_create_message_updates_conversation_timestamp(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation,
    ):
        """Test that creating message updates conversation last_message_at."""
        original_timestamp = conversation.last_message_at

        message_data = MessageCreate(
            conversation_id=conversation.conversation_uuid,
            receiver_id=instructor_user.id,
            content="Test message",
            message_type="text",
        )

        await MessageService.create_message(
            db=session,
            message_data=message_data,
            sender_id=student_user.id,
            org_id=org.id,
        )

        # Refresh conversation
        session.refresh(conversation)

        assert conversation.last_message_at is not None
        if original_timestamp:
            assert conversation.last_message_at >= original_timestamp

    @pytest.mark.asyncio
    async def test_create_message_creates_delivery_receipt(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation,
    ):
        """Test that creating message creates delivery receipt."""
        message_data = MessageCreate(
            conversation_id=conversation.conversation_uuid,
            receiver_id=instructor_user.id,
            content="Test message",
            message_type="text",
        )

        message = await MessageService.create_message(
            db=session,
            message_data=message_data,
            sender_id=student_user.id,
            org_id=org.id,
        )

        # Check delivery receipt exists
        receipt = await ReadReceiptService.get_read_receipt(
            db=session, message_id=message.id, user_id=instructor_user.id
        )

        assert receipt is not None
        assert receipt.delivered_at is not None
        assert receipt.read_at is None

    @pytest.mark.asyncio
    async def test_create_message_nonexistent_conversation_raises_error(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
    ):
        """Test that nonexistent conversation raises error."""
        message_data = MessageCreate(
            conversation_id="conv_nonexistent",
            receiver_id=instructor_user.id,
            content="Test message",
            message_type="text",
        )

        with pytest.raises(HTTPException) as exc_info:
            await MessageService.create_message(
                db=session,
                message_data=message_data,
                sender_id=student_user.id,
                org_id=org.id,
            )

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_create_message_sender_not_participant_raises_error(
        self,
        session: Session,
        org: Organization,
        student_user_two: User,
        instructor_user: User,
        conversation: Conversation,
    ):
        """Test that sender must be conversation participant."""
        message_data = MessageCreate(
            conversation_id=conversation.conversation_uuid,
            receiver_id=instructor_user.id,
            content="Test message",
            message_type="text",
        )

        # student_user_two is not a participant in this conversation
        with pytest.raises(HTTPException) as exc_info:
            await MessageService.create_message(
                db=session,
                message_data=message_data,
                sender_id=student_user_two.id,
                org_id=org.id,
            )

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_create_message_invalid_receiver_raises_error(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        student_user_two: User,
        conversation: Conversation,
    ):
        """Test that receiver must be the other participant."""
        message_data = MessageCreate(
            conversation_id=conversation.conversation_uuid,
            receiver_id=student_user_two.id,  # Not the other participant
            content="Test message",
            message_type="text",
        )

        with pytest.raises(HTTPException) as exc_info:
            await MessageService.create_message(
                db=session,
                message_data=message_data,
                sender_id=student_user.id,
                org_id=org.id,
            )

        assert exc_info.value.status_code == 400


class TestGetConversationMessages:
    """Test retrieving conversation messages."""

    @pytest.mark.asyncio
    async def test_get_messages_empty_conversation(
        self, session: Session, student_user: User, conversation: Conversation
    ):
        """Test getting messages from empty conversation."""
        messages = await MessageService.get_conversation_messages(
            db=session,
            conversation_id=conversation.conversation_uuid,
            user_id=student_user.id,
            limit=50,
            before_message_id=None,
        )

        assert messages == []

    @pytest.mark.asyncio
    async def test_get_messages_returns_messages(
        self,
        session: Session,
        student_user: User,
        conversation: Conversation,
        message: Message,
    ):
        """Test getting messages from conversation."""
        messages = await MessageService.get_conversation_messages(
            db=session,
            conversation_id=conversation.conversation_uuid,
            user_id=student_user.id,
            limit=50,
            before_message_id=None,
        )

        assert len(messages) == 1
        assert messages[0].id == message.id

    @pytest.mark.asyncio
    async def test_get_messages_pagination_with_before_id(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation,
    ):
        """Test message pagination using before_message_id."""
        from uuid import uuid4

        # Create multiple messages
        message_ids = []
        for i in range(5):
            msg = Message(
                message_uuid=f"msg_{uuid4()}",
                conversation_id=conversation.id,
                sender_id=student_user.id,
                receiver_id=instructor_user.id,
                content=f"Message {i}",
                message_type="text",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(msg)
            session.commit()
            session.refresh(msg)
            message_ids.append(msg.id)

        # Get first 3 messages
        messages = await MessageService.get_conversation_messages(
            db=session,
            conversation_id=conversation.conversation_uuid,
            user_id=student_user.id,
            limit=3,
            before_message_id=None,
        )

        assert len(messages) <= 3

        # Get messages before the oldest one we have
        if len(messages) > 0:
            oldest_id = min([m.id for m in messages])
            earlier_messages = await MessageService.get_conversation_messages(
                db=session,
                conversation_id=conversation.conversation_uuid,
                user_id=student_user.id,
                limit=3,
                before_message_id=oldest_id,
            )

            # Should not include the message with oldest_id
            earlier_ids = [m.id for m in earlier_messages]
            assert oldest_id not in earlier_ids

    @pytest.mark.asyncio
    async def test_get_messages_excludes_deleted(
        self,
        session: Session,
        student_user: User,
        conversation: Conversation,
        message: Message,
    ):
        """Test that deleted messages are excluded."""
        # Delete the message
        message.is_deleted = True
        session.add(message)
        session.commit()

        messages = await MessageService.get_conversation_messages(
            db=session,
            conversation_id=conversation.conversation_uuid,
            user_id=student_user.id,
            limit=50,
            before_message_id=None,
        )

        assert len(messages) == 0

    @pytest.mark.asyncio
    async def test_get_messages_unauthorized_user_raises_error(
        self, session: Session, student_user_two: User, conversation: Conversation
    ):
        """Test that non-participant cannot get messages."""
        with pytest.raises(HTTPException) as exc_info:
            await MessageService.get_conversation_messages(
                db=session,
                conversation_id=conversation.conversation_uuid,
                user_id=student_user_two.id,  # Not a participant
                limit=50,
                before_message_id=None,
            )

        assert exc_info.value.status_code == 403


class TestEditMessage:
    """Test message editing."""

    @pytest.mark.asyncio
    async def test_edit_message_success(
        self, session: Session, student_user: User, message: Message
    ):
        """Test editing a message."""
        update_data = MessageUpdate(content="Updated content")

        updated_message = await MessageService.edit_message(
            db=session,
            message_uuid=message.message_uuid,
            user_id=student_user.id,
            update_data=update_data,
        )

        assert updated_message.content == "Updated content"
        assert updated_message.is_edited is True
        assert updated_message.edited_at is not None

    @pytest.mark.asyncio
    async def test_edit_message_creates_history(
        self, session: Session, student_user: User, message: Message
    ):
        """Test that editing creates edit history."""
        from sqlmodel import select

        from src.db.chat.messages import MessageEditHistory

        original_content = message.content
        update_data = MessageUpdate(content="Updated content")

        await MessageService.edit_message(
            db=session,
            message_uuid=message.message_uuid,
            user_id=student_user.id,
            update_data=update_data,
        )

        # Check edit history exists
        history = session.exec(
            select(MessageEditHistory).where(
                MessageEditHistory.message_id == message.id
            )
        ).first()

        assert history is not None
        assert history.previous_content == original_content
        assert history.edited_by_user_id == student_user.id

    @pytest.mark.asyncio
    async def test_edit_message_unauthorized_user_raises_error(
        self, session: Session, instructor_user: User, message: Message
    ):
        """Test that only sender can edit message."""
        update_data = MessageUpdate(content="Hacked content")

        with pytest.raises(HTTPException) as exc_info:
            await MessageService.edit_message(
                db=session,
                message_uuid=message.message_uuid,
                user_id=instructor_user.id,  # Not the sender
                update_data=update_data,
            )

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_edit_nonexistent_message_raises_error(
        self, session: Session, student_user: User
    ):
        """Test editing non-existent message raises error."""
        update_data = MessageUpdate(content="Updated content")

        with pytest.raises(HTTPException) as exc_info:
            await MessageService.edit_message(
                db=session,
                message_uuid="msg_nonexistent",
                user_id=student_user.id,
                update_data=update_data,
            )

        assert exc_info.value.status_code == 404


class TestDeleteMessage:
    """Test message deletion."""

    @pytest.mark.asyncio
    async def test_delete_message_success(
        self, session: Session, student_user: User, message: Message
    ):
        """Test soft deleting a message."""
        deleted_message = await MessageService.delete_message(
            db=session, message_uuid=message.message_uuid, user_id=student_user.id
        )

        assert deleted_message.is_deleted is True
        assert deleted_message.deleted_at is not None
        assert deleted_message.deleted_by_user_id == student_user.id

    @pytest.mark.asyncio
    async def test_delete_message_unauthorized_user_raises_error(
        self, session: Session, instructor_user: User, message: Message
    ):
        """Test that only sender can delete message."""
        with pytest.raises(HTTPException) as exc_info:
            await MessageService.delete_message(
                db=session,
                message_uuid=message.message_uuid,
                user_id=instructor_user.id,  # Not the sender
            )

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_nonexistent_message_raises_error(
        self, session: Session, student_user: User
    ):
        """Test deleting non-existent message raises error."""
        with pytest.raises(HTTPException) as exc_info:
            await MessageService.delete_message(
                db=session, message_uuid="msg_nonexistent", user_id=student_user.id
            )

        assert exc_info.value.status_code == 404


class TestReadReceiptService:
    """Test read receipt functionality."""

    @pytest.mark.asyncio
    async def test_mark_message_as_read(
        self, session: Session, instructor_user: User, message: Message
    ):
        """Test marking a message as read."""
        receipt = await ReadReceiptService.mark_as_read(
            db=session, message_uuid=message.message_uuid, user_id=instructor_user.id
        )

        assert receipt is not None
        assert receipt.message_id == message.id
        assert receipt.user_id == instructor_user.id
        assert receipt.read_at is not None

    @pytest.mark.asyncio
    async def test_mark_nonexistent_message_returns_none(
        self, session: Session, instructor_user: User
    ):
        """Test marking non-existent message returns None."""
        receipt = await ReadReceiptService.mark_as_read(
            db=session, message_uuid="msg_nonexistent", user_id=instructor_user.id
        )

        assert receipt is None

    @pytest.mark.asyncio
    async def test_get_read_receipt(
        self, session: Session, instructor_user: User, message: Message
    ):
        """Test getting read receipt for a message."""
        # First mark as read
        await ReadReceiptService.mark_as_read(
            db=session, message_uuid=message.message_uuid, user_id=instructor_user.id
        )

        # Then retrieve receipt
        receipt = await ReadReceiptService.get_read_receipt(
            db=session, message_id=message.id, user_id=instructor_user.id
        )

        assert receipt is not None
        assert receipt.read_at is not None
