"""Tests for Flutterwave multi-currency payment_options and subscription auto_renew behavior."""

from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlmodel import Session, select

from src.db.payments.payments import PaymentsConfig
from src.db.payments.payments_products import (
    PaymentIntervalEnum,
    PaymentPriceTypeEnum,
    PaymentProductTypeEnum,
    PaymentsProduct,
)
from src.db.payments.payments_users import PaymentsUser
from src.services.payments import payments_flutterwave as fw
from src.services.referrals import payouts as payouts_module


def _fake_request():
    return SimpleNamespace(headers={}, cookies={}, state=SimpleNamespace())


def _fake_public_user(mock_user):
    return SimpleNamespace(
        id=mock_user.id,
        email=mock_user.email,
        first_name=mock_user.first_name,
        last_name=mock_user.last_name,
        user_uuid=mock_user.user_uuid,
    )


def _create_subscription_product(
    db_session: Session,
    org_id: int,
    config_id: int,
    currency: str = "USD",
    amount: float = 10.0,
    plan_id: str = "98765",
) -> PaymentsProduct:
    product = PaymentsProduct(
        org_id=org_id,
        payments_config_id=config_id,
        name="AINA Pro Monthly",
        description="Monthly subscription track",
        product_type=PaymentProductTypeEnum.SUBSCRIPTION,
        price_type=PaymentPriceTypeEnum.FIXED_PRICE,
        interval=PaymentIntervalEnum.MONTHLY,
        amount=amount,
        currency=currency,
        provider_product_id=plan_id,
        benefits="Full track access",
        creation_date=datetime.now(UTC),
        update_date=datetime.now(UTC),
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def test_currency_payment_options_mapping():
    assert fw.get_payment_options_for_currency("NGN") == (
        "card, banktransfer, ussd, account, opay, nqr"
    )
    assert fw.get_payment_options_for_currency("ngn") == (
        "card, banktransfer, ussd, account, opay, nqr"
    )
    assert "mobilemoneyghana" in fw.get_payment_options_for_currency("GHS")
    assert "mpesa" in fw.get_payment_options_for_currency("KES")
    assert "mobilemoneyuganda" in fw.get_payment_options_for_currency("UGX")
    assert "mobilemoneyrwanda" in fw.get_payment_options_for_currency("RWF")
    assert "mobilemoneytanzania" in fw.get_payment_options_for_currency("TZS")
    assert "mobilemoneyzambia" in fw.get_payment_options_for_currency("ZMW")
    assert "1voucher" in fw.get_payment_options_for_currency("ZAR")
    assert "mobilemoneyfranco" in fw.get_payment_options_for_currency("XOF")
    assert "mobilemoneyfranco" in fw.get_payment_options_for_currency("XAF")
    assert fw.get_payment_options_for_currency("UNKNOWN") == "card"


def test_validate_currency_supports_all_configured_currencies():
    for code in (
        "NGN",
        "USD",
        "GHS",
        "ZAR",
        "KES",
        "UGX",
        "TZS",
        "ZMW",
        "XOF",
        "XAF",
        "GBP",
        "EUR",
        "RWF",
    ):
        fw.validate_currency(code)

    with pytest.raises(HTTPException) as exc_info:
        fw.validate_currency("XXX")
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_subscription_defaults_to_all_currency_payment_options_without_payment_plan(
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
    monkeypatch,
):
    product = _create_subscription_product(
        db_session, mock_org.id, mock_payments_config.id
    )
    captured_requests: list[tuple[str, str, dict | None]] = []

    async def fake_fw_request(
        method: str, endpoint: str, data: dict | None = None, secret_key=None
    ):
        captured_requests.append((method, endpoint, data))
        return {"link": "https://checkout.flutterwave.com/v3/hosted/pay/mock-ngn"}

    async def fake_fx(target_currency: str = "NGN") -> float:
        return {"NGN": 1500.0}.get(target_currency.upper(), 1.0)

    monkeypatch.setattr(fw, "make_flutterwave_request", fake_fw_request)
    monkeypatch.setattr(fw, "check_limits_with_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(payouts_module, "get_usd_to_currency_exchange_rate", fake_fx)

    result = await fw.initialize_transaction(
        request=_fake_request(),
        org_id=mock_org.id,
        product_id=product.id,
        redirect_uri="https://app.example.com/frontend-dev",
        currency="NGN",
        current_user=_fake_public_user(mock_user),
        db_session=db_session,
    )

    assert result["checkout_url"].startswith("https://checkout.flutterwave.com/")
    assert len(captured_requests) == 1
    method, endpoint, payload = captured_requests[0]
    assert method == "POST"
    assert endpoint == "/payments"
    assert payload is not None
    assert payload["currency"] == "NGN"
    assert payload["amount"] == "15000.0"
    assert payload["payment_options"] == fw.get_payment_options_for_currency("NGN")
    assert "payment_plan" not in payload

    saved_pu = db_session.exec(
        select(PaymentsUser).where(PaymentsUser.user_id == mock_user.id)
    ).first()
    assert saved_pu is not None
    assert saved_pu.provider_specific_data.get("selected_currency") == "NGN"
    assert saved_pu.provider_specific_data.get("auto_renew") is False
    assert saved_pu.provider_specific_data.get(
        "payment_options"
    ) == fw.get_payment_options_for_currency("NGN")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("currency", "rate"),
    [
        ("NGN", 1500.0),
        ("GHS", 15.0),
        ("KES", 130.0),
        ("UGX", 3800.0),
        ("RWF", 1300.0),
        ("TZS", 2500.0),
        ("ZMW", 27.0),
        ("ZAR", 18.0),
        ("USD", 1.0),
    ],
)
async def test_currency_switching_populates_matching_payment_options(
    currency: str,
    rate: float,
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
    monkeypatch,
):
    product = _create_subscription_product(
        db_session, mock_org.id, mock_payments_config.id
    )
    captured_payloads: list[dict] = []

    async def fake_fw_request(
        method: str, endpoint: str, data: dict | None = None, secret_key=None
    ):
        if method == "POST" and endpoint == "/payments" and data:
            captured_payloads.append(data)
        return {"link": f"https://checkout.flutterwave.com/pay/{currency}"}

    async def fake_fx(target_currency: str = "NGN") -> float:
        return rate

    monkeypatch.setattr(fw, "make_flutterwave_request", fake_fw_request)
    monkeypatch.setattr(fw, "check_limits_with_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(payouts_module, "get_usd_to_currency_exchange_rate", fake_fx)

    await fw.initialize_transaction(
        request=_fake_request(),
        org_id=mock_org.id,
        product_id=product.id,
        redirect_uri="https://app.example.com/courses",
        currency=currency,
        current_user=_fake_public_user(mock_user),
        db_session=db_session,
        auto_renew=False,
    )

    assert len(captured_payloads) == 1
    payload = captured_payloads[0]
    assert payload["currency"] == currency
    assert payload["payment_options"] == fw.get_payment_options_for_currency(currency)
    assert "payment_plan" not in payload


@pytest.mark.asyncio
async def test_subscription_with_auto_renew_attaches_payment_plan_and_card_only(
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
    monkeypatch,
):
    product = _create_subscription_product(
        db_session,
        mock_org.id,
        mock_payments_config.id,
        currency="USD",
        plan_id="98765",
    )
    captured_requests: list[tuple[str, str, dict | None]] = []

    async def fake_fw_request(
        method: str, endpoint: str, data: dict | None = None, secret_key=None
    ):
        captured_requests.append((method, endpoint, data))
        if method == "GET" and endpoint == "/payment-plans/98765":
            return {"id": 98765, "currency": "USD"}
        return {"link": "https://checkout.flutterwave.com/v3/hosted/pay/mock-sub"}

    monkeypatch.setattr(fw, "make_flutterwave_request", fake_fw_request)
    monkeypatch.setattr(fw, "check_limits_with_usage", lambda *args, **kwargs: None)

    await fw.initialize_transaction(
        request=_fake_request(),
        org_id=mock_org.id,
        product_id=product.id,
        redirect_uri="https://app.example.com/frontend-dev",
        currency="USD",
        current_user=_fake_public_user(mock_user),
        db_session=db_session,
        auto_renew=True,
    )

    post_calls = [
        c for c in captured_requests if c[0] == "POST" and c[1] == "/payments"
    ]
    assert len(post_calls) == 1
    payload = post_calls[0][2]
    assert payload is not None
    assert payload["payment_plan"] == "98765"
    assert payload["payment_options"] == "card"


@pytest.mark.asyncio
async def test_subscription_auto_renew_rejects_mismatched_plan_currency_cleanly(
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
    monkeypatch,
):
    product = _create_subscription_product(
        db_session,
        mock_org.id,
        mock_payments_config.id,
        currency="USD",
        plan_id="98765",
    )

    async def fake_fw_request(
        method: str, endpoint: str, data: dict | None = None, secret_key=None
    ):
        if method == "GET" and endpoint == "/payment-plans/98765":
            return {"id": 98765, "currency": "USD"}
        raise AssertionError(
            "POST /payments should not be called on plan currency mismatch"
        )

    async def fake_fx(target_currency: str = "NGN") -> float:
        return 1500.0

    monkeypatch.setattr(fw, "make_flutterwave_request", fake_fw_request)
    monkeypatch.setattr(fw, "check_limits_with_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(payouts_module, "get_usd_to_currency_exchange_rate", fake_fx)

    with pytest.raises(HTTPException) as exc_info:
        await fw.initialize_transaction(
            request=_fake_request(),
            org_id=mock_org.id,
            product_id=product.id,
            redirect_uri="https://app.example.com/frontend-dev",
            currency="NGN",
            current_user=_fake_public_user(mock_user),
            db_session=db_session,
            auto_renew=True,
        )

    assert exc_info.value.status_code == 400
    assert "Auto-renewal is only supported in the plan currency (USD)" in str(
        exc_info.value.detail
    )


@pytest.mark.asyncio
async def test_create_flutterwave_product_passes_currency_for_payment_plans(
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
    monkeypatch,
):
    captured: list[dict] = []

    async def fake_fw_request(
        method: str, endpoint: str, data: dict | None = None, secret_key=None
    ):
        captured.append(data or {})
        return {"id": 55511}

    monkeypatch.setattr(fw, "make_flutterwave_request", fake_fw_request)

    product = PaymentsProduct(
        org_id=mock_org.id,
        payments_config_id=mock_payments_config.id,
        name="Monthly Plan",
        product_type=PaymentProductTypeEnum.SUBSCRIPTION,
        price_type=PaymentPriceTypeEnum.FIXED_PRICE,
        interval=PaymentIntervalEnum.MONTHLY,
        amount=10.0,
        currency="USD",
        provider_product_id="",
    )
    res = await fw.create_flutterwave_product(
        _fake_request(), mock_org.id, product, _fake_public_user(mock_user), db_session
    )

    assert res["id"] == "55511"
    assert captured[0]["currency"] == "USD"
