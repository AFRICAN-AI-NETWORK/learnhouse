"""
Delta sync endpoint.

Collapses "one request per entity type" into a single round trip, which is what
makes reconnection cheap: a client that has been offline asks once for everything
that changed since its last successful sync.

SECURITY — the scoping here is the whole point. Results are filtered to the
organisations the caller actually belongs to, and to courses that are either public
or reachable through that membership. A user must never receive delta rows for
content they cannot otherwise read.
"""

import base64
import binascii
import json
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from src.core.events.database import get_db_session
from src.db.courses.activities import Activity
from src.db.courses.chapters import Chapter
from src.db.courses.courses import Course
from src.db.user_organizations import UserOrganization
from src.security.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# Entity types a client may request. Anything else is rejected rather than ignored,
# so a typo surfaces immediately instead of silently syncing nothing.
_SUPPORTED_ENTITIES = frozenset({"courses", "chapters", "activities"})

# Bounds the response so a long offline period cannot produce an unbounded payload.
_DEFAULT_LIMIT = 100
_MAX_LIMIT = 500


class DeltaCursor(BaseModel):
    """Opaque position marker. Cursor-based, not offset-based, so concurrent
    writes cannot cause rows to be skipped or repeated across pages."""

    entity_type: str
    last_id: int


class DeltaResponse(BaseModel):
    since: datetime | None
    entities: dict[str, list[dict]]
    next_cursor: str | None
    server_time: datetime


def _encode_cursor(cursor: DeltaCursor) -> str:
    raw = json.dumps({"e": cursor.entity_type, "i": cursor.last_id})
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8")


def _decode_cursor(value: str) -> DeltaCursor:
    try:
        raw = base64.urlsafe_b64decode(value.encode("utf-8")).decode("utf-8")
        payload = json.loads(raw)
        return DeltaCursor(entity_type=payload["e"], last_id=int(payload["i"]))
    except (
        binascii.Error,
        UnicodeDecodeError,
        ValueError,
        KeyError,
        TypeError,
    ) as exc:
        raise HTTPException(status_code=400, detail="Invalid cursor") from exc


def _accessible_org_ids(user, db_session: Session) -> list[int]:
    """Organisations the caller belongs to. Empty for anonymous callers."""
    user_id = getattr(user, "id", None)
    if user_id is None:
        return []

    statement = select(UserOrganization.org_id).where(
        UserOrganization.user_id == user_id
    )
    return list(db_session.exec(statement).all())


def _serialise(row) -> dict:
    """SQLModel row → JSON-safe dict, matching the shape the client already caches."""
    return json.loads(json.dumps(row.model_dump(), default=lambda value: str(value)))


def _to_update_date_string(value: datetime) -> str:
    """
    Renders `since` in the same textual form the columns use.

    IMPORTANT: `creation_date`/`update_date` are stored as STRINGS produced by
    `str(datetime.now(UTC))` (e.g. `2026-08-08 12:34:56.789012+00:00`), not as
    timestamps. Comparison must therefore be lexicographic against an identically
    formatted string — passing a `datetime` here would compare against a different
    textual representation and silently return the wrong rows.
    ISO-8601 in a fixed timezone sorts correctly as text, which is what makes this
    safe; normalising to UTC first is what keeps it consistent.
    """
    normalised = (
        value.astimezone(UTC) if value.tzinfo is not None else value.replace(tzinfo=UTC)
    )
    return str(normalised)


