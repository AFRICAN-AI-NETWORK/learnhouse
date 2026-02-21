"""
Fraud Prevention Utilities for Referral System
Implements disposable email detection and domain validation with dynamic domain lists
"""
import logging
import re
import httpx
from typing import Set, Optional
from datetime import datetime, timedelta
from sqlmodel import Session, select

from src.db.referrals.email_domain_lists import EmailDomainList, DomainListType

logger = logging.getLogger(__name__)

# In-memory cache for domain lists (TTL: 1 hour)
_domain_cache = {
    "disposable": set(),
    "legitimate": set(),
    "last_updated": None
}
CACHE_TTL_SECONDS = 3600  # 1 hour

# Minimal fallback sets (used only if database is unavailable)
FALLBACK_DISPOSABLE_DOMAINS: Set[str] = {
    "10minutemail.com", "guerrillamail.com", "mailinator.com", 
    "tempmail.com", "throwaway.email"
}

FALLBACK_LEGITIMATE_DOMAINS: Set[str] = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"
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


async def load_domain_lists_from_db(db_session: Session) -> None:
    """
    Load domain lists from database into memory cache
    
    Args:
        db_session: Database session
    """
    try:
        # Load disposable domains
        disposable_stmt = select(EmailDomainList).where(
            EmailDomainList.list_type == DomainListType.DISPOSABLE,
            EmailDomainList.is_active == True
        )
        disposable_domains = db_session.exec(disposable_stmt).all()
        _domain_cache["disposable"] = {d.domain for d in disposable_domains}
        
        # Load legitimate domains
        legitimate_stmt = select(EmailDomainList).where(
            EmailDomainList.list_type == DomainListType.LEGITIMATE,
            EmailDomainList.is_active == True
        )
        legitimate_domains = db_session.exec(legitimate_stmt).all()
        _domain_cache["legitimate"] = {d.domain for d in legitimate_domains}
        
        _domain_cache["last_updated"] = datetime.utcnow()
        
        logger.info(
            f"Loaded {len(_domain_cache['disposable'])} disposable and "
            f"{len(_domain_cache['legitimate'])} legitimate domains from database"
        )
    except Exception as e:
        logger.error(f"Failed to load domain lists from database: {e}")
        # Use fallback sets
        _domain_cache["disposable"] = FALLBACK_DISPOSABLE_DOMAINS.copy()
        _domain_cache["legitimate"] = FALLBACK_LEGITIMATE_DOMAINS.copy()
        _domain_cache["last_updated"] = datetime.utcnow()


def is_cache_expired() -> bool:
    """Check if domain cache has expired"""
    if _domain_cache["last_updated"] is None:
        return True
    
    elapsed = (datetime.utcnow() - _domain_cache["last_updated"]).total_seconds()
    return elapsed > CACHE_TTL_SECONDS


async def get_disposable_domains(db_session: Session) -> Set[str]:
    """
    Get disposable email domains (with caching)
    
    Args:
        db_session: Database session
        
    Returns:
        Set of disposable domains
    """
    if is_cache_expired():
        await load_domain_lists_from_db(db_session)
    
    return _domain_cache["disposable"]


async def get_legitimate_domains(db_session: Session) -> Set[str]:
    """
    Get legitimate email domains (with caching)
    
    Args:
        db_session: Database session
        
    Returns:
        Set of legitimate domains
    """
    if is_cache_expired():
        await load_domain_lists_from_db(db_session)
    
    return _domain_cache["legitimate"]


async def is_disposable_email(email: str, db_session: Session) -> bool:
    """
    Check if email is from disposable email service (DRY utility)
    
    Args:
        email: Email address
        db_session: Database session
        
    Returns:
        True if disposable, False otherwise
    """
    domain = extract_email_domain(email)
    
    if not domain:
        return False
    
    # Get disposable domains (cached)
    disposable_domains = await get_disposable_domains(db_session)
    
    # Check against disposable domain list
    if domain in disposable_domains:
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


async def is_legitimate_email(email: str, db_session: Session) -> bool:
    """
    Check if email is from known legitimate provider (DRY utility)
    
    Args:
        email: Email address
        db_session: Database session
        
    Returns:
        True if legitimate, False otherwise
    """
    domain = extract_email_domain(email)
    
    if not domain:
        return False
    
    # Get legitimate domains (cached)
    legitimate_domains = await get_legitimate_domains(db_session)
    
    return domain in legitimate_domains


