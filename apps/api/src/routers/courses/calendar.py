from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.courses.weekly_schedule import (
    WeeklyOperatingScheduleRead,
    WeeklyOperatingScheduleUpdate,
)
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.courses.weekly_schedule import (
    delete_course_schedule,
    get_course_schedule,
    get_default_schedule,
    update_default_schedule,
    upsert_course_schedule,
)

router = APIRouter()


@router.get("/weekly-schedule/default")
async def api_get_default_weekly_schedule(
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> WeeklyOperatingScheduleRead:
    """
    Get the organization's default weekly operating schedule.
    """
    return await get_default_schedule(current_user, db_session)


@router.put("/weekly-schedule/default")
async def api_update_default_weekly_schedule(
    schedule_object: WeeklyOperatingScheduleUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> WeeklyOperatingScheduleRead:
    """
    Update the organization's default weekly operating schedule.
    """
    return await update_default_schedule(schedule_object, current_user, db_session)


@router.get("/{course_uuid}/weekly-schedule")
async def api_get_course_weekly_schedule(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> WeeklyOperatingScheduleRead:
    """
    Get the weekly operating schedule in force for a course.
    Returns the course override when one exists, otherwise the default.
    """
    return await get_course_schedule(request, course_uuid, current_user, db_session)


@router.put("/{course_uuid}/weekly-schedule")
async def api_upsert_course_weekly_schedule(
    request: Request,
    course_uuid: str,
    schedule_object: WeeklyOperatingScheduleUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> WeeklyOperatingScheduleRead:
    """
    Create or update the weekly operating schedule override for a course.
    """
    return await upsert_course_schedule(
        request, course_uuid, schedule_object, current_user, db_session
    )


@router.delete("/{course_uuid}/weekly-schedule")
async def api_delete_course_weekly_schedule(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Remove the course override so the course follows the default schedule.
    """
    return await delete_course_schedule(request, course_uuid, current_user, db_session)
