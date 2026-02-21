"""
Fraud Prevention Utilities for Referral System
Implements disposable email detection and domain validation
"""
import logging
import re
from typing import Set
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Common disposable email domains (initial list)
# In production, this should be loaded from external API or database
DISPOSABLE_EMAIL_DOMAINS: Set[str] = {
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "tempmail.com",
    "throwaway.email",
    "temp-mail.org",
    "maildrop.cc",
    "getnada.com",
    "sharklasers.com",
    "guerrillamail.info",
    "grr.la",
    "guerrillamail.biz",
    "guerrillamail.de",
    "spam4.me",
    "trashmail.com",
    "yopmail.com",
    "fakeinbox.com",
    "mytemp.email",
}

# Common legitimate email domains (whitelist)
LEGITIMATE_EMAIL_DOMAINS: Set[str] = {
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "protonmail.com",
    "aol.com",
    "mail.com",
    "zoho.com",
    "gmx.com",
}


def extract_email_domain(email: str) -> str:
    """
    Extract domain from email address (DRY utility)
    
    Args:
        email: Email address
        
    Returns:
        Domain name (lowercase)
    """
    if "@" not in email:
        return ""
    
    return email.split("@")[1].lower()


def is_disposable_email(email: str) -> bool:
    """
    Check if email is from disposable email service (DRY utility)
    
    Args:
        email: Email address
        
    Returns:
        True if disposable, False otherwise
    """
    domain = extract_email_domain(email)
    
    if not domain:
        return False
    
    # Check against disposable domain list
    if domain in DISPOSABLE_EMAIL_DOMAINS:
        logger.warning(f"Disposable email detected: {email}")
        return True
    
    # Pattern-based detection (common patterns)
    disposable_patterns = [
        r"^temp.*",  # temp*, tempmail*, etc.
        r"^trash.*",  # trashmail*, etc.
        r"^fake.*",  # fakemail*, etc.
        r"^throwaway.*",  # throwaway*, etc.
        r".*\d{5,}\..*",  # Domains with many digits
    ]
    
    for pattern in disposable_patterns:
        if re.match(pattern, domain):
            logger.warning(f"Disposable email pattern detected: {email}")
            return True
    
    return False


def is_legitimate_email(email: str) -> bool:
    """
    Check if email is from known legitimate provider (DRY utility)
    
    Args:
        email: Email address
        
    Returns:
        True if legitimate, False otherwise
    """
    domain = extract_email_domain(email)
    
    if not domain:
        return False
    
    return domain in LEGITIMATE_EMAIL_DOMAINS


def validate_email_for_referral(email: str) -> tuple[bool, str]:
    """
    Validate email for referral signup (Core logic - DRY)
    
    Args:
        email: Email address
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check if disposable
    if is_disposable_email(email):
        return False, "Temporary email addresses are not allowed for referral signups"
    
    # If from legitimate provider, allow
    if is_legitimate_email(email):
        return True, ""
    
    # For other domains, allow but log for monitoring
    logger.info(f"Signup with non-whitelisted domain: {email}")
    return True, ""


async def update_disposable_email_list():
    """
    Update disposable email domain list from external source
    Should be run as scheduled job weekly
    
    This is a placeholder for future implementation that would:
    1. Fetch from: https://github.com/disposable/disposable-email-domains
    2. Update DISPOSABLE_EMAIL_DOMAINS set
    3. Store in database or cache
    """
    logger.info("Updating disposable email domain list (placeholder)")
    # TODO: Implement external API fetch
    pass


def detect_sequential_emails(emails: list[str]) -> bool:
    """
    Detect sequential email patterns (fraud detection utility)
    Example: user1@domain.com, user2@domain.com, user3@domain.com
    
    Args:
        emails: List of email addresses
        
    Returns:
        True if sequential pattern detected
    """
    if len(emails) < 3:
        return False
    
    # Group by domain
    by_domain = {}
    for email in emails:
        domain = extract_email_domain(email)
        if domain:
            if domain not in by_domain:
                by_domain[domain] = []
            by_domain[domain].append(email)
    
    # Check each domain for sequential patterns
    for domain, domain_emails in by_domain.items():
        if len(domain_emails) < 3:
            continue
        
        # Extract usernames
        usernames = [e.split("@")[0] for e in domain_emails]
        
        # Check if usernames follow pattern: user1, user2, user3
        sequential_count = 0
        for i in range(len(usernames) - 1):
            curr = usernames[i]
            next_user = usernames[i + 1]
            
            # Simple pattern: ends with incrementing numbers
            if curr[:-1] == next_user[:-1]:
                try:
                    curr_num = int(curr[-1])
                    next_num = int(next_user[-1])
                    if next_num == curr_num + 1:
                        sequential_count += 1
                except ValueError:
                    continue
        
        if sequential_count >= 2:
            logger.warning(f"Sequential email pattern detected for domain {domain}")
            return True
    
    return False
