"""
Scheduled Jobs for Domain List Management
Run these jobs to keep email domain lists up-to-date
"""
import logging
from sqlmodel import Session

from src.db.db import engine
from src.services.referrals.fraud_prevention import (
    update_disposable_email_list,
    seed_initial_domain_lists,
)

logger = logging.getLogger(__name__)


async def update_email_domain_lists_job():
    """
    Scheduled job to update disposable email domains from external source
    Schedule: Weekly (Sunday at midnight recommended)
    
    This job:
    1. Fetches latest disposable domains from GitHub
    2. Updates database with new domains
    3. Deactivates domains no longer in external list
    4. Refreshes in-memory cache
    """
    logger.info("Starting email domain list update job")
    
    with Session(engine) as session:
        try:
            stats = await update_disposable_email_list(session)
            
            if stats["success"]:
                logger.info(
                    f"Email domain list update completed: "
                    f"{stats['added']} added, {stats['deactivated']} deactivated, "
                    f"{stats['total']} total domains"
                )
            else:
                logger.error(
                    f"Email domain list update failed: {stats.get('error', 'Unknown error')}"
                )
        except Exception as e:
            logger.error(f"Email domain list update job failed: {e}", exc_info=True)


async def seed_domain_lists_job():
    """
    One-time job to seed initial domain lists
    Run this once during initial deployment
    """
    logger.info("Starting domain list seeding job")
    
    with Session(engine) as session:
        try:
            await seed_initial_domain_lists(session)
            logger.info("Domain list seeding completed")
        except Exception as e:
            logger.error(f"Domain list seeding failed: {e}", exc_info=True)


# Example scheduler configuration (APScheduler):
# from apscheduler.schedulers.asyncio import AsyncIOScheduler
#
# scheduler = AsyncIOScheduler()
# 
# # Update domain lists weekly (Sunday at midnight)
# scheduler.add_job(
#     update_email_domain_lists_job,
#     'cron',
#     day_of_week='sun',
#     hour=0,
#     minute=0,
#     id='update_email_domain_lists'
# )
#
# scheduler.start()
