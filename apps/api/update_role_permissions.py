import os
import sys

sys.path.append(os.getcwd())
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from src.core.events.database import engine
from src.db.roles import Role, RoleTypeEnum


def update_roles():
    with Session(engine) as session:
        # Fix sequence if out of sync
        try:
            session.execute(
                text("SELECT setval('role_id_seq', (SELECT max(id) FROM role))")
            )
            session.commit()
            print("Reset role_id_seq successfully.")
        except SQLAlchemyError as e:
            session.rollback()
            print(f"Warning: Could not reset sequence: {e}")

        # Debug: List all existing roles
        all_roles = session.exec(select(Role)).all()
        print(
            f"Current roles in database: {[(r.id, r.name, r.role_uuid) for r in all_roles]}"
        )

        # Define the rights for Support and Community Manager
        support_rights = {
            "dashboard": {"action_access": True},
            "communications": {
                "action_create": True,
                "action_read": True,
                "action_update": True,
                "action_delete": False,
            },
            "users": {
                "action_create": False,
                "action_read": True,
                "action_update": False,
                "action_delete": False,
            },
            "activities": {
                "action_create": False,
                "action_read": True,
                "action_update": False,
                "action_delete": False,
            },
        }

        community_manager_rights = {
            "dashboard": {"action_access": True},
            "communications": {
                "action_create": True,
                "action_read": True,
                "action_update": True,
                "action_delete": True,
            },
            "activities": {
                "action_create": True,
                "action_read": True,
                "action_update": True,
                "action_delete": True,
            },
            # Required to view the student dashboard (reads student/user data).
            "users": {
                "action_create": False,
                "action_read": True,
                "action_update": False,
                "action_delete": False,
            },
            "usergroups": {
                "action_create": False,
                "action_read": True,
                "action_update": False,
                "action_delete": False,
            },
        }

        partner_rights = {
            "dashboard": {"action_access": True},
            "communications": {
                "action_create": False,
                "action_read": True,
                "action_update": False,
                "action_delete": False,
            },
            "referrals": {
                "action_create": True,
                "action_read": True,
                "action_update": True,
                "action_delete": False,
            },
            "commissions": {
                "action_create": False,
                "action_read": True,
                "action_update": False,
                "action_delete": False,
            },
        }

        roles_to_update = [
            (
                "Support",
                "support_role",
                "Role for support staff to manage communications",
                support_rights,
            ),
            (
                "Community Manager",
                "community_manager_role",
                "Role for managing community activities and communications",
                community_manager_rights,
            ),
            (
                "Partner",
                "partner_role",
                "Role for external partners to track referrals and commissions",
                partner_rights,
            ),
        ]

        for name, uuid, desc, rights in roles_to_update:
            # Check if role exists by UUID
            statement = select(Role).where(Role.role_uuid == uuid)
            role = session.exec(statement).first()

            now_str = datetime.now(UTC).isoformat()

            if role:
                print(f"Updating existing role: {name} ({uuid})")
                role.rights = rights
                role.description = desc
                role.update_date = now_str
                session.add(role)
            else:
                # Also check by name to avoid duplicates if UUID is different
                statement_name = select(Role).where(Role.name == name)
                role_by_name = session.exec(statement_name).first()

                if role_by_name:
                    print(
                        f"Role with name '{name}' already exists with different UUID: {role_by_name.role_uuid}. Updating it."
                    )
                    role_by_name.rights = rights
                    role_by_name.description = desc
                    role_by_name.role_uuid = (
                        uuid  # Force sync UUID if we want it to be predictable
                    )
                    role_by_name.update_date = now_str
                    session.add(role_by_name)
                else:
                    print(f"Creating new global role: {name}")
                    new_role = Role(
                        name=name,
                        role_uuid=uuid,
                        description=desc,
                        role_type=RoleTypeEnum.TYPE_GLOBAL,
                        rights=rights,
                        creation_date=now_str,
                        update_date=now_str,
                    )
                    session.add(new_role)

        try:
            session.commit()
            print("Roles sync completed successfully.")
        except SQLAlchemyError as e:
            session.rollback()
            print(f"Error during commit: {e}")
            raise


if __name__ == "__main__":
    update_roles()
