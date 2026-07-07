"""
Marketer lifecycle email notifications.
Follows the existing email convention (inline HTML via send_email) with a
single shared layout so every marketer email renders consistently.
All senders are fire-and-forget: callers wrap them in try/except so email
failures never affect business state.
"""

import os
from typing import Optional

from src.services.email.utils import send_email

_PLATFORM_NAME = os.getenv("EMAIL_SENDER_NAME", "AFRICAN AI NETWORK LMS")


def _render_marketer_email(title: str, body_html: str) -> str:
    """Shared layout for all marketer emails (DRY)"""
    return f"""
<html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; }}
            .header {{ background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 26px; font-weight: 700; }}
            .content {{ background-color: #ffffff; padding: 40px 30px; }}
            .content p {{ color: #4B5563; margin: 15px 0; }}
            .highlight {{ background-color: #F5F3FF; border-left: 4px solid #7C3AED; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }}
            .button {{ display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; }}
            .footer {{ background-color: #F9FAFB; padding: 30px; text-align: center; color: #6B7280; font-size: 13px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><h1>{title}</h1></div>
            <div class="content">{body_html}</div>
            <div class="footer">
                <p>{_PLATFORM_NAME} — Marketer Program</p>
            </div>
        </div>
    </body>
</html>
"""


def send_marketer_application_received_email(email: str, username: str):
    """Sent on registration — application acknowledged"""
    return send_email(
        to=email,
        subject="Your Marketer Application Has Been Received",
        body=_render_marketer_email(
            "Application Received",
            f"""
            <p>Hello {username},</p>
            <p>Thanks for applying to become a marketer. Our team is reviewing
            your application and we'll email you as soon as it's approved.</p>
            <div class="highlight">
                <p style="margin: 0;">Once approved, you'll earn <strong>$7.70</strong>
                for every student you refer who pays for a course — paid to your
                bank or mobile money account.</p>
            </div>
            <p>No action is needed from you right now.</p>
            """,
        ),
    )


def send_marketer_approved_email(
    email: str, username: str, referral_code: str, referral_link: str
):
    """Sent on admin approval — includes referral link and next steps"""
    return send_email(
        to=email,
        subject="You're Approved — Start Earning as a Marketer!",
        body=_render_marketer_email(
            "Application Approved 🎉",
            f"""
            <p>Hello {username},</p>
            <p>Your marketer application has been approved. Your unique referral
            code is ready:</p>
            <div class="highlight">
                <p style="margin: 0;"><strong>Referral code:</strong> {referral_code}</p>
                <p style="margin: 8px 0 0;"><strong>Referral link:</strong>
                <a href="{referral_link}">{referral_link}</a></p>
            </div>
            <p>Share your link — you earn <strong>$7.70</strong> every time a
            student you referred pays for a course.</p>
            <p><strong>Next step:</strong> add your payment method (bank or mobile
            money) and complete identity verification so you can request payouts.</p>
            """,
        ),
    )


def send_marketer_rejected_email(email: str, username: str, reason: str):
    """Sent on rejection — includes reason and support contact"""
    return send_email(
        to=email,
        subject="Update on Your Marketer Application",
        body=_render_marketer_email(
            "Application Update",
            f"""
            <p>Hello {username},</p>
            <p>Unfortunately your marketer application was not approved.</p>
            <div class="highlight"><p style="margin: 0;"><strong>Reason:</strong> {reason}</p></div>
            <p>If you believe this is a mistake, please contact support to appeal.</p>
            """,
        ),
    )


def send_marketer_commission_eligible_email(
    email: str, username: str, eligible_amount_usd: float
):
    """Daily digest — commissions moved to ELIGIBLE"""
    return send_email(
        to=email,
        subject="Commissions Ready for Payout",
        body=_render_marketer_email(
            "Commissions Now Eligible",
            f"""
            <p>Hello {username},</p>
            <p>Good news — commissions totalling
            <strong>${eligible_amount_usd:.2f}</strong> have cleared the refund
            period and are now eligible for payout.</p>
            <p>Log in to your marketer dashboard to request a payout.</p>
            """,
        ),
    )


