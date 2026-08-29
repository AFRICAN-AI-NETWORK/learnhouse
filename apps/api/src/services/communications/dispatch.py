import asyncio
import logging
from datetime import datetime, timezone
from sqlmodel import Session, select
from typing import List, Dict

from src.db.communications import (
    Campaign, 
    CampaignRecipient, 
    CampaignStatus, 
    CampaignRecipientStatus,
    CampaignTargetType
)
from src.services.communications.targets import resolve_campaign_targets
from src.services.communications.rendering import render_campaign_email
from src.services.communications.unsubscribe import get_unsubscribed_emails, UnsubscribeScope
from src.services.email.utils import send_resend_email

logger = logging.getLogger(__name__)

COMMUNICATIONS_EMAIL_BATCH_SIZE = 50
COMMUNICATIONS_MAX_EMAIL_ATTEMPTS = 3

async def queue_campaign_recipients(campaign_id: int):
    """Resolve targets and create CampaignRecipient rows."""
    from src.core.events.database import engine
    with Session(engine) as db_session:
        campaign = db_session.get(Campaign, campaign_id)
        if not campaign or campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.QUEUED]:
            return

        # Update status to processing recipients
        campaign.status = CampaignStatus.PROCESSING
        db_session.commit()

        try:
            # Resolve target emails
            target_emails = await resolve_campaign_targets(
                db_session, 
                campaign.org_id, 
                campaign.target_type, 
                campaign.target_metadata
            )

            # Filter unsubscribes (unless CUSTOM_EMAILS and explicitly bypassing - but for now we filter all marketing)
            if campaign.campaign_type == "COURSE_MARKETING":
                unsubscribed = await get_unsubscribed_emails(db_session, campaign.org_id, UnsubscribeScope.MARKETING)
                target_emails = target_emails - unsubscribed

            # Insert recipient rows
            recipients = []
            now_str = datetime.now(timezone.utc).isoformat()
            for email in target_emails:
                recipients.append(
                    CampaignRecipient(
                        campaign_id=campaign.id,
                        org_id=campaign.org_id,
                        email=email,
                        status=CampaignRecipientStatus.PENDING,
                        creation_date=now_str,
                        update_date=now_str
                    )
                )

            if recipients:
                db_session.add_all(recipients)
                
            campaign.total_targets = len(recipients)
            campaign.status = CampaignStatus.QUEUED
            db_session.commit()

        except Exception as e:
            logger.error(f"Failed to queue recipients for campaign {campaign_id}: {e}")
            campaign.status = CampaignStatus.FAILED
            campaign.error_log = str(e)
            db_session.commit()


async def process_campaign_dispatch_job(db_session: Session):
    """Background job that runs periodically to dispatch pending/retryable emails."""
    
    # Get active campaigns
    active_campaigns = db_session.exec(
        select(Campaign).where(Campaign.status.in_([CampaignStatus.QUEUED, CampaignStatus.PROCESSING]))
    ).all()
    
    for campaign in active_campaigns:
        # Fetch a batch of recipients
        recipients = db_session.exec(
            select(CampaignRecipient)
            .where(
                CampaignRecipient.campaign_id == campaign.id,
                CampaignRecipient.status.in_([CampaignRecipientStatus.PENDING, CampaignRecipientStatus.FAILED_RETRYABLE])
            )
            .limit(COMMUNICATIONS_EMAIL_BATCH_SIZE)
        ).all()
        
        if not recipients:
            # Check if all recipients for this campaign are done
            pending_count = db_session.exec(
                select(CampaignRecipient).where(
                    CampaignRecipient.campaign_id == campaign.id,
                    CampaignRecipient.status.in_([CampaignRecipientStatus.PENDING, CampaignRecipientStatus.FAILED_RETRYABLE])
                )
            ).first()
            
            if not pending_count:
                # Roll up campaign status
                failed_count = len(db_session.exec(
                    select(CampaignRecipient).where(
                        CampaignRecipient.campaign_id == campaign.id,
                        CampaignRecipient.status == CampaignRecipientStatus.FAILED_PERMANENT
                    )
                ).all())
                
                campaign.failed_count = failed_count
                campaign.completed_at = datetime.now(timezone.utc)
                if failed_count > 0:
                    campaign.status = CampaignStatus.PARTIALLY_FAILED
                else:
                    campaign.status = CampaignStatus.SENT
                    
                db_session.commit()
            continue

        # Process batch
        campaign.status = CampaignStatus.PROCESSING
        if not campaign.started_at:
            campaign.started_at = datetime.now(timezone.utc)
        db_session.commit()

        # In a real setup, we'd use gather or a worker pool.
        for recipient in recipients:
            recipient.status = CampaignRecipientStatus.SENDING
            recipient.attempt_count += 1
            recipient.last_attempt_at = datetime.now(timezone.utc)
            db_session.commit()
            
            try:
                # Generate unique unsubscribe link (mocked logic)
                unsubscribe_url = f"https://app.learnhouse.com/unsubscribe?token=mock&email={recipient.email}"
                
                campaign_data = {
                    "subject": campaign.subject,
                    "preheader": campaign.preheader,
                    "sender_name": campaign.sender_name,
                    "content_json": campaign.content_json,
                }
                recipient_data = {
                    "email": recipient.email
                }
                
                # Render email
                html_body, text_body = render_campaign_email(
                    campaign_data, 
                    recipient_data, 
                    unsubscribe_url
                )
                
                # Send email using Resend with scheduling support
                send_resend_email(
                    to=recipient.email,
                    subject=campaign.subject,
                    html_body=html_body,
                    scheduled_at=campaign.scheduled_at
                )
                
                recipient.status = CampaignRecipientStatus.SENT
                recipient.sent_at = datetime.now(timezone.utc)
                campaign.sent_count += 1
                
            except Exception as e:
                recipient.last_error = str(e)
                if recipient.attempt_count >= COMMUNICATIONS_MAX_EMAIL_ATTEMPTS:
                    recipient.status = CampaignRecipientStatus.FAILED_PERMANENT
                else:
                    recipient.status = CampaignRecipientStatus.FAILED_RETRYABLE
                    
            recipient.update_date = datetime.now(timezone.utc).isoformat()
            db_session.commit()
