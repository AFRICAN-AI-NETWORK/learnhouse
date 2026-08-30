"""Communications Background Job Processor

Runs periodically via APScheduler to sweep pending/retryable campaign
recipients and dispatch them via the email provider.
"""

import asyncio
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor

from sqlmodel import Session

from src.core.events.database import engine
from src.services.communications.dispatch import process_campaign_dispatch_job

logger = logging.getLogger(__name__)

_JOB_MAX_WORKERS = int(os.getenv("JOB_THREAD_POOL_SIZE", "4"))
_job_executor = ThreadPoolExecutor(
    max_workers=_JOB_MAX_WORKERS,
    thread_name_prefix="communications-job",
)

def _sync_process_campaign_dispatch_job():
    """Run the campaign dispatch sweep on a worker thread."""
    start = time.monotonic()
    with Session(engine) as db_session:
        # process_campaign_dispatch_job is currently declared as async but only calls sync code.
        # Since it's async, we need to run it in a new event loop, or change it to sync.
        # It's better to just run the async function using asyncio.run if it contains awaits,
        # but since we are in a thread pool and the function is async:
        asyncio.run(process_campaign_dispatch_job(db_session))
    
    elapsed = round(time.monotonic() - start, 2)
    return {"elapsed_s": elapsed}

async def run_communications_dispatch_job():
    """Main job that dispatches queued campaign emails."""
    logger.info("Communications dispatch job started")
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            _job_executor, _sync_process_campaign_dispatch_job
        )
        logger.info(
            "Communications dispatch job completed in %.2fs",
            result["elapsed_s"],
        )
    except Exception as e:
        logger.exception("Communications dispatch job failed: %s", e)

def sync_run_communications_dispatch_job():
    """Synchronous wrapper for APScheduler."""
    asyncio.run(run_communications_dispatch_job())

if __name__ == "__main__":
    asyncio.run(run_communications_dispatch_job())
