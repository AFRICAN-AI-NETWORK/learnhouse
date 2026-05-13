from typing import Dict, Set
from fastapi import WebSocket
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

# Check if Redis is available
try:
    import redis.asyncio as redis

    _REDIS_AVAILABLE = True
except ImportError:
    _REDIS_AVAILABLE = False
    logger.warning(
        "redis.asyncio not available, WebSocket scaling will be limited to single instance"
    )


class ConnectionManager:
    """
    Manages WebSocket connections and Redis Pub/Sub for horizontal scaling.
    Implements Singleton pattern.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # {user_id: {websocket_connection}}
        self.active_connections: Dict[int, Set[WebSocket]] = {}

        # {room_id: {websocket_connection}}
        self.rooms: Dict[str, Set[WebSocket]] = {}

        # Redis client for Pub/Sub (optional - for horizontal scaling)
        self.redis_client = None
        self.pubsub = None

        if _REDIS_AVAILABLE:
            try:
                from config.config import get_learnhouse_config

                config = get_learnhouse_config()
                redis_url = config.redis_config.redis_connection_string

                if redis_url:
                    client = redis.from_url(redis_url, decode_responses=True)
                    self.redis_client = client
                    self.pubsub = client.pubsub()
                    logger.info("WebSocket manager initialized with Redis Pub/Sub")
                else:
                    logger.warning(
                        "Redis URL not configured, WebSocket scaling will be limited"
                    )
            except Exception as e:
                logger.warning(f"Failed to initialize Redis for WebSocket manager: {e}")

        self._initialized = True

    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept WebSocket connection and register user."""
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(websocket)

        logger.info(
            f"User {user_id} connected. Total connections: {len(self.active_connections[user_id])}"
        )

        # Publish connection event to Redis (if available)
        client = self.redis_client
        if client is not None:
            try:
                await client.publish(
                    "chat:user_status",
                    json.dumps(
                        {
                            "user_id": user_id,
                            "status": "online",
                            "timestamp": datetime.utcnow().isoformat(),
                        }
                    ),
                )
            except Exception as e:
                logger.warning(f"Failed to publish connection event: {e}")

    async def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove WebSocket connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)

            # Remove user from dict if no more connections
            if not self.active_connections[user_id]:
                self.active_connections.pop(user_id, None)

                # Publish offline event (if Redis available)
                client = self.redis_client
                if client is not None:
                    try:
                        await client.publish(
                            "chat:user_status",
                            json.dumps(
                                {
                                    "user_id": user_id,
                                    "status": "offline",
                                    "timestamp": datetime.utcnow().isoformat(),
                                }
                            ),
                        )
                    except Exception as e:
                        logger.warning(f"Failed to publish disconnect event: {e}")

        # Cleanup rooms
        for room_id in list(self.rooms.keys()):
            self.rooms[room_id].discard(websocket)
            if not self.rooms[room_id]:
                self.rooms.pop(room_id, None)

        logger.info(f"User {user_id} disconnected")

    async def send_personal_message(self, message: dict, user_id: int):
        """Send message to specific user (all their connections)."""
        if user_id in self.active_connections:
            disconnected = set()

            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected.add(connection)

            # Clean up disconnected sockets
            for conn in disconnected:
                await self.disconnect(conn, user_id)

        # Publish to Redis for other instances (if available)
        client = self.redis_client
        if client is not None:
            try:
                await client.publish(f"chat:user:{user_id}", json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to publish message to Redis: {e}")

    async def broadcast_to_conversation(self, message: dict, participant_ids: list):
        """Send message to all participants in a conversation."""
        for user_id in participant_ids:
            await self.send_personal_message(message, user_id)

    async def join_room(self, room_id: str, websocket: WebSocket):
        """Join a specific room (e.g. for a live session)."""
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(websocket)
        logger.info(f"WebSocket joined room {room_id}")

    async def leave_room(self, room_id: str, websocket: WebSocket):
        """Leave a specific room."""
        if room_id in self.rooms:
            self.rooms[room_id].discard(websocket)
            if not self.rooms[room_id]:
                self.rooms.pop(room_id, None)
        logger.info(f"WebSocket left room {room_id}")

    async def broadcast_to_room(self, room_id: str, message: dict):
        """Broadcast message to all websockets in a room."""
        if room_id in self.rooms:
            disconnected = set()
            for connection in self.rooms[room_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to room {room_id}: {e}")
                    disconnected.add(connection)

            # Clean up disconnected sockets (this will be handled by disconnect, but good to be safe)
            for conn in disconnected:
                self.rooms[room_id].discard(conn)

    def is_user_online(self, user_id: int) -> bool:
        """Check if user has active connections."""
        return (
            user_id in self.active_connections
            and len(self.active_connections[user_id]) > 0
        )


# Global singleton instance
connection_manager = ConnectionManager()
