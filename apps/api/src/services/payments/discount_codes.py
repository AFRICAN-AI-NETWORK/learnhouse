"""
Discount code validation and usage tracking service.
Implements critical security measures for race condition prevention.
"""
import logging
from datetime import datetime
from typing import Tuple
from fastapi import HTTPException, Request
from sqlmodel import Session, select, and_
from src.db.payments.discount_codes import (
    DiscountCode,
    DiscountCodeUsage,
    DiscountTypeEnum,
    DiscountCodeCreate,
    DiscountCodeRead,
    DiscountCodeUpdate,
)
from src.db.organizations import Organization
from src.db.users import PublicUser
from src.services.orgs.orgs import rbac_check
from sqlalchemy import text

logger = logging.getLogger(__name__)


class DiscountValidationError(Exception):
    """Custom exception for discount code validation errors"""
    pass


def calculate_discounted_amount(
    original_amount: float,
    discount_type: DiscountTypeEnum,
    discount_value: float
) -> Tuple[float, float]:
    """
    Calculate discounted amount and discount amount.
    
    Returns:
        Tuple of (discount_amount, final_amount)
    """
    if discount_type == DiscountTypeEnum.PERCENTAGE:
        # Percentage discount (0-100)
        if discount_value < 0 or discount_value > 100:
            raise DiscountValidationError("Percentage discount must be between 0 and 100")
        discount_amount = original_amount * (discount_value / 100)
        final_amount = original_amount - discount_amount
    else:
        # Fixed amount discount
        if discount_value < 0:
            raise DiscountValidationError("Fixed discount cannot be negative")
        if discount_value > original_amount:
            # Discount can't exceed the original amount
            discount_amount = original_amount
            final_amount = 0
        else:
            discount_amount = discount_value
            final_amount = original_amount - discount_amount
    
    # Round to 2 decimal places
    discount_amount = round(discount_amount, 2)
    final_amount = round(final_amount, 2)
    
    return discount_amount, final_amount


async def validate_discount_code(
    code: str,
    org_id: int,
    user_id: int,
    course_id: int,
    original_amount: float,
    db_session: Session,
    check_usage: bool = True
) -> Tuple[DiscountCode, float, float]:
    """
    Validate a discount code and calculate discounted amounts.
    
    This function implements critical security checks:
    - Code existence and activation status
    - Expiry date validation
    - Usage limit validation (max_uses)
    - Duplicate usage prevention (user + course + code)
    
    Args:
        code: The discount code string
        org_id: Organization ID
        user_id: User ID applying the discount
        course_id: Course ID being purchased
        original_amount: Original price before discount
        db_session: Database session
        check_usage: Whether to check if user already used this code for this course
        
    Returns:
        Tuple of (DiscountCode, discount_amount, final_amount)
        
    Raises:
        DiscountValidationError: If validation fails
    """
    # Find the discount code
    statement = select(DiscountCode).where(
        and_(
            DiscountCode.code == code.upper(),
            DiscountCode.org_id == org_id,
            DiscountCode.is_active == True
        )
    )
    discount_code = db_session.exec(statement).first()
    
    if not discount_code:
        raise DiscountValidationError("Invalid or inactive discount code")
    
    # Check expiry dates
    now = datetime.utcnow()
    
    if discount_code.valid_from > now:
        raise DiscountValidationError("Discount code is not yet valid")
    
    if discount_code.valid_until and discount_code.valid_until < now:
        raise DiscountValidationError("Discount code has expired")
    
    # Check usage limits (max_uses = 0 or None means unlimited)
    if discount_code.max_uses is not None and discount_code.max_uses > 0:
        if discount_code.current_uses >= discount_code.max_uses:
            raise DiscountValidationError("Discount code has reached maximum usage limit")
    
    # Check if user already used this code for this course (prevent duplicate usage)
    if check_usage:
        existing_usage = db_session.exec(
            select(DiscountCodeUsage).where(
                and_(
                    DiscountCodeUsage.discount_code_id == discount_code.id,
                    DiscountCodeUsage.user_id == user_id,
                    DiscountCodeUsage.course_id == course_id
                )
            )
        ).first()
        
        if existing_usage:
            raise DiscountValidationError("You have already used this discount code for this course")
    
    # Calculate discounted amounts
    try:
        discount_amount, final_amount = calculate_discounted_amount(
            original_amount,
            discount_code.discount_type,
            discount_code.discount_value
        )
    except DiscountValidationError as e:
        logger.error(f"Error calculating discount: {str(e)}")
        raise
    
    return discount_code, discount_amount, final_amount


