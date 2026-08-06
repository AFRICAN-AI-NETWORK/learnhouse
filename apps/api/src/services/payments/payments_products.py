from datetime import UTC, datetime

from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select, text

from src.db.courses.courses import Course
from src.db.organizations import Organization
from src.db.payments.payments import PaymentsConfig
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_products import (
    PaymentsProduct,
    PaymentsProductCreate,
    PaymentsProductRead,
    PaymentsProductUpdate,
)
from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser
from src.db.users import AnonymousUser, PublicUser
from src.security.features_utils.usage import check_limits_with_usage
from src.services.orgs.orgs import rbac_check
from src.services.payments.payments_flutterwave import (
    archive_flutterwave_product,
    create_flutterwave_product,
    update_flutterwave_product,
)


async def create_payments_product(
    request: Request,
    org_id: int,
    payments_product: PaymentsProductCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> PaymentsProductRead:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "create", db_session)

    # Look up the existing active configuration for this organization
    # This replaces the need to pass a specific ID manually and makes the code resilient to database resets
    config_statement = select(PaymentsConfig).where(
        PaymentsConfig.org_id == org_id, PaymentsConfig.active == True
    )
    config = db_session.exec(config_statement).first()

    if not config:
        raise HTTPException(
            status_code=400,
            detail=f"No active payment configuration found for org_id {org_id}. "
            "Please configure a payment provider (e.g., Paystack) first.",
        )

    if config.id is None:
        raise HTTPException(
            status_code=400,
            detail="Payments config has invalid ID. Please reconfigure your payment provider.",
        )

    # Note: We'll attempt to fix FK constraint issues in the retry logic below if the insert fails
    # This pre-check is optional and won't block the operation if it fails

    # Create new payments product - exclude payments_config_id from model_dump to ensure we use the fetched config
    # This prevents any hardcoded or invalid IDs from being used
    product_data = payments_product.model_dump(
        exclude={"payments_config_id"}, exclude_unset=True
    )
    new_product = PaymentsProduct(
        **product_data, org_id=org_id, payments_config_id=config.id
    )
    new_product.creation_date = datetime.now(UTC)
    new_product.update_date = datetime.now(UTC)

    # Create product in Flutterwave if provider_product_id is not manually provided
    if payments_product.provider_product_id:
        new_product.provider_product_id = payments_product.provider_product_id
    else:
        flutterwave_product = await create_flutterwave_product(
            request, org_id, new_product, current_user, db_session
        )
        new_product.provider_product_id = flutterwave_product.get(
            "id"
        ) or flutterwave_product.get("plan_code", "")

    # Save to DB - with retry logic for FK constraint issues
    db_session.add(new_product)
    try:
        db_session.commit()
        db_session.refresh(new_product)
    except IntegrityError as e:
        # Check if this is the FK constraint violation we're expecting
        error_msg = str(e.orig) if hasattr(e, "orig") else str(e)
        if (
            "paymentsproduct_payments_config_id_fkey" in error_msg
            and "paymentsconfig" in error_msg
        ):
            # Rollback the failed insert
            db_session.rollback()

            # Fix the FK constraint
            try:
                db_session.exec(
                    text(
                        "ALTER TABLE paymentsproduct DROP CONSTRAINT IF EXISTS paymentsproduct_payments_config_id_fkey"
                    )
                )
                db_session.exec(
                    text("""
                        ALTER TABLE paymentsproduct
                        ADD CONSTRAINT paymentsproduct_payments_config_id_fkey
                        FOREIGN KEY (payments_config_id)
                        REFERENCES payments_config(id)
                        ON DELETE CASCADE
                    """)
                )
                db_session.commit()

                # Retry the insert
                db_session.add(new_product)
                db_session.commit()
                db_session.refresh(new_product)
            except Exception as fix_error:  # noqa: BLE001
                db_session.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fix foreign key constraint. Please ensure the database migration has been run. "
                    f"Original error: {error_msg}. Fix error: {fix_error!s}",
                )
        else:
            # Different integrity error, re-raise it
            db_session.rollback()
            raise

    return PaymentsProductRead.model_validate(new_product)


