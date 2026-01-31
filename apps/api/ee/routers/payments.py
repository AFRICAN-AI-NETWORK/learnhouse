from typing import Literal
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlmodel import Session
from src.core.events.database import get_db_session
from src.db.payments.payments import PaymentsConfig, PaymentsConfigRead, PaymentsConfigUpdate
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.payments.payments_config import (
    init_payments_config,
    get_payments_config,
    update_payments_config,
    delete_payments_config,
)
from src.db.payments.payments_products import PaymentsProductCreate, PaymentsProductRead, PaymentsProductUpdate
from src.services.payments.payments_products import create_payments_product, delete_payments_product, get_payments_product, get_products_by_course, list_payments_products, update_payments_product
from src.services.payments.payments_courses import (
    link_course_to_product,
    unlink_course_from_product,
    get_courses_by_product,
)
from src.services.payments.payments_users import get_owned_courses
from src.services.payments.payments_paystack import initialize_transaction, get_supported_currencies, verify_transaction
from src.services.payments.payments_access import check_course_paid_access
from src.services.payments.payments_users import update_payment_user_status
from src.db.payments.payments_users import PaymentStatusEnum
from src.db.users import InternalUser
from src.services.payments.payments_customers import get_customers
from src.services.payments.webhooks.payments_paystack_webhooks import handle_paystack_webhook
from src.db.courses.courses import Course


router = APIRouter()

@router.post("/{org_id}/config")
async def api_create_payments_config(
    request: Request,
    org_id: int,
    provider: Literal["paystack"],
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsConfig:
    return await init_payments_config(request, org_id, provider, current_user, db_session)


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
    description="Update and activate the payments configuration for an organization. Set 'active' to true to enable payment processing."
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
    return await update_payments_config(request, org_id, payments_config, current_user, db_session)

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
    return await create_payments_product(request, org_id, payments_product, current_user, db_session)

@router.get("/{org_id}/products")
async def api_get_payments_products(
    request: Request,
    org_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[PaymentsProductRead]:
    return await list_payments_products(request, org_id, current_user, db_session)

@router.get("/{org_id}/products/{product_id}")
async def api_get_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsProductRead:
    return await get_payments_product(request, org_id, product_id, current_user, db_session)

@router.put("/{org_id}/products/{product_id}")
async def api_update_payments_product(
    request: Request,
    org_id: int,
    product_id: int,
    payments_product: PaymentsProductUpdate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> PaymentsProductRead:
    return await update_payments_product(request, org_id, product_id, payments_product, current_user, db_session)

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
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    return await get_products_by_course(
        request, org_id, course_id, current_user, db_session
    )

# Payments webhooks

@router.post("/paystack/webhook")
async def api_handle_paystack_webhook(
    request: Request,
    db_session: Session = Depends(get_db_session),
):
    """Handle Paystack webhook events"""
    return await handle_paystack_webhook(request, db_session)

# Payments checkout

@router.post("/{org_id}/checkout/product/{product_id}")
async def api_create_checkout_session(
    request: Request,
    org_id: int,
    product_id: int,
    redirect_uri: str,
    currency: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Initialize Paystack transaction for checkout
    
    Query Parameters:
        redirect_uri: URL to redirect after payment completion
        currency: Optional currency code (ISO 4217). Supported: NGN, USD, GHS, ZAR, KES, XOF
                 If not provided, uses the product's default currency
    
    Example:
        POST /api/v1/payments/{org_id}/checkout/product/{product_id}?redirect_uri=https://example.com/success&currency=USD
    """
    return await initialize_transaction(
        request, org_id, product_id, redirect_uri, currency, current_user, db_session
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
    Verify a Paystack transaction by reference
    
    This endpoint allows you to manually verify a transaction status after payment.
    According to Paystack documentation, you should verify transactions to confirm
    payment status, especially if webhooks are delayed or failed.
    
    The endpoint will:
    1. Verify the transaction with Paystack API
    2. If successful and payment_user_id is found in metadata, update the payment status
    3. Return the transaction details and updated payment status
    
    Args:
        org_id: Organization ID
        reference: Transaction reference from checkout (e.g., "1lg10sbiy4")
    
    Returns:
        Transaction verification details including:
        - Transaction status from Paystack
        - Payment user status (if found)
        - Whether payment status was updated
    """
    from sqlmodel import select
    from src.db.payments.payments_users import PaymentsUser
    
    # Verify transaction with Paystack
    try:
        transaction_data = await verify_transaction(reference)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to verify transaction with Paystack: {str(e)}"
        )
    
    # Extract transaction details
    paystack_status = transaction_data.get("status")
    paystack_data = transaction_data.get("data", {})
    metadata = paystack_data.get("metadata", {})
    payment_user_id = metadata.get("payment_user_id")
    
    # Prepare response
    response = {
        "reference": reference,
        "paystack_status": paystack_status,
        "transaction_data": {
            "amount": paystack_data.get("amount"),
            "currency": paystack_data.get("currency"),
            "gateway_response": paystack_data.get("gateway_response"),
            "paid_at": paystack_data.get("paid_at"),
            "created_at": paystack_data.get("created_at"),
        },
        "payment_user_id": payment_user_id,
        "payment_status_updated": False,
    }
    
    # If transaction is successful and we have a payment_user_id, update the payment status
    if paystack_status == "success" and payment_user_id:
        try:
            # Find the payment user
            payment_user_statement = select(PaymentsUser).where(
                PaymentsUser.id == int(payment_user_id),
                PaymentsUser.org_id == org_id
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
                else:
                    response["payment_status"] = PaymentStatusEnum.COMPLETED.value
            else:
                response["warning"] = f"Payment user {payment_user_id} not found in database"
        except Exception as e:
            response["warning"] = f"Failed to update payment status: {str(e)}"
    
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
    from src.db.payments.payments_users import PaymentsUser, PaymentStatusEnum
    
    # Get course
    course_statement = select(Course).where(Course.id == course_id)
    course = db_session.exec(course_statement).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check course-product link
    course_payment_statement = select(PaymentsCourse).where(PaymentsCourse.course_id == course.id)
    course_payment = db_session.exec(course_payment_statement).first()
    
    # Check user's payment status
    payment_user = None
    if course_payment:
        payment_user_statement = select(PaymentsUser).where(
            PaymentsUser.user_id == current_user.id,
            PaymentsUser.payment_product_id == course_payment.payment_product_id
        )
        payment_user = db_session.exec(payment_user_statement).first()
    
    has_access = await check_course_paid_access(
        course_id=course_id,
        user=current_user,
        db_session=db_session,
        request=request
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
        }
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
    return await get_owned_courses(request, current_user, db_session)

@router.get("/currencies")
async def api_get_supported_currencies(
    request: Request,
):
    """
    Get list of supported currencies for payments
    Returns currency codes with their names, symbols, and subunit information
    """
    return get_supported_currencies()
