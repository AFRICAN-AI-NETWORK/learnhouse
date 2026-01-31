from sqlmodel import Session, select
from src.security.rbac.rbac import authorization_verify_if_user_is_author
from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser
from src.db.users import PublicUser, AnonymousUser
from src.db.payments.payments_courses import PaymentsCourse
from src.db.courses.activities import Activity
from src.db.courses.courses import Course
from src.db.organization_config import OrganizationConfig
from fastapi import HTTPException, Request

async def check_activity_paid_access(
    request: Request,
    activity_id: int,
    user: PublicUser | AnonymousUser,
    db_session: Session,
) -> bool:
    """
    Check if a user has access to a specific activity
    Returns True if:
    - User is an author of the course
    - Activity is in a free course
    - User has a valid subscription for the course
    """


    # Get activity and associated course
    statement = select(Activity).where(Activity.id == activity_id)
    activity = db_session.exec(statement).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Check if course exists
    statement = select(Course).where(Course.id == activity.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if user is author of the course
    is_course_author = await authorization_verify_if_user_is_author(request, user.id, "update", course.course_uuid, db_session)

    if is_course_author:
        return True

    # Check if payments feature is enabled for the organization
    org_config = db_session.exec(
        select(OrganizationConfig).where(OrganizationConfig.org_id == course.org_id)
    ).first()
    
    # If payments are disabled, treat everything as free
    if org_config and org_config.config.get("features", {}).get("payments", {}).get("enabled") == False:
        return True
    
    # Check if course is linked to a product
    statement = select(PaymentsCourse).where(PaymentsCourse.course_id == course.id)
    course_payment = db_session.exec(statement).first()

    # If course is not linked to any product, it's free
    if not course_payment:
        return True
    
    # Anonymous users have no access to paid activities
    if isinstance(user, AnonymousUser):
        return False
    
    # Check if user has a valid subscription or payment
    statement = select(PaymentsUser).where(
        PaymentsUser.user_id == user.id,
        PaymentsUser.payment_product_id == course_payment.payment_product_id,
        PaymentsUser.status.in_( # type: ignore
            [PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED]
        ),
    )
    access = db_session.exec(statement).first()

    return bool(access)

async def check_course_paid_access(
    course_id: int,
    user: PublicUser | AnonymousUser,
    db_session: Session,
    request: Request = None,
) -> bool:
    """
    Check if a user has paid access to a specific course
    Returns True if:
    - User is an author of the course
    - Course is free (not linked to any product)
    - User has a valid subscription for the course
    """
    # Check if course exists
    statement = select(Course).where(Course.id == course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if user is author of the course (if request is provided)
    if request and not isinstance(user, AnonymousUser):
        try:
            is_course_author = await authorization_verify_if_user_is_author(
                request, user.id, "update", course.course_uuid, db_session
            )
            if is_course_author:
                return True
        except Exception:
            # If authorization check fails, continue with payment check
            pass

    # Check if payments feature is enabled for the organization
    org_config = db_session.exec(
        select(OrganizationConfig).where(OrganizationConfig.org_id == course.org_id)
    ).first()
    
    # If payments are disabled, treat everything as free
    if org_config and org_config.config.get("features", {}).get("payments", {}).get("enabled") == False:
        return True
    
    # Check if course is linked to a product
    statement = select(PaymentsCourse).where(PaymentsCourse.course_id == course.id)
    course_payment = db_session.exec(statement).first()

    # If course is not linked to any product, it's free
    if not course_payment:
        return True

    # Anonymous users have no access to paid courses
    if isinstance(user, AnonymousUser):
        return False

    # Check if user has a valid subscription
    statement = select(PaymentsUser).where(
        PaymentsUser.user_id == user.id,
        PaymentsUser.payment_product_id == course_payment.payment_product_id,
        PaymentsUser.status.in_( # type: ignore
            [PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED]
        ),
    )
    subscription = db_session.exec(statement).first()

    return bool(subscription)
