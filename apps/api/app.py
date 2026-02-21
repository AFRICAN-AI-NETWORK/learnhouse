import uvicorn
import logfire
from fastapi import FastAPI, Request
from config.config import LearnHouseConfig, get_learnhouse_config
from src.core.events.events import shutdown_app, startup_app
from src.router import v1_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi_jwt_auth.exceptions import AuthJWTException
from fastapi.middleware.gzip import GZipMiddleware
from src.core.ee_hooks import register_ee_middlewares
from starlette.middleware.base import BaseHTTPMiddleware

########################
# Pre-Alpha Version 0.1.0
# Author: @swve
# (c) LearnHouse 2022
########################

# Get LearnHouse Config
learnhouse_config: LearnHouseConfig = get_learnhouse_config()

# Global Config
app = FastAPI(
    title=learnhouse_config.site_name,
    description=learnhouse_config.site_description,
    docs_url="/docs" if learnhouse_config.general_config.development_mode else None,
    redoc_url="/redoc" if learnhouse_config.general_config.development_mode else None,
    version="0.1.0",
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
    logfire.configure(console=False, service_name=learnhouse_config.site_name,)
    logfire.instrument_fastapi(app)
    # Instrument database after logfire is configured
    from src.core.events.database import engine
    logfire.instrument_sqlalchemy(engine=engine)

# Gzip Middleware (will add brotli later)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Register EE Middlewares if available
register_ee_middlewares(app)

# Waitlist Background Jobs Scheduler
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    from src.jobs.waitlist_processor import (
        sync_run_waitlist_activation_job,
        sync_run_retry_failed_emails_job,
    )
    import os
    
    # Check if waitlist processor is enabled
    WAITLIST_PROCESSOR_ENABLED = os.getenv("WAITLIST_PROCESSOR_ENABLED", "true").lower() == "true"
    WAITLIST_PROCESSOR_INTERVAL = int(os.getenv("WAITLIST_PROCESSOR_INTERVAL", "300"))  # Default: 5 minutes
    WAITLIST_RETRY_INTERVAL = int(os.getenv("WAITLIST_RETRY_INTERVAL", "3600"))  # Default: 1 hour
    
    if WAITLIST_PROCESSOR_ENABLED:
        scheduler = AsyncIOScheduler()
        
        # Add waitlist activation job (runs every 5 minutes by default)
        scheduler.add_job(
            sync_run_waitlist_activation_job,
            trigger=IntervalTrigger(seconds=WAITLIST_PROCESSOR_INTERVAL),
            id="waitlist_activation",
            name="Process Waitlist Activations",
            replace_existing=True,
        )
        
        # Add retry failed emails job (runs every hour by default)
        scheduler.add_job(
            sync_run_retry_failed_emails_job,
            trigger=IntervalTrigger(seconds=WAITLIST_RETRY_INTERVAL),
            id="waitlist_retry",
            name="Retry Failed Waitlist Emails",
            replace_existing=True,
        )
        
        print(f"✓ Waitlist background jobs scheduled (activation: {WAITLIST_PROCESSOR_INTERVAL}s, retry: {WAITLIST_RETRY_INTERVAL}s)")
    else:
        scheduler = None
        print("✗ Waitlist background jobs disabled")
        
except ImportError:
    scheduler = None
    print("✗ APScheduler not installed. Waitlist background jobs will not run.")

# Events
app.add_event_handler("startup", startup_app(app))
app.add_event_handler("shutdown", shutdown_app(app))

# Start scheduler on app startup
@app.on_event("startup")
async def start_scheduler():
    """Start APScheduler on application startup"""
    if scheduler is not None:
        scheduler.start()
        print("✓ Waitlist background scheduler started")

# Stop scheduler on app shutdown
@app.on_event("shutdown")
async def stop_scheduler():
    """Stop APScheduler on application shutdown"""
    if scheduler is not None:
        scheduler.shutdown()
        print("✓ Waitlist background scheduler stopped")

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
    origin = request.headers.get("origin")
    headers = {}
    
    if origin in learnhouse_config.hosting_config.allowed_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers
    )

# Static Files
app.mount("/content", StaticFiles(directory="content"), name="content")

# Global Routes
app.include_router(v1_router)

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=learnhouse_config.hosting_config.port,
        reload=learnhouse_config.general_config.development_mode,
    )

# General Routes
@app.get("/")
async def root():
    return {"Message": "Welcome to LearnHouse ✨"}