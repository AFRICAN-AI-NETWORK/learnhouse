import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.users import User
from src.security.auth import get_current_user
from src.services.chat.websocket_manager import connection_manager
from src.services.chat.ws_ticket_service import create_ticket, redeem_ticket

router = APIRouter()
logger = logging.getLogger(__name__)


async def verify_websocket_token(token: str, db: Session) -> Optional[int]:
    """
    Verify JWT token for WebSocket connection.
    Returns user_id if valid, None otherwise.

    SECURITY NOTE: Prefer the ticket-based flow (POST /ws/ticket then connect
    with ?ticket=...) so the main JWT never appears in access logs.
    """
    try:
        from fastapi_jwt_auth import AuthJWT
        from sqlmodel import select

        from src.db.users import User as UserModel

        # Create AuthJWT instance with the token
        auth = AuthJWT()
        auth._token = token

        # Verify token
        auth.jwt_required()
        user_uuid = auth.get_jwt_subject()

        # Get user from database
        user = db.exec(
            select(UserModel).where(UserModel.user_uuid == user_uuid)
        ).first()

        if user:
            return user.id

        return None

    except Exception as e:  # noqa: BLE001
        logger.error(f"WebSocket token verification failed: {e}")
        return None


@router.post("/ws/ticket")
async def create_ws_ticket(
    current_user: User = Depends(get_current_user),
):
    """
    Exchange a JWT for a short-lived, single-use WebSocket ticket.

    The client should call this endpoint, then immediately open the WebSocket
    with ``?ticket=<value>`` instead of sending the real JWT in the URL.
    Tickets expire after 30 seconds and can only be used once.
    """
    ticket = create_ticket(current_user.id)
    return {"ticket": ticket}


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None, description="JWT authentication token (legacy)"),
    ticket: Optional[str] = Query(
        None, description="Single-use WebSocket ticket (preferred)"
    ),
    db: Session = Depends(get_db_session),
):
    """
    WebSocket endpoint for real-time chat.

    Authentication (in priority order):
    1. **ticket** (preferred) – short-lived single-use token obtained via
       ``POST /ws/ticket``.  Keeps the main JWT out of server access logs.
    2. **token** (legacy) – raw JWT passed as query parameter.  Still
       supported for backwards compatibility.

    Message types:
    - ping: Keep-alive
    - typing_start: User started typing
    - typing_stop: User stopped typing
    - mark_read: Mark message as read
    """

    user_id = None

    try:
        # Authenticate: prefer ticket, fall back to JWT token
        if ticket:
            user_id = redeem_ticket(ticket)
        elif token:
            user_id = await verify_websocket_token(token, db)

        if not user_id:
            await websocket.close(code=1008, reason="Invalid or expired credentials")
            return

        # Connect user
        await connection_manager.connect(websocket, user_id)

        # Send connection confirmation
        await websocket.send_json(
            {
                "type": "connected",
                "data": {"user_id": user_id, "message": "Successfully connected"},
            }
        )

        # Message loop
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "error", "data": {"message": "Invalid JSON format"}}
                )
                continue

            message_type = message.get("type")
            payload = message.get("data", {})

            # Handle different message types
            if message_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif message_type == "typing_start":
                conversation_uuid = payload.get("conversation_uuid")
                # Get conversation and notify other participant
                from sqlmodel import select

                from src.db.chat.conversations import Conversation
                from src.services.chat.typing_indicator import \
                    TypingIndicatorService

                conversation = db.exec(
                    select(Conversation).where(
                        Conversation.conversation_uuid == conversation_uuid
                    )
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
                                "is_typing": True,
                            },
                        },
                        other_user_id,
                    )

            elif message_type == "typing_stop":
                conversation_uuid = payload.get("conversation_uuid")
                from sqlmodel import select

                from src.db.chat.conversations import Conversation
                from src.services.chat.typing_indicator import \
                    TypingIndicatorService

                conversation = db.exec(
                    select(Conversation).where(
                        Conversation.conversation_uuid == conversation_uuid
                    )
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
                                "is_typing": False,
                            },
                        },
                        other_user_id,
                    )

            elif message_type == "mark_read":
                message_uuid = payload.get("message_uuid")
                from datetime import datetime, timezone

                from sqlmodel import select

                from src.db.chat.messages import Message
                from src.services.chat.message_service import \
                    ReadReceiptService

                await ReadReceiptService.mark_as_read(db, message_uuid, user_id)

                # Notify sender
                msg = db.exec(
                    select(Message).where(Message.message_uuid == message_uuid)
                ).first()
                if msg:
                    await connection_manager.send_personal_message(
                        {
                            "type": "message_read",
                            "data": {
                                "message_uuid": message_uuid,
                                "read_by": user_id,
                                "read_at": datetime.now(timezone.utc).isoformat(),
                            },
                        },
                        msg.sender_id,
                    )

            else:
                logger.warning(f"Unknown WebSocket message type: {message_type}")

    except WebSocketDisconnect:
        if user_id:
            await connection_manager.disconnect(websocket, user_id)
            logger.info(f"User {user_id} disconnected normally")

    except Exception as e:  # noqa: BLE001
        logger.error(f"WebSocket error for user {user_id}: {e}")
        if user_id:
            await connection_manager.disconnect(websocket, user_id)
