"""Waitlist Course Service - Course listing with pricing information"""

from typing import Any

from fastapi import HTTPException, Request, status
from sqlalchemy import func
from sqlmodel import Session, select

from src.db.courses.courses import Course
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_products import PaymentsProduct
from src.db.waitlist import WaitlistConfig, WaitlistCoursePreference


async def get_org_courses_for_waitlist(
    request: Request,
    db_session: Session,
    waitlist_uuid: str,
) -> list[dict[str, Any]]:
    """
    Get all courses for the organization with pricing information.
    Used in waitlist registration form (Step 3) to display course options.

    Args:
        request: FastAPI request object
        db_session: Database session
        waitlist_uuid: UUID of the waitlist campaign

    Returns:
        list[Dict]: Courses with pricing info (is_free, price, currency)

    Raises:
        HTTPException: If waitlist not found
    """

    # Get waitlist config to resolve org_id
    waitlist_query = select(WaitlistConfig).where(
        WaitlistConfig.waitlist_uuid == waitlist_uuid
    )
    waitlist = db_session.exec(waitlist_query).first()

    if not waitlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist not found"
        )

    org_id = waitlist.org_id

    # Query courses with LEFT JOIN to get payment information
    # Course → PaymentsCourse → PaymentsProduct
    courses_query = (
        select(Course, PaymentsProduct)
        .outerjoin(
            PaymentsCourse,
            (Course.id == PaymentsCourse.course_id) & (PaymentsCourse.org_id == org_id),
        )
        .outerjoin(
            PaymentsProduct, PaymentsCourse.payment_product_id == PaymentsProduct.id
        )
        .where(
            Course.org_id == org_id,
            Course.public == True,  # Only show public courses
        )
    )

    results = db_session.exec(courses_query).all()

    # Format response with pricing information
    courses_list = []
    for course, payment_product in results:
        # Determine if course is free
        is_free = True
        price = None
        currency = None

        if payment_product:
            # If PaymentsProduct exists, check amount
            if payment_product.amount > 0:
                is_free = False
                price = payment_product.amount
                currency = payment_product.currency

        courses_list.append(
            {
                "course_id": course.id,
                "course_uuid": course.course_uuid,
                "name": course.name,
                "description": course.description or "",
                "thumbnail_image": course.thumbnail_image or "",
                "thumbnail_type": course.thumbnail_type,
                "is_free": is_free,
                "price": price,
                "currency": currency,
            }
        )

    return courses_list


async def validate_course_belongs_to_org(
    db_session: Session,
    course_id: int,
    org_id: int,
) -> bool:
    """
    Validate that a course belongs to a specific organization.
    Used during course preference storage to prevent cross-org selections.

    Args:
        db_session: Database session
        course_id: Course ID to validate
        org_id: Organization ID

    Returns:
        bool: True if course belongs to org, False otherwise
    """

    query = select(Course).where(Course.id == course_id, Course.org_id == org_id)
    course = db_session.exec(query).first()

    return course is not None


async def get_course_preference_analytics(
    request: Request,
    db_session: Session,
    waitlist_uuid: str,
) -> dict[str, Any]:
    """
    Get aggregated course preference analytics for a waitlist campaign.
    Admin function for demand forecasting.

    Args:
        request: FastAPI request object
        db_session: Database session
        waitlist_uuid: UUID of the waitlist campaign

    Returns:
        Dict: Aggregated analytics data

    Raises:
        HTTPException: If waitlist not found
    """

    # Get waitlist config
    waitlist_query = select(WaitlistConfig).where(
        WaitlistConfig.waitlist_uuid == waitlist_uuid
    )
    waitlist = db_session.exec(waitlist_query).first()

    if not waitlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist not found"
        )

    # Get all course preferences for this waitlist
    prefs_query = (
        select(
            PaymentsProduct.id,
            PaymentsProduct.name,
            func.count(WaitlistCoursePreference.id).label("selection_count"),
        )
        .join(
            WaitlistCoursePreference,
            PaymentsProduct.id == WaitlistCoursePreference.payments_product_id,
        )
        .where(WaitlistCoursePreference.waitlist_config_id == waitlist.id)
        .group_by(PaymentsProduct.id, PaymentsProduct.name)
        .order_by(func.count(WaitlistCoursePreference.id).desc())
    )

    results = db_session.exec(prefs_query).all()

    # Calculate total registrants with preferences
    total_prefs_query = select(
        func.count(func.distinct(WaitlistCoursePreference.user_id))
    ).where(WaitlistCoursePreference.waitlist_config_id == waitlist.id)
    total_with_prefs = db_session.exec(total_prefs_query).first() or 0

    # Format analytics data
    courses_data = []
    for product_id, product_name, count in results:
        percentage = (count / total_with_prefs * 100) if total_with_prefs > 0 else 0
        courses_data.append(
            {
                "product_id": product_id,
                "product_name": product_name,
                "selection_count": count,
                "percentage": round(percentage, 2),
            }
        )

    # Get free vs paid breakdown
    free_paid_query = (
        select(PaymentsProduct.id, PaymentsProduct.amount)
        .join(
            WaitlistCoursePreference,
            PaymentsProduct.id == WaitlistCoursePreference.payments_product_id,
        )
        .where(WaitlistCoursePreference.waitlist_config_id == waitlist.id)
    )

    free_paid_results = db_session.exec(free_paid_query).all()

    free_count = sum(
        1 for _, amount in free_paid_results if amount is None or amount == 0
    )
    paid_count = sum(
        1 for _, amount in free_paid_results if amount is not None and amount > 0
    )

    return {
        "waitlist_name": waitlist.name,
        "total_registrations": waitlist.total_registrations,
        "total_with_preferences": total_with_prefs,
        "courses": courses_data,
        "free_vs_paid": {
            "free_selections": free_count,
            "paid_selections": paid_count,
            "total_selections": free_count + paid_count,
        },
    }


async def get_user_course_preferences(
    request: Request,
    db_session: Session,
    waitlist_uuid: str,
    user_id: int,
) -> list[dict[str, Any]]:
    """
    Get course preferences for a specific user.

    Args:
        request: FastAPI request object
        db_session: Database session
        waitlist_uuid: UUID of the waitlist campaign
        user_id: User ID

    Returns:
        list[Dict]: User's course preferences with details

    Raises:
        HTTPException: If waitlist not found
    """

    # Get waitlist config
    waitlist_query = select(WaitlistConfig).where(
        WaitlistConfig.waitlist_uuid == waitlist_uuid
    )
    waitlist = db_session.exec(waitlist_query).first()

    if not waitlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist not found"
        )

    # Get user's preferences
    prefs_query = (
        select(WaitlistCoursePreference, PaymentsProduct)
        .join(
            PaymentsProduct,
            WaitlistCoursePreference.payments_product_id == PaymentsProduct.id,
        )
        .where(
            WaitlistCoursePreference.waitlist_config_id == waitlist.id,
            WaitlistCoursePreference.user_id == user_id,
        )
    )

    results = db_session.exec(prefs_query).all()

    # Format response
    preferences = []
    for pref, payment_product in results:
        is_free = True
        price = None
        currency = None

        if payment_product and payment_product.amount > 0:
            is_free = False
            price = payment_product.amount
            currency = payment_product.currency

        preferences.append(
            {
                "preference_id": pref.id,
                "product_id": payment_product.id,
                "product_name": payment_product.name,
                "is_free": is_free,
                "price": price,
                "currency": currency,
                "creation_date": pref.creation_date,
            }
        )

    return preferences
