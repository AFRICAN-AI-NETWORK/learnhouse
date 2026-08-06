"""
Discount code validation and usage tracking service.
Implements critical security measures for race condition prevention.
"""

import logging
from datetime import UTC, datetime
from typing import Literal

from fastapi import HTTPException, Request, status
from sqlalchemy import text
from sqlmodel import Session, and_, select

from src.db.organizations import Organization
from src.db.payments.discount_codes import (
    DiscountCode,
    DiscountCodeCreate,
    DiscountCodeRead,
    DiscountCodeUpdate,
    DiscountCodeUsage,
    DiscountTypeEnum,
)
from src.db.users import PublicUser
from src.services.orgs.orgs import rbac_check

logger = logging.getLogger(__name__)


class DiscountValidationError(Exception):
    """Custom exception for discount code validation errors"""



def calculate_discounted_amount(
    original_amount: float, discount_type: DiscountTypeEnum, discount_value: float
) -> tuple[float, float]:
    """
    Calculate discounted amount and discount amount.
    Ensures discounted amount matches calculation exactly.
    Example: 20% off $500 = $400 (discount=$100, final=$400)

    Returns:
        Tuple of (discount_amount, final_amount)
    """
    if discount_type == DiscountTypeEnum.PERCENTAGE:
        # Percentage discount (0-100)
        if discount_value < 0 or discount_value > 100:
            raise DiscountValidationError(
                "Percentage discount must be between 0 and 100"
            )
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
    course_id: int | None = None,
    product_id: int | None = None,
    original_amount: float = 0.0,
    db_session: Session = None,
    check_usage: bool = True,
) -> tuple[DiscountCode, float, float]:
    """
    Validate a discount code and calculate discounted amounts.

    This function implements critical security checks:
    - Code existence and activation status
    - Expiry date validation
    - Usage limit validation (max_uses)
    - Duplicate usage prevention (user + course + code)
    - Course-only restriction (discount codes only work for courses)

    Args:
        code: The discount code string
        org_id: Organization ID
        user_id: User ID applying the discount
        course_id: Course ID being purchased (REQUIRED - discount codes only work for courses)
        original_amount: Original price before discount
        db_session: Database session
        check_usage: Whether to check if user already used this code for this course

    Returns:
        Tuple of (DiscountCode, discount_amount, final_amount)

    Raises:
        DiscountValidationError: If validation fails
    """
    # Discount codes only work for course or product purchases
    if not course_id and not product_id:
        raise DiscountValidationError(
            "Discount codes can only be applied to course or product purchases. "
            "This item is not eligible for discount codes."
        )

    # Ensure this is a paid product/course
    if original_amount <= 0:
        raise DiscountValidationError(
            "Discount codes can only be applied to paid courses."
        )

    # Find the discount code
    statement = select(DiscountCode).where(
        and_(
            DiscountCode.code == code.upper(),
            DiscountCode.org_id == org_id,
            DiscountCode.is_active == True,
        )
    )
    discount_code = db_session.exec(statement).first()

    if not discount_code:
        raise DiscountValidationError("Invalid or inactive discount code")

    # Check expiry dates - code with valid_until in past must be rejected
    now = datetime.now(UTC)

    valid_from_aware = discount_code.valid_from.replace(tzinfo=UTC) if discount_code.valid_from else None
    if valid_from_aware and valid_from_aware > now:
        raise DiscountValidationError(
            f"Discount code is not yet valid. Valid from: {valid_from_aware.strftime('%Y-%m-%d %H:%M:%S UTC')}"
        )

    if discount_code.valid_until:
        valid_until_aware = discount_code.valid_until.replace(tzinfo=UTC)
        if valid_until_aware < now:
            raise DiscountValidationError(
                f"Discount code has expired on {valid_until_aware.strftime('%Y-%m-%d %H:%M:%S UTC')}"
            )

    # Course-Specific Restriction Enforcement
    if discount_code.course_id and discount_code.course_id != course_id:
        raise DiscountValidationError(
            f"Discount code '{discount_code.code}' is not valid for this course."
        )

    # Product-Specific Restriction Enforcement
    if discount_code.product_id and discount_code.product_id != product_id:
        raise DiscountValidationError(
            f"Discount code '{discount_code.code}' is not valid for this package."
        )

    # Max Uses Enforcement
    # Code with 100 max_uses stops at 100 (not 101)
    # Check usage limits (max_uses = 0 or None means unlimited)
    if discount_code.max_uses is not None and discount_code.max_uses > 0:
        if discount_code.current_uses >= discount_code.max_uses:
            raise DiscountValidationError(
                f"Discount code has reached maximum usage limit ({discount_code.current_uses}/{discount_code.max_uses})"
            )

    # Duplicate Usage Prevention
    # User cannot use same code twice for same course
    # Check if user already used this code for this course (prevent duplicate usage)
    if check_usage:
        existing_usage = db_session.exec(
            select(DiscountCodeUsage).where(
                and_(
                    DiscountCodeUsage.discount_code_id == discount_code.id,
                    DiscountCodeUsage.user_id == user_id,
                    DiscountCodeUsage.course_id == course_id,
                    DiscountCodeUsage.product_id == product_id,
                )
            )
        ).first()

        if existing_usage:
            raise DiscountValidationError(
                f"You have already used this discount code '{discount_code.code}' for this course on "
                f"{existing_usage.used_at.strftime('%Y-%m-%d %H:%M:%S UTC')}"
            )

    # Calculate discounted amounts
    try:
        discount_amount, final_amount = calculate_discounted_amount(
            original_amount, discount_code.discount_type, discount_code.discount_value
        )
    except DiscountValidationError as e:
        logger.error(f"Error calculating discount: {e!s}")
        raise

    return discount_code, discount_amount, final_amount