async def increment_discount_usage_atomic(
    discount_code_id: int,
    db_session: Session
) -> bool:
    """
    Atomically increment discount code usage counter.
    
    This prevents race conditions where multiple concurrent payments
    could exceed max_uses limit. Uses database-level atomic UPDATE.
    
    Returns:
        True if increment succeeded, False if max_uses would be exceeded
    """
    # Use raw SQL for atomic increment with conditional check
    # This ensures database handles concurrency, not application code
    # max_uses = NULL or 0 means unlimited
    result = db_session.exec(
        text("""
            UPDATE discountcode
            SET current_uses = current_uses + 1
            WHERE id = :discount_code_id
            AND (max_uses IS NULL OR max_uses = 0 OR current_uses < max_uses)
            RETURNING id
        """),
        {"discount_code_id": discount_code_id}
    )
    
    # If a row was returned, the update succeeded
    updated = result.fetchone() is not None
    
    if updated:
        db_session.commit()
    
    return updated


async def record_discount_usage(
    discount_code_id: int,
    user_id: int,
    course_id: int,
    payment_user_id: int,
    original_amount: float,
    discount_amount: float,
    final_amount: float,
    db_session: Session
) -> DiscountCodeUsage:
    """
    Record a discount code usage after successful payment.
    
    This should be called from the webhook handler after payment confirmation.
    Implements idempotency check to prevent duplicate records from webhook retries.
    
    Args:
        discount_code_id: Discount code ID
        user_id: User ID
        course_id: Course ID
        payment_user_id: Payment user ID
        original_amount: Original price
        discount_amount: Discount applied
        final_amount: Final price paid
        db_session: Database session
        
    Returns:
        DiscountCodeUsage record
    """
    # Idempotency check: has this usage already been recorded?
    existing = db_session.exec(
        select(DiscountCodeUsage).where(
            DiscountCodeUsage.payment_user_id == payment_user_id
        )
    ).first()
    
    if existing:
        logger.info(f"Discount usage already recorded for payment_user_id={payment_user_id}")
        return existing
    
    # Create usage record
    usage = DiscountCodeUsage(
        discount_code_id=discount_code_id,
        user_id=user_id,
        course_id=course_id,
        payment_user_id=payment_user_id,
        original_amount=original_amount,
        discount_amount=discount_amount,
        final_amount=final_amount
    )
    
    db_session.add(usage)
    db_session.commit()
    db_session.refresh(usage)
    
    logger.info(f"Recorded discount usage: code_id={discount_code_id}, user_id={user_id}, course_id={course_id}")
    
    return usage


async def decrement_discount_usage(
    discount_code_id: int,
    payment_user_id: int,
    db_session: Session
) -> bool:
    """
    Decrement discount code usage counter (e.g., for refunds).
    
    Also removes the usage record.
    
    Returns:
        True if decrement succeeded
    """
    # Find and delete the usage record
    usage = db_session.exec(
        select(DiscountCodeUsage).where(
            DiscountCodeUsage.payment_user_id == payment_user_id
        )
    ).first()
    
    if not usage:
        logger.warning(f"No usage record found for payment_user_id={payment_user_id}")
        return False
    
    # Atomically decrement counter
    result = db_session.exec(
        text("""
            UPDATE discountcode
            SET current_uses = GREATEST(0, current_uses - 1)
            WHERE id = :discount_code_id
            RETURNING id
        """),
        {"discount_code_id": discount_code_id}
    )
    
    updated = result.fetchone() is not None
    
    if updated:
        db_session.delete(usage)
        db_session.commit()
        logger.info(f"Decremented discount usage: code_id={discount_code_id}, payment_user_id={payment_user_id}")
    
    return updated


# Admin functions for managing discount codes

