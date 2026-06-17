from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.events.database import get_db_session
from src.security.auth import get_current_user
from src.services.admin_analytics.schemas import (
    OrgAnalyticsSummary,
    StudentCourseDetail,
    StudentDetail,
    StudentListResponse,
)
from src.services.admin_analytics.students import (
    get_org_analytics_summary,
    get_student_course_detail,
    get_student_detail,
    list_org_students,
)

router = APIRouter()


@router.get("/orgs/{org_id}/students", response_model=StudentListResponse)
async def api_list_org_students(
    request: Request,
    org_id: int,
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    user=Depends(get_current_user),
    db_session=Depends(get_db_session),
) -> StudentListResponse:
    """List all students in an organization with their progress metrics."""
    return await list_org_students(
        org_id, user, db_session, search=search, page=page, page_size=page_size
    )


@router.get("/orgs/{org_id}/students/{user_id}", response_model=StudentDetail)
async def api_get_student_detail(
    request: Request,
    org_id: int,
    user_id: int,
    user=Depends(get_current_user),
    db_session=Depends(get_db_session),
) -> StudentDetail:
    """Full profile and per-course progress for a single student."""
    return await get_student_detail(org_id, user_id, user, db_session)


@router.get(
    "/orgs/{org_id}/students/{user_id}/courses/{course_id}",
    response_model=StudentCourseDetail,
)
async def api_get_student_course_detail(
    request: Request,
    org_id: int,
    user_id: int,
    course_id: int,
    user=Depends(get_current_user),
    db_session=Depends(get_db_session),
) -> StudentCourseDetail:
    """Chapter -> activity drilldown for a student in a course."""
    return await get_student_course_detail(org_id, user_id, course_id, user, db_session)


@router.get("/orgs/{org_id}/analytics/summary", response_model=OrgAnalyticsSummary)
async def api_get_org_analytics_summary(
    request: Request,
    org_id: int,
    user=Depends(get_current_user),
    db_session=Depends(get_db_session),
) -> OrgAnalyticsSummary:
    """Org-wide headline metrics for the dashboard top cards."""
    return await get_org_analytics_summary(org_id, user, db_session)
