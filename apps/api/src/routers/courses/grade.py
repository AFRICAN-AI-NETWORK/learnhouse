from typing import List, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.courses.grade import get_course_grade_for_user

router = APIRouter()


class ActivityGradeDetailRead(BaseModel):
    activity_id: int
    activity_name: str
    activity_type: str
    points_possible: float
    points_earned: float
    assignment_score: Optional[float] = None
    is_late: bool
    is_complete: bool


class CourseGradeRead(BaseModel):
    course_uuid: str
    total_points_possible: float
    total_points_earned: float
    grade_percentage: Optional[float] = None
    activity_breakdown: List[ActivityGradeDetailRead]


@router.get("/{course_uuid}/grade")
async def api_get_course_grade(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CourseGradeRead:
    """
    Get the authenticated, enrolled user's performance-weighted grade for a
    course, including a per-activity breakdown.

    Returns the caller's own grade only. Anonymous callers receive 401; callers
    not enrolled in the course receive 403.
    """
    return await get_course_grade_for_user(
        request, course_uuid, current_user, db_session
    )
