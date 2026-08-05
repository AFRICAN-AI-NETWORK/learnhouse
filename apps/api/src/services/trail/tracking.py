"""
Lightweight learning time-tracking ingestion.

The client sends a heartbeat carrying the elapsed seconds since its previous
heartbeat while an activity is open. The server accumulates that delta into the
student's currently-open session for the activity, or opens a new session if too
much time has passed since the last heartbeat (idle gap) — preventing an
abandoned tab from inflating the total. Each heartbeat delta is capped so a
misbehaving or malicious client cannot over-report time.
"""

from datetime import datetime, timezone

from dateutil import parser
from fastapi import HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import Session, select

from src.db.courses.activities import Activity
from src.db.trail_runs import TrailRun
from src.db.trail_sessions import TrailActivitySession
from src.db.users import AnonymousUser, PublicUser

# A new session starts when the gap since the last heartbeat exceeds this.
IDLE_GAP_SECONDS = 300
# Maximum seconds a single heartbeat may add (guards against over-reporting).
MAX_HEARTBEAT_SECONDS = 120


class ActivityHeartbeat(BaseModel):
    activity_uuid: str
    seconds: int = 0


def _within_idle_gap(last_heartbeat_at: str, now: datetime) -> bool:
    if not last_heartbeat_at:
        return False
    try:
        last = parser.isoparse(last_heartbeat_at)
    except (ValueError, TypeError):
        return False
    return (now - last).total_seconds() <= IDLE_GAP_SECONDS


async def record_activity_heartbeat(
    request: Request,
    user: PublicUser | AnonymousUser,
    payload: ActivityHeartbeat,
    db_session: Session,
) -> TrailActivitySession:
    """Accumulate elapsed time for the current user on an activity."""
    if isinstance(user, AnonymousUser) or getattr(user, "id", 0) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Anonymous users cannot record learning time",
        )

    activity = db_session.exec(
        select(Activity).where(Activity.activity_uuid == payload.activity_uuid)
    ).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found"
        )

    increment = max(0, min(payload.seconds, MAX_HEARTBEAT_SECONDS))
    now = datetime.now(timezone.utc)
    now_str = str(now)

    trail_run = db_session.exec(
        select(TrailRun).where(
            TrailRun.user_id == user.id, TrailRun.course_id == activity.course_id
        )
    ).first()

    last_session = db_session.exec(
        select(TrailActivitySession)
        .where(
            TrailActivitySession.user_id == user.id,
            TrailActivitySession.activity_id == activity.id,
        )
        .order_by(TrailActivitySession.id.desc())  # type: ignore[attr-defined]
    ).first()

    if last_session and _within_idle_gap(last_session.last_heartbeat_at, now):
        last_session.seconds_spent += increment
        last_session.last_heartbeat_at = now_str
        session_row = last_session
    else:
        session_row = TrailActivitySession(
            seconds_spent=increment,
            user_id=user.id,
            org_id=activity.org_id,
            course_id=activity.course_id,
            activity_id=activity.id,
            trailrun_id=trail_run.id if trail_run else None,
            started_at=now_str,
            last_heartbeat_at=now_str,
        )

    db_session.add(session_row)
    db_session.commit()
    db_session.refresh(session_row)
    return session_row
