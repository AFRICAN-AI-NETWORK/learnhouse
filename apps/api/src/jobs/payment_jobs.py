import logging
from datetime import UTC, datetime

from sqlmodel import Session, select
from src.db.db import engine

from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser

logger = logging.getLogger(__name__)

async def process_payment_grace_periods_job():
    """
    Scheduled job to expire payment users whose 7-day grace period has passed.
    Schedule: Daily
    """
    logger.info("Starting payment grace period processing job")

    with Session(engine) as session:
        try:
            # Find users in ACTIVE or COMPLETED status with a grace_period_start_date older than 7 days
            statement = select(PaymentsUser).where(
                PaymentsUser.status.in_([PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED]),
                PaymentsUser.grace_period_start_date.is_not(None)
            )
            
            payment_users = session.exec(statement).all()
            
            expired_count = 0
            now = datetime.now(UTC)
            
            for pu in payment_users:
                # Ensure pu.grace_period_start_date is timezone-aware
                start_date = pu.grace_period_start_date
                if start_date.tzinfo is None:
                    start_date = start_date.replace(tzinfo=UTC)
                    
                days_elapsed = (now - start_date).days
                
                if days_elapsed >= 7:
                    pu.status = PaymentStatusEnum.EXPIRED
                    session.add(pu)
                    expired_count += 1
            
            if expired_count > 0:
                session.commit()
                
            logger.info(f"Payment grace period processing completed. Expired {expired_count} subscriptions.")
        except Exception as e:
            logger.exception(f"Payment grace period processing failed: {e}")
