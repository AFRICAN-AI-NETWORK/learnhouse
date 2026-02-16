"""Waitlist Background Job Processor

This module contains the scheduled jobs for processing waitlist activations
and retrying failed email deliveries.

Runs periodically via APScheduler to:
1. Check for waitlists that have reached their launch_datetime
2. Send batch activation emails to waitlist users
3. Retry failed email deliveries with exponential backoff
"""

import asyncio
from datetime import datetime
from sqlmodel import Session, create_engine
from sqlalchemy.orm import sessionmaker
import os

from src.services.waitlist.emails import (
    process_waitlist_activations,
    retry_failed_waitlist_emails,
)


# Database connection setup
def get_database_url():
    """Get database URL from environment variables"""
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "postgres")
    db_name = os.getenv("DB_NAME", "learnhouse")
    
    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


# Create engine and session maker
engine = create_engine(get_database_url())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


async def run_waitlist_activation_job():
    """
    Main job that processes waitlist activations.
    Runs periodically (every 5 minutes recommended).
    """
    print(f"[{datetime.now()}] Running waitlist activation job...")
    
    db_session = SessionLocal()
    try:
        await process_waitlist_activations(db_session)
        print(f"[{datetime.now()}] Waitlist activation job completed")
    except Exception as e:
        print(f"[{datetime.now()}] Error in waitlist activation job: {str(e)}")
    finally:
        db_session.close()


async def run_retry_failed_emails_job():
    """
    Retry job for failed email deliveries.
    Runs less frequently (every hour recommended).
    """
    print(f"[{datetime.now()}] Running retry failed emails job...")
    
    db_session = SessionLocal()
    try:
        await retry_failed_waitlist_emails(db_session)
        print(f"[{datetime.now()}] Retry failed emails job completed")
    except Exception as e:
        print(f"[{datetime.now()}] Error in retry failed emails job: {str(e)}")
    finally:
        db_session.close()


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
