import logging as _logging
import os

import logfire
import sentry_sdk
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi_jwt_auth.exceptions import AuthJWTException
from starlette.middleware.base import BaseHTTPMiddleware

from config.config import LearnHouseConfig, get_learnhouse_config
from src.core.ee_hooks import register_ee_middlewares
from src.core.events.events import shutdown_app, startup_app
from src.core.middleware.sentry_context import SentryContextMiddleware
from src.core.sentry import init_sentry
from src.router import v1_router
from src.routers.media import router as media_router

########################
# Pre-Alpha Version 0.1.0
# Author: @swve
# (c) LearnHouse 2022
########################

# Get LearnHouse Config
learnhouse_config: LearnHouseConfig = get_learnhouse_config()

# Initialize Sentry if enabled
if learnhouse_config.general_config.sentry_enabled:
    init_sentry(
        site_name=learnhouse_config.site_name,
        development_mode=learnhouse_config.general_config.development_mode,
    )


app = FastAPI(
    title=learnhouse_config.site_name,
    description=learnhouse_config.site_description,
    docs_url="/docs" if learnhouse_config.general_config.development_mode else None,
    redoc_url="/redoc" if learnhouse_config.general_config.development_mode else None,
)


# Custom middleware to add CORS headers to all responses including errors
class CORSHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        origin = request.headers.get("origin")

        # Check if origin is in allowed origins
        if origin in learnhouse_config.hosting_config.allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Expose-Headers"] = "*"

        return response


# Add Sentry context middleware if enabled
if learnhouse_config.general_config.sentry_enabled:
    app.add_middleware(SentryContextMiddleware)

# Add CORS header middleware first
app.add_middleware(CORSHeaderMiddleware)

# Then add the standard CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=learnhouse_config.hosting_config.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Only enable logfire if explicitly configured
if learnhouse_config.general_config.logfire_enabled:
    logfire.configure(
        console=False,
        service_name=learnhouse_config.site_name,
        scrubbing_patterns=["token", "password", "authorization", "jwt"],
        scrubbing_callback=lambda key, value: "***REDACTED***",
    )
    logfire.instrument_fastapi(app)
    # Instrument database after logfire is configured
    from src.core.events.database import engine

    logfire.instrument_sqlalchemy(engine=engine)

# Gzip Middleware (will add brotli later)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Register EE Middlewares if available
register_ee_middlewares(app)


# Background Jobs — imports only at module level; scheduler is built at startup
# so that CronTrigger computes its first next_run_time from now, not from import time.
try:
    from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger

    from src.jobs.cohort_jobs import sync_process_cohort_unlocks
    from src.jobs.notification_jobs import run_notification_email_job
    from src.jobs.referral_jobs import (
        process_commission_eligibility_job,
        process_payout_requests_job,
        refresh_all_marketer_counters_job,
    )
    from src.jobs.waitlist_processor import (
        run_retry_failed_emails_job,
        run_waitlist_activation_job,
    )

    _APSCHEDULER_AVAILABLE = True
except ImportError as e:
    _APSCHEDULER_AVAILABLE = False
    _logging.getLogger("scheduler").error(
        "APScheduler not installed — background jobs will not run: %s", e
    )

# Scheduler instance — populated at startup
scheduler = None

# Events
app.add_event_handler("startup", startup_app(app))
app.add_event_handler("shutdown", shutdown_app(app))


