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
                    product_id = metadata.get("product_id")
                    
                    if discount_code_id and (course_id or product_id):
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
                                        course_id=int(course_id) if course_id else None,
                                        product_id=int(product_id) if product_id else None,
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
                    
                    # REFERRAL SYSTEM: Create commission if payment has referral code
                    # Get payment user for referral tracking
                    payment_user = db_session.exec(
                        select(PaymentsUser).where(PaymentsUser.id == int(payment_user_id))
                    ).first()
                    
                    if payment_user and payment_user.referral_code_id:
                        try:
                            from datetime import datetime
                            from src.services.referrals.referral_commissions import create_commission_for_payment
                            from sqlmodel import and_
                            from src.db.referrals.referral_tracking import ReferralTracking
                            
                            # Get referral tracking to find referrer
                            tracking_statement = select(ReferralTracking).where(
                                and_(
                                    ReferralTracking.referred_user_id == payment_user.user_id,
                                    ReferralTracking.referral_code_id == payment_user.referral_code_id
                                )
                            )
                            tracking = db_session.exec(tracking_statement).first()
                            
                            if tracking:
                                # Create commission (implements idempotency check internally)
                                commission = await create_commission_for_payment(
                                    org_id=payment_user.org_id,
                                    referrer_user_id=tracking.referrer_user_id,
                                    referred_user_id=payment_user.user_id,
                                    payment_user_id=payment_user.id,
                                    course_id=int(course_id) if course_id else None,
                                    referral_code_id=payment_user.referral_code_id,
                                    payment_completion_date=datetime.now(),
                                    db_session=db_session
                                )
                                
                                if commission:
                                    logger.info(
                                        f"Created referral commission ${commission.commission_amount} "
                                        f"for referrer {tracking.referrer_user_id} from payment {payment_user_id}"
                                    )
                                else:
                                    logger.info(
                                        f"Commission already exists for payment {payment_user_id} - idempotent response"
                                    )
                            else:
                                logger.warning(
                                    f"No referral tracking found for payment {payment_user_id} "
                                    f"with referral_code_id {payment_user.referral_code_id}"
                                )
                        except Exception as e:
                            logger.error(f"Error creating referral commission: {str(e)}")
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
        
        elif event_type == "refund.processed":
            # Refund should use final_amount (not original_amount)
            # and decrement discount usage counter
            metadata = data.get("metadata", {})
            payment_user_id = metadata.get("payment_user_id")
            
            if not payment_user_id:
                logger.warning("No payment_user_id in refund webhook metadata")
                return {"status": "ignored", "message": "No payment_user_id in metadata"}
            
            org_id = int(metadata.get("org_id"))
            
            # Update payment user status to refunded
            await update_payment_user_status(
                request=request,
                org_id=org_id,
                payment_user_id=int(payment_user_id),
                status=PaymentStatusEnum.REFUNDED,
                current_user=InternalUser(),
                db_session=db_session,
            )
            
            # Check if discount was used and decrement usage
            payment_user = db_session.exec(
                select(PaymentsUser).where(PaymentsUser.id == int(payment_user_id))
            ).first()
            
            if payment_user and payment_user.discount_code_id:
                try:
                    # Import here to avoid circular dependency
                    from src.services.payments.discount_codes import decrement_discount_usage
                    
                    # Decrement usage counter and remove usage record
                    decrement_success = await decrement_discount_usage(
                        discount_code_id=payment_user.discount_code_id,
                        payment_user_id=int(payment_user_id),
                        db_session=db_session
                    )
                    
                    if decrement_success:
                        logger.info(
                            f"Refund processed: payment_user_id={payment_user_id}, "
                            f"discount_code_id={payment_user.discount_code_id}, "
                            f"refund_amount={payment_user.final_amount} (used final_amount, not original_amount)"
                        )
                    else:
                        logger.warning(
                            f"Failed to decrement discount usage for refund: payment_user_id={payment_user_id}"
                        )
                except Exception as e:
                    logger.error(f"Error processing refund discount usage: {str(e)}")
                    # Don't fail the webhook - refund was processed
            
            # REFERRAL SYSTEM: Forfeit commission if refund within refund period
            if payment_user and payment_user.referral_code_id:
                try:
                    from src.services.referrals.referral_commissions import forfeit_commission_for_refund
                    
                    commission = await forfeit_commission_for_refund(
                        payment_user_id=int(payment_user_id),
                        db_session=db_session
                    )
                    
                    if commission:
                        logger.info(
                            f"Forfeited referral commission ${commission.commission_amount} "
                            f"for payment {payment_user_id} due to refund"
                        )
                except Exception as e:
                    logger.error(f"Error forfeiting referral commission: {str(e)}")
                    # Don't fail the webhook - refund was processed
            
            logger.info(f"Refund processed for payment_user_id: {payment_user_id}")
            return {"status": "success", "message": "Refund processed"}
        
        else:
            logger.warning(f"Unhandled Paystack event type: {event_type}")
            return {"status": "ignored", "message": f"Unhandled event type: {event_type}"}
    
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in webhook payload: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.error(f"Error processing Paystack webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing webhook: {str(e)}")
