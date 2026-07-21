"""Waitlist Configuration CRUD Service"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4
from fastapi import HTTPException, Request, status
from sqlmodel import Session, select

from src.db.waitlist import (
    WaitlistConfig,
    WaitlistConfigCreate,
    WaitlistConfigUpdate,
    WaitlistConfigRead,
    WaitlistStatusEnum,
)
from src.db.organizations import Organization
from src.db.cohorts import CohortCreate
from src.services.cohorts.cohorts import create_cohort


async def create_waitlist_config(
    request: Request,
    db_session: Session,
    config_data: WaitlistConfigCreate,
) -> WaitlistConfigRead:
    """
    Create a new waitlist campaign configuration.
    Admin-only function.

    Args:
        request: FastAPI request object
        db_session: Database session
        config_data: Waitlist configuration data

    Returns:
        WaitlistConfigRead: Created waitlist configuration

    Raises:
        HTTPException: Validation errors
    """

    # Verify organization exists
    org_query = select(Organization).where(Organization.id == config_data.org_id)
    org = db_session.exec(org_query).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    # Validate launch datetime is in the future
    try:
        launch_dt = datetime.fromisoformat(
            config_data.launch_datetime.replace("Z", "+00:00")
        )
        if launch_dt <= datetime.now(launch_dt.tzinfo):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Launch datetime must be in the future",
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid datetime format. Use ISO 8601 format.",
        )

    # Create waitlist config
    waitlist = WaitlistConfig(
        waitlist_uuid=f"waitlist_{uuid4()}",
        org_id=config_data.org_id,
        name=config_data.name,
        description=config_data.description,
        interest_category=config_data.interest_category,
        launch_datetime=config_data.launch_datetime,
        batch_size=config_data.batch_size or 50,
        batch_delay_seconds=config_data.batch_delay_seconds or 2,
        status=WaitlistStatusEnum.ACTIVE.value,
        total_registrations=0,
        emails_sent_count=0,
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )

    # Get created_by_user_id from request state if available
    if hasattr(request.state, "user") and hasattr(request.state.user, "id"):
        waitlist.created_by_user_id = request.state.user.id

    db_session.add(waitlist)
    db_session.commit()
    db_session.refresh(waitlist)

    # Auto-create the upcoming cohort linked to this waitlist launch date
    try:
        cohort_data = CohortCreate(
            org_id=waitlist.org_id,
            name=f"{waitlist.name} Cohort",
            cohort_number=0,  # Will be auto-incremented by the service
            start_date=waitlist.launch_datetime,
            status="upcoming",
        )
        await create_cohort(cohort_data, db_session)
    except Exception as e:
        # We don't fail the waitlist creation if cohort creation fails,
        # but we should log it (using standard fastAPI logging).
        print(f"Failed to auto-create cohort for waitlist: {e}")

    return WaitlistConfigRead.model_validate(waitlist)


async def get_waitlist_config(
    request: Request,
    db_session: Session,
    waitlist_uuid: str,
) -> WaitlistConfigRead:
    """
    Retrieve a specific waitlist configuration by UUID.

    Args:
        request: FastAPI request object
        db_session: Database session
        waitlist_uuid: Unique identifier of the waitlist (UUID string)

    Returns:
        WaitlistConfigRead: Waitlist configuration

    Raises:
        HTTPException: If waitlist not found
    """

    query = select(WaitlistConfig).where(WaitlistConfig.waitlist_uuid == waitlist_uuid)
    waitlist = db_session.exec(query).first()

    if not waitlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist not found"
        )

    return WaitlistConfigRead.model_validate(waitlist)


async def get_org_waitlist_configs(
    request: Request,
    db_session: Session,
    org_id: int,
    status_filter: Optional[str] = None,
) -> List[WaitlistConfigRead]:
    """
    Get all waitlist configurations for an organization.

    Args:
        request: FastAPI request object
        db_session: Database session
        org_id: Organization ID
        status_filter: Optional status filter (ACTIVE, COMPLETED, CANCELLED, SCHEDULED)

    Returns:
        List[WaitlistConfigRead]: List of waitlist configurations
    """

    # Build query
    query = select(WaitlistConfig).where(WaitlistConfig.org_id == org_id)

    if status_filter:
        query = query.where(WaitlistConfig.status == status_filter)

    query = query.order_by(WaitlistConfig.creation_date.desc())

    waitlists = db_session.exec(query).all()

    return [WaitlistConfigRead.model_validate(w) for w in waitlists]


async def update_waitlist_config(
    request: Request,
    db_session: Session,
    waitlist_uuid: str,
    update_data: WaitlistConfigUpdate,
) -> WaitlistConfigRead:
    """
    Update a waitlist configuration.
    Admin-only function.

    Args:
        request: FastAPI request object
        db_session: Database session
        waitlist_uuid: Unique identifier of the waitlist
        update_data: Updated configuration data

    Returns:
        WaitlistConfigRead: Updated waitlist configuration

    Raises:
        HTTPException: Validation errors
    """

    # Get existing waitlist
    query = select(WaitlistConfig).where(WaitlistConfig.waitlist_uuid == waitlist_uuid)
    waitlist = db_session.exec(query).first()

    if not waitlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist not found"
        )

    # Validate launch datetime if being updated
    if update_data.launch_datetime:
        try:
            launch_dt = datetime.fromisoformat(
                update_data.launch_datetime.replace("Z", "+00:00")
            )
            if launch_dt <= datetime.now(launch_dt.tzinfo):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Launch datetime must be in the future",
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid datetime format. Use ISO 8601 format.",
            )

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(waitlist, key, value)

    # Auto-reactivate if launch_datetime is updated to the future and status is COMPLETED
    if (
        update_data.launch_datetime
        and waitlist.status == WaitlistStatusEnum.COMPLETED.value
    ):
        # We already validated launch_datetime is in the future above
        waitlist.status = WaitlistStatusEnum.ACTIVE.value
        # Reset counters if we want a fresh start, or keep them?
        # User said "allow reactivation... will not affect the users who have already gained access"
        # Keeping counters is fine as they represent historical registrations.

    waitlist.update_date = str(datetime.now())

    db_session.add(waitlist)
    db_session.commit()
    db_session.refresh(waitlist)

    return WaitlistConfigRead.model_validate(waitlist)


async def cancel_waitlist_config(
    request: Request,
    db_session: Session,
    waitlist_uuid: str,
) -> WaitlistConfigRead:
    """
    Cancel a waitlist configuration (soft delete).
    Changes status to CANCELLED instead of deleting the record.

    Args:
        request: FastAPI request object
        db_session: Database session
        waitlist_uuid: Unique identifier of the waitlist

    Returns:
        WaitlistConfigRead: Cancelled waitlist configuration

    Raises:
        HTTPException: If waitlist not found
    """

    # Get existing waitlist
    query = select(WaitlistConfig).where(WaitlistConfig.waitlist_uuid == waitlist_uuid)
    waitlist = db_session.exec(query).first()

    if not waitlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist not found"
        )

    # Change status to CANCELLED
    waitlist.status = WaitlistStatusEnum.CANCELLED.value
    waitlist.update_date = str(datetime.now())

    db_session.add(waitlist)
    db_session.commit()
    db_session.refresh(waitlist)

    return WaitlistConfigRead.model_validate(waitlist)


async def delete_waitlist_config(
    request: Request,
    db_session: Session,
    waitlist_uuid: str,
) -> dict:
    """
    Permanently delete a waitlist configuration.
    Use with caution - prefer cancel_waitlist_config for soft delete.

    Args:
        request: FastAPI request object
        db_session: Database session
        waitlist_uuid: Unique identifier of the waitlist

    Returns:
        dict: Success message

    Raises:
        HTTPException: If waitlist not found
    """

    # Get existing waitlist
    query = select(WaitlistConfig).where(WaitlistConfig.waitlist_uuid == waitlist_uuid)
    waitlist = db_session.exec(query).first()

    if not waitlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist not found"
        )

    # Delete from database
    db_session.delete(waitlist)
    db_session.commit()

    return {"message": "Waitlist deleted successfully"}
