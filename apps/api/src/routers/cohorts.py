from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from src.core.events.database import get_db_session
from src.db.users import InternalUser, UserSession
from src.security.auth_security import get_current_user_session
from src.services.cohorts.cohorts import (
    create_cohort,
    get_org_cohorts,
    get_current_cohort,
    unlock_cohort
)
from src.db.cohorts import CohortCreate, CohortRead, Cohort

router = APIRouter()

@router.post("/", response_model=CohortRead)
async def api_create_cohort(
    cohort_data: CohortCreate,
    db_session: Session = Depends(get_db_session),
    user_session: UserSession = Depends(get_current_user_session)
):
    # TODO: Add proper admin RBAC check here
    return await create_cohort(cohort_data, db_session)


@router.get("/org/{org_id}", response_model=list[CohortRead])
async def api_get_org_cohorts(
    org_id: int,
    db_session: Session = Depends(get_db_session),
    user_session: UserSession = Depends(get_current_user_session)
):
    return await get_org_cohorts(org_id, db_session)


@router.get("/org/{org_id}/current", response_model=CohortRead)
async def api_get_current_cohort(
    org_id: int,
    db_session: Session = Depends(get_db_session),
    user_session: UserSession = Depends(get_current_user_session)
):
    cohort = await get_current_cohort(org_id, db_session)
    if not cohort:
        raise HTTPException(status_code=404, detail="No active or upcoming cohort found")
    return cohort


@router.post("/{cohort_id}/unlock", response_model=CohortRead)
async def api_unlock_cohort(
    cohort_id: int,
    db_session: Session = Depends(get_db_session),
    user_session: UserSession = Depends(get_current_user_session)
):
    # TODO: Add proper admin RBAC check here
    return await unlock_cohort(cohort_id, db_session)
