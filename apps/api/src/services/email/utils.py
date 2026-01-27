from pydantic import EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from config.config import get_learnhouse_config


def send_email(to: EmailStr, subject: str, body: str):
    """
    Send email using SMTP instead of Resend
    Maintains the same function signature for compatibility
    """
    lh_config = get_learnhouse_config()
    
    try:
        # SMTP configuration from environment variables
        smtp_host = os.getenv('EMAIL_HOST', 'smtp.zoho.com')
        smtp_port = int(os.getenv('EMAIL_PORT', '587'))  # Changed default to 587
        smtp_user = os.getenv('EMAIL_ADDRESS')
        smtp_password = os.getenv('EMAIL_PASSWORD')
        smtp_secure = os.getenv('EMAIL_SECURE', 'false').lower() == 'true'  # Changed default to false
        
        # Validate required credentials
        if not smtp_user or not smtp_password:
            raise ValueError("EMAIL_ADDRESS and EMAIL_PASSWORD must be set in environment variables")
        
        # FIXED: Use the authenticated email address instead of config
        from_email = f"LearnHouse <{smtp_user}>"
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = from_email
        msg['To'] = to
        msg['Subject'] = subject
        
        # Add HTML content
        html_part = MIMEText(body, 'html', 'utf-8')
        msg.attach(html_part)
        
        # Send email based on security settings
        if smtp_secure and smtp_port == 465:
            # Use SSL (port 465)
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
        else:
            # Use STARTTLS (port 587 or other)
            with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
        
        print(f"✅ Email sent successfully to {to}")
        
        # Return a response similar to Resend's format for compatibility
        return {
            "id": f"smtp_{to}_{subject}",
            "from": from_email,
            "to": to,
            "created_at": None
        }
        
    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"SMTP Authentication failed: {str(e)}"
        print(f"❌ {error_msg}")
        raise Exception(f"Email authentication failed. Check your EMAIL_ADDRESS and EMAIL_PASSWORD: {str(e)}")
    
    except smtplib.SMTPException as e:
        error_msg = f"SMTP Error: {str(e)}"
        print(f"❌ {error_msg}")
        raise Exception(f"Failed to send email via SMTP: {str(e)}")
    
    except Exception as e:
        error_msg = f"Email sending error: {str(e)}"
        print(f"❌ {error_msg}")
        raise Exception(f"Failed to send email: {str(e)}")