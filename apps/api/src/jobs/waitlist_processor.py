"""Waitlist Background Job Processor

This module contains the scheduled jobs for processing waitlist activations
and retrying failed email deliveries.

Runs periodically via APScheduler to:
1. Check for waitlists that have reached their launch_datetime
2. Send batch activation emails to waitlist users
3. Retry failed email deliveries with exponential backoff

All synchronous DB work is offloaded to a thread via asyncio.to_thread()
so the event loop is never blocked by long-running queries.
"""

import asyncio
import logging
import time

from src.services.waitlist.emails import (
    process_waitlist_activations,
    retry_failed_waitlist_emails,
)
from sqlmodel import Session
from src.core.events.database import engine

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Sync helpers – these run inside a worker thread via asyncio.to_thread()
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
        asyncio.run(process_waitlist_activations(db_session))
    elapsed = time.monotonic() - start
    return {"elapsed_s": round(elapsed, 2)}


def _sync_retry_failed_emails() -> dict:
    """
    Run failed-email retry processing on a worker thread.
    Returns a summary dict for logging.
    """
    start = time.monotonic()
    with Session(engine) as db_session:
        asyncio.run(retry_failed_waitlist_emails(db_session))
    elapsed = time.monotonic() - start
    return {"elapsed_s": round(elapsed, 2)}


# ---------------------------------------------------------------------------
# Async job entry-points (called by APScheduler)
# ---------------------------------------------------------------------------

async def run_waitlist_activation_job():
    """
    Main job that processes waitlist activations.
    Runs every minute (cron) for near-real-time delivery.
    DB work is offloaded to a thread so the event loop stays responsive.
    """
    logger.info("Waitlist activation job started")
    try:
        result = await asyncio.to_thread(_sync_process_activations)
        logger.info(
            "Waitlist activation job completed in %.2fs",
            result["elapsed_s"],
        )
    except Exception as e:
        logger.error("Waitlist activation job failed: %s", e, exc_info=True)


async def run_retry_failed_emails_job():
    """
    Retry job for failed email deliveries.
    Runs every 15 minutes to avoid blacklisting by mail providers.
    DB work is offloaded to a thread so the event loop stays responsive.
    """
    logger.info("Retry failed emails job started")
    try:
        result = await asyncio.to_thread(_sync_retry_failed_emails)
        logger.info(
            "Retry failed emails job completed in %.2fs",
            result["elapsed_s"],
        )
    except Exception as e:
        logger.error("Retry failed emails job failed: %s", e, exc_info=True)


# ---------------------------------------------------------------------------
# Synchronous wrappers (APScheduler calls these from its own thread pool)
# ---------------------------------------------------------------------------

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
