import logging

import httpx
import sentry_sdk
from fastapi import HTTPException, Request
from sqlmodel import Session, select

from config.config import get_learnhouse_config
from src.db.courses.courses import Course
from src.db.organizations import Organization
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_products import (PaymentProductTypeEnum,
                                               PaymentsProduct)
from src.db.payments.payments_users import PaymentStatusEnum
from src.db.users import AnonymousUser, InternalUser, PublicUser
from src.security.features_utils.usage import check_limits_with_usage
from src.services.payments.discount_codes import (DiscountValidationError,
                                                  validate_discount_code)
from src.services.payments.payments_users import (create_payment_user,
                                                  delete_payment_user)

logger = logging.getLogger(__name__)

# Paystack API base URL
PAYSTACK_API_BASE_URL = "https://api.paystack.co"

# Paystack supported currencies (ISO 4217 format)
PAYSTACK_SUPPORTED_CURRENCIES = {
    "NGN",  # Nigerian Naira
    "USD",  # US Dollar
    "GHS",  # Ghanaian Cedi
    "ZAR",  # South African Rand
    "KES",  # Kenyan Shilling
    "XOF",  # West African CFA Franc
}

# Currency information for display
PAYSTACK_CURRENCY_INFO = {
    "NGN": {"name": "Nigerian Naira", "symbol": "₦", "subunit": "Kobo"},
    "USD": {"name": "US Dollar", "symbol": "$", "subunit": "Cent"},
    "GHS": {"name": "Ghanaian Cedi", "symbol": "₵", "subunit": "Pesewa"},
    "ZAR": {"name": "South African Rand", "symbol": "R", "subunit": "Cent"},
    "KES": {"name": "Kenyan Shilling", "symbol": "Ksh.", "subunit": "Cent"},
    "XOF": {"name": "West African CFA Franc", "symbol": "CFA", "subunit": "Centime"},
}


def get_supported_currencies() -> dict:
    """Get list of supported currencies with their information"""
    return {
        code: {"code": code, **info} for code, info in PAYSTACK_CURRENCY_INFO.items()
    }


async def get_paystack_secret_key() -> str:
    """Get Paystack secret key from config"""
    learnhouse_config = get_learnhouse_config()

    if not learnhouse_config.payments_config.paystack.paystack_secret_key:
        raise HTTPException(
            status_code=400, detail="Paystack secret key not configured"
        )

    return learnhouse_config.payments_config.paystack.paystack_secret_key


async def get_paystack_public_key() -> str:
    """Get Paystack public key from config"""
    learnhouse_config = get_learnhouse_config()

    if not learnhouse_config.payments_config.paystack.paystack_public_key:
        raise HTTPException(
            status_code=400, detail="Paystack public key not configured"
        )

    return learnhouse_config.payments_config.paystack.paystack_public_key


async def make_paystack_request(
    method: str,
    endpoint: str,
    data: dict | None = None,
    secret_key: str | None = None,
) -> dict:
    """Make a request to Paystack API"""
    if secret_key is None:
        secret_key = await get_paystack_secret_key()

    url = f"{PAYSTACK_API_BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Making Paystack {method} request to {endpoint}")
            if data:
                logger.debug(f"Request data: {data}")

            with sentry_sdk.start_span(
                op="payment.paystack", description=f"{method.upper()} {endpoint}"
            ):
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers)
                elif method.upper() == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method.upper() == "PUT":
                    response = await client.put(url, headers=headers, json=data)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, headers=headers)
                else:
                    raise HTTPException(
                        status_code=400, detail=f"Unsupported HTTP method: {method}"
                    )

            response.raise_for_status()
            result = response.json()

            if not result.get("status"):
                error_message = result.get("message", "Unknown error")
                logger.exception(f"Paystack API returned error: {error_message}")
                raise HTTPException(
                    status_code=400, detail=f"Paystack API error: {error_message}"
                )

            return result.get("data", {})
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Paystack HTTP error {e.response.status_code}: {e.response.text}"
            )
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Paystack API error: {e.response.text}",
            )
        except httpx.RequestError as e:
            logger.error(f"Request error to Paystack: {e!s}")
            raise HTTPException(
                status_code=500, detail=f"Error connecting to Paystack: {e!s}"
            )
        except Exception as e:  # noqa: BLE001
            logger.error(
                f"Unexpected error making Paystack request: {e!s}")
            raise HTTPException(
                status_code=500, detail=f"Error making Paystack request: {e!s}"
            )


