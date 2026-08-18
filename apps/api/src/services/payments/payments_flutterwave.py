import logging
import uuid

import httpx
import sentry_sdk
from fastapi import HTTPException, Request
from sqlmodel import Session, select

from config.config import get_learnhouse_config
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_products import PaymentProductTypeEnum, PaymentsProduct
from src.db.payments.payments_users import PaymentStatusEnum
from src.db.users import AnonymousUser, InternalUser, PublicUser
from src.security.features_utils.usage import check_limits_with_usage
from src.services.payments.discount_codes import validate_discount_code
from src.services.payments.payments_users import (
    create_payment_user,
    delete_payment_user,
)

logger = logging.getLogger(__name__)

# Flutterwave API base URL
FLUTTERWAVE_API_BASE_URL = "https://api.flutterwave.com/v3"

# Supported currencies
FLUTTERWAVE_SUPPORTED_CURRENCIES = {
    "NGN",
    "USD",
    "GHS",
    "ZAR",
    "KES",
    "XOF",
    "XAF",
    "GBP",
    "EUR",
    "RWF",
}

FLUTTERWAVE_CURRENCY_INFO = {
    "NGN": {"name": "Nigerian Naira", "symbol": "₦", "subunit": "Kobo"},
    "USD": {"name": "US Dollar", "symbol": "$", "subunit": "Cent"},
    "GHS": {"name": "Ghanaian Cedi", "symbol": "₵", "subunit": "Pesewa"},
    "ZAR": {"name": "South African Rand", "symbol": "R", "subunit": "Cent"},
    "KES": {"name": "Kenyan Shilling", "symbol": "Ksh.", "subunit": "Cent"},
    "XOF": {"name": "West African CFA Franc", "symbol": "CFA", "subunit": "Centime"},
    "XAF": {
        "name": "Central African CFA Franc",
        "symbol": "FCFA",
        "subunit": "Centime",
    },
    "GBP": {"name": "British Pound", "symbol": "£", "subunit": "Penny"},
    "EUR": {"name": "Euro", "symbol": "€", "subunit": "Cent"},
    "RWF": {"name": "Rwandan Franc", "symbol": "FRw", "subunit": "Cent"},
}


def get_supported_currencies() -> dict:
    return {
        code: {"code": code, **info} for code, info in FLUTTERWAVE_CURRENCY_INFO.items()
    }


async def get_flutterwave_secret_key() -> str:
    config = get_learnhouse_config()
    key = config.payments_config.flutterwave.flutterwave_secret_key
    if not key:
        raise HTTPException(
            status_code=400, detail="Flutterwave secret key not configured"
        )
    return key


async def get_flutterwave_public_key() -> str:
    config = get_learnhouse_config()
    key = config.payments_config.flutterwave.flutterwave_public_key
    if not key:
        raise HTTPException(
            status_code=400, detail="Flutterwave public key not configured"
        )
    return key


async def make_flutterwave_request(
    method: str,
    endpoint: str,
    data: dict | None = None,
    secret_key: str | None = None,
) -> dict:
    if secret_key is None:
        secret_key = await get_flutterwave_secret_key()

    url = f"{FLUTTERWAVE_API_BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Making Flutterwave {method} request to {endpoint}")
            with sentry_sdk.start_span(
                op="payment.flutterwave", description=f"{method.upper()} {endpoint}"
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

            if response.status_code >= 400:
                error_data = {}
                try:
                    error_data = response.json()
                except Exception:  # noqa: BLE001
                    pass
                msg = error_data.get("message", response.text)
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Flutterwave API error: {msg}",
                )

            result = response.json()
            if result.get("status") not in ["success", "error"]:
                # Flutterwave often returns 'success' or 'error' in status
                pass

            return result.get("data", result)

        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Flutterwave API error: {e.response.text}",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=500, detail=f"Error connecting to Flutterwave: {e!s}"
            )


async def create_flutterwave_customer(
    email: str,
    first_name: str | None = None,
    last_name: str | None = None,
    phone: str | None = None,
    metadata: dict | None = None,
) -> dict:
    # Flutterwave creates customers automatically on first transaction.
    # We can just return a dummy customer representation for internal compatibility.
    return {
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "phone": phone,
        "metadata": metadata,
        "customer_code": email,  # use email as identifier
    }


