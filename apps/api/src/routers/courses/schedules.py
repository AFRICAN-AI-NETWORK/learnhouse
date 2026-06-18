from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.courses.schedules import (
    CourseRegisterEntryRead,
    CourseRegisterEntryUpdate,
    CourseRegisterPolicyRead,
    CourseRegisterPolicyUpdate,
    CourseRegisterSummaryRead,
    CourseTimetableEventCreate,
    CourseTimetableEventRead,
    CourseTimetableEventUpdate,
    RegisterEntryStatusEnum,
    StudentTimetableEventRead,
)
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.courses.schedules import (
    create_timetable_event,
    delete_timetable_event,
    get_register_entries,
    get_register_policy,
    get_register_summary,
    get_my_timetable_events,
    get_timetable_events,
    mark_register,
    update_register_entry,
    update_register_policy,
    update_timetable_event,
)

router = APIRouter()


@router.get("/timetable/me")
async def api_get_my_timetable(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[StudentTimetableEventRead]:
    """
    Get published timetable events for the current user across courses in an org.
    """
    return await get_my_timetable_events(request, org_id, current_user, db_session)


@router.get("/{course_uuid}/timetable")
async def api_get_course_timetable(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[CourseTimetableEventRead]:
    """
    Get timetable events for a course.
    Course owners receive draft and published events; students receive published events.
    """
    return await get_timetable_events(request, course_uuid, current_user, db_session)


@router.post("/{course_uuid}/timetable")
async def api_create_course_timetable_event(
    request: Request,
    course_uuid: str,
    event_object: CourseTimetableEventCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CourseTimetableEventRead:
    """
    Create a timetable event for a course.
    """
    return await create_timetable_event(
        request, course_uuid, event_object, current_user, db_session
    )


@router.put("/{course_uuid}/timetable/{event_uuid}")
async def api_update_course_timetable_event(
    request: Request,
    course_uuid: str,
    event_uuid: str,
    event_object: CourseTimetableEventUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CourseTimetableEventRead:
    """
    Update a timetable event for a course.
    """
    return await update_timetable_event(
        request, course_uuid, event_uuid, event_object, current_user, db_session
    )


@router.delete("/{course_uuid}/timetable/{event_uuid}")
async def api_delete_course_timetable_event(
    request: Request,
    course_uuid: str,
    event_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Delete a timetable event for a course.
    """
    return await delete_timetable_event(
        request, course_uuid, event_uuid, current_user, db_session
    )


@router.get("/{course_uuid}/register/policy")
async def api_get_course_register_policy(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CourseRegisterPolicyRead:
    """
    Get the register policy for a course. A default policy is created if absent.
    """
    return await get_register_policy(request, course_uuid, current_user, db_session)


@router.put("/{course_uuid}/register/policy")
async def api_update_course_register_policy(
    request: Request,
    course_uuid: str,
    policy_object: CourseRegisterPolicyUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CourseRegisterPolicyRead:
    """
    Update the register policy for a course.
    """
    return await update_register_policy(
        request, course_uuid, policy_object, current_user, db_session
    )


@router.get("/{course_uuid}/register/summary")
async def api_get_course_register_summary(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CourseRegisterSummaryRead:
    """
    Get the current user's register summary for a course.
    """
    return await get_register_summary(request, course_uuid, current_user, db_session)


@router.post("/{course_uuid}/register/mark")
async def api_mark_course_register(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CourseRegisterEntryRead:
    """
    Mark the current user's register for the active period/session.
    """
    return await mark_register(request, course_uuid, current_user, db_session)


@router.get("/{course_uuid}/register/entries")
async def api_get_course_register_entries(
    request: Request,
    course_uuid: str,
    user_id: Optional[int] = None,
    status: Optional[RegisterEntryStatusEnum] = None,
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[CourseRegisterEntryRead]:
    """
    Get register entries for instructor reporting.
    """
    return await get_register_entries(
        request,
        course_uuid,
        current_user,
        db_session,
        user_id=user_id,
        status_filter=status,
        period_start=period_start,
        period_end=period_end,
    )


@router.put("/{course_uuid}/register/entries/{entry_uuid}")
async def api_update_course_register_entry(
    request: Request,
    course_uuid: str,
    entry_uuid: str,
    entry_object: CourseRegisterEntryUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CourseRegisterEntryRead:
    """
    Override a register entry as an instructor/course owner.
    """
    return await update_register_entry(
        request, course_uuid, entry_uuid, entry_object, current_user, db_session
    )
