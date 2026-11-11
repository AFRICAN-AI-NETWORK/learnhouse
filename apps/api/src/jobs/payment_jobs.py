import logging

from sqlmodel import Session
from src.db.db import engine

from src.services.payments.payments_cycles import process_subscription_lifecycle

logger = logging.getLogger(__name__)


async def process_payment_grace_periods_job():
    """
    Scheduled daily job for subscription lifecycle enforcement:
    - Send 3-day pre-expiry reminders for manual-renewal subscriptions.
    - Start 7-day grace periods when subscription periods end unrenewed.
    - Expire subscriptions whose 7-day grace period has elapsed.
    """
    logger.info("Starting payment grace period & renewal lifecycle job")

    with Session(engine) as session:
        try:
            summary = await process_subscription_lifecycle(session)
            logger.info(
                "Subscription lifecycle job completed: reminded=%d, grace_started=%d, expired=%d",
                summary["reminded"],
                summary["grace_started"],
                summary["expired"],
            )
        except Exception as e:
            logger.exception(f"Payment grace period processing failed: {e}")
