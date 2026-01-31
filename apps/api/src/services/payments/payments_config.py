from typing import Literal
from fastapi import HTTPException, Request
from sqlmodel import Session, select, text
from src.db.payments.payments import (
    PaymentProviderEnum,
    PaymentsConfig,
    PaymentsConfigUpdate,
    PaymentsConfigRead,
)
from src.db.users import PublicUser, AnonymousUser, InternalUser
from src.db.organizations import Organization
from src.services.orgs.orgs import rbac_check
from src.security.features_utils.usage import check_limits_with_usage


async def init_payments_config(
    request: Request,
    org_id: int,
    provider: Literal["paystack"],
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> PaymentsConfig:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)
    
    # Validate organization exists
    org = db_session.exec(
        select(Organization).where(Organization.id == org_id)
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Verify permissions
    await rbac_check(request, org.org_uuid, current_user, "create", db_session)

    # Check for existing config
    # Use raw SQL to avoid enum validation issues with old STRIPE configs
    result = db_session.exec(
        text("SELECT id FROM payments_config WHERE org_id = :org_id"),
        {"org_id": org_id}
    ).first()
    
    if result:
        # If there's an existing config (possibly with STRIPE), delete it first
        # This handles migration from STRIPE to PAYSTACK
        db_session.exec(
            text("DELETE FROM payments_config WHERE org_id = :org_id"),
            {"org_id": org_id}
        )
        db_session.commit()

    # Initialize new config
    new_config = PaymentsConfig(
        org_id=org_id,
        provider=PaymentProviderEnum.PAYSTACK,
        provider_config={
            "onboarding_completed": False,
        },
        provider_specific_id=None
    )

    # Save to database
    db_session.add(new_config)
    db_session.commit()
    db_session.refresh(new_config)

    return new_config


async def get_payments_config(
    request: Request,
    org_id: int,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
) -> list[PaymentsConfigRead]:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)
    
    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "read", db_session)

    # Clean up any old STRIPE configs first
    db_session.exec(
        text("DELETE FROM payments_config WHERE org_id = :org_id AND provider = 'stripe'"),
        {"org_id": org_id}
    )
    db_session.commit()

    # Get payments config (now only PAYSTACK configs exist)
    statement = select(PaymentsConfig).where(PaymentsConfig.org_id == org_id)
    configs = db_session.exec(statement).all()

    return [PaymentsConfigRead.model_validate(config) for config in configs]


async def update_payments_config(
    request: Request,
    org_id: int,
    payments_config: PaymentsConfigUpdate,
    current_user: PublicUser | AnonymousUser | InternalUser,
    db_session: Session,
) -> PaymentsConfig:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)
    
    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "update", db_session)

    # Clean up any old STRIPE configs first
    db_session.exec(
        text("DELETE FROM payments_config WHERE org_id = :org_id AND provider = 'stripe'"),
        {"org_id": org_id}
    )
    db_session.commit()

    # Get existing payments config (now only PAYSTACK configs exist)
    statement = select(PaymentsConfig).where(PaymentsConfig.org_id == org_id)
    config = db_session.exec(statement).first()
    if not config:
        raise HTTPException(status_code=404, detail="Payments config not found")

    # Update config
    for key, value in payments_config.model_dump().items():
        setattr(config, key, value)

    db_session.add(config)
    db_session.commit()
    db_session.refresh(config)

    return config


async def delete_payments_config(
    request: Request,
    org_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> None:
    # Check if payments feature is enabled
    check_limits_with_usage("payments", org_id, db_session)
    
    # Check if organization exists
    statement = select(Organization).where(Organization.id == org_id)
    org = db_session.exec(statement).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # RBAC check
    await rbac_check(request, org.org_uuid, current_user, "delete", db_session)

    # Delete config using raw SQL to avoid enum validation issues
    result = db_session.exec(
        text("DELETE FROM payments_config WHERE org_id = :org_id"),
        {"org_id": org_id}
    )
    db_session.commit()
    
    # Check if any rows were deleted
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Payments config not found")
