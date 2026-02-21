"""
Scheduled Jobs for Referral System
Background tasks that run periodically
"""
import logging
from datetime import datetime
from sqlmodel import Session
from src.core.events.database import get_db_session
from src.services.referrals.referral_commissions import update_pending_commissions_to_eligible

logger = logging.getLogger(__name__)


async def process_commission_eligibility_job():
    """
    Daily job to update pending commissions to eligible after 14-day refund period
    Should be scheduled to run once per day (e.g., at midnight)
    """
    logger.info("Starting commission eligibility processing job")
    
    try:
        # Get database session
        db_session_generator = get_db_session()
        db_session: Session = next(db_session_generator)
        
        try:
            # Update commissions
            updated_count = await update_pending_commissions_to_eligible(db_session)
            
            logger.info(
                f"Commission eligibility job completed successfully. "
                f"Updated {updated_count} commissions to eligible status"
            )
            
            return {
                "status": "success",
                "updated_count": updated_count,
                "timestamp": datetime.now().isoformat()
            }
        finally:
            # Close session
            try:
                next(db_session_generator)
            except StopIteration:
                pass
    
    except Exception as e:
        logger.error(f"Error in commission eligibility job: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


async def process_payout_requests_job():
    """
    Background job to process pending payout requests
    Should run every few minutes to process new payout requests
    """
    logger.info("Starting payout request processing job")
    
    try:
        from sqlmodel import select, and_
        from src.db.referrals.payout_requests import ReferrerPayoutRequest, PayoutStatus
        from src.services.referrals.payouts import process_payout_request
        
        # Get database session
        db_session_generator = get_db_session()
        db_session: Session = next(db_session_generator)
        
        try:
            # Get all requested payouts
            statement = select(ReferrerPayoutRequest).where(
                ReferrerPayoutRequest.status == PayoutStatus.REQUESTED
            ).limit(10)  # Process in batches
            
            payouts = db_session.exec(statement).all()
            
            processed_count = 0
            failed_count = 0
            
            for payout in payouts:
                try:
                    await process_payout_request(payout.id, db_session)
                    processed_count += 1
                except Exception as e:
                    logger.error(f"Error processing payout {payout.id}: {str(e)}")
                    failed_count += 1
            
            logger.info(
                f"Payout processing job completed. "
                f"Processed: {processed_count}, Failed: {failed_count}"
            )
            
            return {
                "status": "success",
                "processed_count": processed_count,
                "failed_count": failed_count,
                "timestamp": datetime.now().isoformat()
            }
        finally:
            # Close session
            try:
                next(db_session_generator)
            except StopIteration:
                pass
    
    except Exception as e:
        logger.error(f"Error in payout processing job: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


# Schedule configuration for external scheduler (e.g., APScheduler, Celery)
SCHEDULED_JOBS = {
    "commission_eligibility": {
        "function": process_commission_eligibility_job,
        "schedule": "daily",  # Run once per day
        "time": "00:00",  # Midnight
        "description": "Update pending commissions to eligible after refund period"
    },
    "payout_requests": {
        "function": process_payout_requests_job,
        "schedule": "interval",  # Run at intervals
        "minutes": 5,  # Every 5 minutes
        "description": "Process pending payout requests with Paystack"
    }
}