async def increment_discount_usage_atomic(
    discount_code_id: int, db_session: Session, auto_commit: bool = True
) -> bool:
    """
    Atomically increment discount code usage counter.

    This prevents race conditions where 50 concurrent payments with max_uses=10
    could exceed the limit. Uses database-level atomic UPDATE to ensure
    only 10 succeed (not 11 or more).

    Returns:
        True if increment succeeded, False if max_uses would be exceeded
    """
    # Use raw SQL for atomic increment with conditional check
    # This ensures database handles concurrency, not application code
    # max_uses = NULL or 0 means unlimited
    result = db_session.execute(
        text("""
            UPDATE discountcode
            SET current_uses = current_uses + 1
            WHERE id = :discount_code_id
            AND (max_uses IS NULL OR max_uses = 0 OR current_uses < max_uses)
            RETURNING id, current_uses, max_uses
        """),
        {"discount_code_id": discount_code_id},
    )

    # If a row was returned, the update succeeded
    row = result.fetchone()
    updated = row is not None

    if updated:
        if auto_commit:
            db_session.commit()
        logger.info(
            f"Atomically incremented discount usage: code_id={discount_code_id}, new_uses={row[1]}/{row[2] if row[2] else 'unlimited'}"
        )
    else:
        logger.warning(
            f"Failed to increment discount usage (max uses reached): code_id={discount_code_id}"
        )
        if auto_commit:
            db_session.rollback()

    return updated


