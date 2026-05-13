import re

import sentry_sdk
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

ORG_SLUG_PATTERN = re.compile(r"/api/v1/orgs/([^/]+)/")


class SentryContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        org_match = ORG_SLUG_PATTERN.search(path)

        with sentry_sdk.configure_scope() as scope:
            if org_match:
                scope.set_tag("org_slug", org_match.group(1))

            scope.set_tag("api_version", "v1")
            scope.set_tag(
                "request_type", "websocket" if "websocket" in path else "http"
            )

            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                scope.set_tag("authenticated", "true")
            else:
                scope.set_tag("authenticated", "false")

        response = await call_next(request)

        with sentry_sdk.configure_scope() as scope:
            scope.set_tag("http.status_code", str(response.status_code))

        return response