async def get_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> PaymentsProductRead:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "read", db_session)

    # Get payments product
    statement = select(PaymentsProduct).where(
        PaymentsProduct.id == product_id, PaymentsProduct.org_id == org_id
    )
    product = db_session.exec(statement).first()
    if not product:
        raise HTTPException(status_code=404, detail="Payments product not found")

    return PaymentsProductRead.model_validate(product)


async def update_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    payments_product: PaymentsProductUpdate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> PaymentsProductRead:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "update", db_session)

    # Get existing payments product
    statement = select(PaymentsProduct).where(
        PaymentsProduct.id == product_id, PaymentsProduct.org_id == org_id
    )
    product = db_session.exec(statement).first()
    if not product:
        raise HTTPException(status_code=404, detail="Payments product not found")

    # Update product
    for key, value in payments_product.model_dump().items():
        setattr(product, key, value)

    product.update_date = datetime.now(UTC)

    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    # Update product in Flutterwave
    await update_flutterwave_product(
        request, org_id, product.provider_product_id, product, current_user, db_session
    )

    return PaymentsProductRead.model_validate(product)


async def delete_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> None:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "delete", db_session)

    # Get existing payments product
    statement = select(PaymentsProduct).where(
        PaymentsProduct.id == product_id, PaymentsProduct.org_id == org_id
    )
    product = db_session.exec(statement).first()
    if not product:
        raise HTTPException(status_code=404, detail="Payments product not found")

    # Check if there are any payment users linked to this product
    statement = select(PaymentsUser).where(
        PaymentsUser.payment_product_id == product_id,
        PaymentsUser.status.in_(
            [PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED]
        ),  # type: ignore
    )
    payment_users = db_session.exec(statement).all()
    if payment_users:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete product because users have paid access to it.",
        )

    # Archive product in Flutterwave
    await archive_flutterwave_product(
        request, org_id, product.provider_product_id, current_user, db_session
    )

    # Delete product
    db_session.delete(product)
    db_session.commit()


async def list_payments_products(
    request: Request,
    org_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[PaymentsProductRead]:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "read", db_session)

    # Get payments products ordered by id
    statement = (
        select(PaymentsProduct)
        .where(PaymentsProduct.org_id == org_id)
        .order_by(PaymentsProduct.id.desc())
    )  # type: ignore
    products = db_session.exec(statement).all()

    return [PaymentsProductRead.model_validate(product) for product in products]


async def list_public_payments_products(
    request: Request,
    org_id: int,
    db_session: Session,
) -> list[PaymentsProductRead]:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get payments products ordered by id (no RBAC check for public pricing page)
    # Note: We filter for 'active' or valid products if such a field existed. Currently we return all for this org.
    statement = (
        select(PaymentsProduct)
        .where(PaymentsProduct.org_id == org_id)
        .order_by(PaymentsProduct.id.desc())
    )  # type: ignore
    products = db_session.exec(statement).all()

    return [PaymentsProductRead.model_validate(product) for product in products]


async def get_products_by_course(
    request: Request,
    org_id: int,
    course_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[PaymentsProductRead]:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)

    # Check if course exists and user has permission
    statement = select(Course).where(Course.id == course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # RBAC check
    await rbac_check(request, course.course_uuid, current_user, "read", db_session)

    # Get all products linked to this course with explicit join
    statement = (
        select(PaymentsProduct)
        .select_from(PaymentsProduct)
        .join(PaymentsCourse, PaymentsProduct.id == PaymentsCourse.payment_product_id)  # type: ignore
        .where(PaymentsCourse.course_id == course_id, PaymentsCourse.org_id == org_id)
    )
    products = db_session.exec(statement).all()

    return [PaymentsProductRead.model_validate(product) for product in products]
