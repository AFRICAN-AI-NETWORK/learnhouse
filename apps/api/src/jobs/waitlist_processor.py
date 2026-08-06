"""Waitlist Background Job Processor

This module contains the scheduled jobs for processing waitlist activations
and retrying failed email deliveries.

Runs periodically via APScheduler to:
1. Check for waitlists that have reached their launch_datetime
2. Send batch activation emails to waitlist users
3. Retry failed email deliveries with exponential backoff

"""

import asyncio
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor

from sqlmodel import Session

from src.core.events.database import engine
from src.services.waitlist.emails import (
    process_waitlist_activations,
    retry_failed_waitlist_emails,
)

logger = logging.getLogger(__name__)


_JOB_MAX_WORKERS = int(os.getenv("JOB_THREAD_POOL_SIZE", "4"))
_job_executor = ThreadPoolExecutor(
    max_workers=_JOB_MAX_WORKERS,
    thread_name_prefix="waitlist-job",
)


def _safe_asyncio_run(coro):
    """
    Call asyncio.run() only when there is NO running event loop.


    """
    has_loop = True
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        has_loop = False

    if has_loop:
        raise RuntimeError(
            "_safe_asyncio_run() must be called from a worker thread, "
            "never from the main async event loop."
        )

    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Sync helpers – these run inside _job_executor via loop.run_in_executor()
# ---------------------------------------------------------------------------


def _sync_process_activations() -> dict:
    """
    Run waitlist activation processing on a worker thread.
    Returns a summary dict for logging.
    """
    start = time.monotonic()
    with Session(engine) as db_session:
        # process_waitlist_activations is declared async but its only truly
        # async operation is asyncio.sleep() between batches (rate-limiting).
        # Running it through asyncio.run() inside the thread keeps the sleep
        # working while keeping the sync DB calls off the main event loop.
        _safe_asyncio_run(process_waitlist_activations(db_session))
    elapsed = time.monotonic() - start
    return {"elapsed_s": round(elapsed, 2)}


def _sync_retry_failed_emails() -> dict:
    """
    Run failed-email retry processing on a worker thread.
    Returns a summary dict for logging.
    """
    start = time.monotonic()
    with Session(engine) as db_session:
        _safe_asyncio_run(retry_failed_waitlist_emails(db_session))
    elapsed = time.monotonic() - start
    return {"elapsed_s": round(elapsed, 2)}


async def run_waitlist_activation_job():
    """
    Main job that processes waitlist activations.
    """
    logger.info("Waitlist activation job started")
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(_job_executor, _sync_process_activations)
        logger.info(
            "Waitlist activation job completed in %.2fs",
            result["elapsed_s"],
        )
    except Exception as e:
        logger.exception("Waitlist activation job failed: %s", e)


async def run_retry_failed_emails_job():
    """
    Retry job for failed email deliveries.

    """
    logger.info("Retry failed emails job started")
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(_job_executor, _sync_retry_failed_emails)
        logger.info(
            "Retry failed emails job completed in %.2fs",
            result["elapsed_s"],
        )
    except Exception as e:
        logger.exception("Retry failed emails job failed: %s", e)


def sync_run_waitlist_activation_job():
    """Synchronous wrapper for APScheduler"""
    asyncio.run(run_waitlist_activation_job())


def sync_run_retry_failed_emails_job():
    """Synchronous wrapper for APScheduler"""
    asyncio.run(run_retry_failed_emails_job())


if __name__ == "__main__":
    # For manual testing or cron-based execution
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "retry":
        asyncio.run(run_retry_failed_emails_job())
    else:
        asyncio.run(run_waitlist_activation_job())
