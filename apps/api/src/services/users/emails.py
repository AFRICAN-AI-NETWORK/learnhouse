from pydantic import EmailStr
from src.db.organizations import OrganizationRead
from src.db.users import UserRead
from src.services.email.utils import send_email


def send_account_creation_email(
    user: UserRead,
    email: EmailStr,
    organization: OrganizationRead = None,
    verification_token: str = None,
):
    """
    Send welcome email to new users with optional email verification
    """
    
    # Build verification link if token is provided
    verification_section = ""
    if verification_token and organization:
        verification_link = f"https://lms.africanainetwork.com/verify-email?token={verification_token}&orgslug={organization.slug}"
        verification_section = f"""
        <div style="margin: 30px 0;">
            <p style="margin-bottom: 15px;">Please verify your email address to activate your account:</p>
            <a href="{verification_link}" 
               style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Verify Email Address
            </a>
        </div>
        <p style="margin-top: 20px; font-size: 13px; color: #666;">
            Or copy and paste this link in your browser:<br>
            <span style="word-break: break-all; color: #4F46E5;">{verification_link}</span>
        </p>
        """
    else:
        verification_section = """
        <p style="margin: 20px 0;">You can now log in and start exploring courses!</p>
        """
    
    org_name = organization.name if organization else "African AI Network LMS"
    
    # Send email
    return send_email(
        to=email,
        subject=f"Welcome to {org_name}!",
        body=f"""
<html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; }}
            .header {{ background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 28px; font-weight: 700; }}
            .content {{ background-color: #ffffff; padding: 40px 30px; }}
            .content h2 {{ color: #1F2937; margin-top: 0; font-size: 22px; }}
            .content p {{ color: #4B5563; margin: 15px 0; }}
            .footer {{ background-color: #F9FAFB; padding: 30px; text-align: center; color: #6B7280; font-size: 13px; }}
            .footer a {{ color: #4F46E5; text-decoration: none; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to {org_name}!</h1>
            </div>
            <div class="content">
                <h2>Hello {user.username},</h2>
                <p>Your account has been successfully created. We're excited to have you join our learning community!</p>
                
                {verification_section}
                
                <p style="margin-top: 30px;">Get started by exploring our courses and connecting with fellow learners.</p>
                
                <p style="margin-top: 30px;">Need help getting started? Visit our <a href="https://lms.africanainetwork.com/org/{organization.slug if organization else 'default'}/courses" style="color: #4F46E5; text-decoration: none; font-weight: 600;">Course Catalog</a></p>
                
                <p style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #E5E7EB;">
                    If you did not create this account, please ignore this email.
                </p>
                
                <p style="margin-top: 20px;">
                    Best regards,<br>
                    <strong>The {org_name} Team</strong>
                </p>
            </div>
            <div class="footer">
                <p>&copy; 2026 {org_name}. All rights reserved.</p>
                <p style="margin-top: 10px;">
                    <a href="https://africanainetwork.com">Visit our website</a> | 
                    <a href="https://lms.africanainetwork.com">LMS Platform</a>
                </p>
            </div>
        </div>
    </body>
</html>
""",
    )


def send_password_reset_email(
    generated_reset_code: str,
    user: UserRead,
    organization: OrganizationRead,
    email: EmailStr,
):
    
    # Use your actual domain
    reset_link = f"https://lms.africanainetwork.com/reset?orgslug={organization.slug}&auth.email={email}&resetCode={generated_reset_code}"
    
    # Send email
    return send_email(
        to=email,
        subject=f"Reset your password - {organization.name}",
        body=f"""
<html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; }}
            .header {{ background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 28px; font-weight: 700; }}
            .content {{ background-color: #ffffff; padding: 40px 30px; }}
            .content h2 {{ color: #1F2937; margin-top: 0; font-size: 22px; }}
            .content p {{ color: #4B5563; margin: 15px 0; }}
            .reset-code {{ background-color: #F3F4F6; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #1F2937; margin: 25px 0; }}
            .footer {{ background-color: #F9FAFB; padding: 30px; text-align: center; color: #6B7280; font-size: 13px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Hello {user.username},</h2>
                <p>You have requested to reset your password for your account at <strong>{organization.name}</strong>.</p>
                
                <p style="margin-top: 25px;">Your password reset code is:</p>
                <div class="reset-code">{generated_reset_code}</div>
                
                <div style="margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                        Reset Password
                    </a>
                </div>
                
                <p style="margin-top: 20px; font-size: 13px; color: #666;">
                    Or copy and paste this link in your browser:<br>
                    <span style="word-break: break-all; color: #4F46E5;">{reset_link}</span>
                </p>
                
                <p style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #E5E7EB; color: #DC2626; font-weight: 600;">
                    ⚠️ If you did not request this password reset, please ignore this email or contact support immediately.
                </p>
                
                <p style="margin-top: 20px; font-size: 13px; color: #6B7280;">
                    This reset code will expire in 15 minutes for security reasons.
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