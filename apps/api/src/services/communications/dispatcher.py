import asyncio
import logging
from datetime import datetime
from typing import List
from sqlmodel import Session, select
from src.db.communications import Campaign, CampaignStatus, CampaignTargetType
from src.db.users import User
from src.db.resource_authors import ResourceAuthor
from src.services.email.utils import send_email

logger = logging.getLogger(__name__)


async def create_campaign(
    db_session: Session, 
    campaign_data: dict, 
    org_id: int, 
    user_id: int
) -> Campaign:
    """
    Create a new campaign and start dispatching in the background.
    """
    campaign = Campaign(
        **campaign_data,
        org_id=org_id,
        created_by_user_id=user_id,
        status=CampaignStatus.PENDING,
        creation_date=datetime.now().isoformat(),
        update_date=datetime.now().isoformat()
    )
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)
    
    # Ideally, trigger background task here
    # asyncio.create_task(dispatch_campaign(campaign.id, db_session))
    
    return campaign


async def get_target_users(db_session: Session, campaign: Campaign) -> List[User]:
    """
    Retrieve users based on campaign targeting filters.
    """
    from src.db.user_organizations import UserOrganization
    from src.db.roles import Role

    query = select(User).join(UserOrganization, User.id == UserOrganization.user_id)
    
    # Always filter by org_id first
    query = query.where(UserOrganization.org_id == campaign.org_id)
    
    if campaign.target_type == CampaignTargetType.WAITLIST:
        query = query.where(
            User.user_status.in_(["WAITLIST", "WAITLIST_ACTIVATED"])
        )
    
    elif campaign.target_type == CampaignTargetType.COURSE:
        course_uuid = campaign.target_metadata.get("course_uuid")
        if course_uuid:
            # Join with ResourceAuthor to find students/contributors of a course
            # Note: This is an example, actual logic depends on how enrollments are stored
            # Assuming ResourceAuthor tracks course access
            query = query.join(ResourceAuthor, User.id == ResourceAuthor.user_id).where(
                ResourceAuthor.resource_uuid == course_uuid
            )
            
    elif campaign.target_type == CampaignTargetType.ROLES:
        # Assuming campaign passes role names like ["STUDENT", "INSTRUCTOR"] instead of IDs
        roles = campaign.target_metadata.get("value", "")
        if roles:
            # If it's a single role like "STUDENT" coming from the frontend dropdown
            query = query.join(Role, UserOrganization.role_id == Role.id).where(
                Role.name == roles
            )
            
    elif campaign.target_type == CampaignTargetType.ALL:
        pass # org_id already applied at the top
        
    return db_session.exec(query).all()


def build_email_html(campaign: Campaign) -> str:
    """
    Build a styled HTML email from the campaign data.
    Supports an optional header image from target_metadata.header_image_url.
    """
    header_image_url = (campaign.target_metadata or {}).get("header_image_url", "")
    # Convert plain-text newlines to HTML line breaks
    body_html = campaign.body.replace("\n", "<br>")

    image_block = ""
    if header_image_url:
        image_block = f'''
        <tr>
          <td style="padding:0;">
            <img src="{header_image_url}" alt="Campaign Banner" 
                 style="width:100%;max-width:600px;height:auto;display:block;border-radius:16px 16px 0 0;" />
          </td>
        </tr>
        '''

    return f'''
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              {image_block}
              <tr>
                <td style="padding:32px 40px 16px 40px;">
                  <h1 style="margin:0;font-size:22px;font-weight:800;color:#18181b;letter-spacing:-0.5px;">
                    {campaign.subject}
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding:0 40px 32px 40px;font-size:15px;line-height:1.7;color:#3f3f46;">
                  {body_html}
                </td>
              </tr>
              <tr>
                <td style="padding:24px 40px;border-top:1px solid #f4f4f5;">
                  <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;text-transform:uppercase;letter-spacing:1px;font-weight:700;">
                    African AI Network
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    '''


async def dispatch_campaign(campaign_id: int, db_session: Session):
    """
    Background job to process and send the campaign messages.
    """
    campaign = db_session.get(Campaign, campaign_id)
    if not campaign:
        return

    campaign.status = CampaignStatus.PROCESSING
    db_session.add(campaign)
    db_session.commit()

    try:
        targets = await get_target_users(db_session, campaign)
        campaign.total_targets = len(targets)
        db_session.add(campaign)
        db_session.commit()

        # Build the HTML email once for all recipients
        email_html = build_email_html(campaign)

        for user in targets:
            # 1. Send Email
            if campaign.send_via_email and user.email:
                try:
                    send_email(
                        to=user.email,
                        subject=campaign.subject,
                        body=email_html
                    )
                except Exception as e:

                    logger.error(f"Failed to send email to {user.email}: {e}")

            # 2. Send LMS Chat (System Announcement)
            if campaign.send_via_chat:
                if user.id == campaign.created_by_user_id:
                    # Skip sending a chat to oneself to avoid message_sender_receiver_different constraint
                    logger.info(f"Skipping chat message to self: {user.email}")
                else:
                    try:
                        from src.services.chat.conversation_service import ConversationService
                        from src.services.chat.message_service import MessageService
                        from src.db.chat.messages import MessageCreate
                        
                        # Create or get conversation between the sender and the target student
                        conversation = await ConversationService.create_or_get_conversation(
                            db=db_session,
                            current_user_id=campaign.created_by_user_id,
                            target_user_id=user.id,
                            org_id=campaign.org_id
                        )
                        
                        message_data = MessageCreate(
                            conversation_id=conversation.id,
                            receiver_id=user.id,
                            content=f"📢 {campaign.subject}\n\n{campaign.body}",
                            message_type="text"
                        )
                        
                        await MessageService.create_message(
                            db=db_session,
                            message_data=message_data,
                            sender_id=campaign.created_by_user_id,
                            org_id=campaign.org_id
                        )
                    except Exception as e:
                        logger.error(f"Failed to send chat message to {user.email}: {e}")

            campaign.sent_count += 1
            if campaign.sent_count % 10 == 0: # Update progress every 10 users
                db_session.add(campaign)
                db_session.commit()
            
            # Rate limiting delay
            await asyncio.sleep(0.5)

        campaign.status = CampaignStatus.SENT
        campaign.update_date = datetime.now().isoformat()
        db_session.add(campaign)
        db_session.commit()

    except Exception as e:
        logger.error(f"Campaign {campaign_id} failed: {e}")
        campaign.status = CampaignStatus.FAILED
        campaign.error_log = str(e)
        db_session.add(campaign)
        db_session.commit()
