"""Tests for subscription billing cycles, grace-period notifications, card-failure fallback, and manual renewal."""

import json
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlmodel import Session, select
from starlette.requests import Request

from src.db.courses.courses import Course
from src.db.notifications import Notification
from src.db.payments.payments import PaymentsConfig
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_products import (
    PaymentIntervalEnum,
    PaymentPriceTypeEnum,
    PaymentProductTypeEnum,
    PaymentsProduct,
)
from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser
from src.services.payments import payments_cycles as cycles
from src.services.payments import payments_flutterwave as fw
from src.services.payments.payments_access import check_course_paid_access
from src.services.payments.payments_users import get_owned_courses
from src.services.payments.webhooks.payments_flutterwave_webhooks import (
    handle_flutterwave_webhook,
)


def _fake_public_user(mock_user):
    return SimpleNamespace(
        id=mock_user.id,
        email=mock_user.email,
        first_name=mock_user.first_name,
        last_name=mock_user.last_name,
        user_uuid=mock_user.user_uuid,
    )


def _fake_request():
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/payments/1/checkout",
            "headers": [],
        }
    )


def _webhook_request(payload: dict, secret: str = "fw_webhook_test_secret") -> Request:
    body_bytes = json.dumps(payload).encode("utf-8")

    async def receive():
        return {"type": "http.request", "body": body_bytes, "more_body": False}

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/payments/flutterwave/webhook",
        "headers": [(b"verif-hash", secret.encode("utf-8"))],
    }
    return Request(scope, receive)


