import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import resend
from pydantic import EmailStr


def send_email(to: EmailStr, subject: str, body: str):
    """
    Send email using SMTP instead of Resend
    Maintains the same function signature for compatibility
    """
    try:
        # SMTP configuration from environment variables
        smtp_host = os.getenv("EMAIL_HOST", "smtp.zoho.com")
        smtp_port = int(os.getenv("EMAIL_PORT", "587"))
        smtp_address = os.getenv("EMAIL_ADDRESS")
        smtp_username = os.getenv("EMAIL_USERNAME", "") or smtp_address
        smtp_password = os.getenv("EMAIL_PASSWORD")
        smtp_secure = os.getenv("EMAIL_SECURE", "false").lower() == "true"
        sender_name = os.getenv("EMAIL_SENDER_NAME", "AFRICAN AI NETWORK LMS")

        # Validate required credentials
        if not smtp_address or not smtp_password:
            raise ValueError(
                "EMAIL_ADDRESS and EMAIL_PASSWORD must be set in environment variables"
            )

        # Use EMAIL_ADDRESS as the from/sender address always
        from_email = f"{sender_name} <{smtp_address}>"

        # Create message
        msg = MIMEMultipart("alternative")
        msg["From"] = from_email
        msg["To"] = to
        msg["Subject"] = subject

        # Add HTML content
        html_part = MIMEText(body, "html", "utf-8")
        msg.attach(html_part)

        # Send email based on security settings
        if smtp_secure and smtp_port == 465:
            # Use SSL (port 465)
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
        else:
            # Use STARTTLS (port 587 or other)
            with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)

        print(f"✅ Email sent successfully to {to}")

        # Return a response similar to Resend's format for compatibility
        return {
            "id": f"smtp_{to}_{subject}",
            "from": from_email,
            "to": to,
            "created_at": None,
        }

    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"SMTP Authentication failed: {e!s}"
        print(f"❌ {error_msg}")
        raise Exception(
            f"Email authentication failed. Check your EMAIL_ADDRESS and EMAIL_PASSWORD: {e!s}"
        )

    except smtplib.SMTPException as e:
        error_msg = f"SMTP Error: {e!s}"
        print(f"❌ {error_msg}")
        raise Exception(f"Failed to send email via SMTP: {e!s}")

    except Exception as e:  # noqa: BLE001
        error_msg = f"Email sending error: {e!s}"
        print(f"[ERROR] {error_msg}")
        raise Exception(f"Failed to send email: {e!s}")


def send_resend_email(to: str | list[str], subject: str, html_body: str, scheduled_at: datetime | None = None):
    """
    Send email using the Resend API with native scheduling support.
    """
    resend.api_key = os.getenv("RESEND_API_KEY") or os.getenv("EMAIL_PASSWORD")
    if not resend.api_key:
        raise ValueError("RESEND_API_KEY or EMAIL_PASSWORD must be set in environment variables")
        
    sender_name = os.getenv("EMAIL_SENDER_NAME", "AFRICAN AI NETWORK LMS")
    sender_address = os.getenv("RESEND_FROM_EMAIL") or os.getenv("EMAIL_ADDRESS") or "onboarding@resend.dev"
    
    from_email = f"{sender_name} <{sender_address}>"
    
    # Resend accepts a list or a string for "to"
    to_emails = [to] if isinstance(to, str) else to

    params = {
        "from": from_email,
        "to": to_emails,
        "subject": subject,
        "html": html_body,
    }
    
    if scheduled_at:
        # Resend expects ISO 8601 format or specific timestamps
        # Only include if it's strictly in the future
        from datetime import timezone
        now = datetime.now(timezone.utc) if scheduled_at.tzinfo else datetime.now()
        if scheduled_at > now:
            params["scheduled_at"] = scheduled_at.isoformat()
        
    try:
        response = resend.Emails.send(params)
        print(f"[SUCCESS] Resend Email queued successfully for {to}")
        return response
    except Exception as e:  # noqa: BLE001
        error_msg = f"Resend sending error: {e!s}"
        print(f"[ERROR] {error_msg}")
        raise Exception(f"Failed to send email via Resend: {e!s}")

