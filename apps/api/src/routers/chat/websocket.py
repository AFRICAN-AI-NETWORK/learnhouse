from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlmodel import Session
import json
import logging
from typing import Optional

from src.services.chat.websocket_manager import connection_manager
from src.core.events.database import get_db_session

router = APIRouter()
logger = logging.getLogger(__name__)


async def verify_websocket_token(token: str, db: Session) -> Optional[int]:
    """
    Verify JWT token for WebSocket connection.
    Returns user_id if valid, None otherwise.
    
    SECURITY NOTE: Tokens passed in query parameters are visible in logs.
    Ensure Logfire is configured to scrub 'token' from URL logs.
    """
    try:
        from fastapi_jwt_auth import AuthJWT
        from src.db.users import User
        from sqlmodel import select
        
        # Create AuthJWT instance with the token
        auth = AuthJWT()
        auth._token = token
        
        # Verify token
        auth.jwt_required()
        user_uuid = auth.get_jwt_subject()
        
        # Get user from database
        user = db.exec(
            select(User).where(User.user_uuid == user_uuid)
        ).first()
        
        if user:
            return user.id
        
        return None
    
    except Exception as e:
        logger.error(f"WebSocket token verification failed: {e}")
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
    db: Session = Depends(get_db_session)
):
    """
    WebSocket endpoint for real-time chat.
    
    Authentication:
    - Client sends JWT token as query parameter (?token=...)
    - Standard approach for WebSockets (no custom headers during handshake)
    
    CRITICAL SECURITY:
    - Configure Logfire to strip 'token' from URL logs
    - Add to config: scrubbing_patterns=['token', 'password']
    
    Message types:
    - ping: Keep-alive
    - typing_start: User started typing
    - typing_stop: User stopped typing
    - mark_read: Mark message as read
    """
    
    user_id = None
    
    try:
        # Verify JWT token
        user_id = await verify_websocket_token(token, db)
        
        if not user_id:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        # Connect user
        await connection_manager.connect(websocket, user_id)
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "data": {"user_id": user_id, "message": "Successfully connected"}
        })
        
        # Message loop
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            payload = message.get("data", {})
            
            # Handle different message types
            if message_type == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif message_type == "typing_start":
                conversation_uuid = payload.get("conversation_uuid")
                # Get conversation and notify other participant
                from src.db.chat.conversations import Conversation
                from sqlmodel import select
                from src.services.chat.typing_indicator import TypingIndicatorService
                
                conversation = db.exec(
                    select(Conversation).where(Conversation.conversation_uuid == conversation_uuid)
                ).first()
                
                if conversation:
                    # Persist typing status
                    await TypingIndicatorService.set_typing(
                        db, conversation_uuid, user_id, True
                    )
                    
                    other_user_id = (
                        conversation.participant_two_id 
                        if conversation.participant_one_id == user_id 
                        else conversation.participant_one_id
                    )
                    
                    await connection_manager.send_personal_message(
                        {
                            "type": "user_typing",
                            "data": {
                                "conversation_uuid": conversation_uuid,
                                "user_id": user_id,
                                "is_typing": True
                            }
                        },
                        other_user_id
                    )
            
            elif message_type == "typing_stop":
                conversation_uuid = payload.get("conversation_uuid")
                from src.db.chat.conversations import Conversation
                from sqlmodel import select
                from src.services.chat.typing_indicator import TypingIndicatorService
                
                conversation = db.exec(
                    select(Conversation).where(Conversation.conversation_uuid == conversation_uuid)
                ).first()
                
                if conversation:
                    # Persist typing status
                    await TypingIndicatorService.set_typing(
                        db, conversation_uuid, user_id, False
                    )
                    
                    other_user_id = (
                        conversation.participant_two_id 
                        if conversation.participant_one_id == user_id 
                        else conversation.participant_one_id
                    )
                    
                    await connection_manager.send_personal_message(
                        {
                            "type": "user_typing",
                            "data": {
                                "conversation_uuid": conversation_uuid,
                                "user_id": user_id,
                                "is_typing": False
                            }
                        },
                        other_user_id
                    )
            
            elif message_type == "mark_read":
                message_uuid = payload.get("message_uuid")
                from src.services.chat.message_service import ReadReceiptService
                from src.db.chat.messages import Message
                from sqlmodel import select
                from datetime import datetime
                
                await ReadReceiptService.mark_as_read(db, message_uuid, user_id)
                
                # Notify sender
                msg = db.exec(select(Message).where(Message.message_uuid == message_uuid)).first()
                if msg:
                    await connection_manager.send_personal_message(
                        {
                            "type": "message_read",
                            "data": {
                                "message_uuid": message_uuid,
                                "read_by": user_id,
                                "read_at": datetime.utcnow().isoformat()
                            }
                        },
                        msg.sender_id
                    )
            
            else:
                logger.warning(f"Unknown WebSocket message type: {message_type}")
    
    except WebSocketDisconnect:
        if user_id:
            await connection_manager.disconnect(websocket, user_id)
            logger.info(f"User {user_id} disconnected normally")
    
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        if user_id:
            await connection_manager.disconnect(websocket, user_id)
