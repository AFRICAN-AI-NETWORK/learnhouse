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

from src.services.waitlist.emails import (
    process_waitlist_activations,
    retry_failed_waitlist_emails,
)
from sqlmodel import Session
from src.core.events.database import engine

logger = logging.getLogger(__name__)


async def run_waitlist_activation_job():
    """
    Main job that processes waitlist activations.
    Runs every minute (cron) for near-real-time delivery.
    """
    logger.info("Running waitlist activation job")
    
    with Session(engine) as db_session:
        try:
            await process_waitlist_activations(db_session)
            logger.info("Waitlist activation job completed")
        except Exception as e:
            logger.error(f"Error in waitlist activation job: {e}", exc_info=True)


async def run_retry_failed_emails_job():
    """
    Retry job for failed email deliveries.
    Runs every 15 minutes to avoid blacklisting by mail providers.
    """
    logger.info("Running retry failed emails job")
    
    with Session(engine) as db_session:
        try:
            await retry_failed_waitlist_emails(db_session)
            logger.info("Retry failed emails job completed")
        except Exception as e:
            logger.error(f"Error in retry failed emails job: {e}", exc_info=True)


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
