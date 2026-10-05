"""Shared date and timezone helpers for scheduling and deadlines."""

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def parse_instant(value: str) -> datetime:
    """Parse an ISO-8601 string, keeping its offset. Naive values are UTC."""
    parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed


def parse_instant_utc(value: str) -> datetime:
    """Parse an ISO-8601 string and normalize it to UTC."""
    return parse_instant(value).astimezone(UTC)


def parse_calendar_date(value: str) -> date:
    """Parse a calendar date written exactly as YYYY-MM-DD."""
    parsed = date.fromisoformat(value)
    if parsed.isoformat() != value:
        raise ValueError(f"Not a YYYY-MM-DD date: {value!r}")
    return parsed


def resolve_zone(name: str | None) -> ZoneInfo | None:
    """Return the IANA zone for ``name``, or None when it is missing or unknown."""
    if not name or not name.strip():
        return None
    try:
        return ZoneInfo(name.strip())
    except (ZoneInfoNotFoundError, ValueError, OSError):
        return None


def local_date(instant: datetime, zone: ZoneInfo) -> date:
    """Calendar date of ``instant`` as seen in ``zone``."""
    return instant.astimezone(zone).date()
