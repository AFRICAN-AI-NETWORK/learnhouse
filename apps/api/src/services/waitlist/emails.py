"""Waitlist Email Service - Email templates and batch processing"""

import asyncio
import logging
from datetime import datetime

from pydantic import EmailStr
from sqlmodel import Session, select

from src.db.users import User, UserRead
from src.db.organizations import Organization, OrganizationRead
from src.db.waitlist import (
    WaitlistConfig,
    WaitlistStatusEnum,
    WaitlistEmailLog,
)
from src.services.email.utils import send_email

logger = logging.getLogger(__name__)


def send_waitlist_confirmation_email(
    user: UserRead,
    email: EmailStr,
    organization: OrganizationRead,
    waitlist_config: WaitlistConfig,
):
    """
    Send confirmation email when user joins waitlist.
    Includes launch date and what to expect.
    """
    
    launch_date = waitlist_config.launch_datetime
    try:
        # Format the datetime nicely
        dt = datetime.fromisoformat(launch_date.replace('Z', '+00:00'))
        formatted_date = dt.strftime("%B %d, %Y at %I:%M %p %Z")
    except ValueError:
        formatted_date = launch_date
    
    return send_email(
        to=email,
        subject=f"You're on the waitlist for {waitlist_config.name}!",
        body=f"""
<html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; }}
            .header {{ background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); color: white; padding: 40px 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 28px; font-weight: 700; }}
            .content {{ background-color: #ffffff; padding: 40px 30px; }}
            .content h2 {{ color: #1F2937; margin-top: 0; font-size: 22px; }}
            .content p {{ color: #4B5563; margin: 15px 0; }}
            .launch-box {{ background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 30px 0; border-radius: 6px; }}
            .launch-box h3 {{ margin-top: 0; color: #92400E; font-size: 18px; }}
            .launch-box p {{ color: #78350F; margin: 10px 0; font-size: 16px; font-weight: 600; }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }}
            .info-card {{ background: #F9FAFB; padding: 20px; border-radius: 8px; text-align: center; }}
            .info-card h4 {{ margin: 0 0 10px 0; color: #4B5563; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }}
            .info-card p {{ margin: 0; color: #1F2937; font-size: 18px; font-weight: 700; }}
            .footer {{ background-color: #F9FAFB; padding: 30px; text-align: center; color: #6B7280; font-size: 13px; }}
            .footer a {{ color: #F59E0B; text-decoration: none; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 You're on the Waitlist!</h1>
            </div>
            <div class="content">
                <h2>Welcome, {user.username}!</h2>
                <p>Thank you for joining the waitlist for <strong>{waitlist_config.name}</strong>. We're excited to have you as part of our learning community at {organization.name}!</p>
                
                <div class="launch-box">
                    <h3>📅 Launch Date</h3>
                    <p>{formatted_date}</p>
                </div>
                
                <p><strong>What happens next?</strong></p>
                <ul style="color: #4B5563; padding-left: 20px;">
                    <li style="margin: 10px 0;">We'll send you an email as soon as the platform launches</li>
                    <li style="margin: 10px 0;">You'll be able to login immediately after receiving the activation email</li>
                    <li style="margin: 10px 0;">Access all the courses you're interested in</li>
                    <li style="margin: 10px 0;">Join a community of passionate learners</li>
                </ul>
                
                <div class="info-grid">
                    <div class="info-card">
                        <h4>Interest Area</h4>
                        <p>{waitlist_config.interest_category}</p>
                    </div>
                    <div class="info-card">
                        <h4>Organization</h4>
                        <p>{organization.name}</p>
                    </div>
                </div>
                
                <p style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #E5E7EB;">
                    <strong>Important:</strong> Please verify your email address if you haven't already. Check your inbox for the verification link.
                </p>
                
                <p style="margin-top: 20px;">
                    Questions? Feel free to reach out to us at <a href="mailto:{organization.email}" style="color: #F59E0B; text-decoration: none;">{organization.email}</a>
                </p>
                
                <p style="margin-top: 30px;">
                    Best regards,<br>
                    <strong>The {organization.name} Team</strong>
                </p>
            </div>
            <div class="footer">
                <p>&copy; 2026 {organization.name}. All rights reserved.</p>
            </div>
        </div>
    </body>
</html>
""",
    )