# Create, configure, and start APScheduler at application startup.
# Building the scheduler HERE (not at module level) ensures CronTrigger
# computes its first next_run_time from the moment the app is actually ready,
# which eliminates "Run time of job was missed" warnings on startup.
@app.on_event("startup")
async def start_scheduler():
    global scheduler

    if not _APSCHEDULER_AVAILABLE:
        return

    WAITLIST_PROCESSOR_ENABLED = (
        os.getenv("WAITLIST_PROCESSOR_ENABLED", "true").lower() == "true"
    )
    REFERRAL_PROCESSOR_ENABLED = (
        os.getenv("REFERRAL_PROCESSOR_ENABLED", "true").lower() == "true"
    )
    REFERRAL_COMMISSION_CHECK_HOUR = int(
        os.getenv("REFERRAL_COMMISSION_CHECK_HOUR", "0")
    )
    NOTIFICATION_PROCESSOR_ENABLED = (
        os.getenv("NOTIFICATION_PROCESSOR_ENABLED", "true").lower() == "true"
    )

    COMMUNICATIONS_PROCESSOR_ENABLED = (
        os.getenv("COMMUNICATIONS_PROCESSOR_ENABLED", "true").lower() == "true"
    )

    if not (
        WAITLIST_PROCESSOR_ENABLED
        or REFERRAL_PROCESSOR_ENABLED
        or NOTIFICATION_PROCESSOR_ENABLED
        or COMMUNICATIONS_PROCESSOR_ENABLED
    ):
        print("  [X] Background jobs disabled by environment config")
        return

    scheduler = AsyncIOScheduler()

    # ── Waitlist jobs ──────────────────────────────────────────────
    if WAITLIST_PROCESSOR_ENABLED:
        scheduler.add_job(
            sync_process_cohort_unlocks,
            trigger=CronTrigger.from_crontab("*/5 * * * *"),
            id="cohort_unlocks",
            name="Process Cohort Unlocks",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            jitter=5,
            misfire_grace_time=30,
        )
        scheduler.add_job(
            run_waitlist_activation_job,
            trigger=CronTrigger.from_crontab("*/1 * * * *"),
            id="waitlist_activation",
            name="Process Waitlist Activations",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            jitter=5,
            misfire_grace_time=30,
        )
        scheduler.add_job(
            run_retry_failed_emails_job,
            trigger=CronTrigger.from_crontab("*/15 * * * *"),
            id="waitlist_retry",
            name="Retry Failed Waitlist Emails",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            jitter=10,
            misfire_grace_time=120,
        )

    # ── Referral jobs ──────────────────────────────────────────────
    if REFERRAL_PROCESSOR_ENABLED:
        scheduler.add_job(
            process_commission_eligibility_job,
            trigger=CronTrigger(hour=REFERRAL_COMMISSION_CHECK_HOUR, minute=0),
            id="referral_commission_eligibility",
            name="Update Pending Commissions to Eligible",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            jitter=15,
            misfire_grace_time=300,
        )
        scheduler.add_job(
            process_payout_requests_job,
            trigger=CronTrigger.from_crontab("*/5 * * * *"),
            id="referral_payout_processing",
            name="Process Payout Requests",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            jitter=10,
            misfire_grace_time=120,
        )
        scheduler.add_job(
            refresh_all_marketer_counters_job,
            trigger=CronTrigger(hour=1, minute=0, timezone="UTC"),
            id="marketer_counters_refresh",
            name="Refresh Marketer Leaderboard Counters",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            jitter=15,
            misfire_grace_time=300,
        )

    # ── Notification jobs ──────────────────────────────────────────
    if NOTIFICATION_PROCESSOR_ENABLED:
        scheduler.add_job(
            run_notification_email_job,
            trigger=CronTrigger.from_crontab("*/5 * * * *"),
            id="notification_email_retry",
            name="Send/Retry Pending Notification Emails",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            jitter=10,
            misfire_grace_time=120,
        )

    # ── Communications jobs ──────────────────────────────────────────
    if COMMUNICATIONS_PROCESSOR_ENABLED:
        from src.jobs.communications_jobs import sync_run_communications_dispatch_job

        scheduler.add_job(
            sync_run_communications_dispatch_job,
            trigger=CronTrigger.from_crontab("*/1 * * * *"),
            id="communications_dispatch",
            name="Dispatch Pending Communication Campaigns",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            jitter=5,
            misfire_grace_time=30,
        )

    # Heartbeat listener for health monitoring
    def _job_heartbeat(event):
        _log = _logging.getLogger("scheduler.heartbeat")
        job_id = event.job_id
        if event.exception:
            _log.error(
                "HEARTBEAT | job=%s | status=FAILED | error=%s", job_id, event.exception
            )
        else:
            _log.info(
                "HEARTBEAT | job=%s | status=OK | return=%s", job_id, event.retval
            )

    scheduler.add_listener(_job_heartbeat, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

    # Start NOW — triggers compute their first next_run_time from this instant
    scheduler.start()

    # ── Startup banner ────────────────────────────────────────────
    jobs = scheduler.get_jobs()
    print()
    print("=" * 60)
    print("  🚀 Background job scheduler started")
    print("=" * 60)
    for job in jobs:
        next_run = job.next_run_time
        next_str = next_run.strftime("%Y-%m-%d %H:%M:%S") if next_run else "PAUSED"
        print(f"  ✨ {job.name:<40}  next: {next_str}")
    print("-" * 60)
    print(f"  Total: {len(jobs)} job(s) running")
    print("=" * 60)
    print()


@app.on_event("shutdown")
async def stop_scheduler():
    if scheduler is not None:
        scheduler.shutdown()
        _logging.getLogger("scheduler").info("Background job scheduler stopped")


# JWT Exception Handler
@app.exception_handler(AuthJWTException)
def authjwt_exception_handler(request: Request, exc: AuthJWTException):
    return JSONResponse(
        status_code=exc.status_code,  # type: ignore
        content={"detail": exc.message},  # type: ignore
    )


# Global Exception Handler to ensure CORS on all errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if learnhouse_config.general_config.sentry_enabled:
        sentry_sdk.capture_exception(exc)

    origin = request.headers.get("origin")
    headers = {}

    if origin in learnhouse_config.hosting_config.allowed_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"

    return JSONResponse(
        status_code=500, content={"detail": "Internal server error"}, headers=headers
    )


# Static Files — use a custom subclass to guarantee CORS headers on all
# responses (including 304 Not Modified) since middlewares can be tricky with mounts.
class CORSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope) -> Response:
        if scope["method"] == "OPTIONS":
            response = Response(status_code=204)
        else:
            response = await super().get_response(path, scope)

        # Add CORS header so browser fetch() cross-origin works
        origin = next((v.decode() for k, v in scope["headers"] if k == b"origin"), None)
        if origin and origin in learnhouse_config.hosting_config.allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
        return response


app.mount("/content", CORSStaticFiles(directory="content"), name="content")

# Media Route (Image Resizing)
app.include_router(media_router, prefix="/media", tags=["media"])

# Global Routes
app.include_router(v1_router)


# General Routes
@app.get("/")
async def root():
    return {"Message": "Welcome to LearnHouse"}


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=learnhouse_config.hosting_config.port,
        reload=learnhouse_config.general_config.development_mode,
    )

# Force reload
