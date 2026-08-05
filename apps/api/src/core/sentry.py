"""
LearnHouse Sentry initialization.
"""

import logging
import os

logger = logging.getLogger("learnhouse.sentry")

_SENSITIVE_KEYS = frozenset(
    {
        "password",
        "auth_jwt_secret_key",
        "token",
        "authorization",
        "jwt",
        "secret",
        "api_key",
        "resend_api_key",
        "paystack_secret_key",
        "paystack_webhook_secret",
        "sql_connection_string",
        "redis_connection_string",
        "stripe_secret_key",
        "email",
        "phone_number",
    }
)


def _scrub_dict(data: dict) -> dict:
    cleaned = {}
    for key, value in data.items():
        if key.lower() in _SENSITIVE_KEYS:
            cleaned[key] = "[REDACTED]"
        elif isinstance(value, dict):
            cleaned[key] = _scrub_dict(value)
        elif isinstance(value, list):
            cleaned[key] = [_scrub_dict(v) if isinstance(v, dict) else v for v in value]
        else:
            cleaned[key] = value
    return cleaned


def _scrub_sensitive_event(event: dict, hint: dict) -> dict:
    if "request" in event:
        event["request"].pop("data", None)
        event["request"].pop("cookies", None)
        if "headers" in event["request"]:
            event["request"]["headers"].pop("authorization", None)
            event["request"]["headers"].pop("cookie", None)

    if "extra" in event:
        event["extra"] = _scrub_dict(event["extra"])

    return event


def _scrub_sensitive_transaction(event: dict, hint: dict) -> dict:
    if "request" in event:
        event["request"].pop("data", None)
        event["request"].pop("cookies", None)
    return event


def init_sentry(site_name: str, development_mode: bool) -> None:
    dsn = os.environ.get("SENTRY_DSN")
    if not dsn:
        logger.info("Sentry DSN not configured - error tracking disabled")
        return

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    environment = (
        "development"
        if development_mode
        else os.environ.get("ENVIRONMENT", "production")
    )
    release = os.environ.get("SENTRY_RELEASE", "learnhouse@unknown")

    sentry_logging = LoggingIntegration(
        level=logging.WARNING,
        event_level=logging.ERROR,
    )

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        traces_sample_rate=0.10 if not development_mode else 1.0,
        profiles_sample_rate=0.05 if not development_mode else 0.0,
        integrations=[
            StarletteIntegration(transaction_style="url"),
            FastApiIntegration(transaction_style="url"),
            SqlalchemyIntegration(),
            RedisIntegration(),
            sentry_logging,
        ],
        send_default_pii=False,
        before_send=_scrub_sensitive_event,
        before_send_transaction=_scrub_sensitive_transaction,
        server_name=site_name,
        attach_stacktrace=True,
        max_breadcrumbs=30,
        ignore_errors=[
            "fastapi_jwt_auth.exceptions.AuthJWTException",
            "fastapi.exceptions.RequestValidationError",
            "starlette.exceptions.HTTPException",
        ],
    )

    signoz_endpoint = os.environ.get("SIGNOZ_ENDPOINT")
    if signoz_endpoint:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        provider = TracerProvider()
        provider.add_span_processor(
            BatchSpanProcessor(
                OTLPSpanExporter(endpoint=f"{signoz_endpoint}/v1/traces")
            )
        )
        trace.set_tracer_provider(provider)
        logger.info("SigNoz OTLP exporter configured -> %s", signoz_endpoint)

    logger.info(
        "Sentry initialized | env=%s | release=%s | traces=%.0f%%",
        environment,
        release,
        (0.10 if not development_mode else 1.0) * 100,
    )