def send_waitlist_activation_email(
    user: UserRead,
    email: EmailStr,
    organization: OrganizationRead,
    waitlist_config: WaitlistConfig,
):
    """
    Send activation email when countdown ends and user can login.
    Celebratory tone to excite users.
    """
    
    login_link = f"https://lms.africanainetwork.com/auth/signin?orgslug={organization.slug}"
    
    return send_email(
        to=email,
        subject=f"🚀 The wait is over! {waitlist_config.name} is now live!",
        body=f"""
<html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; }}
            .header {{ background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 50px 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 32px; font-weight: 700; }}
            .header p {{ margin: 15px 0 0 0; font-size: 18px; opacity: 0.95; }}
            .content {{ background-color: #ffffff; padding: 40px 30px; }}
            .content h2 {{ color: #1F2937; margin-top: 0; font-size: 24px; }}
            .content p {{ color: #4B5563; margin: 15px 0; font-size: 16px; }}
            .cta-button {{ display: inline-block; padding: 16px 40px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; margin: 30px 0; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25); }}
            .cta-button:hover {{ background-color: #059669; }}
            .highlight-box {{ background: #D1FAE5; border-left: 4px solid #10B981; padding: 25px; margin: 30px 0; border-radius: 6px; }}
            .highlight-box h3 {{ margin-top: 0; color: #065F46; font-size: 18px; }}
            .highlight-box ul {{ margin: 15px 0; padding-left: 20px; color: #047857; }}
            .footer {{ background-color: #F9FAFB; padding: 30px; text-align: center; color: #6B7280; font-size: 13px; }}
            .footer a {{ color: #10B981; text-decoration: none; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Welcome to {organization.name}!</h1>
                <p>Your learning journey begins now</p>
            </div>
            <div class="content">
                <h2>Hello {user.username},</h2>
                <p>Great news! <strong>{waitlist_config.name}</strong> is now live, and you're ready to get started!</p>
                
                <p>Thank you for your patience. We've been working hard to create an amazing learning experience for you, and we're thrilled to finally open our doors.</p>
                
                <div style="text-align: center;">
                    <a href="{login_link}" class="cta-button">
                        Login to Your Account →
                    </a>
                </div>
                
                <p style="text-align: center; font-size: 13px; color: #6B7280;">
                    Or copy and paste this link: <span style="color: #10B981; word-break: break-all;">{login_link}</span>
                </p>
                
                <div class="highlight-box">
                    <h3>✨ What's Next?</h3>
                    <ul>
                        <li style="margin: 8px 0;">Complete your profile to personalize your experience</li>
                        <li style="margin: 8px 0;">Browse and enroll in courses that interest you</li>
                        <li style="margin: 8px 0;">Connect with instructors and fellow learners</li>
                        <li style="margin: 8px 0;">Start learning at your own pace</li>
                    </ul>
                </div>
                
                <p><strong>Your Account Details:</strong></p>
                <ul style="background: #F9FAFB; padding: 20px; border-radius: 6px; list-style: none;">
                    <li style="margin: 8px 0;"><strong>Username:</strong> {user.username}</li>
                    <li style="margin: 8px 0;"><strong>Email:</strong> {user.email}</li>
                    <li style="margin: 8px 0;"><strong>Organization:</strong> {organization.name}</li>
                </ul>
                
                <p style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #E5E7EB;">
                    Need help? Our support team is here for you at <a href="mailto:{organization.email}" style="color: #10B981; text-decoration: none; font-weight: 600;">{organization.email}</a>
                </p>
                
                <p style="margin-top: 30px;">
                    Happy learning!<br>
                    <strong>The {organization.name} Team</strong>
                </p>
            </div>
            <div class="footer">
                <p>&copy; 2026 {organization.name}. All rights reserved.</p>
                <p style="margin-top: 10px;">
                    <a href="https://lms.africanainetwork.com/org/{organization.slug}">Visit Platform</a> | 
                    <a href="mailto:{organization.email}">Contact Support</a>
                </p>
            </div>
        </div>
    </body>
</html>
""",
    )


async def process_waitlist_activations(db_session: Session):
    """
    Main background job function that runs periodically.
    Checks for expired waitlists and processes activations.
    """
    
    # Query all ACTIVE waitlists where launch_datetime has passed
    current_time = datetime.now().isoformat()
    
    waitlists_query = select(WaitlistConfig).where(
        WaitlistConfig.status == WaitlistStatusEnum.ACTIVE.value,
        WaitlistConfig.launch_datetime <= current_time
    )
    
    waitlists = db_session.exec(waitlists_query).all()
    
    for waitlist in waitlists:
        try:
            await activate_waitlist(db_session, waitlist)
        except Exception as e:
            logger.error(
                "Error activating waitlist %s: %s",
                waitlist.waitlist_uuid, e, exc_info=True,
            )
            # Continue with other waitlists even if one fails
            continue


