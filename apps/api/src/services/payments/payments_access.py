import logging

from fastapi import Request
from sqlmodel import Session, select

from src.db.courses.activities import Activity
from src.db.courses.courses import Course
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser
from src.db.users import AnonymousUser, InternalUser, PublicUser
from src.security.rbac.rbac import (
    authorization_verify_based_on_org_admin_status,
    authorization_verify_if_user_is_author)

logger = logging.getLogger(__name__)


async def check_activity_paid_access(
    request: Request,
    activity_id: int,
    user: PublicUser | AnonymousUser,
    db_session: Session,
) -> bool:
    """
    Checks if a user has access to a paid activity.
    Admins (Org/Platform) and Authors have unrestricted access.
    """
    # Internal automated tasks always have access
    if isinstance(user, InternalUser):
        return True

    # Get activity and associated course
    statement = select(Activity).where(Activity.id == activity_id)
    activity = db_session.exec(statement).first()
    if not activity:
        return False

    statement = select(Course).where(Course.id == activity.course_id)
    course = db_session.exec(statement).first()
    if not course:
        return False

    # 1. Admin Bypass: If user is an Admin of the organization, they have full access.
    if not isinstance(user, AnonymousUser):
        try:
            is_admin = await authorization_verify_based_on_org_admin_status(
                request, user.id, "read", course.course_uuid, db_session
            )
            if is_admin:
                return True
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Error checking admin status in payments_access: {e}")

    # 2. Author Bypass: If user is the author, they have full access.
    if not isinstance(user, AnonymousUser):
        try:
            is_author = await authorization_verify_if_user_is_author(
                request, user.id, "update", course.course_uuid, db_session
            )
            if is_author:
                return True
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Error checking author status in payments_access: {e}")

    # 3. Free Course check: If the course is not in PaymentsCourse, it's free.
    statement = select(PaymentsCourse).where(PaymentsCourse.course_id == course.id)
    course_payment = db_session.exec(statement).first()
    if not course_payment:
        return True

    # Anonymous users cannot access paid courses
    if isinstance(user, AnonymousUser):
        return False

    # 4. Paid access check: Verify payment status in the database.
    statement = select(PaymentsUser).where(
        PaymentsUser.user_id == user.id,
        PaymentsUser.payment_product_id == course_payment.payment_product_id,
        PaymentsUser.status.in_(
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
    Checks if a user has access to a paid course.
    """
    if isinstance(user, InternalUser):
        return True

    statement = select(Course).where(Course.id == course_id)
    course = db_session.exec(statement).first()
    if not course:
        return False

    # Admin and Author bypasses
    if request and not isinstance(user, AnonymousUser):
        try:
            is_admin = await authorization_verify_based_on_org_admin_status(
                request, user.id, "read", course.course_uuid, db_session
            )
            if is_admin:
                return True

            is_author = await authorization_verify_if_user_is_author(
                request, int(user.id), "read", course.course_uuid, db_session
            )
            if is_author:
                return True
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Error in RBAC bypass check for course access: {e}")

    statement = select(PaymentsCourse).where(PaymentsCourse.course_id == course_id)
    course_payment = db_session.exec(statement).first()
    if not course_payment:
        return True

    if isinstance(user, AnonymousUser):
        return False

    statement = select(PaymentsUser).where(
        PaymentsUser.user_id == user.id,
        PaymentsUser.payment_product_id == course_payment.payment_product_id,
        PaymentsUser.status.in_(
            [PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED]
        ),
    )
    subscription = db_session.exec(statement).first()
    return bool(subscription)
