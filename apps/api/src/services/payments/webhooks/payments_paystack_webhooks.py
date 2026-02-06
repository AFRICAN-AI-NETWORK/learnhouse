import logging
import hmac
import hashlib
from fastapi import HTTPException, Request
from sqlmodel import Session, select
from config.config import get_learnhouse_config
from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser
from src.db.users import InternalUser
from src.services.payments.payments_users import update_payment_user_status
from src.services.payments.payments_paystack import verify_transaction
from src.services.payments.discount_codes import (
    record_discount_usage,
    increment_discount_usage_atomic,
)

logger = logging.getLogger(__name__)


async def verify_paystack_webhook_signature(
    payload: bytes,
    signature: str,
    secret: str,
) -> bool:
    """Verify Paystack webhook signature"""
    computed_hash = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha512
    ).hexdigest()
    
    return hmac.compare_digest(computed_hash, signature)


async def handle_paystack_webhook(
    request: Request,
    db_session: Session,
) -> dict:
    """Handle Paystack webhook events"""
    # Get Paystack webhook secret from config
    learnhouse_config = get_learnhouse_config()
    webhook_secret = learnhouse_config.payments_config.paystack.paystack_webhook_secret
    
    if not webhook_secret:
        logger.error("Paystack webhook secret not configured")
        raise HTTPException(status_code=400, detail="Paystack webhook secret not configured")
    
    # Get request data
    payload = await request.body()
    signature = request.headers.get('x-paystack-signature')
    
    if not signature:
        logger.error("Missing Paystack signature header")
        raise HTTPException(status_code=400, detail="Missing Paystack signature header")
    
    # Verify webhook signature
    if not await verify_paystack_webhook_signature(payload, signature, webhook_secret):
        logger.error("Invalid Paystack webhook signature")
        raise HTTPException(status_code=400, detail="Invalid Paystack webhook signature")
    
    try:
        import json
        event_data = json.loads(payload.decode('utf-8'))
        
        event_type = event_data.get("event")
        data = event_data.get("data", {})
        
        logger.info(f"Processing Paystack webhook event: {event_type}")
        
        # Handle different event types
        if event_type == "charge.success":
            # Payment was successful
            transaction_reference = data.get("reference")
            metadata = data.get("metadata", {})
            payment_user_id = metadata.get("payment_user_id")
            
            if not payment_user_id:
                logger.warning("No payment_user_id in webhook metadata")
                return {"status": "ignored", "message": "No payment_user_id in metadata"}
            
            # Verify the transaction
            try:
                transaction_data = await verify_transaction(transaction_reference)
                
                if transaction_data.get("status") == "success":
                    # Get org_id from metadata
                    org_id = int(metadata.get("org_id"))
                    
                    # Update payment user status
                    await update_payment_user_status(
                        request=request,
                        org_id=org_id,
                        payment_user_id=int(payment_user_id),
                        status=PaymentStatusEnum.COMPLETED,
                        current_user=InternalUser(),
                        db_session=db_session,
                    )
                    
                    # CRITICAL: Record discount usage if discount was applied
                    # Implements idempotency check to prevent duplicate webhook processing
                    discount_code_id = metadata.get("discount_code_id")
                    course_id = metadata.get("course_id")
                    
                    if discount_code_id and course_id:
                        # Get payment user to retrieve discount information
                        payment_user = db_session.exec(
                            select(PaymentsUser).where(PaymentsUser.id == int(payment_user_id))
                        ).first()
                        
                        if payment_user and payment_user.discount_code_id:
                            try:
                                # First, atomically increment the usage counter
                                # This prevents race conditions with concurrent payments
                                increment_success = await increment_discount_usage_atomic(
                                    int(discount_code_id),
                                    db_session
                                )
                                
                                if increment_success:
                                    # Record the usage details
                                    await record_discount_usage(
                                        discount_code_id=int(discount_code_id),
                                        user_id=int(metadata.get("user_id")),
                                        course_id=int(course_id),
                                        payment_user_id=int(payment_user_id),
                                        original_amount=payment_user.original_amount,
                                        discount_amount=payment_user.discount_amount,
                                        final_amount=payment_user.final_amount,
                                        db_session=db_session
                                    )
                                    logger.info(f"Recorded discount usage for payment_user_id: {payment_user_id}, discount_code_id: {discount_code_id}")
                                else:
                                    logger.warning(f"Failed to increment discount usage counter (max_uses reached?) for discount_code_id: {discount_code_id}")
                            except Exception as e:
                                logger.error(f"Error recording discount usage: {str(e)}")
                                # Don't fail the webhook - payment was successful
                    
                    logger.info(f"Payment completed for payment_user_id: {payment_user_id}")
                    return {"status": "success", "message": "Payment processed successfully"}
                else:
                    logger.warning(f"Transaction verification failed for reference: {transaction_reference}")
                    return {"status": "ignored", "message": "Transaction not successful"}
            except Exception as e:
                logger.error(f"Error verifying transaction: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Error verifying transaction: {str(e)}")
        
        elif event_type == "charge.failed":
            # Payment failed
            metadata = data.get("metadata", {})
            payment_user_id = metadata.get("payment_user_id")
            
            if not payment_user_id:
                logger.warning("No payment_user_id in webhook metadata")
                return {"status": "ignored", "message": "No payment_user_id in metadata"}
            
            org_id = int(metadata.get("org_id"))
            
            # Update payment user status to failed
            await update_payment_user_status(
                request=request,
                org_id=org_id,
                payment_user_id=int(payment_user_id),
                status=PaymentStatusEnum.FAILED,
                current_user=InternalUser(),
                db_session=db_session,
            )
            
            logger.info(f"Payment failed for payment_user_id: {payment_user_id}")
            return {"status": "success", "message": "Payment failure processed"}
        
        elif event_type == "subscription.create":
            # Subscription created
            metadata = data.get("metadata", {})
            payment_user_id = metadata.get("payment_user_id")
            
            if not payment_user_id:
                logger.warning("No payment_user_id in webhook metadata")
                return {"status": "ignored", "message": "No payment_user_id in metadata"}
            
            org_id = int(metadata.get("org_id"))
            
            # Update payment user status to active
            await update_payment_user_status(
                request=request,
                org_id=org_id,
                payment_user_id=int(payment_user_id),
                status=PaymentStatusEnum.ACTIVE,
                current_user=InternalUser(),
                db_session=db_session,
            )
            
            logger.info(f"Subscription created for payment_user_id: {payment_user_id}")
            return {"status": "success", "message": "Subscription created"}
        
        elif event_type == "subscription.disable":
            # Subscription disabled/cancelled
            metadata = data.get("metadata", {})
            payment_user_id = metadata.get("payment_user_id")
            
            if not payment_user_id:
                logger.warning("No payment_user_id in webhook metadata")
                return {"status": "ignored", "message": "No payment_user_id in metadata"}
            
            org_id = int(metadata.get("org_id"))
            
            # Update payment user status to cancelled
            await update_payment_user_status(
                request=request,
                org_id=org_id,
                payment_user_id=int(payment_user_id),
                status=PaymentStatusEnum.CANCELLED,
                current_user=InternalUser(),
                db_session=db_session,
            )
            
            logger.info(f"Subscription cancelled for payment_user_id: {payment_user_id}")
            return {"status": "success", "message": "Subscription cancelled"}
        
        else:
            logger.warning(f"Unhandled Paystack event type: {event_type}")
            return {"status": "ignored", "message": f"Unhandled event type: {event_type}"}
    
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in webhook payload: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.error(f"Error processing Paystack webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing webhook: {str(e)}")