async def validate_email_for_referral(email: str, db_session: Session) -> tuple[bool, str]:
    """
    Validate email for referral signup (Core logic - DRY)
    
    Args:
        email: Email address
        db_session: Database session
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check if disposable
    if await is_disposable_email(email, db_session):
        return False, "Temporary email addresses are not allowed for referral signups"
    
    # If from legitimate provider, allow
    if await is_legitimate_email(email, db_session):
        return True, ""
    
    # For other domains, allow but log for monitoring
    logger.info(f"Signup with non-whitelisted domain: {email}")
    return True, ""


async def fetch_disposable_domains_from_github() -> Set[str]:
    """
    Fetch disposable email domains from GitHub repository
    
    Returns:
        Set of disposable domains
        
    Raises:
        Exception if fetch fails
    """
    # Primary source: disposable-email-domains repository
    url = "https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            # Parse domain list (one domain per line)
            domains = set()
            for line in response.text.split("\n"):
                line = line.strip().lower()
                if line and not line.startswith("#"):
                    domains.add(line)
            
            logger.info(f"Fetched {len(domains)} disposable domains from GitHub")
            return domains
            
    except Exception as e:
        logger.error(f"Failed to fetch disposable domains from GitHub: {e}")
        raise


async def update_disposable_email_list(db_session: Session) -> dict:
    """
    Update disposable email domain list from external source
    Should be run as scheduled job (weekly recommended)
    
    Args:
        db_session: Database session
        
    Returns:
        Dict with update statistics
    """
    stats = {
        "added": 0,
        "deactivated": 0,
        "total": 0,
        "source": "github:disposable",
        "success": False
    }
    
    try:
        # Fetch from GitHub
        external_domains = await fetch_disposable_domains_from_github()
        
        # Get existing domains from database
        stmt = select(EmailDomainList).where(
            EmailDomainList.list_type == DomainListType.DISPOSABLE,
            EmailDomainList.source == "github:disposable"
        )
        existing_records = db_session.exec(stmt).all()
        existing_domains = {r.domain: r for r in existing_records}
        
        # Add new domains
        for domain in external_domains:
            if domain not in existing_domains:
                new_record = EmailDomainList(
                    domain=domain,
                    list_type=DomainListType.DISPOSABLE,
                    source="github:disposable",
                    is_active=True,
                    last_verified_at=datetime.utcnow()
                )
                db_session.add(new_record)
                stats["added"] += 1
            else:
                # Update last_verified_at for existing domains
                record = existing_domains[domain]
                record.last_verified_at = datetime.utcnow()
                record.is_active = True
                db_session.add(record)
        
        # Deactivate domains no longer in external list
        for domain, record in existing_domains.items():
            if domain not in external_domains:
                record.is_active = False
                db_session.add(record)
                stats["deactivated"] += 1
        
        db_session.commit()
        
        # Refresh cache
        await load_domain_lists_from_db(db_session)
        
        stats["total"] = len(external_domains)
        stats["success"] = True
        
        logger.info(
            f"Disposable email list updated: {stats['added']} added, "
            f"{stats['deactivated']} deactivated, {stats['total']} total"
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to update disposable email list: {e}")
        db_session.rollback()
        stats["error"] = str(e)
        return stats


async def seed_initial_domain_lists(db_session: Session) -> None:
    """
    Seed database with initial domain lists (run once on setup)
    
    Args:
        db_session: Database session
    """
    # Check if already seeded
    stmt = select(EmailDomainList)
    existing = db_session.exec(stmt).first()
    if existing:
        logger.info("Domain lists already seeded, skipping")
        return
    
    logger.info("Seeding initial domain lists...")
    
    # Seed disposable domains from GitHub
    try:
        await update_disposable_email_list(db_session)
    except Exception as e:
        logger.warning(f"Failed to fetch from GitHub, using fallback list: {e}")
        # Use fallback set
        for domain in FALLBACK_DISPOSABLE_DOMAINS:
            record = EmailDomainList(
                domain=domain,
                list_type=DomainListType.DISPOSABLE,
                source="fallback",
                is_active=True
            )
            db_session.add(record)
    
    # Seed legitimate domains
    legitimate_domains = [
        "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
        "protonmail.com", "aol.com", "mail.com", "zoho.com", "gmx.com",
        "live.com", "msn.com", "yandex.com", "inbox.com", "fastmail.com"
    ]
    
    for domain in legitimate_domains:
        record = EmailDomainList(
            domain=domain,
            list_type=DomainListType.LEGITIMATE,
            source="config",
            is_active=True
        )
        db_session.add(record)
    
    db_session.commit()
    logger.info("Initial domain lists seeded successfully")


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
