from typing import List
from fastapi import APIRouter, Depends, Request
from sqlmodel import Session
from src.core.events.database import get_db_session
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.courses.prerequisites import (
    PrerequisiteCreate,
    PrerequisiteRead,
    get_course_prerequisites,
    set_course_prerequisites,
    delete_course_prerequisites,
)

router = APIRouter()


@router.get("/{course_uuid}")
async def api_get_course_prerequisites(
    request: Request,
    course_uuid: str,
    db_session: Session = Depends(get_db_session),
) -> List[PrerequisiteRead]:
    """
    Get prerequisites for a course.
    """
    return await get_course_prerequisites(request, course_uuid, db_session)


@router.put("/{course_uuid}")
async def api_set_course_prerequisites(
    request: Request,
    course_uuid: str,
    prereq_data: PrerequisiteCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> List[PrerequisiteRead]:
    """
    Set prerequisites for a course (replaces any existing).
    Requires admin/maintainer/instructor role.
    """
    return await set_course_prerequisites(
        request, course_uuid, prereq_data, current_user, db_session
    )


@router.delete("/{course_uuid}")
async def api_delete_course_prerequisites(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Remove all prerequisites from a course.
    """
    return await delete_course_prerequisites(
        request, course_uuid, current_user, db_session
    )
