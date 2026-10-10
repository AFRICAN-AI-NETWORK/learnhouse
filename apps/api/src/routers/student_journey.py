from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.student_journey import (
    MilestoneProgressUpdate,
    StudentJourneyMilestoneCreate,
    StudentJourneyMilestoneRead,
    StudentJourneyMilestoneUpdate,
    StudentMilestoneStatus,
)
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.student_journey import (
    create_milestone,
    delete_milestone,
    get_learner_journey,
    get_my_journey,
    list_course_milestones,
    seed_course_journey,
    set_milestone_progress,
    update_milestone,
)

router = APIRouter()


@router.post("/course/{course_uuid}/seed")
async def api_seed_course_journey(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[StudentJourneyMilestoneRead]:
    """
    Create the default journey for a course. Does nothing if milestones exist.
    """
    return await seed_course_journey(request, course_uuid, current_user, db_session)


@router.get("/course/{course_uuid}/milestones")
async def api_list_course_milestones(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[StudentJourneyMilestoneRead]:
    """
    List a course's milestones in journey order.
    """
    return await list_course_milestones(request, course_uuid, current_user, db_session)


@router.post("/course/{course_uuid}/milestones")
async def api_create_milestone(
    request: Request,
    course_uuid: str,
    milestone_object: StudentJourneyMilestoneCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> StudentJourneyMilestoneRead:
    """
    Add a milestone to a course's journey.
    """
    return await create_milestone(
        request, course_uuid, milestone_object, current_user, db_session
    )


@router.get("/course/{course_uuid}/me")
async def api_get_my_journey(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[StudentMilestoneStatus]:
    """
    Get the current user's standing on each milestone of a course.
    """
    return await get_my_journey(request, course_uuid, current_user, db_session)


@router.get("/course/{course_uuid}/learners/{user_id}")
async def api_get_learner_journey(
    request: Request,
    course_uuid: str,
    user_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[StudentMilestoneStatus]:
    """
    Get one learner's standing on each milestone of a course (staff view).
    """
    return await get_learner_journey(
        request, course_uuid, user_id, current_user, db_session
    )


@router.put("/milestones/{milestone_uuid}")
async def api_update_milestone(
    request: Request,
    milestone_uuid: str,
    milestone_object: StudentJourneyMilestoneUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> StudentJourneyMilestoneRead:
    """
    Update a milestone.
    """
    return await update_milestone(
        request, milestone_uuid, milestone_object, current_user, db_session
    )


@router.delete("/milestones/{milestone_uuid}")
async def api_delete_milestone(
    request: Request,
    milestone_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Delete a milestone together with learners' progress on it.
    """
    return await delete_milestone(request, milestone_uuid, current_user, db_session)


@router.put("/milestones/{milestone_uuid}/progress/{user_id}")
async def api_set_milestone_progress(
    request: Request,
    milestone_uuid: str,
    user_id: int,
    progress_object: MilestoneProgressUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[StudentMilestoneStatus]:
    """
    Override a learner's standing on a milestone, or clear the override.
    """
    return await set_milestone_progress(
        request, milestone_uuid, user_id, progress_object, current_user, db_session
    )
