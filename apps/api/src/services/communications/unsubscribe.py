import hashlib
import hmac
import os
from datetime import UTC, datetime
from typing import Optional

from sqlmodel import Session, select

from src.db.communications import EmailUnsubscribe, UnsubscribeScope

# In a real system, use a secret key from settings
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key").encode("utf-8")


def generate_unsubscribe_token(org_id: int, email: str, scope: UnsubscribeScope) -> str:
    """Generate a secure HMAC-based unsubscribe token."""
    message = f"{org_id}:{email}:{scope.value}".encode()
    return hmac.new(SECRET_KEY, message, hashlib.sha256).hexdigest()


def verify_unsubscribe_token(org_id: int, email: str, scope: UnsubscribeScope, token: str) -> bool:
    """Verify an unsubscribe token."""
    expected_token = generate_unsubscribe_token(org_id, email, scope)
    return hmac.compare_digest(expected_token, token)


async def unsubscribe_user(
    db_session: Session, 
    org_id: int, 
    email: str, 
    scope: UnsubscribeScope, 
    user_id: Optional[int] = None
) -> EmailUnsubscribe:
    """Opt a user out of communications for a specific scope."""
    # Check if already unsubscribed
    existing = db_session.exec(
        select(EmailUnsubscribe).where(
            EmailUnsubscribe.org_id == org_id,
            EmailUnsubscribe.email == email,
            EmailUnsubscribe.scope == scope
        )
    ).first()
    
    if existing:
        return existing
        
    token = generate_unsubscribe_token(org_id, email, scope)
    unsub = EmailUnsubscribe(
        org_id=org_id,
        user_id=user_id,
        email=email,
        scope=scope,
        token_hash=token,
        unsubscribed_at=datetime.now(UTC),
        creation_date=datetime.now(UTC).isoformat()
    )
    db_session.add(unsub)
    db_session.commit()
    db_session.refresh(unsub)
    return unsub


async def get_unsubscribed_emails(db_session: Session, org_id: int, scope: UnsubscribeScope) -> set[str]:
    """Get all unsubscribed emails for an org and scope."""
    unsubs = db_session.exec(
        select(EmailUnsubscribe.email).where(
            EmailUnsubscribe.org_id == org_id,
            EmailUnsubscribe.scope == scope
        )
    ).all()
    return set(unsubs)
