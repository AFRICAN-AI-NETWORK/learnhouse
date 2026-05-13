"""
Scheduled Jobs for Referral System
Background tasks that run periodically.

All synchronous DB work is offloaded to a worker thread via
asyncio.to_thread() so the event loop is never blocked.
"""

import asyncio
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from sqlmodel import Session, select
from src.core.events.database import engine
from src.services.referrals.referral_commissions import (
    update_pending_commissions_to_eligible,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Capped thread pool – mirrors the waitlist processor strategy.
# Prevents unbounded thread growth under heavy payout volume.
# ---------------------------------------------------------------------------
_JOB_MAX_WORKERS = int(os.getenv("JOB_THREAD_POOL_SIZE", "4"))
_job_executor = ThreadPoolExecutor(
    max_workers=_JOB_MAX_WORKERS,
    thread_name_prefix="referral-job",
)


def _safe_asyncio_run(coro):
    """
    Call asyncio.run() only when there is NO running event loop.

    """
    # get_running_loop() returns the loop if one is active, otherwise raises
    # RuntimeError.  We *want* the RuntimeError (= no loop = safe to proceed).
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
# Sync helpers – run inside _job_executor via loop.run_in_executor()
# ---------------------------------------------------------------------------


def _sync_process_commissions() -> dict:
    """Process commission eligibility on a worker thread."""
    start = time.monotonic()
    with Session(engine) as db_session:
        updated_count = _safe_asyncio_run(
            update_pending_commissions_to_eligible(db_session)
        )
    elapsed = time.monotonic() - start
    return {"updated_count": updated_count, "elapsed_s": round(elapsed, 2)}


def _sync_process_payouts() -> dict:
    """Process payout requests on a worker thread."""
    from src.db.referrals.payout_requests import ReferrerPayoutRequest, PayoutStatus
    from src.services.referrals.payouts import process_payout_request

    start = time.monotonic()
    processed_count = 0
    failed_count = 0

    with Session(engine) as db_session:
        statement = (
            select(ReferrerPayoutRequest)
            .where(ReferrerPayoutRequest.status == PayoutStatus.APPROVED)
            .limit(10)
        )  # Process in batches

        payouts = db_session.exec(statement).all()

        for payout in payouts:
            try:
                _safe_asyncio_run(process_payout_request(payout.id, db_session))
                processed_count += 1
            except Exception as e:
                logger.error(
                    "Error processing payout %s: %s", payout.id, e, exc_info=True
                )
                failed_count += 1

    elapsed = time.monotonic() - start
    return {
        "processed_count": processed_count,
        "failed_count": failed_count,
        "elapsed_s": round(elapsed, 2),
    }


# ---------------------------------------------------------------------------
# Async job entry-points (called by APScheduler)
# Uses loop.run_in_executor with the capped _job_executor.
# ---------------------------------------------------------------------------


async def process_commission_eligibility_job():
    """
    Daily job to update pending commissions to eligible after 14-day refund period.
    """
    logger.info("Commission eligibility job started")
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(_job_executor, _sync_process_commissions)
        logger.info(
            "Commission eligibility job completed in %.2fs — "
            "updated %d commissions to eligible",
            result["elapsed_s"],
            result["updated_count"],
        )
    except Exception as e:
        logger.error("Commission eligibility job failed: %s", e, exc_info=True)


async def process_payout_requests_job():
    """
    Background job to process pending payout requests.
    Runs every 5 minutes. DB + Paystack work offloaded to a capped thread pool.
    """
    logger.info("Payout processing job started")
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(_job_executor, _sync_process_payouts)
        logger.info(
            "Payout processing job completed in %.2fs — " "processed: %d, failed: %d",
            result["elapsed_s"],
            result["processed_count"],
            result["failed_count"],
        )
    except Exception as e:
        logger.error("Payout processing job failed: %s", e, exc_info=True)


# Schedule configuration for external scheduler (e.g., APScheduler, Celery)
SCHEDULED_JOBS = {
    "commission_eligibility": {
        "function": process_commission_eligibility_job,
        "schedule": "daily",  # Run once per day
        "time": "00:00",  # Midnight
        "description": "Update pending commissions to eligible after refund period",
    },
    "payout_requests": {
        "function": process_payout_requests_job,
        "schedule": "interval",  # Run at intervals
        "minutes": 5,  # Every 5 minutes
        "description": "Process pending payout requests with Paystack",
    },
}
