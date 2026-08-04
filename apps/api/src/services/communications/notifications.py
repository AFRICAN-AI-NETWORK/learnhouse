import logging

from src.db.courses.activities import Activity
from src.db.users import User
from src.services.email.utils import send_email

logger = logging.getLogger(__name__)


def send_session_confirmation_email(user: User, activity: Activity):
    """
    Send a confirmation email to a user who just registered for a session.
    """
    subject = f"Confirmation: You're registered for {activity.name}"
    workshop_link = f"https://lms.africanainetwork.com/join/{activity.activity_uuid}"

    # Simple HTML template for the email
    body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000;">Workshop Registration Confirmed!</h2>
        <p>Hi {user.first_name or user.username},</p>
        <p>You've successfully reserved your spot for <strong>{activity.name}</strong>.</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Event:</strong> {activity.name}</p>
            <p style="margin: 5px 0 0 0;"><strong>Status:</strong> Successfully Registered</p>
            <p style="margin: 10px 0 0 0;"><strong>Your Link:</strong> <a href="{workshop_link}">{workshop_link}</a></p>
        </div>
        <p>We'll send you a reminder shortly before we go live. Use the link above to join the session when we start.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">© African AI Network. Empowering the next generation.</p>
    </div>
    """

    try:
        send_email(to=user.email, subject=subject, body=body)
        logger.info(f"Sent session confirmation to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send session confirmation to {user.email}: {e}")


def send_session_reminder_email(user: User, activity: Activity):
    """
    Send a reminder email alert for a session that's about to start.
    """
    subject = f"Starting Soon: {activity.name} is about to begin!"
    workshop_link = f"https://lms.africanainetwork.com/join/{activity.activity_uuid}"

    body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="background: #000; color: #fff; padding: 10px; border-radius: 5px; display: inline-block; font-size: 10px; font-weight: bold; text-transform: uppercase;">Happening Now</div>
        <h2 style="color: #000; margin-top: 15px;">We are going live!</h2>
        <p>Hi {user.first_name or user.username},</p>
        <p>This is a quick reminder that <strong>{activity.name}</strong> is starting now. Don't miss out on the interactive session and Q&A.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{workshop_link}"
               style="background: #000; color: #fff; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold;">
               Join Workshop Now
            </a>
        </div>
        <p>See you inside!</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">© African AI Network. Empowering the next generation.</p>
    </div>
    """
    try:
        send_email(to=user.email, subject=subject, body=body)
    except Exception as e:
        logger.error(f"Failed to send reminder to {user.email}: {e}")


def send_enrolment_invitation_email(user: User, activity: Activity):
    """
    Send an invitation to complete registration and enroll in the full course.
    """
    subject = "Loved the workshop? Enroll in the full course now!"

    body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000;">Take the Next Step!</h2>
        <p>Hi {user.first_name or user.username},</p>
        <p>Thank you for joining our live session <strong>{activity.name}</strong>. We hope you found it valuable!</p>
        <p>Ready to go deeper? Complete your registration now to unlock full course materials, assignments, and certification.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://lms.africanainetwork.com/auth/signup?email={user.email}"
               style="background: #000; color: #fff; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold;">
               Finish Registration & Enroll
            </a>
        </div>
        <p>Don't stop here. The future is waiting for you.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">© African AI Network. Empowering the next generation.</p>
    </div>
    """

    try:
        send_email(to=user.email, subject=subject, body=body)
        logger.info(f"Sent enrolment invitation to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send enrolment invitation to {user.email}: {e}")
