from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from src.core.events.database import get_db_session
from src.db.courses.courses import Course
from src.db.payments.discount_codes import (
    DiscountCodeCreate,
    DiscountCodeRead,
    DiscountCodeUpdate,
)
from src.db.payments.payments import (
    PaymentsConfig,
    PaymentsConfigRead,
    PaymentsConfigUpdate,
)
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_products import (
    PaymentsProduct,
    PaymentsProductCreate,
    PaymentsProductRead,
    PaymentsProductUpdate,
)
from src.db.payments.payments_users import PaymentStatusEnum
from src.db.users import AnonymousUser, InternalUser, PublicUser
from src.security.auth import get_current_user
from src.services.payments.discount_codes import (
    DiscountValidationError,
    create_discount_code,
    deactivate_discount_code,
    get_discount_code,
    get_discount_code_analytics,
    list_discount_codes,
    update_discount_code,
    validate_discount_code,
)
from src.services.payments.payments_access import check_course_paid_access
from src.services.payments.payments_config import (
    delete_payments_config,
    get_payments_config,
    init_payments_config,
    update_payments_config,
)
from src.services.payments.payments_courses import (
    get_courses_by_product,
    link_course_to_product,
    unlink_course_from_product,
)
from src.services.payments.payments_customers import get_customers
from src.services.payments.payments_flutterwave import (
    get_supported_currencies,
    initialize_transaction,
    verify_transaction,
)
from src.services.payments.payments_products import (
    create_payments_product,
    delete_payments_product,
    get_payments_product,
    get_products_by_course,
    list_payments_products,
    list_public_payments_products,
    update_payments_product,
)
from src.services.payments.payments_users import (
    get_owned_courses,
    update_payment_user_status,
)
from src.services.payments.webhooks.payments_flutterwave_webhooks import (
    handle_flutterwave_webhook,
)

router = APIRouter()


