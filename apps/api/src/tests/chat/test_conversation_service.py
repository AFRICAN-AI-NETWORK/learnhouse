"""Unit tests for conversation service."""
import pytest
from fastapi import HTTPException
from sqlmodel import Session, select

from src.services.chat.conversation_service import ConversationService
from src.db.chat.conversations import Conversation
from src.db.users import User
from src.db.organizations import Organization


class TestCreateOrGetConversation:
    """Test conversation creation and retrieval."""
    
    @pytest.mark.asyncio
    async def test_create_new_conversation_success(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test creating a new conversation."""
        conversation = await ConversationService.create_or_get_conversation(
            db=session,
            current_user_id=student_user.id,
            target_user_id=instructor_user.id,
            org_id=org.id
        )
        
        assert conversation is not None
        assert conversation.org_id == org.id
        assert conversation.conversation_uuid.startswith("conv_")
        assert conversation.other_participant["id"] == instructor_user.id
        assert conversation.other_participant["username"] == instructor_user.username
        assert conversation.unread_count == 0
    
    @pytest.mark.asyncio
    async def test_get_existing_conversation(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation
    ):
        """Test getting existing conversation instead of creating duplicate."""
        # Try to create conversation that already exists
        result = await ConversationService.create_or_get_conversation(
            db=session,
            current_user_id=student_user.id,
            target_user_id=instructor_user.id,
            org_id=org.id
        )
        
        # Should return existing conversation
        assert result.id == conversation.id
        assert result.conversation_uuid == conversation.conversation_uuid
    
    @pytest.mark.asyncio
    async def test_conversation_bidirectional_uniqueness(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test that conversation is same regardless of who initiates."""
        # Student initiates
        conv1 = await ConversationService.create_or_get_conversation(
            db=session,
            current_user_id=student_user.id,
            target_user_id=instructor_user.id,
            org_id=org.id
        )
        
        # Instructor initiates with same student
        conv2 = await ConversationService.create_or_get_conversation(
            db=session,
            current_user_id=instructor_user.id,
            target_user_id=student_user.id,
            org_id=org.id
        )
        
        # Should be the same conversation
        assert conv1.id == conv2.id
        assert conv1.conversation_uuid == conv2.conversation_uuid
    
    @pytest.mark.asyncio
    async def test_other_participant_reflects_current_user(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation
    ):
        """Test that other_participant is relative to current user."""
        # Student views conversation
        conv_from_student = await ConversationService.create_or_get_conversation(
            db=session,
            current_user_id=student_user.id,
            target_user_id=instructor_user.id,
            org_id=org.id
        )
        
        # other_participant should be instructor
        assert conv_from_student.other_participant["id"] == instructor_user.id
        
        # Instructor views same conversation
        conv_from_instructor = await ConversationService.create_or_get_conversation(
            db=session,
            current_user_id=instructor_user.id,
            target_user_id=student_user.id,
            org_id=org.id
        )
        
        # other_participant should be student
        assert conv_from_instructor.other_participant["id"] == student_user.id
    
    @pytest.mark.asyncio
    async def test_unauthorized_users_cannot_create_conversation(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        student_user_two: User
    ):
        """Test that unauthorized users cannot create conversations."""
        with pytest.raises(HTTPException) as exc_info:
            await ConversationService.create_or_get_conversation(
                db=session,
                current_user_id=student_user.id,
                target_user_id=student_user_two.id,
                org_id=org.id
            )
        
        assert exc_info.value.status_code == 403
    
    @pytest.mark.asyncio
    async def test_nonexistent_target_user_raises_error(
        self,
        session: Session,
        org: Organization,
        student_user: User
    ):
        """Test that nonexistent target user raises error."""
        with pytest.raises(HTTPException) as exc_info:
            await ConversationService.create_or_get_conversation(
                db=session,
                current_user_id=student_user.id,
                target_user_id=99999,  # Non-existent
                org_id=org.id
            )
        
        # Will fail at permission check first
        assert exc_info.value.status_code in [403, 404]


class TestGetUserConversations:
    """Test getting user conversations."""
    
    @pytest.mark.asyncio
    async def test_get_conversations_empty_list(
        self,
        session: Session,
        org: Organization,
        student_user: User
    ):
        """Test getting conversations when none exist."""
        conversations = await ConversationService.get_user_conversations(
            db=session,
            user_id=student_user.id,
            org_id=org.id,
            include_archived=False,
            limit=50,
            offset=0
        )
        
        assert conversations == []
    
    @pytest.mark.asyncio
    async def test_get_conversations_returns_user_conversations(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation
    ):
        """Test getting user's conversations."""
        conversations = await ConversationService.get_user_conversations(
            db=session,
            user_id=student_user.id,
            org_id=org.id,
            include_archived=False,
            limit=50,
            offset=0
        )
        
        assert len(conversations) == 1
        assert conversations[0].id == conversation.id
    
    @pytest.mark.asyncio
    async def test_get_conversations_pagination(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test conversation list pagination."""
        from uuid import uuid4
        from datetime import datetime, timedelta
        
        # Create multiple conversations
        for i in range(5):
            conv = Conversation(
                conversation_uuid=f"conv_{uuid4()}",
                org_id=org.id,
                participant_one_id=min(student_user.id, instructor_user.id + i),
                participant_two_id=max(student_user.id, instructor_user.id + i),
                last_message_at=datetime.utcnow() - timedelta(minutes=i),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(conv)
        session.commit()
        
        # Get first 3
        conversations = await ConversationService.get_user_conversations(
            db=session,
            user_id=student_user.id,
            org_id=org.id,
            include_archived=False,
            limit=3,
            offset=0
        )
        
        assert len(conversations) <= 3
    
    @pytest.mark.asyncio
    async def test_archived_conversations_excluded_by_default(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation
    ):
        """Test that archived conversations are excluded by default."""
        # Archive the conversation
        conversation.is_archived = True
        conversation.archived_by_user_id = student_user.id
        session.add(conversation)
        session.commit()
        
        # Get conversations (without archived)
        conversations = await ConversationService.get_user_conversations(
            db=session,
            user_id=student_user.id,
            org_id=org.id,
            include_archived=False,
            limit=50,
            offset=0
        )
        
        assert len(conversations) == 0
    
    @pytest.mark.asyncio
    async def test_archived_conversations_included_when_requested(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        conversation: Conversation
    ):
        """Test that archived conversations can be included."""
        # Archive the conversation
        conversation.is_archived = True
        conversation.archived_by_user_id = student_user.id
        session.add(conversation)
        session.commit()
        
        # Get conversations (with archived)
        conversations = await ConversationService.get_user_conversations(
            db=session,
            user_id=student_user.id,
            org_id=org.id,
            include_archived=True,
            limit=50,
            offset=0
        )
        
        assert len(conversations) == 1
        assert conversations[0].is_archived is True


class TestArchiveConversation:
    """Test archiving conversations."""
    
    @pytest.mark.asyncio
    async def test_archive_conversation_success(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        conversation: Conversation
    ):
        """Test archiving a conversation."""
        result = await ConversationService.archive_conversation(
            db=session,
            conversation_uuid=conversation.conversation_uuid,
            user_id=student_user.id
        )
        
        assert result.is_archived is True
        assert result.other_participant is not None
    
    @pytest.mark.asyncio
    async def test_archive_nonexistent_conversation_raises_error(
        self,
        session: Session,
        student_user: User
    ):
        """Test archiving non-existent conversation raises error."""
        with pytest.raises(HTTPException) as exc_info:
            await ConversationService.archive_conversation(
                db=session,
                conversation_uuid="conv_nonexistent",
                user_id=student_user.id
            )
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_archive_conversation_unauthorized_user(
        self,
        session: Session,
        conversation: Conversation
    ):
        """Test that unauthorized user cannot archive conversation."""
        with pytest.raises(HTTPException) as exc_info:
            await ConversationService.archive_conversation(
                db=session,
                conversation_uuid=conversation.conversation_uuid,
                user_id=99999  # Not a participant
            )
        
        assert exc_info.value.status_code == 403
