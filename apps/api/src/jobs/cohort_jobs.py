"""Cohort Background Job Processor

This module contains scheduled jobs for processing cohort unlocking.
"""

import asyncio
import logging
from datetime import UTC, datetime

from sqlmodel import Session, select

from src.core.events.database import engine
from src.db.cohorts import Cohort, CohortEnrollment, CohortStatusEnum

logger = logging.getLogger(__name__)


async def process_cohort_unlocks(db_session: Session):
    """
    Checks for cohorts that have reached their start_date and unlocks them.
    """
    current_time_utc = datetime.now(UTC)

    # Get all upcoming cohorts
    statement = select(Cohort).where(Cohort.status == CohortStatusEnum.UPCOMING)
    cohorts = db_session.exec(statement).all()

    for cohort in cohorts:
        try:
            start_dt = datetime.fromisoformat(cohort.start_date)
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=UTC)
            else:
                start_dt = start_dt.astimezone(UTC)

            if current_time_utc >= start_dt:
                # Unlock cohort
                cohort.status = CohortStatusEnum.ACTIVE
                cohort.update_date = str(datetime.now(UTC))
                db_session.add(cohort)

                # Unlock all enrollments in this cohort
                enrollment_stmt = select(CohortEnrollment).where(
                    CohortEnrollment.cohort_id == cohort.id
                )
                enrollments = db_session.exec(enrollment_stmt).all()
                for enrollment in enrollments:
                    enrollment.is_locked = False
                    db_session.add(enrollment)

                db_session.commit()
                logger.info(
                    f"Successfully unlocked cohort {cohort.name} ({cohort.cohort_uuid})"
                )
        except ValueError as e:
            logger.error(
                f"Error parsing start_date for cohort {cohort.cohort_uuid}: {e}"
            )
            continue
        except Exception as e:  # noqa: BLE001
            logger.error(f"Error unlocking cohort {cohort.cohort_uuid}: {e}")
            db_session.rollback()
            continue


def sync_process_cohort_unlocks():
    """Synchronous wrapper for APScheduler"""
    with Session(engine) as db_session:
        asyncio.run(process_cohort_unlocks(db_session))
