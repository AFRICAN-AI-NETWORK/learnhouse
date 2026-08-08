"""
Conditional GET / ETag support.

Implemented as ONE middleware rather than an `If-None-Match` check copy-pasted into
every read route. A middleware is also the only place that can see the serialised
response body, which is what the ETag must be derived from.

What this buys the offline client: the incremental sync can re-poll cheaply and get
a bodyless `304 Not Modified` when nothing changed, instead of re-downloading
identical course and chapter payloads on every reconnect.

Purely additive: a client that does not send `If-None-Match` receives
the same 200 and the same body it does today, plus an extra `ETag` header.
"""

import hashlib
import re

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Only content reads benefit from revalidation. Auth/payment/admin surfaces are
# excluded so no validator is ever minted for a sensitive response.
_ETAG_ELIGIBLE_PATTERN = re.compile(
    r"/api/v1/("
    r"orgs|courses|chapters|activities|blocks|collections|certifications"
    r"|assignments|trail|roles|usergroups|prerequisites"
    r")"
)

_EXCLUDED_PATTERN = re.compile(
    r"/api/v1/("
    r"auth|payments|referrals|marketers|ee|admin|dashboard|code|webhooks|dev"
    r")"
)

# Guard against buffering very large payloads purely to hash them.
_MAX_ETAG_BODY_BYTES = 2 * 1024 * 1024  # 2 MB


def _compute_etag(body: bytes) -> str:
    """
    Weak validator over the response body.

    MD5 is used for speed, not security: this is a change-detection digest, never
    an integrity or authentication mechanism. It is marked weak (`W/`) because the
    comparison is semantic rather than byte-exact once transfer encodings differ.
    """
    digest = hashlib.md5(body, usedforsecurity=False).hexdigest()
    return f'W/"{digest}"'


class ETagMiddleware(BaseHTTPMiddleware):
    """Adds `ETag` to eligible GET responses and honours `If-None-Match`."""

    async def dispatch(self, request: Request, call_next):
        if request.method not in ("GET", "HEAD"):
            return await call_next(request)

        path = request.url.path
        if _EXCLUDED_PATTERN.search(path) or not _ETAG_ELIGIBLE_PATTERN.search(path):
            return await call_next(request)

        response = await call_next(request)

        if response.status_code != 200:
            return response

        # Buffer the body so it can be hashed, then re-emit it unchanged.
        chunks = [chunk async for chunk in response.body_iterator]
        body = b"".join(chunks)

        if len(body) > _MAX_ETAG_BODY_BYTES:
            # Too large to be worth revalidating; return it untouched.
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        etag = _compute_etag(body)
        headers = dict(response.headers)
        headers["ETag"] = etag

        # `Content-Length` is recomputed by the Response constructor below; drop the
        # inherited value so a 304 cannot advertise a body it does not send.
        headers.pop("content-length", None)

        if_none_match = request.headers.get("if-none-match")
        if if_none_match and _etag_matches(if_none_match, etag):
            # 304 must not carry a body. Cache-Control is preserved so the client
            # keeps its existing freshness contract.
            not_modified_headers = {
                key: value
                for key, value in headers.items()
                if key.lower() in ("etag", "cache-control", "vary", "date", "expires")
                or key.lower().startswith("access-control-")
            }
            return Response(status_code=304, headers=not_modified_headers)

        return Response(
            content=body,
            status_code=200,
            headers=headers,
            media_type=response.media_type,
        )


def _etag_matches(if_none_match: str, current_etag: str) -> bool:
    """
    Compares a client validator list against the current ETag.

    Handles `*`, comma-separated lists, and the weak prefix, so a client that
    echoes our own header back always matches.
    """
    header = if_none_match.strip()
    if header == "*":
        return True

    normalised_current = current_etag.replace("W/", "").strip()

    for candidate in header.split(","):
        normalised = candidate.replace("W/", "").strip()
        if normalised and normalised == normalised_current:
            return True

    return False