async def create_paystack_customer(
    email: str,
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
    metadata: dict | None = None,
) -> dict:
    """Create a customer in Paystack"""
    customer_data = {
        "email": email,
    }

    if first_name:
        customer_data["first_name"] = first_name
    if last_name:
        customer_data["last_name"] = last_name
    if phone:
        customer_data["phone"] = phone
    if metadata:
        customer_data["metadata"] = metadata

    return await make_paystack_request("POST", "/customer", customer_data)


async def get_paystack_customer(email_or_code: str) -> dict:
    """Get a customer from Paystack by email or customer code"""
    return await make_paystack_request("GET", f"/customer/{email_or_code}")


async def create_paystack_product(
    request: Request,
    org_id: int,
    product_data: PaymentsProduct,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    """Create a product in Paystack (Paystack doesn't have products API, so we'll use plans for subscriptions)"""
    # Paystack doesn't have a products API
    # For one-time payments, we'll create a plan with a single invoice
    # For subscriptions, we'll create a plan

    if product_data.product_type == PaymentProductTypeEnum.SUBSCRIPTION:
        # Create a plan for subscriptions
        plan_data = {
            "name": product_data.name,
            "amount": int(
                product_data.amount * 100
            ),  # Convert to subunit (kobo for NGN)
            "interval": "monthly",  # Paystack supports: daily, weekly, monthly, annually
            "currency": product_data.currency,
        }

        if product_data.description:
            plan_data["description"] = product_data.description

        plan = await make_paystack_request("POST", "/plan", plan_data)

        # Return plan data
        return {
            "id": plan.get("plan_code"),
            "plan_code": plan.get("plan_code"),
            "type": "plan",
        }
    else:
        # For one-time payments, Paystack doesn't require a product/plan
        # We'll return a placeholder that will be used during transaction initialization
        return {
            "id": f"product_{product_data.id}",
            "type": "one_time",
        }


async def archive_paystack_product(
    request: Request,
    org_id: int,
    product_id: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    """Archive a Paystack product/plan"""
    # Check if it's a plan (subscription) or one-time product
    if product_id.startswith("PLN_"):
        # It's a plan, update it to be inactive
        # Paystack doesn't have an archive endpoint for plans, so we'll just return success
        # In production, you might want to track this in your database
        return {"id": product_id, "active": False}
    else:
        # One-time products don't exist in Paystack, just return success
        return {"id": product_id, "active": False}


async def update_paystack_product(
    request: Request,
    org_id: int,
    product_id: str,
    product_data: PaymentsProduct,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    """Update a Paystack product/plan"""
    if (
        product_data.product_type == PaymentProductTypeEnum.SUBSCRIPTION
        and product_id.startswith("PLN_")
    ):
        # Update plan
        plan_data = {
            "name": product_data.name,
            "amount": int(product_data.amount * 100),
            "interval": "monthly",
            "currency": product_data.currency,
        }

        if product_data.description:
            plan_data["description"] = product_data.description

        # Paystack doesn't support updating plans directly
        # We need to create a new plan and update the product reference
        # For now, we'll return the existing plan
        existing_plan = await make_paystack_request("GET", f"/plan/{product_id}")
        return existing_plan
    else:
        # One-time products don't need updates in Paystack
        return {"id": product_id}


def validate_currency(currency: str) -> None:
    """Validate that currency is supported by Paystack"""
    currency_upper = currency.upper()
    if currency_upper not in PAYSTACK_SUPPORTED_CURRENCIES:
        raise HTTPException(
            status_code=400,
            detail=f"Currency {currency} is not supported. Supported currencies: {', '.join(sorted(PAYSTACK_SUPPORTED_CURRENCIES))}",
        )


async def initialize_transaction(
    request: Request,
    org_id: int,
    product_id: int,
    redirect_uri: str,
    currency: str | None = None,
    discount_code: str | None = None,
    current_user: PublicUser | AnonymousUser = None,
    db_session: Session = None,
) -> dict:
    """Initialize a Paystack transaction for checkout

    Args:
        request: FastAPI request object
        org_id: Organization ID
        product_id: Product ID
        redirect_uri: URL to redirect after payment
        currency: Optional currency code (ISO 4217). If not provided, uses product's default currency
        discount_code: Optional discount code to apply
        current_user: Current user making the payment
        db_session: Database session
    """
    # Check if payments feature is enabled
    with sentry_sdk.start_span(
        op="payment.initialize", description="Initialize Paystack transaction"
    ):
        check_limits_with_usage("payments", org_id, db_session)

    # Get product details
    statement = select(PaymentsProduct).where(
        PaymentsProduct.id == product_id, PaymentsProduct.org_id == org_id
    )
    product = db_session.exec(statement).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Get organization payment config to check for subaccount
    from src.db.payments.payments import PaymentsConfig

    config_statement = select(PaymentsConfig).where(
        PaymentsConfig.org_id == org_id,
        PaymentsConfig.active == True,
        PaymentsConfig.provider == "paystack",
    )
    org_payment_config = db_session.exec(config_statement).first()

    # Determine currency to use
    selected_currency = currency.upper() if currency else product.currency.upper()

    # Validate currency
    validate_currency(selected_currency)

    # Get course_id from product (if product is linked to a course)
    course_statement = select(PaymentsCourse).where(
        PaymentsCourse.payment_product_id == product_id, PaymentsCourse.org_id == org_id
    )
    payment_course = db_session.exec(course_statement).first()
    course_id = payment_course.course_id if payment_course else None

    # Initialize discount variables
    discount_code_obj = None
    original_amount = product.amount
    discount_amount = 0.0
    final_amount = product.amount

    # CRITICAL: Validate discount code if provided (prevents race conditions)
    if discount_code:
        try:
            (
                discount_code_obj,
                discount_amount,
                final_amount,
            ) = await validate_discount_code(
                code=discount_code,
                org_id=org_id,
                user_id=current_user.id,
                course_id=course_id,
                product_id=product_id,
                original_amount=original_amount,
                db_session=db_session,
                check_usage=True,
            )
            logger.info(
                f"Discount code validated: {discount_code}, discount={discount_amount}, final={final_amount}"
            )
        except DiscountValidationError as e:
            logger.warning(f"Discount code validation failed: {e!s}")
            raise HTTPException(
                status_code=400, detail=f"Discount code error: {e!s}"
            )
        except Exception as e:  # noqa: BLE001
            logger.error(f"Error validating discount code: {e!s}")
            raise HTTPException(
                status_code=400, detail=f"Error validating discount code: {e!s}"
            )

    # REFERRAL SYSTEM: Check if user has referral tracking
    referral_code_id = None
    try:
        from src.db.referrals.referral_tracking import ReferralTracking

        tracking_statement = select(ReferralTracking).where(
            ReferralTracking.referred_user_id == current_user.id
        )
        tracking = db_session.exec(tracking_statement).first()

        if tracking:
            referral_code_id = tracking.referral_code_id
            logger.info(
                f"User {current_user.id} has referral tracking with code {referral_code_id}"
            )
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Error checking referral tracking: {e!s}")

    # Prepare transaction metadata template
    metadata_dict = {
        "product_id": str(product.id),
        "user_id": str(current_user.id),
        "org_id": str(org_id),
        "selected_currency": selected_currency,
        "product_currency": product.currency,
        "product_amount": str(product.amount),
    }

    if discount_code_obj:
        metadata_dict["discount_code_id"] = str(discount_code_obj.id)
        metadata_dict["discount_code"] = discount_code_obj.code
        metadata_dict["original_amount"] = str(original_amount)
        metadata_dict["discount_amount"] = str(discount_amount)
        metadata_dict["final_amount"] = str(final_amount)
        if course_id:
            metadata_dict["course_id"] = str(course_id)

    # Calculate amount in subunit
    amount_to_charge = final_amount if discount_code_obj else product.amount
    amount_in_subunit = int(amount_to_charge * 100)

    # CRITICAL: Bypassing Paystack for Free Products ($0)
    if amount_in_subunit == 0:
        logger.info(
            f"Amount is 0 for product {product_id}. Bypassing Paystack checkout."
        )

        # Create payment user without Paystack customer data
        payment_user = await create_payment_user(
            request=request,
            org_id=org_id,
            user_id=current_user.id,
            product_id=product_id,
            status=PaymentStatusEnum.COMPLETED,
            provider_data={
                "bypass_reason": "free_product_or_100_percent_discount",
                "selected_currency": selected_currency,
                "product_currency": product.currency,
            },
            current_user=InternalUser(),
            db_session=db_session,
            referral_code_id=referral_code_id,
        )

        if not payment_user:
            raise HTTPException(status_code=400, detail="Error creating payment user")

        # Update metadata for redirect construction
        # If it's a single-course product, redirect to that course page instead of the general dashboard
        target_redirect = redirect_uri

        # Check if product is linked to exactly one course
        statement = select(PaymentsCourse).where(
            PaymentsCourse.payment_product_id == product_id
        )
        linked_courses = db_session.exec(statement).all()

        if len(linked_courses) == 1:
            course = db_session.get(Course, linked_courses[0].course_id)
            if course:
                # Get org slug for URL construction
                statement = select(Organization).where(Organization.id == org_id)
                org = db_session.exec(statement).first()
                if org:
                    # Robust base URL detection
                    config = get_learnhouse_config()
                    base_url = config.hosting_config.app_base_url.rstrip("/")

                    if request:
                        origin = request.headers.get("origin")
                        referer = request.headers.get("referer")

                        if origin:
                            base_url = origin.rstrip("/")
                        elif referer:
                            from urllib.parse import urlparse

                            parsed = urlparse(referer)
                            base_url = f"{parsed.scheme}://{parsed.netloc}"

                    target_redirect = (
                        f"{base_url}/course/{course.course_uuid.replace('course_', '')}"
                    )

        separator = "&" if "?" in target_redirect else "?"
        success_url = f"{target_redirect}{separator}payment_success=true&reference=free_{payment_user.id}"
        return {
            "checkout_url": success_url,
            "reference": f"free_{payment_user.id}",
            "access_code": "free_bypass",
        }

    # FOR PAID PRODUCTS ONLY: Create or get Paystack customer
    try:
        try:
            customer = await get_paystack_customer(current_user.email)
        except HTTPException as e:
            # Customer doesn't exist (404), create one
            if e.status_code == 404:
                customer = await create_paystack_customer(
                    email=current_user.email,
                    metadata={
                        "user_id": str(current_user.id),
                        "org_id": str(org_id),
                    },
                )
            else:
                raise

        # Create payment_user for paid product
        payment_user = await create_payment_user(
            request=request,
            org_id=org_id,
            user_id=current_user.id,
            product_id=product_id,
            status=PaymentStatusEnum.PENDING,
            provider_data={
                "paystack_customer": customer,
                "paystack_customer_code": customer.get("customer_code"),
            },
            current_user=InternalUser(),
            db_session=db_session,
            referral_code_id=referral_code_id,
        )

        if not payment_user:
            raise HTTPException(status_code=400, detail="Error creating payment user")

        # Update payment_user with discount information if applicable
        if discount_code_obj:
            payment_user.discount_code_id = discount_code_obj.id
            payment_user.original_amount = original_amount
            payment_user.discount_amount = discount_amount
            payment_user.final_amount = final_amount
            db_session.add(payment_user)
            db_session.commit()
            db_session.refresh(payment_user)

    except Exception as e:  # noqa: BLE001
        logger.error(f"Error creating/retrieving customer: {e!s}")
        raise HTTPException(
            status_code=400, detail=f"Error creating/retrieving customer: {e!s}"
        )

    # Prepare PAID transaction initialization data
    import json

    metadata_dict["payment_user_id"] = str(payment_user.id)

    transaction_data = {
        "email": current_user.email,
        "amount": amount_in_subunit,
        "currency": selected_currency,
        "callback_url": redirect_uri,
        "metadata": json.dumps(metadata_dict),
    }

    # Add Paystack Subaccount if configured by the Organization
    if org_payment_config and org_payment_config.provider_specific_id:
        transaction_data["subaccount"] = org_payment_config.provider_specific_id

    # For subscriptions, add plan code
    if product.product_type == PaymentProductTypeEnum.SUBSCRIPTION:
        if product.provider_product_id and product.provider_product_id.startswith(
            "PLN_"
        ):
            transaction_data["plan"] = product.provider_product_id

    # Initialize transaction
    try:
        transaction_response = await make_paystack_request(
            "POST", "/transaction/initialize", transaction_data
        )

        authorization_url = transaction_response.get("authorization_url")
        reference = transaction_response.get("reference")
        access_code = transaction_response.get("access_code")

        if not authorization_url:
            raise HTTPException(
                status_code=400, detail="Failed to get authorization URL from Paystack"
            )

        # Update payment user with transaction reference and selected currency
        # We'll store the reference and currency in provider_specific_data
        payment_user.provider_specific_data.update(
            {
                "paystack_transaction_reference": reference,
                "paystack_access_code": access_code,
                "selected_currency": selected_currency,
                "product_currency": product.currency,
            }
        )
        db_session.add(payment_user)
        db_session.commit()

        return {
            "checkout_url": authorization_url,
            "reference": reference,
            "access_code": access_code,
        }

    except Exception as e:  # noqa: BLE001
        # Clean up payment user if transaction initialization fails
        if payment_user and payment_user.id:
            await delete_payment_user(
                request, org_id, payment_user.id, InternalUser(), db_session
            )
        logger.error(f"Error initializing transaction: {e!s}")
        raise HTTPException(status_code=400, detail=str(e))


async def verify_transaction(reference: str) -> dict:
    """Verify a Paystack transaction

    Returns the full Paystack response including status and data fields.
    The data field contains transaction details like amount, currency, metadata, etc.
    """
    # Make request and get the data portion
    transaction_data = await make_paystack_request(
        "GET", f"/transaction/verify/{reference}"
    )

    # Return in the format expected by the endpoint (with status and data keys)
    return {
        "status": "success",  # If make_paystack_request didn't throw, it was successful
        "data": transaction_data,
    }
