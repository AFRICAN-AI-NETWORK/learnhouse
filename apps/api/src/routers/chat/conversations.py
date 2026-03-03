from typing import List
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from src.db.chat.conversations import ConversationCreate, ConversationRead, ConversationWithLastMessage
from src.services.chat.conversation_service import ConversationService
from src.core.events.database import get_db_session
from src.security.auth import get_current_user
from src.db.users import User

router = APIRouter()


@router.post("/", response_model=ConversationRead)
async def create_conversation(
    conversation_data: ConversationCreate,
    org_id: int = Query(..., description="Organization ID"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Create or get existing conversation with target user."""
    conversation = await ConversationService.create_or_get_conversation(
        db=db,
        current_user_id=current_user.id,
        target_user_id=conversation_data.participant_two_id,
        org_id=org_id
    )
    return conversation


@router.get("/", response_model=List[ConversationWithLastMessage])
async def get_user_conversations(
    org_id: int = Query(..., description="Organization ID"),
    include_archived: bool = Query(False, description="Include archived conversations"),
    limit: int = Query(50, le=100, description="Number of conversations to return"),
    offset: int = Query(0, description="Offset for pagination"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Get all conversations for current user."""
    conversations = await ConversationService.get_user_conversations(
        db=db,
        user_id=current_user.id,
        org_id=org_id,
        include_archived=include_archived,
        limit=limit,
        offset=offset
    )
    return conversations


@router.patch("/{conversation_uuid}/archive", response_model=ConversationRead)
async def archive_conversation(
    conversation_uuid: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Archive a conversation."""
    conversation = await ConversationService.archive_conversation(
        db=db,
        conversation_uuid=conversation_uuid,
        user_id=current_user.id
    )
    return conversation


@router.get("/chatable-users", response_model=List[dict])
async def get_chatable_users(
    org_id: int = Query(..., description="Organization ID"),
    search: str = Query(None, description="Search query for user name"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user)
):
    """Get list of users that current user can initiate chats with."""
    from src.services.chat.authorization import get_chatable_users_for_user
    
    users = await get_chatable_users_for_user(
        db=db,
        current_user_id=current_user.id,
        org_id=org_id
    )
    
    # Apply search filter if provided
    if search:
        search_lower = search.lower()
        users = [
            u for u in users
            if search_lower in u.username.lower()
            or search_lower in (u.first_name or "").lower()
            or search_lower in (u.last_name or "").lower()
        ]
    
    return [
        {
            "id": u.id,
            "user_uuid": u.user_uuid,
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "avatar_image": u.avatar_image
        }
        for u in users
    ]