def send_marketer_payout_processing_email(email: str, username: str, amount_usd: float):
    """Sent when admin approves and the transfer job starts"""
    return send_email(
        to=email,
        subject="Your Payout Is Being Processed",
        body=_render_marketer_email(
            "Payout Processing",
            f"""
            <p>Hello {username},</p>
            <p>Your payout request of <strong>${amount_usd:.2f}</strong> has been
            approved and is now being processed. You'll receive a confirmation
            once the transfer completes.</p>
            """,
        ),
    )


def send_marketer_payout_completed_email(
    email: str,
    username: str,
    amount_usd: float,
    converted_amount: Optional[float],
    currency: str,
    reference: Optional[str],
):
    """Sent on COMPLETED — amount, local equivalent, Paystack reference"""
    local_line = (
        f"<p style='margin: 8px 0 0;'><strong>Local amount:</strong> "
        f"{converted_amount:,.2f} {currency}</p>"
        if converted_amount
        else ""
    )
    reference_line = (
        f"<p style='margin: 8px 0 0;'><strong>Reference:</strong> {reference}</p>"
        if reference
        else ""
    )
    return send_email(
        to=email,
        subject="Payout Completed 🎉",
        body=_render_marketer_email(
            "Payout Completed",
            f"""
            <p>Hello {username},</p>
            <p>Your payout has been sent to your saved payment method.</p>
            <div class="highlight">
                <p style="margin: 0;"><strong>Amount:</strong> ${amount_usd:.2f} USD</p>
                {local_line}
                {reference_line}
            </div>
            <p>Depending on your bank or mobile money provider, funds may take a
            few minutes to reflect.</p>
            """,
        ),
    )


def send_marketer_payout_failed_email(
    email: str, username: str, amount_usd: float, reason: Optional[str]
):
    """Sent on FAILED after all retries — balance has been restored"""
    reason_block = (
        f"<div class='highlight'><p style='margin: 0;'><strong>Reason:</strong> {reason}</p></div>"
        if reason
        else ""
    )
    return send_email(
        to=email,
        subject="Payout Failed — Action Needed",
        body=_render_marketer_email(
            "Payout Failed",
            f"""
            <p>Hello {username},</p>
            <p>We were unable to complete your payout of
            <strong>${amount_usd:.2f}</strong> after several attempts. Your
            balance has been restored — no funds were lost.</p>
            {reason_block}
            <p>Please check your saved payment method details and request the
            payout again, or contact support if the problem persists.</p>
            """,
        ),
    )


def send_marketer_kyc_verified_email(email: str, username: str):
    """Sent on KYC approval — payouts unlocked"""
    return send_email(
        to=email,
        subject="Identity Verified — Payouts Unlocked",
        body=_render_marketer_email(
            "Identity Verified ✅",
            f"""
            <p>Hello {username},</p>
            <p>Your identity verification is complete. Payouts are now unlocked
            for your marketer account.</p>
            <p>Head to your dashboard to request your first payout once your
            eligible balance reaches $7.70.</p>
            """,
        ),
    )


def send_marketer_kyc_rejected_email(
    email: str, username: str, reason: str, attempts_remaining: int
):
    """Sent on KYC rejection — reason plus resubmission instructions"""
    if attempts_remaining > 0:
        next_steps = (
            f"<p>You can resubmit your documents ({attempts_remaining} "
            f"attempt{'s' if attempts_remaining != 1 else ''} remaining). Make "
            "sure photos are clear, uncropped, and match the ID number you enter.</p>"
        )
    else:
        next_steps = (
            "<p>You have used all submission attempts. Please contact support "
            "to continue verification.</p>"
        )
    return send_email(
        to=email,
        subject="Identity Verification Update",
        body=_render_marketer_email(
            "Verification Not Approved",
            f"""
            <p>Hello {username},</p>
            <p>Your identity verification could not be approved.</p>
            <div class="highlight"><p style="margin: 0;"><strong>Reason:</strong> {reason}</p></div>
            {next_steps}
            """,
        ),
    )
