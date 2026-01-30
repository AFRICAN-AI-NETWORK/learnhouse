import logging
import httpx
from typing import Literal
from fastapi import HTTPException, Request
from sqlmodel import Session, select
from config.config import get_learnhouse_config
from src.db.payments.payments import PaymentsConfigUpdate, PaymentsConfig
from src.db.payments.payments_products import (
    PaymentPriceTypeEnum,
    PaymentProductTypeEnum,
    PaymentsProduct,
)
from src.db.payments.payments_users import PaymentStatusEnum
from src.db.users import AnonymousUser, InternalUser, PublicUser
from src.services.payments.payments_config import (
    get_payments_config,
    update_payments_config,
)
from src.security.features_utils.usage import check_limits_with_usage
from src.services.payments.payments_users import (
    create_payment_user,
    delete_payment_user,
)

logger = logging.getLogger(__name__)

# Paystack API base URL
PAYSTACK_API_BASE_URL = "https://api.paystack.co"


async def get_paystack_secret_key() -> str:
    """Get Paystack secret key from config"""
    learnhouse_config = get_learnhouse_config()
    
    if not learnhouse_config.payments_config.paystack.paystack_secret_key:
        raise HTTPException(status_code=400, detail="Paystack secret key not configured")
    
    return learnhouse_config.payments_config.paystack.paystack_secret_key


async def get_paystack_public_key() -> str:
    """Get Paystack public key from config"""
    learnhouse_config = get_learnhouse_config()
    
    if not learnhouse_config.payments_config.paystack.paystack_public_key:
        raise HTTPException(status_code=400, detail="Paystack public key not configured")
    
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
            if method.upper() == "GET":
                response = await client.get(url, headers=headers)
            elif method.upper() == "POST":
                response = await client.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = await client.put(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = await client.delete(url, headers=headers)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            result = response.json()
            
            if not result.get("status"):
                error_message = result.get("message", "Unknown error")
                raise HTTPException(status_code=400, detail=f"Paystack API error: {error_message}")
            
            return result.get("data", {})
        except httpx.HTTPStatusError as e:
            logger.error(f"Paystack API error: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Paystack API error: {e.response.text}")
        except Exception as e:
            logger.error(f"Error making Paystack request: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error making Paystack request: {str(e)}")


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
            "amount": int(product_data.amount * 100),  # Convert to subunit (kobo for NGN)
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
    if product_data.product_type == PaymentProductTypeEnum.SUBSCRIPTION and product_id.startswith("PLN_"):
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


async def initialize_transaction(
    request: Request,
    org_id: int,
    product_id: int,
    redirect_uri: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    """Initialize a Paystack transaction for checkout"""
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)
    
    # Get product details
    statement = select(PaymentsProduct).where(
        PaymentsProduct.id == product_id, PaymentsProduct.org_id == org_id
    )
    product = db_session.exec(statement).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Create or get Paystack customer
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
                    }
                )
            else:
                raise
        
        # Create initial payment user with pending status
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
        )
        
        if not payment_user:
            raise HTTPException(status_code=400, detail="Error creating payment user")
        
    except Exception as e:
        logger.error(f"Error creating/retrieving customer: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Error creating/retrieving customer: {str(e)}"
        )
    
    # Prepare transaction initialization data
    # Paystack metadata needs to be a JSON string
    import json
    metadata_dict = {
        "product_id": str(product.id),
        "payment_user_id": str(payment_user.id),
        "user_id": str(current_user.id),
        "org_id": str(org_id),
    }
    
    transaction_data = {
        "email": current_user.email,
        "amount": int(product.amount * 100),  # Convert to subunit (kobo for NGN, cents for USD, etc.)
        "currency": product.currency,
        "callback_url": redirect_uri,
        "metadata": json.dumps(metadata_dict),  # Paystack expects metadata as JSON string
    }
    
    # For subscriptions, add plan code
    if product.product_type == PaymentProductTypeEnum.SUBSCRIPTION:
        if product.provider_product_id and product.provider_product_id.startswith("PLN_"):
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
            raise HTTPException(status_code=400, detail="Failed to get authorization URL from Paystack")
        
        # Update payment user with transaction reference
        from src.services.payments.payments_users import update_payment_user_status
        # We'll store the reference in provider_specific_data
        payment_user.provider_specific_data.update({
            "paystack_transaction_reference": reference,
            "paystack_access_code": access_code,
        })
        db_session.add(payment_user)
        db_session.commit()
        
        return {
            "checkout_url": authorization_url,
            "reference": reference,
            "access_code": access_code,
        }
    
    except Exception as e:
        # Clean up payment user if transaction initialization fails
        if payment_user and payment_user.id:
            await delete_payment_user(
                request, org_id, payment_user.id, InternalUser(), db_session
            )
        logger.error(f"Error initializing transaction: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


async def verify_transaction(reference: str) -> dict:
    """Verify a Paystack transaction"""
    return await make_paystack_request("GET", f"/transaction/verify/{reference}")


