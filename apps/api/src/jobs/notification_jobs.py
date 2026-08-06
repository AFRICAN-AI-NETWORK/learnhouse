"""Notification Background Job Processor

Runs periodically via APScheduler to attempt/retry email delivery for
pending notifications. Follows the same worker-thread pattern as
src.jobs.waitlist_processor so notification email I/O (blocking smtplib
calls) never runs on the main asyncio event loop.
"""

import asyncio
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor

from sqlmodel import Session

from src.core.events.database import engine
from src.services.notifications.email_dispatch import (
    process_pending_notification_emails,
)

logger = logging.getLogger(__name__)

_JOB_MAX_WORKERS = int(os.getenv("JOB_THREAD_POOL_SIZE", "4"))
_job_executor = ThreadPoolExecutor(
    max_workers=_JOB_MAX_WORKERS,
    thread_name_prefix="notification-job",
)


def _sync_process_pending_notification_emails() -> dict:
    """Run the notification email sweep on a worker thread."""
    start = time.monotonic()
    with Session(engine) as db_session:
        result = process_pending_notification_emails(db_session)
    result["elapsed_s"] = round(time.monotonic() - start, 2)
    return result


async def run_notification_email_job():
    """Main job that sends/retries pending notification emails."""
    logger.info("Notification email job started")
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            _job_executor, _sync_process_pending_notification_emails
        )
        logger.info(
            "Notification email job completed in %.2fs: sent=%d failed=%d total=%d",
            result["elapsed_s"],
            result["sent"],
            result["failed"],
            result["total"],
        )
    except Exception as e:
        logger.exception("Notification email job failed: %s", e)


def sync_run_notification_email_job():
    """Synchronous wrapper for APScheduler."""
    asyncio.run(run_notification_email_job())


if __name__ == "__main__":
    # For manual testing or cron-based execution
    asyncio.run(run_notification_email_job())
