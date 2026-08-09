"""
Redis-backed rate limiting.

ONE implementation, applied via `Depends(...)`, so limits are declared at the route
rather than reimplemented inside handlers.

Uses a fixed-window counter: `INCR` plus an `EXPIRE` on first write. This is cheap
(one round trip in the common case) and adequate for abuse control. It permits a
burst at a window boundary; a sliding window would not, but that precision is not
worth the extra complexity for the endpoints protected here.

Degrades OPEN: if Redis is unreachable the request is allowed. Locking users out of
token refresh because a cache is down would be a far worse outcome than briefly
un-enforced limits — and the endpoint remains authenticated regardless.
"""

import hashlib
import logging

from fastapi import HTTPException, Request, status

from src.services.referrals.redis_cache import get_redis_client

logger = logging.getLogger(__name__)

_KEY_PREFIX = "lh:ratelimit:"


def _caller_identity(request: Request) -> str:
    """
    Stable per-caller key.

    Prefers a digest of the bearer token so the limit follows the session rather
    than the network path (NAT and mobile carriers routinely share IPs). Falls back
    to client host for unauthenticated callers. The token itself is never stored or
    logged — only a truncated SHA-256 digest.
    """
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return hashlib.sha256(auth_header[7:].encode("utf-8")).hexdigest()[:16]

    cookie = request.cookies.get("refresh_token_cookie")
    if cookie:
        return hashlib.sha256(cookie.encode("utf-8")).hexdigest()[:16]

    client = request.client
    return f"ip:{client.host}" if client else "ip:unknown"


class RateLimiter:
    """
    Dependency enforcing `limit` requests per `window_seconds` for a named bucket.

    Usage:

        refresh_rate_limit = RateLimiter("auth_refresh", limit=60, window_seconds=3600)

        @router.get("/refresh")
        def refresh(..., _: None = Depends(refresh_rate_limit)):
            ...
    """

    def __init__(self, bucket: str, limit: int, window_seconds: int):
        self.bucket = bucket
        self.limit = limit
        self.window_seconds = window_seconds

    async def __call__(self, request: Request) -> None:
        client = get_redis_client()
        if client is None:
            # Fail open — see module docstring.
            return

        key = f"{_KEY_PREFIX}{self.bucket}:{_caller_identity(request)}"

        try:
            current = client.incr(key)
            # Only set the TTL on the first hit, so the window does not slide
            # forward with every request and effectively never expire.
            if current == 1:
                client.expire(key, self.window_seconds)
        except Exception as exc:  # noqa: BLE001 - limiter must not break the route
            logger.warning("Rate limit check failed for %s: %s", self.bucket, exc)
            return

        if current > self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(self.window_seconds)},
            )


# Token refresh: the Next.js JWT callback refreshes roughly hourly per session, and
# the offline client retries on reconnect. 60/hour leaves ample headroom for normal
# use while capping a token-grinding loop.
refresh_rate_limit = RateLimiter("auth_refresh", limit=60, window_seconds=3600)