async def activate_waitlist(db_session: Session, waitlist: WaitlistConfig):
    """
    Core activation logic for one specific waitlist.
    Sends batch emails and updates user statuses.
    """
    
    logger.info("Activating waitlist: %s (%s)", waitlist.name, waitlist.waitlist_uuid)
    
    # Get organization details for emails
    org_query = select(Organization).where(Organization.id == waitlist.org_id)
    org = db_session.exec(org_query).first()
    
    if not org:
        logger.warning(
            "Organization %s not found for waitlist %s",
            waitlist.org_id, waitlist.waitlist_uuid,
        )
        return
    
    # Get all users with WAITLIST status matching this waitlist's interest
    users_query = select(User).where(
        User.user_status == "WAITLIST",
        User.waitlist_interest == waitlist.interest_category,
        User.email_verified == True  # Only send to verified emails
    )
    
    users = db_session.exec(users_query).all()
    
    if not users:
        logger.info("No users found for waitlist %s", waitlist.waitlist_uuid)
        # Mark as completed anyway
        waitlist.status = WaitlistStatusEnum.COMPLETED.value
        waitlist.activation_date = str(datetime.now())
        db_session.add(waitlist)
        db_session.commit()
        return
    
    logger.info("Found %d users to activate for waitlist %s", len(users), waitlist.waitlist_uuid)
    
    # Process in batches
    batch_size = waitlist.batch_size
    batch_delay = waitlist.batch_delay_seconds
    emails_sent = 0
    emails_failed = 0
    
    for i in range(0, len(users), batch_size):
        batch = users[i:i + batch_size]
        
        for user in batch:
            # Check if email already sent (prevent duplicates)
            log_query = select(WaitlistEmailLog).where(
                WaitlistEmailLog.user_id == user.id,
                WaitlistEmailLog.waitlist_config_id == waitlist.id,
                WaitlistEmailLog.email_sent == True
            )
            existing_log = db_session.exec(log_query).first()
            
            if existing_log:
                logger.debug("Email already sent to user %d, skipping", user.id)
                continue
            
            try:
                # Send activation email
                send_waitlist_activation_email(
                    user=UserRead.model_validate(user),
                    email=user.email,
                    organization=OrganizationRead.model_validate(org),
                    waitlist_config=waitlist,
                )
                
                # Update user status to WAITLIST_ACTIVATED
                user.user_status = "WAITLIST_ACTIVATED"
                user.waitlist_activated_date = str(datetime.now())
                db_session.add(user)
                
                # Update email log
                email_log = WaitlistEmailLog(
                    waitlist_config_id=waitlist.id,
                    user_id=user.id,
                    email_sent=True,
                    email_sent_date=str(datetime.now()),
                    creation_date=str(datetime.now()),
                    update_date=str(datetime.now())
                )
                db_session.add(email_log)
                
                emails_sent += 1
                logger.info("Activated user %d (%s)", user.id, user.email)
                
            except Exception as e:
                # Log error but continue with other users
                email_log = WaitlistEmailLog(
                    waitlist_config_id=waitlist.id,
                    user_id=user.id,
                    email_sent=False,
                    email_error=str(e),
                    retry_count=1,
                    creation_date=str(datetime.now()),
                    update_date=str(datetime.now())
                )
                db_session.add(email_log)
                emails_failed += 1
                logger.error(
                    "Failed to activate user %d: %s", user.id, e, exc_info=True,
                )
        
        # Commit batch
        db_session.commit()
        
        # Wait between batches (rate limiting)
        if i + batch_size < len(users) and batch_delay > 0:
            await asyncio.sleep(batch_delay)
    
    # Mark waitlist as COMPLETED
    waitlist.status = WaitlistStatusEnum.COMPLETED.value
    waitlist.activation_date = str(datetime.now())
    waitlist.emails_sent_count = emails_sent
    db_session.add(waitlist)
    db_session.commit()
    
    logger.info(
        "Waitlist activation complete: %d sent, %d failed", emails_sent, emails_failed,
    )


async def retry_failed_waitlist_emails(db_session: Session):
    """
    Retry failed waitlist activation emails with exponential backoff.
    """
    
    # Find failed emails with retry_count < 3
    failed_logs_query = select(WaitlistEmailLog).where(
        WaitlistEmailLog.email_sent == False,
        WaitlistEmailLog.retry_count < 3
    )
    
    failed_logs = db_session.exec(failed_logs_query).all()
    
    for log in failed_logs:
        # Get user and waitlist
        user = db_session.get(User, log.user_id)
        waitlist = db_session.get(WaitlistConfig, log.waitlist_config_id)
        
        if not user or not waitlist:
            continue
        
        # Get organization
        org = db_session.get(Organization, waitlist.org_id)
        if not org:
            continue
        
        try:
            # Retry sending email
            send_waitlist_activation_email(
                user=UserRead.model_validate(user),
                email=user.email,
                organization=OrganizationRead.model_validate(org),
                waitlist_config=waitlist,
            )
            
            # Update log
            log.email_sent = True
            log.email_sent_date = str(datetime.now())
            log.update_date = str(datetime.now())
            
            # Update user status
            user.user_status = "WAITLIST_ACTIVATED"
            user.waitlist_activated_date = str(datetime.now())
            db_session.add(user)
            
            logger.info("Retry successful for user %d", user.id)
            
        except Exception as e:
            # Increment retry count
            log.retry_count += 1
            log.email_error = str(e)
            log.update_date = str(datetime.now())
            logger.warning("Retry failed for user %d: %s", user.id, e)
        
        db_session.add(log)
    
    db_session.commit()
