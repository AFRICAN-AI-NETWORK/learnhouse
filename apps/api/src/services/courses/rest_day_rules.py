import calendar
from collections.abc import Iterable, Iterator
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo


def occurrences(
    starts_at: datetime,
    ends_at: datetime,
    recurrence: str,
    until: datetime | None = None,
) -> Iterator[tuple[datetime, datetime]]:
    """Yield the occurrences needed to evaluate a recurring timetable item."""
    if recurrence == "none":
        yield starts_at, ends_at
        return

    if recurrence in {"weekly", "biweekly"}:
        yield starts_at, ends_at
        return

    if recurrence != "monthly":
        raise ValueError(f"Unsupported recurrence: {recurrence}")

    original_day = starts_at.day
    step = 1
    current_start, current_end = starts_at, ends_at
    limit = until or (starts_at + timedelta(days=366))
    while current_start <= limit:
        yield current_start, current_end
        month = current_start.month - 1 + step
        year = current_start.year + month // 12
        month = month % 12 + 1
        # Monthly timetable occurrences use the last valid day when the
        # original day does not exist in a later month.
        day = min(original_day, calendar.monthrange(year, month)[1])
        current_start = current_start.replace(year=year, month=month, day=day)
        # Preserve the original duration without relying on wall-clock days.
        duration = ends_at - starts_at
        current_end = current_start + duration


def local_dates_covered(start: datetime, end: datetime, zone: ZoneInfo) -> set[date]:
    local_start = start.astimezone(zone).date()
    local_end = end.astimezone(zone).date()
    return {
        local_start + timedelta(days=offset)
        for offset in range((local_end - local_start).days + 1)
    }


def find_conflicts(
    spans: Iterable[tuple[datetime, datetime]],
    zone: ZoneInfo,
    rest_weekdays: set[int],
) -> list[date]:
    conflicts = {
        covered
        for start, end in spans
        for covered in local_dates_covered(start, end, zone)
        if covered.weekday() in rest_weekdays
    }
    return sorted(conflicts)
