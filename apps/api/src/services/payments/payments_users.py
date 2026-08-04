from datetime import datetime
from typing import Any

from fastapi import HTTPException, Request
from sqlmodel import Session, select

from src.db.courses.courses import AuthorWithRole, Course, CourseRead
from src.db.organizations import Organization
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_products import PaymentsProduct
from src.db.payments.payments_users import (PaymentStatusEnum, PaymentsUser,
                                            ProviderSpecificData)
from src.db.resource_authors import (ResourceAuthor,
                                     ResourceAuthorshipStatusEnum)
from src.db.users import (AnonymousUser, InternalUser, PublicUser, User,
                          UserRead)
from src.security.features_utils.usage import check_limits_with_usage
from src.services.orgs.orgs import rbac_check


async def create_payment_user(
    request: Request,
    org_id: int,
    user_id: int,
    product_id: int,
    status: PaymentStatusEnum,
    provider_data: Any,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
    referral_code_id: int | None = None,  # Added for referral system
) -> PaymentsUser:
    # Check if payments feature is enabled (skip for InternalUser to allow webhook processing)
    if not isinstance(current_user, InternalUser):
        check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "create", db_session)

    # Check if product exists
    statement = select(PaymentsProduct).where(
        PaymentsProduct.id == product_id, PaymentsProduct.org_id == org_id
    )
    product = db_session.exec(statement).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Handle provider-specific data
    if isinstance(provider_data, dict):
        provider_specific_data = ProviderSpecificData(
            flutterwave_customer=provider_data.get("flutterwave_customer")
            if "flutterwave_customer" in provider_data
            else None,
            customer_code=provider_data.get("customer_code")
            if "customer_code" in provider_data
            else None,
            flutterwave_tx_ref=provider_data.get("flutterwave_tx_ref")
            if "flutterwave_tx_ref" in provider_data
            else None,
            # Flutterwave doesn't have an equivalent of access_code typically, but if needed we can add it here.
            # We removed paystack_access_code.
        )
    else:
        provider_specific_data = ProviderSpecificData()

    # Check if user already has a payment user for this product
    statement = select(PaymentsUser).where(
        PaymentsUser.user_id == user_id,
        PaymentsUser.org_id == org_id,
        PaymentsUser.payment_product_id == product_id,
    )
    existing_payment_user = db_session.exec(statement).first()

    if existing_payment_user:
        # If status is PENDING, CANCELLED, or FAILED, delete the existing record
        if existing_payment_user.status in [
            PaymentStatusEnum.PENDING,
            PaymentStatusEnum.CANCELLED,
            PaymentStatusEnum.FAILED,
        ]:
            db_session.delete(existing_payment_user)
            db_session.commit()
        else:
            # If it's a free product, allow "re-purchase" by returning existing
            # This handles cases where users click "Get Started" multiple times for free courses
            if product.amount == 0:
                return existing_payment_user
            raise HTTPException(
                status_code=400, detail="User already has purchase for this product"
            )

    # Create new payment user
    payment_user = PaymentsUser(
        user_id=user_id,
        org_id=org_id,
        payment_product_id=product_id,
        provider_specific_data=provider_specific_data.model_dump(),
        status=status,
        referral_code_id=referral_code_id,  # Added for referral system
    )

    db_session.add(payment_user)
    db_session.commit()
    db_session.refresh(payment_user)

    return payment_user


async def get_payment_user(
    request: Request,
    org_id: int,
    payment_user_id: int,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
) -> PaymentsUser:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "read", db_session)

    # Get payment user
    statement = select(PaymentsUser).where(
        PaymentsUser.id == payment_user_id, PaymentsUser.org_id == org_id
    )
    payment_user = db_session.exec(statement).first()
    if not payment_user:
        raise HTTPException(status_code=404, detail="Payment user not found")

    return payment_user


async def update_payment_user_status(
    request: Request,
    org_id: int,
    payment_user_id: int,
    status: PaymentStatusEnum,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
) -> PaymentsUser:
    # Check if payments feature is enabled (skip for InternalUser to allow webhook processing)
    if not isinstance(current_user, InternalUser):
        check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "update", db_session)

    # Get existing payment user
    statement = select(PaymentsUser).where(
        PaymentsUser.id == payment_user_id, PaymentsUser.org_id == org_id
    )
    payment_user = db_session.exec(statement).first()
    if not payment_user:
        raise HTTPException(status_code=404, detail="Payment user not found")

    # Update status
    payment_user.status = status
    payment_user.update_date = datetime.now()

    db_session.add(payment_user)
    db_session.commit()
    db_session.refresh(payment_user)

    return payment_user


