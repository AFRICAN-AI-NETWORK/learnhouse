from fastapi import APIRouter, Depends

from ee.routers import referrals
from src.core.ee_hooks import register_ee_routers
from src.routers import (
                         admin_analytics,
                         announcements,
                         auth,
                         cohorts,
                         communications,
                         dev,
                         health,
                         notifications,
                         orgs,
                         roles,
                         search,
                         trail,
                         usergroups,
                         users,
                         waitlist,
)
from src.routers.ai import ai
from src.routers.chat import admin as chat_admin
from src.routers.chat import conversations as chat_conversations
from src.routers.chat import messages as chat_messages
from src.routers.chat import websocket as chat_websocket
from src.routers.code import router as code_router
from src.routers.contact import router as contact_router
from src.routers.courses import (
                         assignments,
                         certifications,
                         chapters,
                         collections,
                         courses,
                         grade,
                         live_sessions,
                         prerequisites,
                         schedules,
)
from src.routers.courses.activities import activities, blocks
from src.routers.utils import router as utils_router
from src.routers.webhooks.flutterwave import router as flutterwave_webhook_router
from src.services.dev.dev import isDevModeEnabledOrRaise

v1_router = APIRouter(prefix="/api/v1")


# API Routes
v1_router.include_router(users.router, prefix="/users", tags=["users"])
v1_router.include_router(usergroups.router, prefix="/usergroups", tags=["usergroups"])
v1_router.include_router(auth.router, prefix="/auth", tags=["auth"])
v1_router.include_router(orgs.router, prefix="/orgs", tags=["orgs"])
v1_router.include_router(roles.router, prefix="/roles", tags=["roles"])
v1_router.include_router(blocks.router, prefix="/blocks", tags=["blocks"])
v1_router.include_router(courses.router, prefix="/courses", tags=["courses"])
v1_router.include_router(search.router, prefix="/search", tags=["search"])
v1_router.include_router(
    assignments.router, prefix="/assignments", tags=["assignments"]
)
v1_router.include_router(chapters.router, prefix="/chapters", tags=["chapters"])
v1_router.include_router(activities.router, prefix="/activities", tags=["activities"])
v1_router.include_router(
    collections.router, prefix="/collections", tags=["collections"]
)
v1_router.include_router(
    certifications.router, prefix="/certifications", tags=["certifications"]
)
v1_router.include_router(
    live_sessions.router, prefix="/live_sessions", tags=["live_sessions"]
)
v1_router.include_router(
    prerequisites.router, prefix="/prerequisites", tags=["prerequisites"]
)
v1_router.include_router(grade.router, prefix="/courses", tags=["course-grade"])
v1_router.include_router(schedules.router, prefix="/courses", tags=["course-schedule"])
v1_router.include_router(trail.router, prefix="/trail", tags=["trail"])
v1_router.include_router(
    admin_analytics.router, prefix="/admin/analytics", tags=["admin-analytics"]
)
v1_router.include_router(ai.router, prefix="/ai", tags=["ai"])
v1_router.include_router(waitlist.router, prefix="/waitlist", tags=["waitlist"])
v1_router.include_router(
    communications.router, prefix="/communications", tags=["communications"]
)
v1_router.include_router(referrals.router, prefix="/referrals", tags=["referrals"])
v1_router.include_router(contact_router, prefix="/contact", tags=["contact"])
v1_router.include_router(
    flutterwave_webhook_router, prefix="/webhooks", tags=["webhooks"]
)
v1_router.include_router(cohorts.router, prefix="/cohorts", tags=["cohorts"])
v1_router.include_router(
    announcements.router, prefix="/announcements", tags=["announcements"]
)
v1_router.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)

# Chat Routes
v1_router.include_router(
    chat_conversations.router, prefix="/chat/conversations", tags=["chat"]
)
v1_router.include_router(chat_messages.router, prefix="/chat/messages", tags=["chat"])
v1_router.include_router(chat_websocket.router, prefix="/chat", tags=["chat"])
v1_router.include_router(chat_admin.router, prefix="/chat/admin", tags=["chat-admin"])

# Register EE Routers if available
register_ee_routers(v1_router)

v1_router.include_router(health.router, prefix="/health", tags=["health"])

# Dev Routes
v1_router.include_router(
    dev.router,
    prefix="/dev",
    tags=["dev"],
    dependencies=[Depends(isDevModeEnabledOrRaise)],
)

v1_router.include_router(code_router, prefix="/code", tags=["code"])
v1_router.include_router(utils_router, prefix="/utils", tags=["utils"])
