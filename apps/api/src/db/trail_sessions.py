from sqlalchemy import Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel


class TrailActivitySession(SQLModel, table=True):
    """
    Lightweight learning time-tracking.

    A row represents one continuous viewing session of an activity. While an
    activity is open the client sends periodic heartbeats; the server accumulates
    the elapsed seconds into the currently-open session and opens a new session
    once the gap since the last heartbeat exceeds the idle timeout, so an
    abandoned browser tab does not inflate the total.

    Time spent on a course is ``SUM(seconds_spent)`` grouped by ``course_id`` and
    a student's last activity is ``MAX(last_heartbeat_at)``.
    """

    id: int | None = Field(default=None, primary_key=True)
    seconds_spent: int = Field(default=0)
    # foreign keys
    user_id: int = Field(
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), index=True)
    )
    org_id: int = Field(
        sa_column=Column(
            Integer, ForeignKey("organization.id", ondelete="CASCADE"), index=True
        )
    )
    course_id: int = Field(
        sa_column=Column(
            Integer, ForeignKey("course.id", ondelete="CASCADE"), index=True
        )
    )
    activity_id: int = Field(
        sa_column=Column(Integer, ForeignKey("activity.id", ondelete="CASCADE"))
    )
    trailrun_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("trailrun.id", ondelete="CASCADE")),
    )
    # timestamps (ISO strings, consistent with the other trail models)
    started_at: str = ""
    last_heartbeat_at: str = ""