async def record_discount_usage(
    discount_code_id: int,
    user_id: int,
    course_id: int | None,
    payment_user_id: int,
    original_amount: float,
    discount_amount: float,
    final_amount: float,
    db_session: Session,
    product_id: int | None = None,
) -> DiscountCodeUsage:
    """
    Record a discount code usage after successful payment.

    Webhook Idempotency
    This should be called from the webhook handler after payment confirmation.
    Implements idempotency check to prevent duplicate records from webhook retries.
    If same webhook is sent 3 times, only 1 usage is recorded.

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
    # IDEMPOTENCY CHECK: has this usage already been recorded?
    # Prevents duplicate records if Paystack retries webhook
    existing = db_session.exec(
        select(DiscountCodeUsage).where(
            DiscountCodeUsage.payment_user_id == payment_user_id
        )
    ).first()

    if existing:
        logger.info(
            f"Discount usage already recorded for payment_user_id={payment_user_id} "
            f"(webhook retry detected - idempotent response)"
        )
        return existing

    # Create usage record
    usage = DiscountCodeUsage(
        discount_code_id=discount_code_id,
        user_id=user_id,
        course_id=course_id,
        product_id=product_id,
        payment_user_id=payment_user_id,
        original_amount=original_amount,
        discount_amount=discount_amount,
        final_amount=final_amount,
    )

    db_session.add(usage)
    db_session.commit()
    db_session.refresh(usage)

    logger.info(
        f"Recorded discount usage: code_id={discount_code_id}, user_id={user_id}, course_id={course_id}"
    )

    return usage


async def decrement_discount_usage(
    discount_code_id: int,
    payment_user_id: int,
    db_session: Session,
    auto_commit: bool = True,
) -> bool:
    """
    Decrement discount code usage counter (e.g., for refunds).

    Refund Handling
    This function is called when a payment is refunded.
    It uses the final_amount (discounted price) from the payment record,
    not the original_amount, ensuring refunds process the correct amount.
    Also removes the usage record and decrements the usage counter.

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
        logger.warning(
            f"No usage record found for payment_user_id={payment_user_id} during refund processing"
        )
        return False

    logger.info(
        f"Processing refund for discount usage: payment_user_id={payment_user_id}, "
        f"discount_code_id={discount_code_id}, final_amount={usage.final_amount} "
        f"(using final_amount, not original_amount={usage.original_amount})"
    )

    # Atomically decrement counter
    result = db_session.execute(
        text("""
            UPDATE discountcode
            SET current_uses = GREATEST(0, current_uses - 1)
            WHERE id = :discount_code_id
            RETURNING id, current_uses
        """),
        {"discount_code_id": discount_code_id},
    )

    row = result.fetchone()
    updated = row is not None

    if updated:
        db_session.delete(usage)
        if auto_commit:
            db_session.commit()
        logger.info(
            f"Successfully decremented discount usage counter: code_id={discount_code_id}, "
            f"new_uses={row[1]}, payment_user_id={payment_user_id}"
        )
    else:
        logger.error(
            f"Failed to decrement discount usage counter for code_id={discount_code_id}"
        )
        if auto_commit:
            db_session.rollback()

    return updated


# Admin functions for managing discount codes


