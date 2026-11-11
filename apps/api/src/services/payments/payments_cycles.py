"""
Shared subscription billing-cycle helpers: period calculation, idempotent period
extension, strict access validation, renewal notifications, and daily lifecycle sweep.
"""

import asyncio
import calendar
import html
import logging
import math
import os
from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select

from config.config import get_learnhouse_config
from src.db.courses.courses import Course
from src.db.notifications import EmailStatus, Notification, NotificationType
from src.db.organizations import Organization
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_products import (
    PaymentIntervalEnum,
    PaymentProductTypeEnum,
    PaymentsProduct,
)
from src.db.payments.payments_users import PaymentStatusEnum, PaymentsUser
from src.db.users import User
from src.services.email.utils import send_email
from src.services.notifications.notification_copy import NotificationCopy
from src.services.notifications.notification_service import _push_in_app

logger = logging.getLogger(__name__)

GRACE_PERIOD_DAYS = 7
RENEWAL_REMINDER_DAYS = 3
EXPIRING_SOON_DAYS = 5
AUTO_RENEW_GRACE_BUFFER_DAYS = 2


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def add_billing_interval(
    start: datetime,
    interval: PaymentIntervalEnum | str | None,
) -> datetime:
    """Advance ``start`` by one calendar billing interval in UTC."""
    base = _as_utc(start) or datetime.now(UTC)
    interval_val = (
        interval.value
        if hasattr(interval, "value")
        else (str(interval).lower() if interval else "monthly")
    )

    if interval_val == "daily":
        return base + timedelta(days=1)
    if interval_val == "weekly":
        return base + timedelta(weeks=1)
    if interval_val == "yearly":
        target_year = base.year + 1
        max_day = calendar.monthrange(target_year, base.month)[1]
        return base.replace(year=target_year, day=min(base.day, max_day))

    # Default / monthly
    next_month = (base.month % 12) + 1
    next_year = base.year + (base.month // 12)
    max_day = calendar.monthrange(next_year, next_month)[1]
    return base.replace(year=next_year, month=next_month, day=min(base.day, max_day))


def is_payment_user_access_valid(
    payment_user: PaymentsUser | None,
    product: PaymentsProduct | None = None,
    now: datetime | None = None,
) -> bool:
    """
    Determine whether ``payment_user`` currently grants paid access.

    - ``ACTIVE`` / ``COMPLETED`` rows are required.
    - Explicit ``grace_period_start_date`` expires after ``GRACE_PERIOD_DAYS`` (7 days).
    - Subscription rows with ``current_period_end`` keep access through their paid
      period plus at most ``GRACE_PERIOD_DAYS`` past-due grace days.
    - One-time products (or legacy rows with ``current_period_end is None``) follow
      status + explicit grace-period checks only.
    """
    if payment_user is None:
        return False
    if payment_user.status not in (
        PaymentStatusEnum.ACTIVE,
        PaymentStatusEnum.COMPLETED,
    ):
        return False

    now_utc = _as_utc(now) or datetime.now(UTC)

    explicit_grace = _as_utc(getattr(payment_user, "grace_period_start_date", None))
    if explicit_grace is not None and (now_utc - explicit_grace) >= timedelta(
        days=GRACE_PERIOD_DAYS
    ):
        return False

    product_type = getattr(product, "product_type", None)
    product_type_val = (
        getattr(product_type, "value", str(product_type)).lower()
        if product_type
        else None
    )

    if product_type_val == PaymentProductTypeEnum.SUBSCRIPTION.value:
        period_end = _as_utc(getattr(payment_user, "current_period_end", None))
        if period_end is not None and period_end <= now_utc:
            grace_start = explicit_grace or period_end
            if (now_utc - grace_start) >= timedelta(days=GRACE_PERIOD_DAYS):
                return False

    return True


def compute_subscription_lifecycle_state(
    payment_user: PaymentsUser | None,
    product: PaymentsProduct | None = None,
    now: datetime | None = None,
) -> dict:
    """Build UI-friendly subscription period, grace, and expiry metadata."""
    now_utc = _as_utc(now) or datetime.now(UTC)
    if payment_user is None:
        return {
            "auto_renew": False,
            "current_period_end": None,
            "grace_period_start_date": None,
            "grace_period_ends_at": None,
            "is_in_grace_period": False,
            "is_expiring_soon": False,
            "is_expired": False,
            "days_remaining": None,
            "grace_days_remaining": None,
        }

    psd = payment_user.provider_specific_data or {}
    col_auto_renew = getattr(payment_user, "auto_renew", None)
    auto_renew = bool(
        col_auto_renew if col_auto_renew is not None else psd.get("auto_renew", False)
    )
    period_end = _as_utc(getattr(payment_user, "current_period_end", None))
    explicit_grace = _as_utc(getattr(payment_user, "grace_period_start_date", None))

    effective_grace = explicit_grace
    if (
        effective_grace is None
        and period_end is not None
        and period_end <= now_utc
        and payment_user.status
        in (PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED)
    ):
        effective_grace = period_end

    grace_ends_at = (
        effective_grace + timedelta(days=GRACE_PERIOD_DAYS)
        if effective_grace is not None
        else None
    )

    has_access = is_payment_user_access_valid(payment_user, product, now_utc)
    is_in_grace_period = bool(
        has_access
        and effective_grace is not None
        and grace_ends_at is not None
        and now_utc < grace_ends_at
    )
    is_expired = bool(
        payment_user.status == PaymentStatusEnum.EXPIRED
        or (
            payment_user.status
            in (PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED)
            and not has_access
        )
    )

    days_remaining: int | None = None
    if period_end is not None:
        days_remaining = max(
            0, math.ceil((period_end - now_utc).total_seconds() / 86400)
        )

    grace_days_remaining: int | None = None
    if grace_ends_at is not None and is_in_grace_period:
        grace_days_remaining = max(
            0, math.ceil((grace_ends_at - now_utc).total_seconds() / 86400)
        )

    product_type = getattr(product, "product_type", None)
    product_type_val = (
        getattr(product_type, "value", str(product_type)).lower()
        if product_type
        else None
    )
    is_expiring_soon = bool(
        has_access
        and product_type_val == PaymentProductTypeEnum.SUBSCRIPTION.value
        and (
            is_in_grace_period
            or (
                not auto_renew
                and period_end is not None
                and (period_end - now_utc) <= timedelta(days=EXPIRING_SOON_DAYS)
            )
        )
    )

    return {
        "auto_renew": auto_renew,
        "current_period_end": period_end.isoformat() if period_end else None,
        "grace_period_start_date": effective_grace.isoformat()
        if effective_grace
        else None,
        "grace_period_ends_at": grace_ends_at.isoformat() if grace_ends_at else None,
        "is_in_grace_period": is_in_grace_period,
        "is_expiring_soon": is_expiring_soon,
        "is_expired": is_expired,
        "days_remaining": days_remaining,
        "grace_days_remaining": grace_days_remaining,
    }


def extend_payment_period(
    db_session: Session,
    payment_user: PaymentsUser,
    product: PaymentsProduct | None = None,
    *,
    tx_ref: str | None = None,
    auto_renew: bool | None = None,
    paid_at: datetime | None = None,
) -> tuple[PaymentsUser, bool]:
    """
    Activate or extend a ``PaymentsUser`` billing cycle idempotently.

    Returns ``(payment_user, True)`` if this payment updated/extended the cycle,
    or ``(payment_user, False)`` if ``tx_ref`` was already processed earlier
    (preventing duplicate extensions across redirect verification + webhook).
    """
    now_utc = _as_utc(paid_at) or datetime.now(UTC)
    psd = dict(payment_user.provider_specific_data or {})
    processed_refs = list(psd.get("processed_tx_refs") or [])

    if tx_ref and tx_ref in processed_refs:
        if payment_user.status not in (
            PaymentStatusEnum.ACTIVE,
            PaymentStatusEnum.COMPLETED,
        ):
            payment_user.status = PaymentStatusEnum.COMPLETED
            payment_user.update_date = now_utc
            db_session.add(payment_user)
            db_session.commit()
            db_session.refresh(payment_user)
        return payment_user, False

    if product is None:
        product = db_session.get(PaymentsProduct, payment_user.payment_product_id)

    pending_checkout = psd.get("pending_checkout") or {}
    if auto_renew is not None:
        resolved_auto_renew = bool(auto_renew)
    elif (
        tx_ref
        and pending_checkout.get("tx_ref") == tx_ref
        and "auto_renew" in pending_checkout
    ):
        resolved_auto_renew = bool(pending_checkout.get("auto_renew"))
    else:
        resolved_auto_renew = bool(
            getattr(payment_user, "auto_renew", False) or psd.get("auto_renew", False)
        )

    if tx_ref:
        processed_refs.append(tx_ref)
        psd["processed_tx_refs"] = processed_refs[-25:]
        if pending_checkout.get("tx_ref") == tx_ref:
            psd.pop("pending_checkout", None)
        psd["flutterwave_tx_ref"] = tx_ref

    psd["auto_renew"] = resolved_auto_renew

    product_type = getattr(product, "product_type", None)
    product_type_val = (
        getattr(product_type, "value", str(product_type)).lower()
        if product_type
        else None
    )

    if product_type_val == PaymentProductTypeEnum.SUBSCRIPTION.value:
        existing_end = _as_utc(getattr(payment_user, "current_period_end", None))
        cycle_base = (
            existing_end
            if (
                existing_end is not None
                and existing_end > now_utc
                and payment_user.status
                in (PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED)
            )
            else now_utc
        )
        if existing_end is None or existing_end <= now_utc:
            payment_user.current_period_start = now_utc
        elif payment_user.current_period_start is None:
            payment_user.current_period_start = now_utc
        payment_user.current_period_end = add_billing_interval(
            cycle_base, getattr(product, "interval", None)
        )
        payment_user.auto_renew = resolved_auto_renew
    else:
        payment_user.auto_renew = False

    payment_user.status = PaymentStatusEnum.COMPLETED
    payment_user.last_payment_date = now_utc
    payment_user.grace_period_start_date = None
    payment_user.renewal_reminder_sent_at = None
    payment_user.grace_notice_sent_at = None
    payment_user.update_date = now_utc
    payment_user.provider_specific_data = psd

    db_session.add(payment_user)
    db_session.commit()
    db_session.refresh(payment_user)
    return payment_user, True


def _resolve_renewal_url(
    db_session: Session,
    org_id: int,
    product_id: int,
) -> tuple[str, str]:
    """Return ``(org_name, renewal_url)`` for a subscription product."""
    org = db_session.get(Organization, org_id)
    org_name = org.name if org and org.name else "African AI Network LMS"
    org_slug = org.slug if org and org.slug else "default"

    try:
        base_url = get_learnhouse_config().hosting_config.app_base_url or ""
    except Exception:  # noqa: BLE001
        base_url = os.getenv("LEARNHOUSE_APP_BASE_URL", "")
    base_url = base_url.rstrip("/")

    path = f"/orgs/{org_slug}/pricing"
    pc = db_session.exec(
        select(PaymentsCourse).where(PaymentsCourse.payment_product_id == product_id)
    ).first()
    if pc:
        course = db_session.get(Course, pc.course_id)
        if course and course.course_uuid:
            clean_uuid = course.course_uuid.replace("course_", "")
            path = f"/orgs/{org_slug}/course/{clean_uuid}"

    return org_name, f"{base_url}{path}" if base_url else path


def _build_lifecycle_copy(
    kind: str,
    product_name: str,
    org_name: str,
    renewal_url: str,
    period_end: datetime | None = None,
    grace_ends_at: datetime | None = None,
) -> tuple[NotificationCopy, str, str]:
    """Return ``(NotificationCopy, email_subject, email_html)`` for lifecycle notices."""
    end_str = period_end.strftime("%B %d, %Y") if period_end else "soon"
    grace_str = grace_ends_at.strftime("%B %d, %Y") if grace_ends_at else "7 days"

    if kind == "reminder":
        title = f"{product_name} renews soon"
        message = (
            f"Your monthly access to {product_name} ends on {end_str}. "
            f"Renew now using Bank Transfer, USSD, OPay, Mobile Money, or Card to keep uninterrupted access."
        )
        subject = f"Reminder: Renew your {product_name} access before {end_str}"
        badge_color = "#4F46E5"
        cta_label = "Renew Monthly Access"
    elif kind == "card_failed":
        title = f"Card renewal failed for {product_name}"
        message = (
            f"Your automatic card renewal for {product_name} did not go through. "
            f"Pay with another card or switch to Bank Transfer, USSD, OPay, or Mobile Money before {grace_str} to keep access."
        )
        subject = f"Action required: Card renewal failed for {product_name}"
        badge_color = "#D97706"
        cta_label = "Pay Now (All Methods Supported)"
    elif kind == "grace_started":
        title = f"Monthly renewal due for {product_name}"
        message = (
            f"Your billing period for {product_name} has ended. "
            f"You are in a 7-day grace period until {grace_str}. Complete renewal via Bank Transfer, USSD, OPay, Mobile Money, or Card to keep access."
        )
        subject = f"Grace period started: Renew {product_name} by {grace_str}"
        badge_color = "#D97706"
        cta_label = "Renew Access Now"
    else:  # expired
        title = f"Access paused for {product_name}"
        message = (
            f"Your monthly subscription for {product_name} expired after the 7-day grace period. "
            f"Renew anytime via Bank Transfer, USSD, OPay, Mobile Money, or Card to restore full access."
        )
        subject = f"Subscription expired: Restore access to {product_name}"
        badge_color = "#DC2626"
        cta_label = "Restore Subscription"

    safe_org = html.escape(org_name)
    safe_title = html.escape(title)
    safe_msg = html.escape(message)
    safe_url = html.escape(renewal_url, quote=True)
    safe_cta = html.escape(cta_label)

    body_html = f"""
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1F2937; line-height: 1.6; margin: 0; padding: 0; background-color: #F9FAFB;">
    <div style="max-width: 580px; margin: 24px auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB;">
      <div style="background: {badge_color}; color: #FFFFFF; padding: 28px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">{safe_title}</h1>
      </div>
      <div style="padding: 28px 24px;">
        <p style="margin: 0 0 16px 0; color: #374151;">{safe_msg}</p>
        <div style="margin: 24px 0; text-align: center;">
          <a href="{safe_url}" style="display: inline-block; padding: 12px 28px; background-color: #111827; color: #FFFFFF !important; text-decoration: none; border-radius: 8px; font-weight: 600;">{safe_cta}</a>
        </div>
        <p style="margin: 0; font-size: 13px; color: #6B7280;">Supported payment methods include Bank Transfer, USSD, OPay, Mobile Money, and Card in your selected currency.</p>
      </div>
      <div style="background: #F9FAFB; padding: 16px 24px; text-align: center; font-size: 12px; color: #6B7280;">
        {safe_org}
      </div>
    </div>
  </body>
</html>
"""
    return NotificationCopy(title=title, message=message), subject, body_html


async def notify_subscription_lifecycle(
    db_session: Session,
    payment_user: PaymentsUser,
    product: PaymentsProduct | None,
    kind: str,
) -> None:
    """
    Create an in-app notification and send a branded renewal email for
    ``reminder``, ``card_failed``, ``grace_started``, or ``expired``.
    Never raises on notification/email transport failures.
    """
    try:
        user = db_session.get(User, payment_user.user_id)
        if not user:
            return

        if product is None:
            product = db_session.get(PaymentsProduct, payment_user.payment_product_id)
        product_name = product.name if product and product.name else "your course"

        org_name, renewal_url = _resolve_renewal_url(
            db_session, payment_user.org_id, payment_user.payment_product_id
        )

        period_end = _as_utc(getattr(payment_user, "current_period_end", None))
        grace_start = _as_utc(getattr(payment_user, "grace_period_start_date", None))
        grace_ends_at = (
            grace_start + timedelta(days=GRACE_PERIOD_DAYS)
            if grace_start is not None
            else None
        )

        copy, subject, email_html = _build_lifecycle_copy(
            kind=kind,
            product_name=product_name,
            org_name=org_name,
            renewal_url=renewal_url,
            period_end=period_end,
            grace_ends_at=grace_ends_at,
        )

        # Create in-app notification with email_status=NOT_REQUIRED because we
        # dispatch the rich CTA email directly below (avoiding duplicate plain email).
        from uuid import uuid4

        notification = Notification(
            notification_uuid=f"notif_{uuid4()}",
            user_id=user.id,
            org_id=payment_user.org_id,
            notification_type=NotificationType.APP_UPDATE,
            target_type="subscription",
            target_id=payment_user.id,
            title=copy.title,
            message=copy.message,
            metadata_json={
                "event": kind,
                "payment_user_id": payment_user.id,
                "product_id": payment_user.payment_product_id,
                "renewal_url": renewal_url,
            },
            email_status=EmailStatus.NOT_REQUIRED,
        )
        db_session.add(notification)
        db_session.commit()
        db_session.refresh(notification)
        await _push_in_app(notification)

        if user.email:
            try:
                await asyncio.to_thread(send_email, user.email, subject, email_html)
            except Exception as email_err:  # noqa: BLE001
                logger.warning(
                    "Subscription %s email not sent to user %s: %s",
                    kind,
                    user.id,
                    email_err,
                )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Subscription lifecycle notice (%s) failed for payment_user %s: %s",
            kind,
            getattr(payment_user, "id", None),
            exc,
        )


