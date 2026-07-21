"""
Builds the title/message copy for every notification type.

Kept as pure, dependency-free functions (no DB session, no I/O) so message
wording can be unit-tested directly and stays in exactly one place instead
of being duplicated across each trigger call site.
"""

from dataclasses import dataclass
from typing import Optional

FEEDBACK_PREVIEW_LENGTH = 140
ANNOUNCEMENT_PREVIEW_LENGTH = 160


@dataclass(frozen=True)
class NotificationCopy:
    title: str
    message: str


def truncate(text: Optional[str], limit: int) -> str:
    """Trim ``text`` to ``limit`` characters, appending an ellipsis if cut."""
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def assignment_reviewed_copy(
    instructor_name: str,
    assignment_title: str,
    grade: int,
    max_grade: int,
    feedback: Optional[str] = None,
) -> NotificationCopy:
    message = (
        f'{instructor_name} graded your submission for "{assignment_title}" '
        f"— {grade}/{max_grade}."
    )
    if feedback:
        message = f"{message} {truncate(feedback, FEEDBACK_PREVIEW_LENGTH)}"
    return NotificationCopy(title="Assignment graded", message=message)


def retake_requested_copy(
    instructor_name: str,
    assignment_title: str,
    feedback: Optional[str] = None,
) -> NotificationCopy:
    feedback_preview = (
        truncate(feedback, FEEDBACK_PREVIEW_LENGTH)
        if feedback
        else "Please review and resubmit."
    )
    message = (
        f'{instructor_name} asked you to redo "{assignment_title}": {feedback_preview}'
    )
    return NotificationCopy(title="Resubmission requested", message=message)


def chapter_added_copy(chapter_title: str, course_title: str) -> NotificationCopy:
    message = f'"{chapter_title}" was just added to {course_title}.'
    return NotificationCopy(title="New chapter available", message=message)


def activity_added_copy(
    activity_title: str, chapter_title: str, course_title: str
) -> NotificationCopy:
    message = f'"{activity_title}" was added to {chapter_title} in {course_title}.'
    return NotificationCopy(title="New activity available", message=message)


def app_update_copy(
    announcement_title: str, announcement_content: str
) -> NotificationCopy:
    message = truncate(announcement_content, ANNOUNCEMENT_PREVIEW_LENGTH)
    return NotificationCopy(title=announcement_title, message=message)
