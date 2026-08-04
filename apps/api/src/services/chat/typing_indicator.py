import logging
from datetime import datetime, timedelta

from sqlmodel import Session, select

from src.db.chat.conversations import (Conversation,
                                       ConversationParticipantState)

logger = logging.getLogger(__name__)


class TypingIndicatorService:
    """Service for managing typing indicators."""

    # Typing expires after 5 seconds of inactivity
    TYPING_TIMEOUT_SECONDS = 5

    @staticmethod
    async def set_typing(
        db: Session, conversation_uuid: str, user_id: int, is_typing: bool
    ) -> bool:
        """Set typing status for user in conversation."""

        # Get conversation
        conversation = db.exec(
            select(Conversation).where(
                Conversation.conversation_uuid == conversation_uuid
            )
        ).first()

        if not conversation:
            logger.warning(
                f"Conversation {conversation_uuid} not found for typing indicator"
            )
            return False

        # Get or create participant state
        state = db.exec(
            select(ConversationParticipantState)
            .where(ConversationParticipantState.conversation_id == conversation.id)
            .where(ConversationParticipantState.user_id == user_id)
        ).first()

        if not state:
            state = ConversationParticipantState(
                conversation_id=conversation.id, user_id=user_id
            )

        state.is_typing = is_typing
        state.typing_updated_at = datetime.utcnow()
        state.updated_at = datetime.utcnow()

        db.add(state)
        db.commit()

        logger.debug(
            f"User {user_id} typing status set to {is_typing} in conversation {conversation_uuid}"
        )
        return True

    @staticmethod
    async def get_typing_status(
        db: Session, conversation_uuid: str, user_id: int
    ) -> bool:
        """
        Get typing status for user in conversation.
        Returns False if status is older than timeout.
        """

        conversation = db.exec(
            select(Conversation).where(
                Conversation.conversation_uuid == conversation_uuid
            )
        ).first()

        if not conversation:
            return False

        state = db.exec(
            select(ConversationParticipantState)
            .where(ConversationParticipantState.conversation_id == conversation.id)
            .where(ConversationParticipantState.user_id == user_id)
        ).first()

        if not state or not state.is_typing:
            return False

        # Check if typing status has expired
        if state.typing_updated_at:
            timeout = datetime.utcnow() - timedelta(
                seconds=TypingIndicatorService.TYPING_TIMEOUT_SECONDS
            )

            if state.typing_updated_at < timeout:
                # Auto-expire typing status
                state.is_typing = False
                db.add(state)
                db.commit()
                return False

        return True

    @staticmethod
    async def clear_expired_typing_indicators(db: Session):
        """Clear all expired typing indicators (background job)."""

        timeout = datetime.utcnow() - timedelta(
            seconds=TypingIndicatorService.TYPING_TIMEOUT_SECONDS
        )

        # Find all expired typing states
        expired_states = db.exec(
            select(ConversationParticipantState)
            .where(ConversationParticipantState.is_typing == True)
            .where(ConversationParticipantState.typing_updated_at < timeout)
        ).all()

        count = 0
        for state in expired_states:
            state.is_typing = False
            db.add(state)
            count += 1

        if count > 0:
            db.commit()
            logger.info(f"Cleared {count} expired typing indicators")

        return count