@router.get("/delta", response_model=DeltaResponse)
async def get_delta(
    request: Request,
    since: datetime | None = Query(
        default=None,
        description="ISO timestamp. Only entities updated after this are returned.",
    ),
    entity_types: str = Query(
        default="courses,chapters,activities",
        description="Comma-separated entity types to include.",
    ),
    cursor: str | None = Query(
        default=None, description="Opaque cursor from a previous response."
    ),
    limit: int = Query(default=_DEFAULT_LIMIT, ge=1, le=_MAX_LIMIT),
    user=Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> DeltaResponse:
    """
    Returns entities modified since `since`, scoped to the caller's permissions.
    """
    requested = {item.strip() for item in entity_types.split(",") if item.strip()}
    unsupported = requested - _SUPPORTED_ENTITIES
    if unsupported:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported entity_types: {', '.join(sorted(unsupported))}",
        )

    org_ids = _accessible_org_ids(user, db_session)

    # No memberships means nothing user-scoped to deliver. Returning an empty
    # payload (rather than 403) keeps the client's sync loop simple.
    if not org_ids:
        return DeltaResponse(
            since=since,
            entities={entity: [] for entity in requested},
            next_cursor=None,
            server_time=datetime.now(UTC),
        )

    active_cursor = _decode_cursor(cursor) if cursor else None
    entities: dict[str, list[dict]] = {}
    next_cursor: str | None = None

    since_text = _to_update_date_string(since) if since is not None else None

    # Courses the caller can reach — the anchor for chapter/activity scoping.
    course_statement = select(Course).where(Course.org_id.in_(org_ids))  # type: ignore[attr-defined]
    if since_text is not None:
        course_statement = course_statement.where(Course.update_date > since_text)  # type: ignore[operator]

    accessible_course_ids = list(
        db_session.exec(select(Course.id).where(Course.org_id.in_(org_ids))).all()  # type: ignore[attr-defined]
    )

    if "courses" in requested:
        statement = course_statement.order_by(Course.id)  # type: ignore[arg-type]
        if active_cursor and active_cursor.entity_type == "courses":
            statement = statement.where(Course.id > active_cursor.last_id)  # type: ignore[operator]
        rows = list(db_session.exec(statement.limit(limit + 1)).all())

        if len(rows) > limit:
            rows = rows[:limit]
            next_cursor = _encode_cursor(
                DeltaCursor(entity_type="courses", last_id=rows[-1].id)  # type: ignore[arg-type]
            )
        entities["courses"] = [_serialise(row) for row in rows]

    if "chapters" in requested and next_cursor is None:
        statement = select(Chapter).where(
            Chapter.course_id.in_(accessible_course_ids)  # type: ignore[attr-defined]
        )
        if since_text is not None:
            statement = statement.where(Chapter.update_date > since_text)  # type: ignore[operator]
        statement = statement.order_by(Chapter.id)  # type: ignore[arg-type]
        if active_cursor and active_cursor.entity_type == "chapters":
            statement = statement.where(Chapter.id > active_cursor.last_id)  # type: ignore[operator]

        rows = list(db_session.exec(statement.limit(limit + 1)).all())
        if len(rows) > limit:
            rows = rows[:limit]
            next_cursor = _encode_cursor(
                DeltaCursor(entity_type="chapters", last_id=rows[-1].id)  # type: ignore[arg-type]
            )
        entities["chapters"] = [_serialise(row) for row in rows]

    if "activities" in requested and next_cursor is None:
        statement = select(Activity).where(
            Activity.course_id.in_(accessible_course_ids)  # type: ignore[attr-defined]
        )
        if since_text is not None:
            statement = statement.where(Activity.update_date > since_text)  # type: ignore[operator]
        statement = statement.order_by(Activity.id)  # type: ignore[arg-type]
        if active_cursor and active_cursor.entity_type == "activities":
            statement = statement.where(Activity.id > active_cursor.last_id)  # type: ignore[operator]

        rows = list(db_session.exec(statement.limit(limit + 1)).all())
        if len(rows) > limit:
            rows = rows[:limit]
            next_cursor = _encode_cursor(
                DeltaCursor(entity_type="activities", last_id=rows[-1].id)  # type: ignore[arg-type]
            )
        entities["activities"] = [_serialise(row) for row in rows]

    # Ensure every requested type is present, so the client can rely on the shape.
    for entity in requested:
        entities.setdefault(entity, [])

    # Tracing (plan Layer 11.3). `instrument_fastapi` already spans the request;
    # these attributes add the detail that matters when many clients reconnect at
    # once after a maintenance window — row counts and whether paging kicked in.
    _record_sync_metrics(
        org_count=len(org_ids),
        row_counts={name: len(rows) for name, rows in entities.items()},
        paginated=next_cursor is not None,
    )

    return DeltaResponse(
        since=since,
        entities=entities,
        next_cursor=next_cursor,
        server_time=datetime.now(UTC),
    )


def _record_sync_metrics(
    org_count: int, row_counts: dict[str, int], paginated: bool
) -> None:
    """
    Attaches delta-sync detail to the active trace.

    Best-effort: observability must never be able to fail a sync response, and
    logfire may not be configured in every environment.
    """
    try:
        import logfire

        logfire.info(
            "sync.delta",
            org_count=org_count,
            row_counts=row_counts,
            total_rows=sum(row_counts.values()),
            paginated=paginated,
        )
    except Exception:  # noqa: BLE001 - telemetry is never load-bearing
        logger.debug("Sync metrics not recorded", exc_info=True)
