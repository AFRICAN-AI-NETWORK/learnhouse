"""Create or update the initial LearnHouse administrator.

Run from ``apps/api`` after setting:

    LEARNHOUSE_INITIAL_ADMIN_EMAIL
    LEARNHOUSE_INITIAL_ADMIN_PASSWORD

The script is idempotent and marks the administrator's email as verified.
"""

import os
import sys
from datetime import UTC, datetime
from pathlib import Path

from dotenv import load_dotenv
from pydantic import EmailStr
from sqlalchemy import create_engine
from sqlmodel import Session, select

API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

from src.db.organizations import Organization
from src.db.roles import Role
from src.db.user_organizations import UserOrganization
from src.db.users import User
from src.security.security import security_hash_password


def main() -> None:
    load_dotenv(API_ROOT / ".env")

    email = os.environ.get("LEARNHOUSE_INITIAL_ADMIN_EMAIL")
    password = os.environ.get("LEARNHOUSE_INITIAL_ADMIN_PASSWORD")
    database_url = os.environ.get("LEARNHOUSE_SQL_CONNECTION_STRING")

    missing = [
        name
        for name, value in (
            ("LEARNHOUSE_INITIAL_ADMIN_EMAIL", email),
            ("LEARNHOUSE_INITIAL_ADMIN_PASSWORD", password),
            ("LEARNHOUSE_SQL_CONNECTION_STRING", database_url),
        )
        if not value
    ]
    if missing:
        raise RuntimeError(
            "Missing required environment variable(s): " + ", ".join(missing)
        )

    admin_email = str(EmailStr(email))
    engine = create_engine(database_url, pool_pre_ping=True)

    with Session(engine) as session:
        organization = session.exec(
            select(Organization).where(Organization.slug == "default")
        ).first()
        if organization is None or organization.id is None:
            raise RuntimeError(
                "The default organization does not exist. Run the LearnHouse "
                "installation first."
            )

        admin_role = session.exec(
            select(Role).where(Role.id == 1, Role.role_uuid == "role_global_admin")
        ).first()
        if admin_role is None or admin_role.id is None:
            raise RuntimeError(
                "The global admin role does not exist. Install the default roles first."
            )

        user = session.exec(select(User).where(User.email == admin_email)).first()
        if user is None:
            username_taken = session.exec(
                select(User).where(User.username == "admin")
            ).first()
            if username_taken is not None:
                raise RuntimeError(
                    "The username 'admin' is already used by another user."
                )

            now = str(datetime.now(UTC))
            user = User(
                username="admin",
                first_name="",
                last_name="",
                email=admin_email,
                password=security_hash_password(password),
                user_uuid=f"user_{os.urandom(16).hex()}",
                email_verified=True,
                creation_date=now,
                update_date=now,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            action = "Created"
        else:
            user.password = security_hash_password(password)
            user.email_verified = True
            user.update_date = str(datetime.now(UTC))
            session.add(user)
            session.commit()
            action = "Updated"

        if user.id is None:
            raise RuntimeError("The administrator was saved without a user ID.")

        membership = session.exec(
            select(UserOrganization).where(
                UserOrganization.user_id == user.id,
                UserOrganization.org_id == organization.id,
            )
        ).first()
        if membership is None:
            now = str(datetime.now(UTC))
            session.add(
                UserOrganization(
                    user_id=user.id,
                    org_id=organization.id,
                    role_id=admin_role.id,
                    creation_date=now,
                    update_date=now,
                )
            )
        else:
            membership.role_id = admin_role.id
            membership.update_date = str(datetime.now(UTC))
            session.add(membership)

        session.commit()

    print(f"{action} verified administrator account for {admin_email}.")


if __name__ == "__main__":
    main()