@router.post("/{org_id}/config")
async def api_create_payments_config(
    request: Request,
    org_id: int,
    provider: Literal["flutterwave"],
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsConfig:
    return await init_payments_config(
        request, org_id, provider, current_user, db_session
    )


@router.get("/{org_id}/config")
async def api_get_payments_config(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[PaymentsConfigRead]:
    return await get_payments_config(request, org_id, current_user, db_session)


@router.put(
    "/{org_id}/config",
    summary="Update payments configuration",
    description="Update and activate the payments configuration for an organization. Set 'active' to true to enable payment processing.",
)
async def api_update_payments_config(
    request: Request,
    org_id: int,
    payments_config: PaymentsConfigUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsConfig:
    """
    Update payments configuration.

    Use this endpoint to:
    - Activate the payments config (set active: true)
    - Update provider configuration
    - Enable/disable payments
    """
    return await update_payments_config(
        request, org_id, payments_config, current_user, db_session
    )


@router.delete("/{org_id}/config")
async def api_delete_payments_config(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    await delete_payments_config(request, org_id, current_user, db_session)
    return {"message": "Payments config deleted successfully"}


@router.post("/{org_id}/products")
async def api_create_payments_product(
    request: Request,
    org_id: int,
    payments_product: PaymentsProductCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsProductRead:
    return await create_payments_product(
        request, org_id, payments_product, current_user, db_session
    )


@router.get("/{org_id}/products")
async def api_get_payments_products(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[PaymentsProductRead]:
    return await list_payments_products(request, org_id, current_user, db_session)


@router.get("/{org_id}/public-products")
async def api_get_public_payments_products(
    request: Request,
    org_id: int,
    db_session: Session = Depends(get_db_session),
) -> list[PaymentsProductRead]:
    return await list_public_payments_products(request, org_id, db_session)


@router.get("/{org_id}/products/{product_id}")
async def api_get_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsProductRead:
    return await get_payments_product(
        request, org_id, product_id, current_user, db_session
    )


@router.put("/{org_id}/products/{product_id}")
async def api_update_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    payments_product: PaymentsProductUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsProductRead:
    return await update_payments_product(
        request, org_id, product_id, payments_product, current_user, db_session
    )


@router.delete("/{org_id}/products/{product_id}")
async def api_delete_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    await delete_payments_product(request, org_id, product_id, current_user, db_session)
    return {"message": "Payments product deleted successfully"}


@router.post("/{org_id}/products/{product_id}/courses/{course_id}")
async def api_link_course_to_product(
    request: Request,
    org_id: int,
    product_id: int,
    course_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await link_course_to_product(
        request, org_id, course_id, product_id, current_user, db_session
    )


@router.delete("/{org_id}/products/{product_id}/courses/{course_id}")
async def api_unlink_course_from_product(
    request: Request,
    org_id: int,
    product_id: int,
    course_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await unlink_course_from_product(
        request, org_id, course_id, current_user, db_session
    )


@router.get("/{org_id}/products/{product_id}/courses")
async def api_get_courses_by_product(
    request: Request,
    org_id: int,
    product_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await get_courses_by_product(
        request, org_id, product_id, current_user, db_session
    )


@router.get("/{org_id}/courses/{course_id}/products")
async def api_get_products_by_course(
    request: Request,
    org_id: int,
    course_id: int,
    current_user: PublicUser | AnonymousUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await get_products_by_course(
        request, org_id, course_id, current_user, db_session
    )


# Payments webhooks


@router.post("/flutterwave/webhook")
async def api_handle_flutterwave_webhook(
    request: Request,
    db_session: Session = Depends(get_db_session),
):
    """Handle Flutterwave webhook events"""
    return await handle_flutterwave_webhook(request, db_session)


# Payments checkout


def resolve_payment_product_and_course(
    identifier: str, org_id: int, db_session: Session
) -> tuple[int | None, Course | None]:
    """
    Resolve a course_uuid, course slug, course name, product name, or product ID
    into a valid (product_id, Course | None) tuple within the organization.
    """
    if not identifier:
        return None, None

    identifier_clean = identifier.strip()
    norm_id = identifier_clean.lower().replace("-", " ").replace("_", " ")

    # 1. Direct product ID (digit)
    if identifier_clean.isdigit():
        prod = db_session.get(PaymentsProduct, int(identifier_clean))
        if prod and prod.org_id == org_id:
            return prod.id, None

    # Fetch all products and courses for this org for matching
    all_products = list(
        db_session.exec(
            select(PaymentsProduct).where(PaymentsProduct.org_id == org_id)
        ).all()
    )
    all_courses = list(
        db_session.exec(
            select(Course).where(Course.org_id == org_id)
        ).all()
    )

    # 2. Check if identifier matches a Course by course_uuid, id, or name/slug
    matched_course: Course | None = None
    for course in all_courses:
        c_uuid = (course.course_uuid or "").strip()
        if c_uuid == identifier_clean:
            matched_course = course
            break
        if identifier_clean.startswith("course_") and c_uuid == identifier_clean[7:]:
            matched_course = course
            break
        if not identifier_clean.startswith("course_") and c_uuid == f"course_{identifier_clean}":
            matched_course = course
            break
        c_name = course.name.strip().lower().replace("-", " ").replace("_", " ")
        if c_name == norm_id:
            matched_course = course
            break

    # If still not matched, check substring/partial course name match
    if not matched_course:
        norm_tokens = [w for w in norm_id.split() if len(w) >= 3 and w not in ("and", "for", "the", "with")]
        for course in all_courses:
            c_name = course.name.strip().lower().replace("-", " ").replace("_", " ")
            if (len(norm_id) >= 4 and norm_id in c_name) or (len(c_name) >= 4 and c_name in norm_id):
                matched_course = course
                break
            # Token overlap check (e.g. "fundamentals", "automation", "creators")
            c_tokens = set(c_name.split())
            if any(t in c_tokens for t in norm_tokens if t in ("fundamentals", "creators", "automation", "backend", "frontend", "career", "science")):
                matched_course = course
                break

    # If course is found, find linked PaymentsCourse or matching product
    if matched_course:
        payment_course_stmt = select(PaymentsCourse).where(
            PaymentsCourse.course_id == matched_course.id, PaymentsCourse.org_id == org_id
        )
        main_payment_course = db_session.exec(payment_course_stmt).first()
        if main_payment_course:
            return main_payment_course.payment_product_id, matched_course

        # Course found, but no PaymentsCourse linked yet: look for a product with matching name or norm_id
        c_name = matched_course.name.strip().lower().replace("-", " ").replace("_", " ")
        c_tokens = set(c_name.split())
        for prod in all_products:
            p_name = prod.name.strip().lower().replace("-", " ").replace("_", " ")
            if (
                p_name == c_name
                or p_name == norm_id
                or (len(p_name) >= 4 and p_name in c_name)
                or (len(c_name) >= 4 and c_name in p_name)
                or any(t in p_name.split() for t in c_tokens if len(t) >= 4)
            ):
                # Auto-link PaymentsCourse so subsequent access checks work seamlessly
                try:
                    new_pc = PaymentsCourse(
                        course_id=matched_course.id,
                        payment_product_id=prod.id,
                        org_id=org_id,
                    )
                    db_session.add(new_pc)
                    db_session.commit()
                except Exception:  # noqa: BLE001
                    db_session.rollback()
                return prod.id, matched_course

    # 3. Check if identifier directly matches a PaymentsProduct name or provider_product_id
    for prod in all_products:
        p_name = prod.name.strip().lower().replace("-", " ").replace("_", " ")
        if p_name == norm_id:
            return prod.id, matched_course
        if prod.provider_product_id and prod.provider_product_id.strip() == identifier_clean:
            return prod.id, matched_course

    # 4. Fallback: fuzzy/partial match on PaymentsProduct name
    for prod in all_products:
        p_name = prod.name.strip().lower().replace("-", " ").replace("_", " ")
        if (len(norm_id) >= 4 and norm_id in p_name) or (len(p_name) >= 4 and p_name in norm_id):
            return prod.id, matched_course

    # 5. Fallback for subscription aliases like "aina-pro-subscription", "pro-subscription"
    if "subscription" in norm_id or "pro" in norm_id:
        for prod in all_products:
            if getattr(prod, "product_type", None) == "subscription" or "subscription" in prod.name.lower():
                return prod.id, matched_course

    # 6. Fallback for Career Accelerator upsell
    if "career" in norm_id or "accelerator" in norm_id:
        for prod in all_products:
            if "career" in prod.name.lower() or "accelerator" in prod.name.lower():
                return prod.id, matched_course

    return None, matched_course


@router.post("/{org_id}/checkout/course_uuid/{course_uuid}")
async def api_create_checkout_session_by_uuid(
    request: Request,
    org_id: int,
    course_uuid: str,
    redirect_uri: str,
    currency: str | None = None,
    discount_code: str | None = None,
    upsell_course_uuid: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    product_id, _ = resolve_payment_product_and_course(course_uuid, org_id, db_session)
    if not product_id:
        raise HTTPException(
            status_code=404,
            detail=f"Course or payment product not found for '{course_uuid}'",
        )

    upsell_product_id = None
    if upsell_course_uuid:
        upsell_product_id, _ = resolve_payment_product_and_course(
            upsell_course_uuid, org_id, db_session
        )
        if not upsell_product_id:
            raise HTTPException(
                status_code=404,
                detail=f"Payment product not found for upsell course '{upsell_course_uuid}'",
            )

    return await initialize_transaction(
        request,
        org_id,
        product_id,
        redirect_uri,
        currency,
        discount_code,
        upsell_product_id,
        current_user,
        db_session,
    )


@router.post("/{org_id}/checkout/product/{product_id}")
async def api_create_checkout_session(
    request: Request,
    org_id: int,
    product_id: int,
    redirect_uri: str,
    currency: str | None = None,
    discount_code: str | None = None,
    upsell_product_id: int | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Initialize Flutterwave transaction for checkout

    Query Parameters:
        redirect_uri: URL to redirect after payment completion
        currency: Optional currency code (ISO 4217). Supported: NGN, USD, GHS, ZAR, KES, XOF
                 If not provided, uses the product's default currency
        discount_code: Optional discount code to apply to the purchase
        upsell_product_id: Optional ID of a product to upsell/bump with this checkout

    Example:
        POST /api/v1/payments/{org_id}/checkout/product/{product_id}?redirect_uri=https://example.com/success&currency=USD&discount_code=SCHOOL2026&upsell_product_id=5
    """
    return await initialize_transaction(
        request,
        org_id,
        product_id,
        redirect_uri,
        currency,
        discount_code,
        upsell_product_id,
        current_user,
        db_session,
    )


@router.get("/{org_id}/transactions/{reference}")
async def api_verify_transaction(
    request: Request,
    org_id: int,
    reference: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Verify a Flutterwave transaction by reference

    This endpoint allows you to manually verify a transaction status after payment.
    According to Flutterwave documentation, you should verify transactions to confirm
    payment status, especially if webhooks are delayed or failed.

    The endpoint will:
    1. Verify the transaction with Flutterwave API
    2. If successful and payment_user_id is found in metadata, update the payment status
    3. Return the transaction details and updated payment status

    Args:
        org_id: Organization ID
        reference: Transaction reference from checkout (e.g., "1lg10sbiy4")

    Returns:
        Transaction verification details including:
        - Transaction status from Flutterwave
        - Payment user status (if found)
        - Whether payment status was updated
    """
    from sqlmodel import select

    from src.db.payments.payments_users import PaymentsUser

    # Verify transaction with Flutterwave
    try:
        transaction_data = await verify_transaction(reference)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=400,
            detail=f"Failed to verify transaction with Flutterwave: {e!s}",
        )

    # Extract transaction details
    flutterwave_status = transaction_data.get("status")
    flutterwave_data = transaction_data.get("data", {})
    # For Flutterwave, meta is slightly different. Sometimes it's inside data.meta
    meta = flutterwave_data.get("meta", {})
    payment_user_id = meta.get("payment_user_id")

    # Prepare response
    response = {
        "reference": reference,
        "flutterwave_status": flutterwave_status,
        "transaction_data": {
            "amount": flutterwave_data.get("amount"),
            "currency": flutterwave_data.get("currency"),
            "processor_response": flutterwave_data.get("processor_response"),
            "created_at": flutterwave_data.get("created_at"),
        },
        "payment_user_id": payment_user_id,
        "upsell_payment_user_id": meta.get("upsell_payment_user_id"),
        "payment_status_updated": False,
    }

    # If transaction is successful and we have a payment_user_id, update the payment status
    if flutterwave_status == "successful" and payment_user_id:
        try:
            # Find the payment user
            payment_user_statement = select(PaymentsUser).where(
                PaymentsUser.id == int(payment_user_id), PaymentsUser.org_id == org_id
            )
            payment_user = db_session.exec(payment_user_statement).first()

            if payment_user:
                # Update status to COMPLETED if it's not already
                if payment_user.status != PaymentStatusEnum.COMPLETED:
                    await update_payment_user_status(
                        request=request,
                        org_id=org_id,
                        payment_user_id=int(payment_user_id),
                        status=PaymentStatusEnum.COMPLETED,
                        current_user=InternalUser(),
                        db_session=db_session,
                    )
                    response["payment_status_updated"] = True
                    response["previous_status"] = payment_user.status.value
                    response["new_status"] = PaymentStatusEnum.COMPLETED.value

                    # Activate upsell if present
                    upsell_payment_user_id = meta.get("upsell_payment_user_id")
                    if upsell_payment_user_id:
                        await update_payment_user_status(
                            request=request,
                            org_id=org_id,
                            payment_user_id=int(upsell_payment_user_id),
                            status=PaymentStatusEnum.COMPLETED,
                            current_user=InternalUser(),
                            db_session=db_session,
                        )
                else:
                    response["payment_status"] = PaymentStatusEnum.COMPLETED.value
            else:
                response["warning"] = (
                    f"Payment user {payment_user_id} not found in database"
                )
        except Exception as e:  # noqa: BLE001
            response["warning"] = f"Failed to update payment status: {e!s}"

    return response


@router.get("/{org_id}/courses/{course_id}/access")
async def api_check_course_paid_access(
    request: Request,
    org_id: int,
    course_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Check if current user has paid access to a specific course

    Returns diagnostic information about why access is granted or denied.
    """
    from sqlmodel import select

    from src.db.payments.payments_courses import PaymentsCourse
    from src.db.payments.payments_users import PaymentsUser

    # Get course
    course_statement = select(Course).where(Course.id == course_id)
    course = db_session.exec(course_statement).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check course-product link
    course_payment_statement = select(PaymentsCourse).where(
        PaymentsCourse.course_id == course.id
    )
    course_payment = db_session.exec(course_payment_statement).first()

    # Check user's payment status
    payment_user = None
    if course_payment:
        payment_user_statement = select(PaymentsUser).where(
            PaymentsUser.user_id == current_user.id,
            PaymentsUser.payment_product_id == course_payment.payment_product_id,
        )
        payment_user = db_session.exec(payment_user_statement).first()

    is_author = False
    if request and not isinstance(current_user, AnonymousUser):
        try:
            from src.security.rbac.rbac import authorization_verify_if_user_is_author

            is_author = await authorization_verify_if_user_is_author(
                request, int(current_user.id), "read", course.course_uuid, db_session
            )
        except Exception:  # noqa: BLE001
            pass

    is_admin = isinstance(current_user, InternalUser) or (
        not isinstance(current_user, AnonymousUser) and current_user.id in [1, 2]
    )

    has_access = await check_course_paid_access(
        course_id=course_id, user=current_user, db_session=db_session, request=request
    )

    return {
        "has_access": has_access,
        "diagnostics": {
            "course_id": course_id,
            "course_linked_to_product": course_payment is not None,
            "product_id": course_payment.payment_product_id if course_payment else None,
            "user_has_payment": payment_user is not None,
            "payment_status": payment_user.status.value if payment_user else None,
            "payment_user_id": payment_user.id if payment_user else None,
            "is_admin": is_admin,
            "is_author": is_author,
        },
    }


@router.get("/{org_id}/customers")
async def api_get_customers(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get list of customers and their subscriptions for an organization
    """
    return await get_customers(request, org_id, current_user, db_session)


@router.get("/{org_id}/courses/owned")
async def api_get_owned_courses(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await get_owned_courses(request, current_user, db_session, org_id)


@router.get("/currencies")
async def api_get_supported_currencies(
    request: Request,
):
    """
    Get list of supported currencies for payments
    Returns currency codes with their names, symbols, and subunit information
    """
    return get_supported_currencies()


# Discount code endpoints


@router.post("/{org_id}/discount-codes")
async def api_create_discount_code(
    request: Request,
    org_id: int,
    discount_data: DiscountCodeCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> DiscountCodeRead:
    """Create a new discount code for an organization (admin only)"""
    return await create_discount_code(
        request, org_id, discount_data, current_user, db_session
    )


@router.get("/{org_id}/discount-codes")
async def api_list_discount_codes(
    request: Request,
    org_id: int,
    include_inactive: bool = False,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[DiscountCodeRead]:
    """List all discount codes for an organization (admin only)"""
    return await list_discount_codes(
        request, org_id, current_user, db_session, include_inactive
    )


@router.get("/{org_id}/discount-codes/{code_id}")
async def api_get_discount_code(
    request: Request,
    org_id: int,
    code_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> DiscountCodeRead:
    """Get a specific discount code (admin only)"""
    code = await get_discount_code(request, org_id, code_id, current_user, db_session)
    return DiscountCodeRead.model_validate(code)


@router.patch("/{org_id}/discount-codes/{code_id}")
async def api_update_discount_code(
    request: Request,
    org_id: int,
    code_id: int,
    discount_update: DiscountCodeUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> DiscountCodeRead:
    """Update a discount code (admin only)"""
    code = await update_discount_code(
        request, org_id, code_id, discount_update, current_user, db_session
    )
    return DiscountCodeRead.model_validate(code)


@router.post("/{org_id}/discount-codes/{code_id}/deactivate")
async def api_deactivate_discount_code(
    request: Request,
    org_id: int,
    code_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> DiscountCodeRead:
    """Deactivate a discount code (admin only)"""
    code = await deactivate_discount_code(
        request, org_id, code_id, current_user, db_session
    )
    return DiscountCodeRead.model_validate(code)


@router.get("/{org_id}/discount-codes/{code_id}/analytics")
async def api_get_discount_code_analytics(
    request: Request,
    org_id: int,
    code_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> dict:
    """Get usage analytics for a discount code (admin only)"""
    return await get_discount_code_analytics(
        request, org_id, code_id, current_user, db_session
    )


@router.post("/{org_id}/validate-discount")
async def api_validate_discount_code(
    request: Request,
    org_id: int,
    code: str,
    amount: float,
    course_id: int | None = None,
    product_id: int | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> dict:
    """
    Validate a discount code and calculate discounted price (student operation).
    This is a read-only operation that doesn't record usage.
    """
    try:
        discount_code, discount_amount, final_amount = await validate_discount_code(
            code=code,
            org_id=org_id,
            user_id=current_user.id,
            course_id=course_id,
            product_id=product_id,
            original_amount=amount,
            db_session=db_session,
            check_usage=True,
        )

        return {
            "valid": True,
            "discount_code_id": discount_code.id,
            "code": discount_code.code,
            "discount_type": discount_code.discount_type,
            "discount_value": discount_code.discount_value,
            "original_amount": amount,
            "discount_amount": discount_amount,
            "final_amount": final_amount,
            "description": discount_code.description,
        }
    except DiscountValidationError as e:
        return {"valid": False, "error": str(e)}


@router.get("/{org_id}/payments/me")
async def api_get_my_payments(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    from src.services.payments.payments_users import get_my_payments

    return await get_my_payments(request, org_id, current_user, db_session)


@router.post("/{org_id}/payments/{payment_user_id}/cancel")
async def api_cancel_subscription(
    request: Request,
    org_id: int,
    payment_user_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    from src.services.payments.payments_users import cancel_subscription

    return await cancel_subscription(
        request, org_id, payment_user_id, current_user, db_session
    )
