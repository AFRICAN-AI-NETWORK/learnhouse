"""
Cache-Control middleware.

Applies caching headers centrally rather than decorating every route handler, so
there is exactly ONE place where cacheability is decided. This
matters for correctness as much as tidiness: a single tested code path cannot
drift the way dozens of per-route decorators would.

Behaviour is purely additive — response bodies and status codes are untouched, and
existing headers set explicitly by a handler always win.
"""

import re

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

# Mutating verbs must never be cached anywhere: browser, proxy, or service worker.
_MUTATING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})

# Auth, payment, and admin surfaces are never cacheable regardless of method.
# Kept in sync with the frontend denylist in lib/offline/sw-cache-patterns.js.
_NO_STORE_PATTERN = re.compile(
    r"/api/v1/("
    r"auth|payments|referrals|marketers|ee|admin|dashboard|code|webhooks|dev"
    r"|users/session|users/profile|users/reset_password|users/change_password"
    r"|chat/ws"
    r")"
)

# Org-level content: changes infrequently and is identical for every member, so a
# short shared cache plus background revalidation is safe and saves real bandwidth.
_PUBLIC_CACHE_PATTERN = re.compile(
    r"/api/v1/(orgs|courses|chapters|activities|blocks|collections|prerequisites)"
)

# User-scoped reads: cacheable, but only privately in the user's own browser.
_PRIVATE_CACHE_PATTERN = re.compile(
    r"/api/v1/(trail|assignments|certifications|notifications|announcements|communications|users)"
)

_NO_STORE = "no-store, no-cache, must-revalidate, private"
_PUBLIC = "public, max-age=60, stale-while-revalidate=300"
_PRIVATE = "private, max-age=300"


class CacheControlMiddleware(BaseHTTPMiddleware):
    """Sets Cache-Control based on request path and method."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Never override a handler that made a deliberate choice.
        if "cache-control" in (key.lower() for key in response.headers.keys()):
            return response

        path = request.url.path

        if request.method in _MUTATING_METHODS or _NO_STORE_PATTERN.search(path):
            response.headers["Cache-Control"] = _NO_STORE
            return response

        if request.method in ("GET", "HEAD"):
            if _PRIVATE_CACHE_PATTERN.search(path):
                response.headers["Cache-Control"] = _PRIVATE
            elif _PUBLIC_CACHE_PATTERN.search(path):
                response.headers["Cache-Control"] = _PUBLIC
            else:
                # Unknown read: private and short-lived is the safe default.
                response.headers["Cache-Control"] = _PRIVATE

        return response
