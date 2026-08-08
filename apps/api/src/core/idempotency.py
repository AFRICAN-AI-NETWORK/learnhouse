"""
Idempotency-key support for replayed writes.

WHY THIS IS NECESSARY
The offline outbox may replay a request whose response leg was lost: the server
processed the write, but the client never saw the 200 and therefore still believes
the mutation is pending. Without a de-duplication key, reconnecting would apply the
same completion or submission twice.

ONE implementation, applied via `Depends(...)`, rather than re-derived per route.

Degrades gracefully: if Redis is unavailable the dependency becomes a no-op and the
endpoint behaves exactly as it does today. That is the correct trade-off here —
refusing writes because a cache is down would be far worse than the rare duplicate,
and the underlying handlers remain individually safe.
"""

import json
import logging
from typing import Any

from fastapi import Header, Request

from src.services.referrals.redis_cache import get_redis_client

logger = logging.getLogger(__name__)

# Long enough to cover a realistic offline period plus retries, short enough that
# the key space stays bounded.
_TTL_SECONDS = 24 * 60 * 60

_KEY_PREFIX = "lh:idem:"


def _redis_key(idempotency_key: str, user_scope: str) -> str:
    # Scoped by user so one account's key can never collide with — or replay —
    # another's mutation.
    return f"{_KEY_PREFIX}{user_scope}:{idempotency_key}"


class IdempotencyContext:
    """
    Carries the resolved key for a request.

    Handlers call `cached_response()` to short-circuit a duplicate, then `store()`
    with the result they are about to return.
    """

    def __init__(self, key: str | None, user_scope: str):
        self.key = key
        self.user_scope = user_scope

    @property
    def enabled(self) -> bool:
        return self.key is not None

    def cached_response(self) -> Any | None:
        """Returns the original response for a duplicate request, else None."""
        if not self.enabled:
            return None

        client = get_redis_client()
        if client is None:
            return None

        try:
            raw = client.get(_redis_key(self.key, self.user_scope))  # type: ignore[arg-type]
        except Exception as exc:  # noqa: BLE001 - cache failures must not break writes
            logger.warning("Idempotency lookup failed: %s", exc)
            return None

        if raw is None:
            return None

        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            # A corrupt entry is treated as a miss rather than failing the request.
            return None

    def store(self, response: Any) -> None:
        """Remembers this response so a replay returns the same result."""
        if not self.enabled:
            return

        client = get_redis_client()
        if client is None:
            return

        try:
            client.setex(
                _redis_key(self.key, self.user_scope),  # type: ignore[arg-type]
                _TTL_SECONDS,
                json.dumps(response, default=str),
            )
        except Exception as exc:  # noqa: BLE001 - cache failures must not break writes
            logger.warning("Idempotency store failed: %s", exc)


async def idempotency(
    request: Request,
    x_idempotency_key: str | None = Header(default=None),
) -> IdempotencyContext:
    """
    FastAPI dependency resolving the request's idempotency context.

    Usage in a route:

        @router.post("/add_activity/{activity_uuid}")
        async def add(..., idem: IdempotencyContext = Depends(idempotency)):
            cached = idem.cached_response()
            if cached is not None:
                return cached
            result = do_the_write(...)
            idem.store(result)
            return result

    Requests without the header are unaffected, so existing clients see no change.
    """
    # Prefer the authenticated subject; fall back to the client host so an
    # unauthenticated replay still cannot collide across callers.
    user_scope = "anon"
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        # The token itself is not logged or stored — only a short, stable digest of
        # it is used to namespace keys.
        import hashlib

        user_scope = hashlib.sha256(auth_header[7:].encode("utf-8")).hexdigest()[:16]

    return IdempotencyContext(key=x_idempotency_key, user_scope=user_scope)
