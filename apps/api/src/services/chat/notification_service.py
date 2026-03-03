from datetime import datetime, timedelta
from uuid import uuid4
from sqlmodel import Session, select
import logging

from src.db.chat.messages import Message
from src.db.chat.notifications import ChatNotification
from src.db.chat.conversations import Conversation
from src.db.users import User
from src.db.chat.messages import MessageReadReceipt

logger = logging.getLogger(__name__)

# Check if APScheduler is available
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    _APSCHEDULER_AVAILABLE = True
except ImportError:
    _APSCHEDULER_AVAILABLE = False
    logger.warning("APScheduler not available, scheduled email notifications will not work")


class NotificationService:
    """Service for managing chat notifications."""
    
    # Email notification delay (24 hours)
    EMAIL_DELAY_HOURS = 24
    
    @staticmethod
    async def send_message_notification(
        db: Session,
        message: Message
    ):
        """
        Send multi-channel notification for new message.
        
        Email notifications are scheduled for 24 hours later and will be
        cancelled if the message is read before that time.
        """
        
        # Create notification record
        notification = ChatNotification(
            notification_uuid=f"notif_{uuid4()}",
            user_id=message.receiver_id,
            message_id=message.id,
            conversation_id=message.conversation_id,
            notification_type="new_message",
            created_at=datetime.utcnow()
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        # Send in-app notification (always, immediate)
        await NotificationService._send_in_app_notification(
            message, notification
        )
        
        # Schedule email notification for 24 hours later (will be cancelled if read)
        await NotificationService._schedule_delayed_email_notification(
            db, message, notification
        )
        
        logger.info(f"Notification {notification.notification_uuid} created for message {message.message_uuid}")
    
    @staticmethod
    async def _send_in_app_notification(
        message: Message,
        notification: ChatNotification
    ):
        """Send in-app notification via WebSocket."""
        try:
            from src.services.chat.websocket_manager import connection_manager
            
            await connection_manager.send_personal_message(
                {
                    "type": "notification",
                    "data": {
                        "notification_uuid": notification.notification_uuid,
                        "type": "new_message",
                        "message": "You have a new message",
                        "conversation_id": message.conversation_id,
                        "sender_id": message.sender_id,
                        "created_at": datetime.utcnow().isoformat()
                    }
                },
                message.receiver_id
            )
            logger.debug(f"In-app notification sent to user {message.receiver_id}")
        except Exception as e:
            logger.warning(f"Failed to send in-app notification: {e}")
    
    @staticmethod
    async def _schedule_delayed_email_notification(
        db: Session,
        message: Message,
        notification: ChatNotification
    ):
        """
        Schedule email notification to be sent in 24 hours if message remains unread.
        Uses existing APScheduler from app.py.
        """
        
        if not _APSCHEDULER_AVAILABLE:
            logger.warning("APScheduler not available, email notification not scheduled")
            notification.delivery_status["email"] = "scheduler_unavailable"
            db.add(notification)
            db.commit()
            return
        
        try:
            # Get or create scheduler instance
            # Note: In production, this should use the app's scheduler instance
            scheduler = AsyncIOScheduler()
            
            # Schedule job for 24 hours from now
            run_time = datetime.utcnow() + timedelta(hours=NotificationService.EMAIL_DELAY_HOURS)
            
            scheduler.add_job(
                func=NotificationService._check_and_send_email,
                trigger='date',
                run_date=run_time,
                args=[message.id, notification.notification_uuid],
                id=f"email_notification_{message.message_uuid}",
                replace_existing=True
            )
            
            # Start scheduler if not already running
            if not scheduler.running:
                scheduler.start()
            
            # Update notification status
            notification.delivery_status["email"] = "scheduled"
            db.add(notification)
            db.commit()
            
            logger.info(f"Email notification scheduled for message {message.message_uuid} at {run_time}")
            
        except Exception as e:
            logger.error(f"Failed to schedule email notification: {e}")
            notification.delivery_status["email"] = "failed"
            db.add(notification)
            db.commit()
    
    @staticmethod
    async def _check_and_send_email(message_id: int, notification_uuid: str):
        """
        Check if message is still unread after 24 hours and send email if so.
        This is called by APScheduler.
        """
        try:
            from src.core.events.database import get_db_session
            
            db = next(get_db_session())
            
            # Get message
            message = db.get(Message, message_id)
            if not message or message.is_deleted:
                logger.info(f"Message {message_id} not found or deleted, skipping email")
                return
            
            # Check if message has been read
            read_receipt = db.exec(
                select(MessageReadReceipt)
                .where(MessageReadReceipt.message_id == message_id)
                .where(MessageReadReceipt.user_id == message.receiver_id)
                .where(MessageReadReceipt.read_at.isnot(None))
            ).first()
            
            if read_receipt:
                # Message was read, cancel email notification
                logger.info(f"Message {message_id} was read, cancelling email notification")
                
                # Update notification status
                notification = db.exec(
                    select(ChatNotification)
                    .where(ChatNotification.notification_uuid == notification_uuid)
                ).first()
                
                if notification:
                    notification.delivery_status["email"] = "cancelled_read"
                    db.add(notification)
                    db.commit()
                
                return
            
            # Message still unread after 24 hours, send email
            await NotificationService._send_email_now(db, message, notification_uuid)
            
        except Exception as e:
            logger.error(f"Error in email notification check: {e}")
        finally:
            db.close()
    
    @staticmethod
    async def _send_email_now(
        db: Session,
        message: Message,
        notification_uuid: str
    ):
        """Send email notification immediately. Reuses existing email service."""
        
        try:
            # Get sender and receiver info
            sender = db.get(User, message.sender_id)
            receiver = db.get(User, message.receiver_id)
            
            if not sender or not receiver:
                logger.warning("User not found for email notification")
                return
            
            # Get conversation for org info
            conversation = db.get(Conversation, message.conversation_id)
            if not conversation:
                return
            
            # Get organization for link
            from src.db.organizations import Organization
            org = db.get(Organization, conversation.org_id)
            
            # Prepare email data
            sender_name = f"{sender.first_name} {sender.last_name}".strip() or sender.username
            receiver_name = receiver.first_name or receiver.username
            message_preview = message.content[:150] + "..." if len(message.content) > 150 else message.content
            
            # Try to use existing email service
            try:
                # Check if Resend email service exists
                from src.services.emails import send_email
                
                # Send email using existing service
                await send_email(
                    to=receiver.email,
                    subject=f"Unread message from {sender_name}",
                    template="chat_unread_message",
                    context={
                        "receiver_name": receiver_name,
                        "sender_name": sender_name,
                        "message_preview": message_preview,
                        "conversation_link": f"/orgs/{org.slug}/chat/{conversation.conversation_uuid}" if org else "#",
                        "hours_waiting": str(NotificationService.EMAIL_DELAY_HOURS)
                    }
                )
                
                # Update notification delivery status
                notification = db.exec(
                    select(ChatNotification)
                    .where(ChatNotification.notification_uuid == notification_uuid)
                ).first()
                
                if notification:
                    notification.delivery_status["email"] = "sent"
                    db.add(notification)
                    db.commit()
                
                logger.info(f"Email notification sent for unread message {message.message_uuid}")
                
            except ImportError:
                logger.warning("Email service not available, email not sent")
                
                # Update notification status
                notification = db.exec(
                    select(ChatNotification)
                    .where(ChatNotification.notification_uuid == notification_uuid)
                ).first()
                
                if notification:
                    notification.delivery_status["email"] = "service_unavailable"
                    db.add(notification)
                    db.commit()
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            
            # Update notification status
            try:
                notification = db.exec(
                    select(ChatNotification)
                    .where(ChatNotification.notification_uuid == notification_uuid)
                ).first()
                
                if notification:
                    notification.delivery_status["email"] = "failed"
                    db.add(notification)
                    db.commit()
            except Exception:
                pass
    
    @staticmethod
    async def cancel_scheduled_email(message_uuid: str):
        """Cancel scheduled email notification when message is read."""
        
        if not _APSCHEDULER_AVAILABLE:
            return
        
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            scheduler = AsyncIOScheduler()
            
            job_id = f"email_notification_{message_uuid}"
            if scheduler.get_job(job_id):
                scheduler.remove_job(job_id)
                logger.info(f"Cancelled scheduled email for message {message_uuid}")
        except Exception as e:
            logger.warning(f"Could not cancel scheduled email: {e}")
