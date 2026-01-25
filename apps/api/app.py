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

# -------------------------
# ✅ CORS Middleware
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=learnhouse_config.hosting_config.allowed_regexp,
    allow_methods=["*"],
    allow_credentials=True,
    allow_headers=["*"],
)

# -------------------------
# ✅ FIX #1: Global OPTIONS handler
# This MUST be defined BEFORE routers
# -------------------------
@app.options("/{path:path}")
async def preflight_handler(path: str):
    return JSONResponse(status_code=200)

# -------------------------
# Logfire (optional)
# -------------------------
if learnhouse_config.general_config.logfire_enabled:
    logfire.configure(console=False, service_name=learnhouse_config.site_name)
    logfire.instrument_fastapi(app)
    from src.core.events.database import engine
    logfire.instrument_sqlalchemy(engine=engine)

# -------------------------
# Gzip Middleware
# -------------------------
app.add_middleware(GZipMiddleware, minimum_size=1000)

# -------------------------
# EE Middlewares
# -------------------------
register_ee_middlewares(app)

# -------------------------
# Lifecycle Events
# -------------------------
app.add_event_handler("startup", startup_app(app))
app.add_event_handler("shutdown", shutdown_app(app))

# -------------------------
# JWT Exception Handler
# -------------------------
@app.exception_handler(AuthJWTException)
def authjwt_exception_handler(request: Request, exc: AuthJWTException):
    return JSONResponse(
        status_code=exc.status_code,  # type: ignore
        content={"detail": exc.message},  # type: ignore
    )

# -------------------------
# Static Files
# -------------------------
app.mount("/content", StaticFiles(directory="content"), name="content")

# -------------------------
# API Routes (AFTER OPTIONS FIX)
# -------------------------
app.include_router(v1_router)

# -------------------------
# Root Route
# -------------------------
@app.get("/")
async def root():
    return {"Message": "Welcome to LearnHouse ✨"}

# -------------------------
# Run Server
# -------------------------
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=learnhouse_config.hosting_config.port,
        reload=learnhouse_config.general_config.development_mode,
    )