async def list_payment_users(
    request: Request,
    org_id: int,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
) -> list[PaymentsUser]:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "read", db_session)

    # Get all payment users for org ordered by id
    statement = (
        select(PaymentsUser)
        .where(PaymentsUser.org_id == org_id)
        .order_by(PaymentsUser.id.desc())
    )  # type: ignore
    payment_users = list(db_session.exec(statement).all())  # Convert to list

    return payment_users


async def delete_payment_user(
    request: Request,
    org_id: int,
    payment_user_id: int,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
) -> None:
    # Check if payments feature is enabled (skip for InternalUser to allow webhook processing)
    if not isinstance(current_user, InternalUser):
        check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "delete", db_session)

    # Get existing payment user
    statement = select(PaymentsUser).where(
        PaymentsUser.id == payment_user_id, PaymentsUser.org_id == org_id
    )
    payment_user = db_session.exec(statement).first()
    if not payment_user:
        raise HTTPException(status_code=404, detail="Payment user not found")

    # Delete payment user
    db_session.delete(payment_user)
    db_session.commit()


async def get_owned_courses(
    request: Request,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
    org_id: int | None = None,
) -> list[CourseRead]:
    # Anonymous users don't own any courses
    if isinstance(current_user, AnonymousUser):
        return []

    # If org_id is provided, check if user is an admin of THIS organization
    is_admin = False
    if org_id and not isinstance(current_user, AnonymousUser):
        from src.db.user_organizations import UserOrganization

        statement = select(UserOrganization).where(
            UserOrganization.user_id == current_user.id,
            UserOrganization.org_id == org_id,
            UserOrganization.role_id.in_([1, 2]),
        )
        is_admin = db_session.exec(statement).first() is not None

    if is_admin and org_id:
        # Admins see all courses in the organization
        statement = select(Course).where(Course.org_id == org_id)
        courses = db_session.exec(statement).all()
    else:
        # Get all active/completed payment users for the current user
        statement = select(PaymentsUser).where(
            PaymentsUser.user_id == current_user.id,
            PaymentsUser.status.in_(
                [PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED]
            ),  # type: ignore
        )
        payment_users = db_session.exec(statement).all()

        # Get all product IDs from payment users
        product_ids = [pu.payment_product_id for pu in payment_users]

        # Get all courses linked to these products
        courses = []
        for product_id in product_ids:
            # Get courses linked to this product through PaymentsCourse
            statement = (
                select(Course)
                .join(PaymentsCourse, Course.id == PaymentsCourse.course_id)  # type: ignore
                .where(PaymentsCourse.payment_product_id == product_id)
            )
            product_courses = db_session.exec(statement).all()
            courses.extend(product_courses)

        # Also include authored courses if authenticated
        if not isinstance(current_user, AnonymousUser):
            authored_statement = (
                select(Course)
                .join(
                    ResourceAuthor, ResourceAuthor.resource_uuid == Course.course_uuid
                )
                .where(
                    ResourceAuthor.user_id == current_user.id,
                    ResourceAuthor.authorship_status
                    == ResourceAuthorshipStatusEnum.ACTIVE,
                )
            )
            if org_id:
                authored_statement = authored_statement.where(Course.org_id == org_id)

            authored_courses = db_session.exec(authored_statement).all()
            courses.extend(authored_courses)

    # Remove duplicates by converting to set and back to list
    unique_courses = list({course.id: course for course in courses}.values())

    # Get authors for each course and convert to CourseRead
    course_reads = []
    for course in unique_courses:
        # Get course authors with their roles
        authors_statement = (
            select(ResourceAuthor, User)
            .join(User, ResourceAuthor.user_id == User.id)
            .where(ResourceAuthor.resource_uuid == course.course_uuid)
        )
        author_results = db_session.exec(authors_statement).all()

        # Convert to AuthorWithRole objects
        authors = [
            AuthorWithRole(
                user=UserRead.model_validate(user),
                authorship=resource_author.authorship,
                authorship_status=resource_author.authorship_status,
                creation_date=resource_author.creation_date,
                update_date=resource_author.update_date,
            )
            for resource_author, user in author_results
        ]

        # Check if course is paid
        payment_statement = (
            select(PaymentsCourse)
            .join(
                PaymentsProduct, PaymentsCourse.payment_product_id == PaymentsProduct.id
            )
            .where(PaymentsCourse.course_id == course.id, PaymentsProduct.amount > 0)
        )
        is_paid = db_session.exec(payment_statement).first() is not None

        # Create CourseRead object
        course_read = CourseRead(
            **course.model_dump(), authors=authors, is_paid=is_paid
        )
        course_reads.append(course_read)

    return course_reads