async def create_discount_code(
    request: Request,
    org_id: int,
    discount_data: DiscountCodeCreate,
    current_user: PublicUser,
    db_session: Session,
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

    # RBAC check - Org Admins or Instructors (with course_id)
    try:
        await rbac_check(request, org.org_uuid, current_user, "create", db_session)
    except HTTPException:
        # User is not an org admin, check if they are an instructor for the specific course
        if not discount_data.course_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization admins can create global discount codes. Instructors must provide a course_id.",
            )

        # Check course ownership/instructor rights
        from src.db.courses.courses import Course
        from src.security.courses_security import courses_rbac_check

        course = db_session.exec(
            select(Course).where(Course.id == discount_data.course_id)
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        # This will raise 403 if user is not an instructor/owner of this course
        await courses_rbac_check(
            request=request,
            course_uuid=course.course_uuid,
            current_user=current_user,
            action="update",  # Using update action as proxy for course management rights
            db_session=db_session,
            require_course_ownership=True,
        )

    # Validate course belongs to organization if provided
    if discount_data.course_id:
        from src.db.courses.courses import Course

        course_check = db_session.exec(
            select(Course).where(
                and_(Course.id == discount_data.course_id, Course.org_id == org_id)
            )
        ).first()
        if not course_check:
            raise HTTPException(
                status_code=400, detail="Course does not belong to this organization"
            )

    # Validate discount value
    if discount_data.discount_type == DiscountTypeEnum.PERCENTAGE:
        if discount_data.discount_value < 0 or discount_data.discount_value > 100:
            raise HTTPException(
                status_code=400, detail="Percentage discount must be between 0 and 100"
            )
    elif discount_data.discount_value < 0:
        raise HTTPException(status_code=400, detail="Fixed discount cannot be negative")

    # Normalize datetimes to timezone-naive UTC (consistent with database storage)
    valid_from_naive = (
        discount_data.valid_from.replace(tzinfo=None)
        if discount_data.valid_from.tzinfo
        else discount_data.valid_from
    )
    valid_until_naive = None
    if discount_data.valid_until:
        valid_until_naive = (
            discount_data.valid_until.replace(tzinfo=None)
            if discount_data.valid_until.tzinfo
            else discount_data.valid_until
        )

    # Validate dates
    if valid_until_naive and valid_until_naive < valid_from_naive:
        raise HTTPException(
            status_code=400, detail="Valid until date must be after valid from date"
        )

    # Check if code already exists for this org
    existing = db_session.exec(
        select(DiscountCode).where(
            and_(
                DiscountCode.code == discount_data.code.upper(),
                DiscountCode.org_id == org_id,
            )
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=400, detail="Discount code already exists for this organization"
        )

    # Create discount code with timezone-naive datetimes
    discount_code = DiscountCode(
        org_id=org_id,
        code=discount_data.code.upper(),
        discount_type=discount_data.discount_type,
        discount_value=discount_data.discount_value,
        max_uses=discount_data.max_uses,
        valid_from=valid_from_naive,
        valid_until=valid_until_naive,
        description=discount_data.description,
        course_id=discount_data.course_id,
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
    include_inactive: bool = False,
) -> list[DiscountCodeRead]:
    """
    List all discount codes for an organization (admin only).
    """
    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check - Org Admins can read all, Instructors can read their own
    is_org_admin = False
    try:
        await rbac_check(request, org.org_uuid, current_user, "read", db_session)
        is_org_admin = True
    except HTTPException:
        # Not an org admin, will filter by course authorship later
        pass

    # Query discount codes
    query = select(DiscountCode).where(DiscountCode.org_id == org_id)

    if not is_org_admin:
        # For non-admins, only show codes for courses they manage
        # This requires an inner join with ResourceAuthor
        from src.db.courses.courses import Course
        from src.db.resource_authors import ResourceAuthor, ResourceAuthorshipStatusEnum

        query = query.join(
            ResourceAuthor,
            and_(
                ResourceAuthor.resource_uuid
                == select(Course.course_uuid)
                .where(Course.id == DiscountCode.course_id)
                .scalar_subquery(),
                ResourceAuthor.user_id == current_user.id,
                ResourceAuthor.authorship_status == ResourceAuthorshipStatusEnum.ACTIVE,
            ),
        )

    if not include_inactive:
        query = query.where(DiscountCode.is_active == True)

    discount_codes = db_session.exec(query).all()

    return [DiscountCodeRead.model_validate(code) for code in discount_codes]


async def get_discount_code(
    request: Request,
    org_id: int,
    code_id: int,
    current_user: PublicUser,
    db_session: Session,
    action: Literal["read", "update", "delete"] = "read",
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
    is_org_admin = False
    try:
        await rbac_check(
            request,
            org.org_uuid,
            current_user,
            action if action != "read" else "read",
            db_session,
        )
        is_org_admin = True
    except HTTPException:
        pass

    # Get discount code
    discount_code = db_session.exec(
        select(DiscountCode).where(
            and_(DiscountCode.id == code_id, DiscountCode.org_id == org_id)
        )
    ).first()

    if not discount_code:
        raise HTTPException(status_code=404, detail="Discount code not found")

    if not is_org_admin:
        # If not an org admin, user must be an owner/instructor of the specific course linked to the code
        if not discount_code.course_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization admins can access global discount codes.",
            )

        from src.db.courses.courses import Course
        from src.security.courses_security import courses_rbac_check

        course = db_session.exec(
            select(Course).where(Course.id == discount_code.course_id)
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        await courses_rbac_check(
            request=request,
            course_uuid=course.course_uuid,
            current_user=current_user,
            action=action,
            db_session=db_session,
            require_course_ownership=True,
        )

    return discount_code


async def update_discount_code(
    request: Request,
    org_id: int,
    code_id: int,
    discount_update: DiscountCodeUpdate,
    current_user: PublicUser,
    db_session: Session,
) -> DiscountCode:
    """
    Update a discount code (admin only).
    """
    # Get the discount code (includes RBAC check)
    discount_code = await get_discount_code(
        request, org_id, code_id, current_user, db_session, action="update"
    )

    # Update fields
    if discount_update.discount_value is not None:
        if discount_code.discount_type == DiscountTypeEnum.PERCENTAGE:
            if (
                discount_update.discount_value < 0
                or discount_update.discount_value > 100
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Percentage discount must be between 0 and 100",
                )
        elif discount_update.discount_value < 0:
            raise HTTPException(
                status_code=400, detail="Fixed discount cannot be negative"
            )
        discount_code.discount_value = discount_update.discount_value

    if discount_update.max_uses is not None:
        discount_code.max_uses = discount_update.max_uses

    if discount_update.valid_until is not None:
        # Normalize both datetimes to timezone-naive UTC for comparison
        valid_until_naive = (
            discount_update.valid_until.replace(tzinfo=None)
            if discount_update.valid_until.tzinfo
            else discount_update.valid_until
        )
        valid_from_naive = (
            discount_code.valid_from.replace(tzinfo=None)
            if discount_code.valid_from.tzinfo
            else discount_code.valid_from
        )

        if valid_until_naive < valid_from_naive:
            raise HTTPException(
                status_code=400, detail="Valid until date must be after valid from date"
            )

        # Store as timezone-naive (consistent with database)
        discount_code.valid_until = valid_until_naive

    if discount_update.is_active is not None:
        discount_code.is_active = discount_update.is_active

    if discount_update.description is not None:
        discount_code.description = discount_update.description

    discount_code.updated_at = datetime.now(UTC)

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
    db_session: Session,
) -> DiscountCode:
    """
    Deactivate a discount code (admin only).
    """
    discount_code = await get_discount_code(
        request, org_id, code_id, current_user, db_session, action="update"
    )

    discount_code.is_active = False
    discount_code.updated_at = datetime.now(UTC)

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
    db_session: Session,
) -> dict:
    """
    Get analytics for a discount code (admin only).

    Returns usage statistics, revenue impact, and student enrollment data.
    """
    # Get the discount code (includes RBAC check)
    discount_code = await get_discount_code(
        request, org_id, code_id, current_user, db_session, action="read"
    )

    # Get all usage records
    usages = db_session.exec(
        select(DiscountCodeUsage).where(DiscountCodeUsage.discount_code_id == code_id)
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
    unique_students = len({usage.user_id for usage in usages})

    # Get unique courses
    unique_courses = len({usage.course_id for usage in usages})

    return {
        "code": discount_code.code,
        "discount_type": discount_code.discount_type,
        "discount_value": discount_code.discount_value,
        "max_uses": discount_code.max_uses
        if discount_code.max_uses and discount_code.max_uses > 0
        else "unlimited",
        "current_uses": discount_code.current_uses,
        "usage_percentage": round(usage_percentage, 2)
        if usage_percentage is not None
        else "N/A (unlimited)",
        "is_active": discount_code.is_active,
        "valid_from": discount_code.valid_from,
        "valid_until": discount_code.valid_until,
        "total_uses": total_uses,
        "unique_students": unique_students,
        "unique_courses": unique_courses,
        "total_revenue": round(total_revenue, 2),
        "total_discount_given": round(total_discount_given, 2),
        "original_revenue": round(original_revenue, 2),
        "revenue_impact_percentage": round(
            (total_discount_given / original_revenue * 100)
            if original_revenue > 0
            else 0,
            2,
        ),
    }