async def get_flutterwave_customer(email_or_code: str) -> dict:
    # No exact equivalent for fetching customer upfront without a transaction in FW
    # We'll return dummy data matching what create_flutterwave_customer returns
    return {"email": email_or_code, "customer_code": email_or_code}


async def create_flutterwave_product(
    request: Request,
    org_id: int,
    product_data: PaymentsProduct,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    if product_data.product_type == PaymentProductTypeEnum.SUBSCRIPTION:
        interval_map = {
            "monthly": "monthly",
            "yearly": "yearly",
            "weekly": "weekly",
            "daily": "daily",
        }
        interval = interval_map.get(
            product_data.interval.value if product_data.interval else "monthly",
            "monthly",
        )

        plan_data = {
            "amount": float(product_data.amount),
            "name": product_data.name,
            "interval": interval,
            "duration": 0,  # 0 means run indefinitely
        }

        plan = await make_flutterwave_request("POST", "/payment-plans", plan_data)

        plan_id = str(plan.get("id"))
        return {
            "id": plan_id,
            "plan_code": plan_id,
            "type": "plan",
        }
    else:
        return {
            "id": f"product_{product_data.id}",
            "type": "one_time",
        }


async def archive_flutterwave_product(
    request: Request,
    org_id: int,
    product_id: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    if product_id.isdigit():
        # It's a payment plan
        try:
            await make_flutterwave_request("PUT", f"/payment-plans/{product_id}/cancel")
        except Exception:  # noqa: BLE001
            pass
    return {"id": product_id, "active": False}


async def update_flutterwave_product(
    request: Request,
    org_id: int,
    product_id: str,
    product_data: PaymentsProduct,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    if (
        product_data.product_type == PaymentProductTypeEnum.SUBSCRIPTION
        and product_id.isdigit()
    ):
        interval = product_data.interval.value if product_data.interval else "monthly"
        plan_data = {
            "name": product_data.name,
            "amount": float(product_data.amount),
            "interval": interval,
        }
        updated_plan = await make_flutterwave_request(
            "PUT", f"/payment-plans/{product_id}", plan_data
        )
        return updated_plan
    else:
        return {"id": product_id}


def validate_currency(currency: str) -> None:
    if currency.upper() not in FLUTTERWAVE_SUPPORTED_CURRENCIES:
        raise HTTPException(
            status_code=400,
            detail=f"Currency {currency} is not supported. Supported currencies: {', '.join(sorted(FLUTTERWAVE_SUPPORTED_CURRENCIES))}",
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
    with sentry_sdk.start_span(
        op="payment.initialize", description="Initialize Flutterwave transaction"
    ):
        check_limits_with_usage("payments", org_id, db_session)

    statement = select(PaymentsProduct).where(
        PaymentsProduct.id == product_id, PaymentsProduct.org_id == org_id
    )
    product = db_session.exec(statement).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    from src.db.payments.payments import PaymentsConfig

    config_statement = select(PaymentsConfig).where(
        PaymentsConfig.org_id == org_id,
        PaymentsConfig.active == True,
        PaymentsConfig.provider == "flutterwave",
    )
    org_payment_config = db_session.exec(config_statement).first()

    selected_currency = currency.upper() if currency else product.currency.upper()
    validate_currency(selected_currency)

    course_statement = select(PaymentsCourse).where(
        PaymentsCourse.payment_product_id == product_id, PaymentsCourse.org_id == org_id
    )
    payment_course = db_session.exec(course_statement).first()
    course_id = payment_course.course_id if payment_course else None

    discount_code_obj = None
    original_amount = product.amount
    discount_amount = 0.0
    final_amount = product.amount

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
        except Exception as e:  # noqa: BLE001
            raise HTTPException(
                status_code=400, detail=f"Discount code error: {e!s}"
            )

    referral_code_id = None
    try:
        from src.db.referrals.referral_tracking import ReferralTracking

        tracking_statement = select(ReferralTracking).where(
            ReferralTracking.referred_user_id == current_user.id
        )
        tracking = db_session.exec(tracking_statement).first()
        if tracking:
            referral_code_id = tracking.referral_code_id
    except Exception:  # noqa: BLE001
        pass

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

    amount_to_charge = final_amount if discount_code_obj else product.amount

    if product.currency.upper() != selected_currency.upper():
        from src.services.referrals.payouts import get_usd_to_currency_exchange_rate
        
        amount_in_usd = amount_to_charge
        if product.currency.upper() != "USD":
            base_rate = await get_usd_to_currency_exchange_rate(product.currency.upper())
            amount_in_usd = amount_to_charge / base_rate if base_rate else amount_to_charge
            
        if selected_currency.upper() != "USD":
            target_rate = await get_usd_to_currency_exchange_rate(selected_currency.upper())
            amount_to_charge = amount_in_usd * target_rate if target_rate else amount_in_usd
        else:
            amount_to_charge = amount_in_usd
            
        amount_to_charge = round(amount_to_charge, 2)


    if amount_to_charge <= 0:
        payment_user = await create_payment_user(
            request=request,
            org_id=org_id,
            user_id=current_user.id,
            product_id=product_id,
            status=PaymentStatusEnum.COMPLETED,
            provider_data={
                "bypass_reason": "free_product",
                "selected_currency": selected_currency,
            },
            current_user=InternalUser(),
            db_session=db_session,
            referral_code_id=referral_code_id,
        )
        separator = "&" if "?" in redirect_uri else "?"
        success_url = f"{redirect_uri}{separator}payment_success=true&reference=free_{payment_user.id}"
        return {
            "checkout_url": success_url,
            "reference": f"free_{payment_user.id}",
            "access_code": "free_bypass",
        }

    customer = await create_flutterwave_customer(
        current_user.email, current_user.first_name, current_user.last_name
    )

    payment_user = await create_payment_user(
        request=request,
        org_id=org_id,
        user_id=current_user.id,
        product_id=product_id,
        status=PaymentStatusEnum.PENDING,
        provider_data={
            "flutterwave_customer": customer,
            "customer_code": customer.get("customer_code"),
        },
        current_user=InternalUser(),
        db_session=db_session,
        referral_code_id=referral_code_id,
    )

    if discount_code_obj:
        payment_user.discount_code_id = discount_code_obj.id
        payment_user.original_amount = original_amount
        payment_user.discount_amount = discount_amount
        payment_user.final_amount = final_amount
        db_session.add(payment_user)
        db_session.commit()
        db_session.refresh(payment_user)

    tx_ref = f"LH_{payment_user.id}_{uuid.uuid4().hex[:8]}"
    metadata_dict["payment_user_id"] = str(payment_user.id)

    transaction_data = {
        "tx_ref": tx_ref,
        "amount": str(amount_to_charge),  # Flutterwave uses decimal amount, not subunit
        "currency": selected_currency,
        "redirect_url": redirect_uri,
        "customer": {
            "email": current_user.email,
            "name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(),
        },
        "meta": metadata_dict,
    }

    if org_payment_config and org_payment_config.provider_specific_id:
        transaction_data["subaccounts"] = [
            {"id": org_payment_config.provider_specific_id}
        ]

    if product.product_type == PaymentProductTypeEnum.SUBSCRIPTION:
        if product.provider_product_id:
            transaction_data["payment_plan"] = product.provider_product_id

    try:
        transaction_response = await make_flutterwave_request(
            "POST", "/payments", transaction_data
        )
        authorization_url = transaction_response.get("link")

        if not authorization_url:
            raise HTTPException(
                status_code=400,
                detail="Failed to get authorization URL from Flutterwave",
            )

        payment_user.provider_specific_data.update(
            {
                "flutterwave_tx_ref": tx_ref,
                "selected_currency": selected_currency,
            }
        )
        db_session.add(payment_user)
        db_session.commit()

        return {
            "checkout_url": authorization_url,
            "reference": tx_ref,
        }

    except Exception as e:  # noqa: BLE001
        if payment_user and payment_user.id:
            await delete_payment_user(
                request, org_id, payment_user.id, InternalUser(), db_session
            )
        raise HTTPException(status_code=400, detail=str(e))


async def verify_transaction(reference: str) -> dict:
    # Flutterwave verify expects the transaction ID (which is returned in webhook or callback as transaction_id)
    # If reference passed here is tx_ref, we need a different endpoint: /transactions/verify_by_reference?tx_ref={reference}
    # Let's use verify_by_reference
    try:
        data = await make_flutterwave_request(
            "GET", f"/transactions/verify_by_reference?tx_ref={reference}"
        )
        return {"status": "success", "data": data}
    except HTTPException as e:
        if e.status_code == 404:
            return {"status": "error", "message": "Transaction not found"}
        raise
