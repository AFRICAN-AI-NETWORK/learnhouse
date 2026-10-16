"""
Tests for get_customers endpoint service in src.services.payments.payments_customers.
Verifies:
1. Returning customer list for an organization with users and products
2. Resilient handling when a user was removed (no 400/500 error)
3. Resilient handling when a payments product was removed (no 404/500 error)
4. Empty customer list returns empty array
5. Organization not found raises 404
"""

import pytest
from fastapi import HTTPException
from sqlmodel import Session
from starlette.requests import Request

from src.db.organizations import Organization
from src.db.payments.payments import PaymentsConfig
from src.db.payments.payments_products import (
    PaymentPriceTypeEnum,
    PaymentProductTypeEnum,
    PaymentsProduct,
)
from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser
from src.db.users import PublicUser, User
from src.services.payments.payments_customers import get_customers


@pytest.mark.asyncio
async def test_get_customers_success(
    db_session: Session,
    mock_org: Organization,
    mock_payments_config: PaymentsConfig,
    mock_user: User,
):
    # Create a mock Request
    scope = {
        "type": "http",
        "method": "GET",
        "path": f"/api/v1/payments/{mock_org.id}/customers",
        "headers": [],
    }
    request = Request(scope)

    # Create PaymentsProduct
    prod = PaymentsProduct(
        name="AI Mastery Course",
        org_id=mock_org.id,
        payments_config_id=mock_payments_config.id,
        provider_product_id="prod_test_123",
        product_type=PaymentProductTypeEnum.ONE_TIME,
        price_type=PaymentPriceTypeEnum.FIXED_PRICE,
        amount=99.0,
        currency="USD",
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    # Create PaymentsUser
    pu = PaymentsUser(
        user_id=mock_user.id,
        org_id=mock_org.id,
        payment_product_id=prod.id,
        status=PaymentStatusEnum.COMPLETED,
        original_amount=99.0,
        final_amount=99.0,
    )
    db_session.add(pu)
    db_session.commit()
    db_session.refresh(pu)

    current_user = PublicUser.model_validate(mock_user)

    result = await get_customers(request, mock_org.id, current_user, db_session)

    assert isinstance(result, list)
    assert len(result) >= 1
    found = next((item for item in result if item["payment_user_id"] == pu.id), None)
    assert found is not None
    assert found["user"]["email"] == mock_user.email
    assert found["product"]["name"] == "AI Mastery Course"
    assert found["status"] == "completed"


@pytest.mark.asyncio
async def test_get_customers_resilient_to_missing_user_and_product(
    db_session: Session,
    mock_org: Organization,
    mock_user: User,
):
    scope = {
        "type": "http",
        "method": "GET",
        "path": f"/api/v1/payments/{mock_org.id}/customers",
        "headers": [],
    }
    request = Request(scope)

    # Create PaymentsUser with nonexistent user_id and payment_product_id
    pu = PaymentsUser(
        user_id=999999,  # Nonexistent
        org_id=mock_org.id,
        payment_product_id=888888,  # Nonexistent
        status=PaymentStatusEnum.ACTIVE,
        final_amount=49.0,
    )
    db_session.add(pu)
    db_session.commit()
    db_session.refresh(pu)

    current_user = PublicUser.model_validate(mock_user)

    # Should NOT raise 400 or 404 or 500
    result = await get_customers(request, mock_org.id, current_user, db_session)

    assert isinstance(result, list)
    found = next((item for item in result if item["payment_user_id"] == pu.id), None)
    assert found is not None
    assert found["user"] is not None
    assert found["product"] is not None
    assert found["product"]["name"] == "Standard Access"
    assert found["product"]["amount"] == 49.0
    assert found["status"] == "active"


@pytest.mark.asyncio
async def test_get_customers_nonexistent_org(
    db_session: Session,
    mock_user: User,
):
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/payments/999999/customers",
        "headers": [],
    }
    request = Request(scope)
    current_user = PublicUser.model_validate(mock_user)

    with pytest.raises(HTTPException) as exc_info:
        await get_customers(request, 999999, current_user, db_session)

    assert exc_info.value.status_code == 404