def _seed_paid_course_and_product(
    db_session: Session,
    org_id: int,
    config_id: int,
    *,
    product_type: PaymentProductTypeEnum = PaymentProductTypeEnum.SUBSCRIPTION,
    amount: float = 10.0,
) -> tuple[Course, PaymentsProduct]:
    course = Course(
        name="Backend Engineering",
        description="Track course",
        course_uuid="course_backend_123",
        org_id=org_id,
        public=True,
        open_to_contributors=False,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    product = PaymentsProduct(
        org_id=org_id,
        payments_config_id=config_id,
        name="Backend Pro Monthly",
        description="Monthly access",
        product_type=product_type,
        price_type=PaymentPriceTypeEnum.FIXED_PRICE,
        interval=PaymentIntervalEnum.MONTHLY,
        amount=amount,
        currency="USD",
        provider_product_id="98765"
        if product_type == PaymentProductTypeEnum.SUBSCRIPTION
        else "product_1",
        benefits="Full course access",
        creation_date=datetime.now(UTC),
        update_date=datetime.now(UTC),
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    link = PaymentsCourse(
        course_id=course.id,
        payment_product_id=product.id,
        org_id=org_id,
    )
    db_session.add(link)
    db_session.commit()
    return course, product


def test_add_billing_interval_clamps_month_end():
    jan31 = datetime(2026, 1, 31, 12, 0, tzinfo=UTC)
    feb_end = cycles.add_billing_interval(jan31, PaymentIntervalEnum.MONTHLY)
    assert feb_end == datetime(2026, 2, 28, 12, 0, tzinfo=UTC)

    leap_day = datetime(2024, 2, 29, 10, 0, tzinfo=UTC)
    next_year = cycles.add_billing_interval(leap_day, PaymentIntervalEnum.YEARLY)
    assert next_year == datetime(2025, 2, 28, 10, 0, tzinfo=UTC)


@pytest.mark.asyncio
async def test_manual_payment_period_extension_is_idempotent_across_verify_and_webhook(
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
):
    course, product = _seed_paid_course_and_product(
        db_session, mock_org.id, mock_payments_config.id
    )
    pu = PaymentsUser(
        user_id=mock_user.id,
        org_id=mock_org.id,
        payment_product_id=product.id,
        status=PaymentStatusEnum.PENDING,
    )
    db_session.add(pu)
    db_session.commit()
    db_session.refresh(pu)

    paid_at = datetime.now(UTC).replace(microsecond=0)
    pu, did_extend_first = cycles.extend_payment_period(
        db_session,
        pu,
        product,
        tx_ref="LH_1_first",
        auto_renew=False,
        paid_at=paid_at,
    )
    assert did_extend_first is True
    assert pu.status == PaymentStatusEnum.COMPLETED
    assert pu.auto_renew is False
    expected_end = cycles.add_billing_interval(paid_at, PaymentIntervalEnum.MONTHLY)
    assert cycles._as_utc(pu.current_period_end) == expected_end

    # Replay same tx_ref (e.g. redirect verify + Flutterwave webhook): must NOT extend twice
    pu, did_extend_second = cycles.extend_payment_period(
        db_session,
        pu,
        product,
        tx_ref="LH_1_first",
        auto_renew=False,
        paid_at=paid_at + timedelta(minutes=1),
    )
    assert did_extend_second is False
    assert cycles._as_utc(pu.current_period_end) == expected_end
    assert cycles.is_payment_user_access_valid(
        pu, product, now=paid_at + timedelta(days=15)
    )

    # Paid user has course access + shows up in owned courses
    assert await check_course_paid_access(
        course.id, _fake_public_user(mock_user), db_session
    )
    owned = await get_owned_courses(
        _fake_request(), _fake_public_user(mock_user), db_session, mock_org.id
    )
    assert any(c.id == course.id for c in owned)

    # Verify lifecycle state diagnostics match active grace/expired/expiring-soon rules
    state = cycles.compute_subscription_lifecycle_state(
        pu, product, now=paid_at + timedelta(days=27)
    )
    assert state["is_expiring_soon"] is True
    assert state["is_in_grace_period"] is False
    assert state["is_expired"] is False


@pytest.mark.asyncio
async def test_manual_subscription_lifecycle_reminder_grace_and_expiry(
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
    monkeypatch,
):
    course, product = _seed_paid_course_and_product(
        db_session, mock_org.id, mock_payments_config.id
    )
    pu = PaymentsUser(
        user_id=mock_user.id,
        org_id=mock_org.id,
        payment_product_id=product.id,
        status=PaymentStatusEnum.COMPLETED,
        auto_renew=False,
        current_period_start=datetime(2026, 3, 1, 0, 0, tzinfo=UTC),
        current_period_end=datetime(2026, 4, 1, 0, 0, tzinfo=UTC),
    )
    db_session.add(pu)
    db_session.commit()
    db_session.refresh(pu)

    sent_emails: list[tuple[str, str]] = []
    monkeypatch.setattr(
        cycles,
        "send_email",
        lambda to, subject, body, text_body=None: sent_emails.append((to, subject)),
    )

    # 1. 2 days before expiry -> sends 3-day pre-expiry reminder once
    res_t2 = await cycles.process_subscription_lifecycle(
        db_session, now=datetime(2026, 3, 30, 12, 0, tzinfo=UTC)
    )
    assert res_t2 == {"reminded": 1, "grace_started": 0, "expired": 0}
    assert len(sent_emails) == 1
    assert "Reminder" in sent_emails[0][1]

    # Running again same day does NOT duplicate reminder
    res_t2_repeat = await cycles.process_subscription_lifecycle(
        db_session, now=datetime(2026, 3, 30, 18, 0, tzinfo=UTC)
    )
    assert res_t2_repeat == {"reminded": 0, "grace_started": 0, "expired": 0}
    assert len(sent_emails) == 1

    # 2. Period ends -> starts 7-day grace window; user retains access during grace
    day_past = datetime(2026, 4, 1, 6, 0, tzinfo=UTC)
    res_grace = await cycles.process_subscription_lifecycle(db_session, now=day_past)
    db_session.refresh(pu)
    assert res_grace == {"reminded": 0, "grace_started": 1, "expired": 0}
    assert pu.grace_period_start_date is not None
    assert pu.status == PaymentStatusEnum.COMPLETED
    assert cycles.is_payment_user_access_valid(pu, product, now=day_past) is True
    assert len(sent_emails) == 2

    # 3. 7 days after period end -> immediately loses validity and cron marks EXPIRED
    day_7 = datetime(2026, 4, 8, 1, 0, tzinfo=UTC)
    assert cycles.is_payment_user_access_valid(pu, product, now=day_7) is False

    res_expired = await cycles.process_subscription_lifecycle(db_session, now=day_7)
    db_session.refresh(pu)
    assert res_expired == {"reminded": 0, "grace_started": 0, "expired": 1}
    assert pu.status == PaymentStatusEnum.EXPIRED
    assert len(sent_emails) == 3

    # Verify in-app notifications created & course removed from active access + owned list
    notifs = db_session.exec(
        select(Notification).where(Notification.user_id == mock_user.id)
    ).all()
    assert len(notifs) == 3
    assert (
        await check_course_paid_access(
            course.id, _fake_public_user(mock_user), db_session
        )
        is False
    )
    owned = await get_owned_courses(
        _fake_request(), _fake_public_user(mock_user), db_session, mock_org.id
    )
    assert not any(c.id == course.id for c in owned)


@pytest.mark.asyncio
async def test_failed_card_fallback_and_expired_renewal_with_local_methods(
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
    monkeypatch,
):
    from src.services.payments.webhooks import payments_flutterwave_webhooks as wh
    from src.services.referrals import payouts as payouts_module

    course, product = _seed_paid_course_and_product(
        db_session, mock_org.id, mock_payments_config.id
    )
    pu = PaymentsUser(
        user_id=mock_user.id,
        org_id=mock_org.id,
        payment_product_id=product.id,
        status=PaymentStatusEnum.COMPLETED,
        auto_renew=True,
        current_period_start=datetime(2026, 3, 1, tzinfo=UTC),
        current_period_end=datetime(2026, 4, 1, tzinfo=UTC),
    )
    db_session.add(pu)
    db_session.commit()
    db_session.refresh(pu)

    sent_emails: list[tuple[str, str]] = []
    monkeypatch.setattr(
        cycles,
        "send_email",
        lambda to, subject, body, text_body=None: sent_emails.append((to, subject)),
    )
    monkeypatch.setattr(
        wh,
        "get_learnhouse_config",
        lambda: SimpleNamespace(
            payments_config=SimpleNamespace(
                flutterwave=SimpleNamespace(
                    flutterwave_webhook_secret="fw_webhook_test_secret"
                )
            )
        ),
    )

    # 1. Failed automatic card webhook starts grace period & sends card_failed email
    fail_payload = {
        "event": "charge.completed",
        "data": {
            "id": 778899,
            "status": "failed",
            "customer": {"email": mock_user.email},
            "meta": {"payment_user_id": str(pu.id)},
        },
    }
    res_fail = await handle_flutterwave_webhook(
        _webhook_request(fail_payload), db_session
    )
    db_session.refresh(pu)
    assert res_fail["status"] == "ignored"
    assert pu.grace_period_start_date is not None
    assert len(sent_emails) == 1
    assert "Card renewal failed" in sent_emails[0][1]

    # 2. User switches to Bank Transfer / NGN (auto_renew=False) during grace period!
    captured_fw: list[tuple[str, str, dict | None]] = []

    async def fake_fw_request(
        method: str, endpoint: str, data: dict | None = None, secret_key=None
    ):
        captured_fw.append((method, endpoint, data))
        if endpoint == "/payments":
            return {"link": "https://checkout.flutterwave.com/v3/hosted/pay/rescue-ngn"}
        if endpoint.startswith("/transactions/verify_by_reference"):
            return {
                "id": 990011,
                "status": "successful",
                "tx_ref": data or endpoint.split("tx_ref=")[-1],
            }
        return {}

    async def fake_fx(target_currency: str = "NGN") -> float:
        return 1500.0

    monkeypatch.setattr(fw, "make_flutterwave_request", fake_fw_request)
    monkeypatch.setattr(fw, "check_limits_with_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(payouts_module, "get_usd_to_currency_exchange_rate", fake_fx)

    checkout = await fw.initialize_transaction(
        request=_fake_request(),
        org_id=mock_org.id,
        product_id=product.id,
        redirect_uri="https://app.example.com/course/backend_123",
        currency="NGN",
        current_user=_fake_public_user(mock_user),
        db_session=db_session,
        auto_renew=False,
    )
    assert checkout["checkout_url"].endswith("/rescue-ngn")

    # Existing record status must remain intact (not overwritten to PENDING) before payment clears
    db_session.refresh(pu)
    assert pu.status == PaymentStatusEnum.COMPLETED
    assert pu.auto_renew is True

    # Flutterwave payload allows all NGN local methods and omits payment_plan
    post_payload = next(
        c[2] for c in captured_fw if c[0] == "POST" and c[1] == "/payments"
    )
    assert post_payload is not None
    assert post_payload["currency"] == "NGN"
    assert post_payload["payment_options"] == fw.get_payment_options_for_currency("NGN")
    assert "payment_plan" not in post_payload

    # 3. Payment succeeds via Bank Transfer webhook -> clears grace, switches auto_renew=False, extends period
    success_payload = {
        "event": "charge.completed",
        "data": {
            "id": 990011,
            "status": "successful",
            "tx_ref": checkout["reference"],
            "meta": {
                "payment_user_id": str(pu.id),
                "org_id": str(mock_org.id),
                "auto_renew": "false",
            },
        },
    }
    res_ok = await handle_flutterwave_webhook(
        _webhook_request(success_payload), db_session
    )
    db_session.refresh(pu)
    assert res_ok["status"] == "success"
    assert pu.status == PaymentStatusEnum.COMPLETED
    assert pu.grace_period_start_date is None
    assert pu.auto_renew is False
    assert pu.current_period_end is not None and cycles._as_utc(
        pu.current_period_end
    ) > datetime.now(UTC)


@pytest.mark.asyncio
async def test_early_renewal_preserves_remaining_days_and_one_time_still_blocks_duplicate(
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
    monkeypatch,
):
    _, sub_product = _seed_paid_course_and_product(
        db_session,
        mock_org.id,
        mock_payments_config.id,
        product_type=PaymentProductTypeEnum.SUBSCRIPTION,
    )
    future_end = datetime.now(UTC) + timedelta(days=5)
    pu_sub = PaymentsUser(
        user_id=mock_user.id,
        org_id=mock_org.id,
        payment_product_id=sub_product.id,
        status=PaymentStatusEnum.COMPLETED,
        auto_renew=False,
        current_period_start=future_end - timedelta(days=30),
        current_period_end=future_end,
    )
    db_session.add(pu_sub)

    _, one_time_product = _seed_paid_course_and_product(
        db_session,
        mock_org.id,
        mock_payments_config.id,
        product_type=PaymentProductTypeEnum.ONE_TIME,
        amount=20.0,
    )
    pu_once = PaymentsUser(
        user_id=mock_user.id,
        org_id=mock_org.id,
        payment_product_id=one_time_product.id,
        status=PaymentStatusEnum.COMPLETED,
    )
    db_session.add(pu_once)
    db_session.commit()
    db_session.refresh(pu_sub)

    # Early renewal adds 1 calendar month on top of future_end
    pu_sub, extended = cycles.extend_payment_period(
        db_session, pu_sub, sub_product, tx_ref="LH_early_1", auto_renew=False
    )
    assert extended is True
    assert cycles._as_utc(pu_sub.current_period_end) == cycles.add_billing_interval(
        future_end, PaymentIntervalEnum.MONTHLY
    )

    # One-time completed product still blocks duplicate purchase
    monkeypatch.setattr(fw, "check_limits_with_usage", lambda *args, **kwargs: None)
    with pytest.raises(HTTPException) as exc_info:
        await fw.initialize_transaction(
            request=_fake_request(),
            org_id=mock_org.id,
            product_id=one_time_product.id,
            redirect_uri="https://app.example.com/career-accelerator",
            currency="USD",
            current_user=_fake_public_user(mock_user),
            db_session=db_session,
        )
    assert exc_info.value.status_code == 400
    assert "already has purchase" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_expired_subscription_reactivation_and_card_subscription_renewed_webhook(
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
    monkeypatch,
):
    from src.services.payments.webhooks import payments_flutterwave_webhooks as wh

    course, product = _seed_paid_course_and_product(
        db_session, mock_org.id, mock_payments_config.id
    )
    old_end = datetime.now(UTC) - timedelta(days=10)
    pu = PaymentsUser(
        user_id=mock_user.id,
        org_id=mock_org.id,
        payment_product_id=product.id,
        status=PaymentStatusEnum.EXPIRED,
        auto_renew=False,
        current_period_start=old_end - timedelta(days=30),
        current_period_end=old_end,
        grace_period_start_date=old_end,
    )
    db_session.add(pu)
    db_session.commit()
    db_session.refresh(pu)

    async def fake_fw_request(
        method: str, endpoint: str, data: dict | None = None, secret_key=None
    ):
        if endpoint == "/payments":
            return {"link": "https://checkout.flutterwave.com/v3/hosted/pay/reactivate"}
        if endpoint.startswith("/transactions/verify_by_reference"):
            return {
                "id": 445566,
                "status": "successful",
                "tx_ref": endpoint.split("tx_ref=")[-1],
            }
        return {}

    monkeypatch.setattr(fw, "make_flutterwave_request", fake_fw_request)
    monkeypatch.setattr(fw, "check_limits_with_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        wh,
        "get_learnhouse_config",
        lambda: SimpleNamespace(
            payments_config=SimpleNamespace(
                flutterwave=SimpleNamespace(
                    flutterwave_webhook_secret="fw_webhook_test_secret"
                )
            )
        ),
    )

    # Expired subscriber initiates renewal checkout and abandons before paying: status stays EXPIRED
    checkout = await fw.initialize_transaction(
        request=_fake_request(),
        org_id=mock_org.id,
        product_id=product.id,
        redirect_uri="https://app.example.com/course/backend_123",
        currency="USD",
        current_user=_fake_public_user(mock_user),
        db_session=db_session,
        auto_renew=False,
    )
    db_session.refresh(pu)
    assert pu.status == PaymentStatusEnum.EXPIRED
    assert (
        await check_course_paid_access(
            course.id, _fake_public_user(mock_user), db_session
        )
        is False
    )

    # Completing checkout via webhook restores access and advances current_period_end
    res_reactivate = await handle_flutterwave_webhook(
        _webhook_request(
            {
                "event": "charge.completed",
                "data": {
                    "id": 445566,
                    "status": "successful",
                    "tx_ref": checkout["reference"],
                    "meta": {
                        "payment_user_id": str(pu.id),
                        "org_id": str(mock_org.id),
                        "auto_renew": "false",
                    },
                },
            }
        ),
        db_session,
    )
    assert res_reactivate["status"] == "success"
    db_session.refresh(pu)
    assert pu.status == PaymentStatusEnum.COMPLETED
    assert pu.grace_period_start_date is None
    assert (
        await check_course_paid_access(
            course.id, _fake_public_user(mock_user), db_session
        )
        is True
    )

    # Simulate Flutterwave subscription.renewed event advancing an active card plan
    pu.auto_renew = True
    pu.grace_period_start_date = datetime.now(UTC) - timedelta(days=1)
    prior_end = cycles._as_utc(pu.current_period_end)
    db_session.add(pu)
    db_session.commit()

    res_renew = await handle_flutterwave_webhook(
        _webhook_request(
            {
                "event": "subscription.renewed",
                "data": {
                    "id": 31337,
                    "plan": int(product.provider_product_id),
                    "created_at": "2026-11-10T15:00:00Z",
                    "customer": {"customer_email": mock_user.email},
                },
            }
        ),
        db_session,
    )
    assert res_renew["status"] == "ok"
    db_session.refresh(pu)
    assert pu.grace_period_start_date is None
    assert cycles._as_utc(pu.current_period_end) == cycles.add_billing_interval(
        prior_end, PaymentIntervalEnum.MONTHLY
    )


@pytest.mark.asyncio
async def test_api_verify_transaction_and_access_diagnostics(
    db_session: Session,
    mock_org,
    mock_user,
    mock_payments_config: PaymentsConfig,
    monkeypatch,
):
    from ee.routers import payments as payments_router

    course, product = _seed_paid_course_and_product(
        db_session, mock_org.id, mock_payments_config.id
    )
    pu = PaymentsUser(
        user_id=mock_user.id,
        org_id=mock_org.id,
        payment_product_id=product.id,
        status=PaymentStatusEnum.PENDING,
    )
    db_session.add(pu)
    db_session.commit()
    db_session.refresh(pu)

    tx_ref = f"LH_{pu.id}_route"

    async def fake_verify(reference: str) -> dict:
        return {
            "status": "success",
            "data": {
                "status": "successful",
                "amount": 15000,
                "currency": "NGN",
                "tx_ref": reference,
                "processor_response": "Approved",
                "created_at": datetime.now(UTC).isoformat(),
                "meta": {
                    "payment_user_id": str(pu.id),
                    "org_id": str(mock_org.id),
                    "auto_renew": "false",
                },
            },
        }

    monkeypatch.setattr(payments_router, "verify_transaction", fake_verify)

    # 1. Redirect verify activates subscription and sets current_period_end
    verify_res = await payments_router.api_verify_transaction(
        _fake_request(),
        mock_org.id,
        tx_ref,
        _fake_public_user(mock_user),
        db_session,
    )
    assert verify_res["payment_status_updated"] is True
    assert verify_res["current_period_end"] is not None

    # Replaying verify with same tx_ref must not double-extend
    first_end = verify_res["current_period_end"]
    replay_res = await payments_router.api_verify_transaction(
        _fake_request(),
        mock_org.id,
        tx_ref,
        _fake_public_user(mock_user),
        db_session,
    )
    assert replay_res["payment_status_updated"] is False
    assert replay_res["current_period_end"] == first_end

    # 2. Access endpoint exposes subscription lifecycle diagnostics
    access_res = await payments_router.api_check_course_paid_access(
        _fake_request(),
        mock_org.id,
        str(course.id),
        _fake_public_user(mock_user),
        db_session,
    )
    assert access_res["has_access"] is True
    assert access_res["diagnostics"]["auto_renew"] is False
    assert access_res["diagnostics"]["current_period_end"] is not None
    assert access_res["diagnostics"]["is_expired"] is False