async def process_subscription_lifecycle(
    db_session: Session,
    now: datetime | None = None,
) -> dict[str, int]:
    """
    Daily subscription lifecycle processor:
    1. Expire active/completed subscriptions whose 7-day grace window elapsed.
    2. Start grace period (+ notify) when a subscription period ends without renewal.
    3. Send pre-expiry reminders 3 days ahead for manual-renewal subscriptions.
    """
    now_utc = _as_utc(now) or datetime.now(UTC)

    statement = (
        select(PaymentsUser, PaymentsProduct)
        .join(PaymentsProduct, PaymentsUser.payment_product_id == PaymentsProduct.id)
        .where(
            PaymentsUser.status.in_(
                [PaymentStatusEnum.ACTIVE, PaymentStatusEnum.COMPLETED]
            ),
            PaymentsProduct.product_type == PaymentProductTypeEnum.SUBSCRIPTION,
        )
    )
    rows = db_session.exec(statement).all()

    reminded_count = 0
    grace_started_count = 0
    expired_count = 0

    for pu, product in rows:
        grace_start = _as_utc(getattr(pu, "grace_period_start_date", None))
        period_end = _as_utc(getattr(pu, "current_period_end", None))
        auto_renew = bool(getattr(pu, "auto_renew", False))

        # Step 1: If grace has NOT started yet, check if period_end elapsed
        if grace_start is None and period_end is not None:
            if not auto_renew and period_end <= now_utc:
                pu.grace_period_start_date = period_end
                pu.update_date = now_utc
                grace_start = period_end
                db_session.add(pu)
                db_session.commit()
                grace_started_count += 1
            elif auto_renew and (
                period_end + timedelta(days=AUTO_RENEW_GRACE_BUFFER_DAYS) <= now_utc
            ):
                # Fallback if automatic Flutterwave charge webhook never arrived
                pu.grace_period_start_date = period_end + timedelta(
                    days=AUTO_RENEW_GRACE_BUFFER_DAYS
                )
                pu.update_date = now_utc
                grace_start = pu.grace_period_start_date
                db_session.add(pu)
                db_session.commit()
                grace_started_count += 1

        # Step 2: Expire if 7-day grace period has elapsed
        if grace_start is not None and (now_utc - grace_start) >= timedelta(
            days=GRACE_PERIOD_DAYS
        ):
            pu.status = PaymentStatusEnum.EXPIRED
            pu.update_date = now_utc
            db_session.add(pu)
            db_session.commit()
            expired_count += 1
            await notify_subscription_lifecycle(db_session, pu, product, "expired")
            continue

        # Step 3: Send grace-period notice once if in grace period and not yet notified
        if grace_start is not None and pu.grace_notice_sent_at is None:
            notice_kind = "card_failed" if auto_renew else "grace_started"
            pu.grace_notice_sent_at = now_utc
            pu.update_date = now_utc
            db_session.add(pu)
            db_session.commit()
            await notify_subscription_lifecycle(db_session, pu, product, notice_kind)
            continue

        # Step 4: Send 3-day pre-expiry reminder once for manual-renewal subscriptions
        if (
            not auto_renew
            and grace_start is None
            and period_end is not None
            and pu.renewal_reminder_sent_at is None
            and now_utc
            < period_end
            <= (now_utc + timedelta(days=RENEWAL_REMINDER_DAYS))
        ):
            pu.renewal_reminder_sent_at = now_utc
            pu.update_date = now_utc
            db_session.add(pu)
            db_session.commit()
            reminded_count += 1
            await notify_subscription_lifecycle(db_session, pu, product, "reminder")

    return {
        "reminded": reminded_count,
        "grace_started": grace_started_count,
        "expired": expired_count,
    }
