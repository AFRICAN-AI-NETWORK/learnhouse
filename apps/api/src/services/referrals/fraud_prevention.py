"""
Fraud Prevention Utilities for Referral System
Implements disposable email detection and domain validation with dynamic domain lists
"""
import asyncio
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

# Thread-safe lock for cache refresh (prevents concurrent DB queries)
_cache_refresh_lock = asyncio.Lock()

# Circuit breaker state for external API calls
_circuit_breaker = {
    "failures": 0,
    "last_failure_time": None,
    "state": "closed",  # closed, open, half_open
}
CIRCUIT_BREAKER_THRESHOLD = 3  # Open circuit after 3 consecutive failures
CIRCUIT_BREAKER_TIMEOUT = 300  # Try again after 5 minutes
CIRCUIT_BREAKER_HALF_OPEN_TIMEOUT = 60  # In half-open state, try after 1 minute
    "tempmail.com", "throwaway.email"
}

FALLBACK_LEGITIMATE_DOMAINS: Set[str] = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"
}

# Pre-compiled regex patterns for disposable email detection (performance optimization)
DISPOSABLE_PATTERNS = [
    re.compile(r"^temp.*"),  # temp*, tempmail*, etc.
    re.compile(r"^trash.*"),  # trashmail*, etc.
    re.compile(r"^fake.*"),  # fakemail*, etc.
    re.compile(r"^throwaway.*"),  # throwaway*, etc.
    re.compile(r".*\d{5,}\..*"),  # Domains with many digits
]


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
    Load domain lists from database into memory cache (thread-safe)
    Uses asyncio.Lock to prevent concurrent cache refreshes
    
    Args:
        db_session: Database session
    """
    # Acquire lock to prevent concurrent refreshes (performance + consistency)
    async with _cache_refresh_lock:
        # Double-check if another coroutine already refreshed the cache
        if not is_cache_expired():
            return
        
        try:
            # Fetch all active domains in one query (performance optimization)
            stmt = select(EmailDomainList).where(EmailDomainList.is_active == True)
            all_domains = db_session.exec(stmt).all()
            
            # Sort by type in Python (more efficient than two DB queries)
            _domain_cache["disposable"] = {
                d.domain for d in all_domains if d.list_type == DomainListType.DISPOSABLE
            }
            _domain_cache["legitimate"] = {
                d.domain for d in all_domains if d.list_type == DomainListType.LEGITIMATE
            }
            
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
    
    # Pattern-based detection using pre-compiled patterns (performance optimization)
    for pattern in DISPOSABLE_PATTERNS:
        if pattern.match(domain):
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


def _check_circuit_breaker() -> bool:
    """
    Check if circuit breaker allows API call
    
    Returns:
        True if call is allowed, False if circuit is open
    """
    state = _circuit_breaker["state"]
    
    if state == "closed":
        return True
    
    if state == "open":
        # Check if timeout has passed
        last_failure = _circuit_breaker["last_failure_time"]
        if last_failure and (datetime.utcnow() - last_failure).total_seconds() > CIRCUIT_BREAKER_TIMEOUT:
            # Move to half-open state
            _circuit_breaker["state"] = "half_open"
            logger.info("Circuit breaker moved to half-open state, allowing test request")
            return True
        return False
    
    if state == "half_open":
        # Allow one test request
        return True
    
    return False


def _record_circuit_breaker_success() -> None:
    """Record successful API call, reset circuit breaker"""
    _circuit_breaker["failures"] = 0
    _circuit_breaker["last_failure_time"] = None
    if _circuit_breaker["state"] != "closed":
        logger.info("Circuit breaker reset to closed state after successful request")
    _circuit_breaker["state"] = "closed"


def _record_circuit_breaker_failure() -> None:
    """Record failed API call, update circuit breaker state"""
    _circuit_breaker["failures"] += 1
    _circuit_breaker["last_failure_time"] = datetime.utcnow()
    
    if _circuit_breaker["failures"] >= CIRCUIT_BREAKER_THRESHOLD:
        if _circuit_breaker["state"] != "open":
            logger.warning(
                f"Circuit breaker opened after {_circuit_breaker['failures']} failures. "
                f"External API calls blocked for {CIRCUIT_BREAKER_TIMEOUT}s"
            )
        _circuit_breaker["state"] = "open"
    elif _circuit_breaker["state"] == "half_open":
        # Half-open test failed, back to open
        logger.warning("Circuit breaker test request failed, returning to open state")
        _circuit_breaker["state"] = "open"


async def fetch_disposable_domains_from_github() -> Set[str]:
    """
    Fetch disposable email domains from GitHub repository with circuit breaker pattern
    
    Returns:
        Set of disposable domains
        
    Raises:
        Exception if fetch fails or circuit is open
    """
    # Check circuit breaker before attempting call
    if not _check_circuit_breaker():
        failures = _circuit_breaker["failures"]
        logger.warning(
            f"Circuit breaker is open ({failures} failures). "
            f"Skipping GitHub API call, using cached/fallback data"
        )
        raise Exception(f"Circuit breaker open after {failures} failures")
    
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
            
            # Success - reset circuit breaker
            _record_circuit_breaker_success()
            
            logger.info(f"Fetched {len(domains)} disposable domains from GitHub")
            return domains
            
    except Exception as e:
        # Record failure in circuit breaker
        _record_circuit_breaker_failure()
        
        logger.error(
            f"Failed to fetch disposable domains from GitHub: {e}. "
            f"Circuit breaker failures: {_circuit_breaker['failures']}/{CIRCUIT_BREAKER_THRESHOLD}"
        )
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
    
    # Regex to extract trailing digits from username (handles multi-digit numbers)
    trailing_digits_pattern = re.compile(r"^(.+?)(\d+)$")
    
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
        
        # Check if usernames follow pattern: user1, user2, user3 (or user9, user10, user11)
        sequential_count = 0
        for i in range(len(usernames) - 1):
            curr = usernames[i]
            next_user = usernames[i + 1]
            
            # Extract base and number using regex (handles multi-digit numbers)
            curr_match = trailing_digits_pattern.match(curr)
            next_match = trailing_digits_pattern.match(next_user)
            
            if curr_match and next_match:
                curr_base, curr_num_str = curr_match.groups()
                next_base, next_num_str = next_match.groups()
                
                # Check if base matches and numbers are sequential
                if curr_base == next_base:
                    try:
                        curr_num = int(curr_num_str)
                        next_num = int(next_num_str)
                        if next_num == curr_num + 1:
                            sequential_count += 1
                    except ValueError:
                        continue
        
        if sequential_count >= 2:
            logger.warning(f"Sequential email pattern detected for domain {domain}")
            return True
    
    return False
