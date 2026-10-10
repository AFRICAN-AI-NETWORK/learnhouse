from fastapi import APIRouter, Depends
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.academic_calendar import (
    AcademicCohortCreate,
    AcademicCohortRead,
    AcademicCohortUpdate,
    AcademicYearCreate,
    AcademicYearRead,
    AcademicYearUpdate,
)
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.academic_calendar import (
    create_academic_cohort,
    create_academic_year,
    delete_academic_cohort,
    delete_academic_year,
    get_active_academic_year,
    list_academic_cohorts,
    list_academic_years,
    update_academic_cohort,
    update_academic_year,
)

years_router = APIRouter()
cohorts_router = APIRouter()


@years_router.post("/")
async def api_create_academic_year(
    year_object: AcademicYearCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> AcademicYearRead:
    """
    Create an academic year.
    """
    return await create_academic_year(year_object, current_user, db_session)


@years_router.get("/")
async def api_list_academic_years(
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[AcademicYearRead]:
    """
    List academic years, most recent first.
    """
    return await list_academic_years(current_user, db_session)


@years_router.get("/active")
async def api_get_active_academic_year(
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> AcademicYearRead:
    """
    Get the latest active academic year, or the latest year when none is active.
    """
    return await get_active_academic_year(current_user, db_session)


@years_router.put("/{academic_year_uuid}")
async def api_update_academic_year(
    academic_year_uuid: str,
    year_object: AcademicYearUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> AcademicYearRead:
    """
    Update an academic year.
    """
    return await update_academic_year(
        academic_year_uuid, year_object, current_user, db_session
    )


@years_router.delete("/{academic_year_uuid}")
async def api_delete_academic_year(
    academic_year_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Delete an academic year that has no cohorts.
    """
    return await delete_academic_year(academic_year_uuid, current_user, db_session)


@cohorts_router.post("/")
async def api_create_academic_cohort(
    cohort_object: AcademicCohortCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> AcademicCohortRead:
    """
    Create an academic cohort inside an academic year.
    """
    return await create_academic_cohort(cohort_object, current_user, db_session)


@cohorts_router.get("/year/{academic_year_uuid}")
async def api_list_academic_cohorts(
    academic_year_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[AcademicCohortRead]:
    """
    List the cohorts of an academic year in start-date order.
    """
    return await list_academic_cohorts(academic_year_uuid, current_user, db_session)


@cohorts_router.put("/{academic_cohort_uuid}")
async def api_update_academic_cohort(
    academic_cohort_uuid: str,
    cohort_object: AcademicCohortUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> AcademicCohortRead:
    """
    Update an academic cohort.
    """
    return await update_academic_cohort(
        academic_cohort_uuid, cohort_object, current_user, db_session
    )


@cohorts_router.delete("/{academic_cohort_uuid}")
async def api_delete_academic_cohort(
    academic_cohort_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Delete an academic cohort that no course runs under.
    """
    return await delete_academic_cohort(academic_cohort_uuid, current_user, db_session)
