"""
API Endpoints for Email Domain Management (Admin only)
Allows manual triggering of domain list updates
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.organizations import Organization
from src.db.users import User
from src.security.auth import get_current_user
from src.services.orgs.orgs import rbac_check
from src.services.referrals.fraud_prevention import (
    seed_initial_domain_lists,
    update_disposable_email_list,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{org_id}/update-domain-lists")
async def trigger_domain_list_update(
    org_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Manually trigger email domain list update from external source
    Requires admin permissions

    Returns update statistics
    """
    # Get organization to get UUID
    org = db_session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check admin permissions
    await rbac_check(request, org.org_uuid, current_user, "update", db_session)

    try:
        stats = await update_disposable_email_list(db_session)

        if not stats["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Domain list update failed: {stats.get('error', 'Unknown error')}",
            )

        return {
            "success": True,
            "message": "Email domain lists updated successfully",
            "statistics": {
                "added": stats["added"],
                "deactivated": stats["deactivated"],
                "total": stats["total"],
                "source": stats["source"],
            },
        }
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to update domain lists: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update email domain lists",
        )


@router.post("/{org_id}/seed-domain-lists")
async def trigger_domain_list_seed(
    org_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Manually trigger initial seeding of domain lists
    Use only once during setup
    Requires admin permissions
    """
    # Get organization to get UUID
    org = db_session.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check admin permissions
    await rbac_check(request, org.org_uuid, current_user, "update", db_session)

    try:
        await seed_initial_domain_lists(db_session)

        return {"success": True, "message": "Email domain lists seeded successfully"}
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to seed domain lists: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to seed email domain lists",
        )
