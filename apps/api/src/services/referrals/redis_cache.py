"""
Shared Redis client for the referral/marketer system.
Single connection pool reused by exchange-rate caching, marketer active-status
caching, and registration rate limiting. Degrades gracefully (returns None)
when Redis is unavailable so callers can fall back to DB queries.
"""

import logging
import os

import redis
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import RedisError

from config.config import get_learnhouse_config

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None
_initialized = False


def _redis_enabled() -> bool:
    return os.getenv("REDIS_ENABLED", "true").lower() in ("true", "1", "yes")


def get_redis_client() -> redis.Redis | None:
    """
    Return the shared Redis client, or None if Redis is disabled/unreachable.
    Lazily initialized once per process; callers must handle None.
    """
    global _redis_client, _initialized

    if not _redis_enabled():
        logger.info("Redis disabled via REDIS_ENABLED env var")
        return None

    if _initialized:
        return _redis_client

    _initialized = True

    _config = get_learnhouse_config()
    redis_url = (
        os.getenv("REDIS_URL")
        or _config.redis_config.redis_connection_string
        or "redis://localhost:6379/0"
    )

    try:
        client = redis.Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30,
        )
        client.ping()
        _redis_client = client
        logger.info("Redis connected successfully (referral system shared client)")
    except (RedisError, RedisConnectionError) as e:
        logger.warning(f"Redis connection failed: {e}. Falling back to DB-only mode.")
        _redis_client = None

    return _redis_client
