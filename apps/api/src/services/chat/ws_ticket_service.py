"""
WebSocket ticket service for secure authentication.

Instead of passing the main JWT token in the WebSocket URL (which leaks into
access logs from Nginx, AWS ALBs, etc.), the client first exchanges its JWT
for a short-lived, single-use ticket via a regular authenticated POST request.
The ticket is then passed in the WebSocket query string.
"""
import secrets
import time
import logging
from typing import Optional, Dict, Tuple

logger = logging.getLogger(__name__)

# In-memory store for pending tickets:  ticket_id -> (user_id, expires_at)
_pending_tickets: Dict[str, Tuple[int, float]] = {}

# Ticket lifetime in seconds (30s is plenty for a WebSocket handshake)
TICKET_TTL_SECONDS = 30


def create_ticket(user_id: int) -> str:
    """Create a short-lived, single-use WebSocket ticket for the given user."""
    _cleanup_expired()

    ticket = secrets.token_urlsafe(32)
    _pending_tickets[ticket] = (user_id, time.monotonic() + TICKET_TTL_SECONDS)
    return ticket


def redeem_ticket(ticket: str) -> Optional[int]:
    """
    Redeem a ticket and return the associated user_id.
    Returns None if the ticket is invalid or expired.
    The ticket is consumed (deleted) on redemption regardless of outcome.
    """
    _cleanup_expired()

    entry = _pending_tickets.pop(ticket, None)
    if entry is None:
        return None

    user_id, expires_at = entry
    if time.monotonic() > expires_at:
        return None

    return user_id


def _cleanup_expired() -> None:
    """Remove expired tickets to prevent memory leaks."""
    now = time.monotonic()
    expired = [k for k, (_, exp) in _pending_tickets.items() if now > exp]
    for k in expired:
        del _pending_tickets[k]