async def create_discount_code(
    request: Request,
    org_id: int,
    discount_data: DiscountCodeCreate,
    current_user: PublicUser,
    db_session: Session
) -> DiscountCode:
    """
    Create a new discount code (admin only).
    
    Requires RBAC permission: "create" on organization
    """
    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # RBAC check - only org admins can create discount codes
    await rbac_check(request, org.org_uuid, current_user, "create", db_session)
    
    # Validate discount value
    if discount_data.discount_type == DiscountTypeEnum.PERCENTAGE:
        if discount_data.discount_value < 0 or discount_data.discount_value > 100:
            raise HTTPException(status_code=400, detail="Percentage discount must be between 0 and 100")
    elif discount_data.discount_value < 0:
        raise HTTPException(status_code=400, detail="Fixed discount cannot be negative")
    
    # Normalize datetimes to timezone-naive UTC (consistent with database storage)
    valid_from_naive = discount_data.valid_from.replace(tzinfo=None) if discount_data.valid_from.tzinfo else discount_data.valid_from
    valid_until_naive = None
    if discount_data.valid_until:
        valid_until_naive = discount_data.valid_until.replace(tzinfo=None) if discount_data.valid_until.tzinfo else discount_data.valid_until
    
    # Validate dates
    if valid_until_naive and valid_until_naive < valid_from_naive:
        raise HTTPException(status_code=400, detail="Valid until date must be after valid from date")
    
    # Check if code already exists for this org
    existing = db_session.exec(
        select(DiscountCode).where(
            and_(
                DiscountCode.code == discount_data.code.upper(),
                DiscountCode.org_id == org_id
            )
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Discount code already exists for this organization")
    
    # Create discount code with timezone-naive datetimes
    discount_code = DiscountCode(
        org_id=org_id,
        code=discount_data.code.upper(),
        discount_type=discount_data.discount_type,
        discount_value=discount_data.discount_value,
        max_uses=discount_data.max_uses,
        valid_from=valid_from_naive,
        valid_until=valid_until_naive,
        description=discount_data.description
    )
    
    db_session.add(discount_code)
    db_session.commit()
    db_session.refresh(discount_code)
    
    logger.info(f"Created discount code: {discount_code.code} for org_id={org_id}")
    
    return discount_code


async def list_discount_codes(
    request: Request,
    org_id: int,
    current_user: PublicUser,
    db_session: Session,
    include_inactive: bool = False
) -> list[DiscountCodeRead]:
    """
    List all discount codes for an organization (admin only).
    """
    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "read", db_session)
    
    # Query discount codes
    query = select(DiscountCode).where(DiscountCode.org_id == org_id)
    
    if not include_inactive:
        query = query.where(DiscountCode.is_active == True)
    
    discount_codes = db_session.exec(query).all()
    
    return [DiscountCodeRead.model_validate(code) for code in discount_codes]


async def get_discount_code(
    request: Request,
    org_id: int,
    code_id: int,
    current_user: PublicUser,
    db_session: Session
) -> DiscountCode:
    """
    Get a specific discount code (admin only).
    """
    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "read", db_session)
    
    # Get discount code
    discount_code = db_session.exec(
        select(DiscountCode).where(
            and_(
                DiscountCode.id == code_id,
                DiscountCode.org_id == org_id
            )
        )
    ).first()
    
    if not discount_code:
        raise HTTPException(status_code=404, detail="Discount code not found")
    
    return discount_code


