from typing import List
from datetime import datetime
from uuid import uuid4
from sqlmodel import Session, select, and_, or_, func
from fastapi import HTTPException, status

from src.db.chat.conversations import (
    Conversation, ConversationRead, ConversationWithLastMessage
)
from src.db.chat.messages import Message, MessageReadReceipt
from src.db.users import User
from src.services.chat.authorization import verify_chat_permission
import logging

logger = logging.getLogger(__name__)


class ConversationService:
    """Service for managing conversations."""
    
    @staticmethod
    async def create_or_get_conversation(
        db: Session,
        current_user_id: int,
        target_user_id: int,
        org_id: int
    ) -> ConversationRead:
        """
        Create a new conversation or return existing one.
        Enforces bidirectional uniqueness.
        Returns enriched conversation with other_participant details.
        """
        
        # Verify permission
        await verify_chat_permission(db, current_user_id, target_user_id, org_id)
        
        # Normalize participant order for consistency (smaller ID first)
        participant_one = min(current_user_id, target_user_id)
        participant_two = max(current_user_id, target_user_id)
        
        # Check if conversation already exists
        statement = select(Conversation).where(
            Conversation.org_id == org_id,
            Conversation.participant_one_id == participant_one,
            Conversation.participant_two_id == participant_two
        )
        
        existing_conversation = db.exec(statement).first()
        
        if existing_conversation:
            conversation = existing_conversation
        else:
            # Create new conversation
            conversation = Conversation(
                conversation_uuid=f"conv_{uuid4()}",
                org_id=org_id,
                participant_one_id=participant_one,
                participant_two_id=participant_two,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            
            logger.info(f"Created conversation {conversation.conversation_uuid} between users {current_user_id} and {target_user_id}")
        
        # Get the other participant details
        other_user_id = target_user_id
        other_user = db.get(User, other_user_id)
        
        if not other_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {other_user_id} not found"
            )
        
        # Count unread messages for current user
        unread_count_query = (
            select(func.count(Message.id))
            .outerjoin(
                MessageReadReceipt,
                and_(
                    MessageReadReceipt.message_id == Message.id,
                    MessageReadReceipt.user_id == current_user_id,
                    MessageReadReceipt.read_at.isnot(None)
                )
            )
            .where(
                Message.conversation_id == conversation.id,
                Message.receiver_id == current_user_id,
                Message.is_deleted == False,
                MessageReadReceipt.id.is_(None)  # Not read
            )
        )
        unread_count = db.exec(unread_count_query).one()
        
        # Return enriched conversation
        return ConversationRead(
            id=conversation.id,
            conversation_uuid=conversation.conversation_uuid,
            org_id=conversation.org_id,
            participant_one_id=conversation.participant_one_id,
            participant_two_id=conversation.participant_two_id,
            last_message_at=conversation.last_message_at,
            is_archived=conversation.is_archived,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            unread_count=int(unread_count),
            other_participant={
                "id": other_user.id,
                "user_uuid": other_user.user_uuid,
                "username": other_user.username,
                "first_name": other_user.first_name,
                "last_name": other_user.last_name,
                "avatar_image": other_user.avatar_image
            }
        )
    
    @staticmethod
    async def get_user_conversations(
        db: Session,
        user_id: int,
        org_id: int,
        include_archived: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> List[ConversationWithLastMessage]:
        """
        Get all conversations for a user with last message and unread count.
        
        Performance Note: Uses optimized subqueries to avoid N+1 query problem.
        With 50 conversations, this executes ~5 queries instead of 101.
        """
        
        # Subquery for unread count per conversation
        unread_subq = (
            select(
                Message.conversation_id,
                func.count(Message.id).label('unread_count')
            )
            .outerjoin(
                MessageReadReceipt,
                and_(
                    MessageReadReceipt.message_id == Message.id,
                    MessageReadReceipt.user_id == user_id,
                    MessageReadReceipt.read_at.isnot(None)
                )
            )
            .where(Message.receiver_id == user_id)
            .where(Message.is_deleted == False)
            .where(MessageReadReceipt.id.is_(None))  # Not read
            .group_by(Message.conversation_id)
            .subquery()
        )
        
        # Main query with joins
        query = (
            select(
                Conversation,
                func.coalesce(unread_subq.c.unread_count, 0).label('unread_count')
            )
            .outerjoin(unread_subq, Conversation.id == unread_subq.c.conversation_id)
            .where(
                Conversation.org_id == org_id,
                or_(
                    Conversation.participant_one_id == user_id,
                    Conversation.participant_two_id == user_id
                )
            )
        )
        
        if not include_archived:
            query = query.where(Conversation.is_archived == False)
        
        query = query.order_by(Conversation.last_message_at.desc().nullslast())
        query = query.offset(offset).limit(limit)
        
        results = db.exec(query).all()
        
        # Fetch all participant IDs in one query
        conversation_ids = [conv.id for conv, _ in results]
        participant_ids = set()
        for conv, _ in results:
            participant_ids.add(conv.participant_one_id)
            participant_ids.add(conv.participant_two_id)
        
        # Fetch all users in one query
        if participant_ids:
            users_query = select(User).where(User.id.in_(participant_ids))
            all_users = {user.id: user for user in db.exec(users_query).all()}
        else:
            all_users = {}
        
        # Fetch last messages for all conversations in one query
        if conversation_ids:
            # Subquery for last message timestamp per conversation
            last_msg_time_subq = (
                select(
                    Message.conversation_id,
                    func.max(Message.created_at).label('last_created_at')
                )
                .where(Message.is_deleted == False)
                .where(Message.conversation_id.in_(conversation_ids))
                .group_by(Message.conversation_id)
                .subquery()
            )
            
            last_messages_query = (
                select(Message)
                .join(
                    last_msg_time_subq,
                    and_(
                        Message.conversation_id == last_msg_time_subq.c.conversation_id,
                        Message.created_at == last_msg_time_subq.c.last_created_at
                    )
                )
                .where(Message.is_deleted == False)
            )
            last_messages = {msg.conversation_id: msg for msg in db.exec(last_messages_query).all()}
        else:
            last_messages = {}
        
        # Build enriched conversation list
        enriched_conversations = []
        
        for conv, unread_count in results:
            # Get other participant
            other_user_id = (
                conv.participant_two_id 
                if conv.participant_one_id == user_id 
                else conv.participant_one_id
            )
            other_user = all_users.get(other_user_id)
            
            if not other_user:
                continue  # Skip if user not found
            
            # Get last message
            last_message = last_messages.get(conv.id)
            
            enriched_conv = ConversationWithLastMessage(
                id=conv.id,
                conversation_uuid=conv.conversation_uuid,
                org_id=conv.org_id,
                participant_one_id=conv.participant_one_id,
                participant_two_id=conv.participant_two_id,
                last_message_at=conv.last_message_at,
                is_archived=conv.is_archived,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                unread_count=int(unread_count),
                other_participant={
                    "id": other_user.id,
                    "user_uuid": other_user.user_uuid,
                    "username": other_user.username,
                    "first_name": other_user.first_name,
                    "last_name": other_user.last_name,
                    "avatar_image": other_user.avatar_image
                },
                last_message={
                    "content": last_message.content[:100],
                    "created_at": last_message.created_at,
                    "sender_id": last_message.sender_id
                } if last_message else None
            )
            
            enriched_conversations.append(enriched_conv)
        
        return enriched_conversations
    
    @staticmethod
    async def archive_conversation(
        db: Session,
        conversation_uuid: str,
        user_id: int
    ) -> ConversationRead:
        """Archive a conversation."""
        
        conversation = db.exec(
            select(Conversation)
            .where(Conversation.conversation_uuid == conversation_uuid)
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Verify user is participant
        if user_id not in [conversation.participant_one_id, conversation.participant_two_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to archive this conversation"
            )
        
        conversation.is_archived = True
        conversation.archived_by_user_id = user_id
        conversation.archived_at = datetime.utcnow()
        conversation.updated_at = datetime.utcnow()
        
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        logger.info(f"Archived conversation {conversation_uuid} by user {user_id}")
        
        # Get the other participant details
        other_user_id = (
            conversation.participant_two_id
            if conversation.participant_one_id == user_id
            else conversation.participant_one_id
        )
        other_user = db.get(User, other_user_id)
        
        # Count unread messages
        unread_count_query = (
            select(func.count(Message.id))
            .outerjoin(
                MessageReadReceipt,
                and_(
                    MessageReadReceipt.message_id == Message.id,
                    MessageReadReceipt.user_id == user_id,
                    MessageReadReceipt.read_at.isnot(None)
                )
            )
            .where(
                Message.conversation_id == conversation.id,
                Message.receiver_id == user_id,
                Message.is_deleted == False,
                MessageReadReceipt.id.is_(None)
            )
        )
        unread_count = db.exec(unread_count_query).one()
        
        return ConversationRead(
            id=conversation.id,
            conversation_uuid=conversation.conversation_uuid,
            org_id=conversation.org_id,
            participant_one_id=conversation.participant_one_id,
            participant_two_id=conversation.participant_two_id,
            last_message_at=conversation.last_message_at,
            is_archived=conversation.is_archived,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            unread_count=int(unread_count),
            other_participant={
                "id": other_user.id if other_user else None,
                "user_uuid": other_user.user_uuid if other_user else None,
                "username": other_user.username if other_user else None,
                "first_name": other_user.first_name if other_user else None,
                "last_name": other_user.last_name if other_user else None,
                "avatar_image": other_user.avatar_image if other_user else None
            }
        )
