"""
API Endpoints for Email Domain Management (Admin only)
Allows manual triggering of domain list updates
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from src.db.db import get_session
from src.security.rbac.rbac import rbac_check
from src.security.auth import get_current_user
from src.db.users import User
from src.services.referrals.fraud_prevention import (
    update_disposable_email_list,
    seed_initial_domain_lists,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{org_id}/update-domain-lists")
async def trigger_domain_list_update(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db_session: Session = Depends(get_session)
):
    """
    Manually trigger email domain list update from external source
    Requires admin permissions
    
    Returns update statistics
    """
    # Check admin permissions (adjust role as needed)
    await rbac_check(None, org_id, current_user, db_session)
    
    try:
        stats = await update_disposable_email_list(db_session)
        
        if not stats["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Domain list update failed: {stats.get('error', 'Unknown error')}"
            )
        
        return {
            "success": True,
            "message": "Email domain lists updated successfully",
            "statistics": {
                "added": stats["added"],
                "deactivated": stats["deactivated"],
                "total": stats["total"],
                "source": stats["source"]
            }
        }
    except Exception as e:
        logger.error(f"Failed to update domain lists: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update email domain lists"
        )


@router.post("/{org_id}/seed-domain-lists")
async def trigger_domain_list_seed(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db_session: Session = Depends(get_session)
):
    """
    Manually trigger initial seeding of domain lists
    Use only once during setup
    Requires admin permissions
    """
    # Check admin permissions
    await rbac_check(None, org_id, current_user, db_session)
    
    try:
        await seed_initial_domain_lists(db_session)
        
        return {
            "success": True,
            "message": "Email domain lists seeded successfully"
        }
    except Exception as e:
        logger.error(f"Failed to seed domain lists: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to seed email domain lists"
        )