async def update_discount_code(
    request: Request,
    org_id: int,
    code_id: int,
    discount_update: DiscountCodeUpdate,
    current_user: PublicUser,
    db_session: Session
) -> DiscountCode:
    """
    Update a discount code (admin only).
    """
    # Get the discount code (includes RBAC check)
    discount_code = await get_discount_code(request, org_id, code_id, current_user, db_session)
    
    # Update fields
    if discount_update.discount_value is not None:
        if discount_code.discount_type == DiscountTypeEnum.PERCENTAGE:
            if discount_update.discount_value < 0 or discount_update.discount_value > 100:
                raise HTTPException(status_code=400, detail="Percentage discount must be between 0 and 100")
        elif discount_update.discount_value < 0:
            raise HTTPException(status_code=400, detail="Fixed discount cannot be negative")
        discount_code.discount_value = discount_update.discount_value
    
    if discount_update.max_uses is not None:
        discount_code.max_uses = discount_update.max_uses
    
    if discount_update.valid_until is not None:
        # Normalize both datetimes to timezone-naive UTC for comparison
        valid_until_naive = discount_update.valid_until.replace(tzinfo=None) if discount_update.valid_until.tzinfo else discount_update.valid_until
        valid_from_naive = discount_code.valid_from.replace(tzinfo=None) if discount_code.valid_from.tzinfo else discount_code.valid_from
        
        if valid_until_naive < valid_from_naive:
            raise HTTPException(status_code=400, detail="Valid until date must be after valid from date")
        
        # Store as timezone-naive (consistent with database)
        discount_code.valid_until = valid_until_naive
    
    if discount_update.is_active is not None:
        discount_code.is_active = discount_update.is_active
    
    if discount_update.description is not None:
        discount_code.description = discount_update.description
    
    discount_code.updated_at = datetime.utcnow()
    
    db_session.add(discount_code)
    db_session.commit()
    db_session.refresh(discount_code)
    
    logger.info(f"Updated discount code: id={code_id}, org_id={org_id}")
    
    return discount_code


async def deactivate_discount_code(
    request: Request,
    org_id: int,
    code_id: int,
    current_user: PublicUser,
    db_session: Session
) -> DiscountCode:
    """
    Deactivate a discount code (admin only).
    """
    discount_code = await get_discount_code(request, org_id, code_id, current_user, db_session)
    
    discount_code.is_active = False
    discount_code.updated_at = datetime.utcnow()
    
    db_session.add(discount_code)
    db_session.commit()
    db_session.refresh(discount_code)
    
    logger.info(f"Deactivated discount code: id={code_id}, org_id={org_id}")
    
    return discount_code


async def get_discount_code_analytics(
    request: Request,
    org_id: int,
    code_id: int,
    current_user: PublicUser,
    db_session: Session
) -> dict:
    """
    Get analytics for a discount code (admin only).
    
    Returns usage statistics, revenue impact, and student enrollment data.
    """
    # Get the discount code (includes RBAC check)
    discount_code = await get_discount_code(request, org_id, code_id, current_user, db_session)
    
    # Get all usage records
    usages = db_session.exec(
        select(DiscountCodeUsage).where(
            DiscountCodeUsage.discount_code_id == code_id
        )
    ).all()
    
    # Calculate statistics
    total_uses = len(usages)
    total_revenue = sum(usage.final_amount for usage in usages)
    total_discount_given = sum(usage.discount_amount for usage in usages)
    original_revenue = sum(usage.original_amount for usage in usages)
    
    # Calculate usage percentage (max_uses = 0 or None means unlimited)
    usage_percentage = None
    if discount_code.max_uses and discount_code.max_uses > 0:
        usage_percentage = (discount_code.current_uses / discount_code.max_uses) * 100
    
    # Get unique students
    unique_students = len(set(usage.user_id for usage in usages))
    
    # Get unique courses
    unique_courses = len(set(usage.course_id for usage in usages))
    
    return {
        "code": discount_code.code,
        "discount_type": discount_code.discount_type,
        "discount_value": discount_code.discount_value,
        "max_uses": discount_code.max_uses if discount_code.max_uses and discount_code.max_uses > 0 else "unlimited",
        "current_uses": discount_code.current_uses,
        "usage_percentage": round(usage_percentage, 2) if usage_percentage is not None else "N/A (unlimited)",
        "is_active": discount_code.is_active,
        "valid_from": discount_code.valid_from,
        "valid_until": discount_code.valid_until,
        "total_uses": total_uses,
        "unique_students": unique_students,
        "unique_courses": unique_courses,
        "total_revenue": round(total_revenue, 2),
        "total_discount_given": round(total_discount_given, 2),
        "original_revenue": round(original_revenue, 2),
        "revenue_impact_percentage": round((total_discount_given / original_revenue * 100) if original_revenue > 0 else 0, 2)
    }
