import logging

from fastapi import HTTPException, Request
from sqlmodel import Session, select

from src.db.organizations import Organization
from src.db.payments.payments_products import PaymentsProduct, PaymentsProductRead
from src.db.payments.payments_users import PaymentsUser
from src.db.users import AnonymousUser, PublicUser, User, UserRead
from src.security.features_utils.usage import check_limits_with_usage
from src.services.orgs.orgs import rbac_check

logger = logging.getLogger(__name__)


async def get_customers(
    request: Request,
    org_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # Check if payments feature is enabled (warning only so customer list does not 500 on Redis outages)
    try:
        check_limits_with_usage("payments", org_id, db_session)
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "Limit check warning for payments on org %s: %s", org_id, e
        )

    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "read", db_session)

    # Get all payment users for the organization, ordered by newest first
    statement = (
        select(PaymentsUser)
        .where(PaymentsUser.org_id == org_id)
        .order_by(PaymentsUser.id.desc())
    )
    payment_users = db_session.exec(statement).all()

    customers_data = []

    for payment_user in payment_users:
        try:
            # 1. Resolve User
            user_data = None
            if payment_user.user_id:
                user_obj = db_session.exec(
                    select(User).where(User.id == payment_user.user_id)
                ).first()
                if user_obj:
                    try:
                        user_read = UserRead.model_validate(user_obj)
                        user_data = user_read.model_dump()
                    except Exception:  # noqa: BLE001
                        user_data = {
                            "id": user_obj.id,
                            "user_uuid": getattr(user_obj, "user_uuid", ""),
                            "first_name": getattr(user_obj, "first_name", ""),
                            "last_name": getattr(user_obj, "last_name", ""),
                            "username": getattr(user_obj, "username", ""),
                            "email": getattr(user_obj, "email", ""),
                            "avatar_image": getattr(user_obj, "avatar_image", None),
                        }

            if not user_data:
                user_data = {
                    "id": payment_user.user_id,
                    "user_uuid": "",
                    "first_name": "Customer",
                    "last_name": "",
                    "username": f"user_{payment_user.user_id}",
                    "email": "",
                    "avatar_image": None,
                }

            # 2. Resolve Product
            product_data = None
            if payment_user.payment_product_id:
                product_obj = db_session.exec(
                    select(PaymentsProduct).where(
                        PaymentsProduct.id == payment_user.payment_product_id
                    )
                ).first()
                if product_obj:
                    try:
                        product_read = PaymentsProductRead.model_validate(product_obj)
                        product_data = product_read.model_dump()
                    except Exception:  # noqa: BLE001
                        product_data = {
                            "id": product_obj.id,
                            "name": getattr(product_obj, "name", "Product"),
                            "product_type": getattr(product_obj, "product_type", "one_time"),
                            "price_type": getattr(product_obj, "price_type", "fixed_price"),
                            "amount": getattr(product_obj, "amount", 0.0),
                            "currency": getattr(product_obj, "currency", "USD"),
                        }

            if not product_data:
                product_data = {
                    "id": payment_user.payment_product_id,
                    "name": "Standard Access",
                    "product_type": "one_time",
                    "price_type": "fixed_price",
                    "amount": payment_user.final_amount or payment_user.original_amount or 0.0,
                    "currency": "USD",
                }

            # 3. Format Status and Dates
            status_val = (
                payment_user.status.value
                if hasattr(payment_user.status, "value")
                else str(payment_user.status)
            )

            creation_date_str = (
                payment_user.creation_date.isoformat()
                if hasattr(payment_user.creation_date, "isoformat")
                else str(payment_user.creation_date)
            )

            update_date_str = (
                payment_user.update_date.isoformat()
                if hasattr(payment_user.update_date, "isoformat")
                else str(payment_user.update_date)
            )

            customer_data = {
                "payment_user_id": payment_user.id,
                "user": user_data,
                "product": product_data,
                "status": status_val,
                "creation_date": creation_date_str,
                "update_date": update_date_str,
            }
            customers_data.append(customer_data)
        except Exception as row_error:  # noqa: BLE001
            logger.error(
                "Error processing customer row %s for org %s: %s",
                getattr(payment_user, "id", None),
                org_id,
                row_error,
            )

    return customers_data
