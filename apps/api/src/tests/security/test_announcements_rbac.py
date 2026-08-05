"""
Tests for announcement-creation authorization.

create_announcement() checks the "announcements"/"create" right rather than
a hardcoded admin-role list, so Admin, Maintainer, and Instructor can all
post announcements while a plain student ("User" role) cannot.
"""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from src.db.organizations import Organization
from src.db.roles import (DashboardPermission, Permission, PermissionsWithOwn,
                          Rights)
from src.db.user_organizations import UserOrganization
from src.db.users import User
from src.security.rbac.rbac import authorization_verify_has_rights


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="org")
def organization_fixture(session: Session):
    org = Organization(
        org_uuid=f"org_{uuid4()}",
        name="Test Organization",
        slug="test-org",
        email="test@testorg.com",
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


def _base_permission(**overrides) -> Permission:
    defaults = dict(
        action_create=False, action_read=True, action_update=False, action_delete=False
    )
    defaults.update(overrides)
    return Permission(**defaults)


def _make_role(
    session: Session, name: str, announcements_create: bool, role_id: int = 100
):
    from src.db.roles import Role, RoleTypeEnum

    # role_id defaults well outside ADMIN_ROLE_IDS ({1, 2}) — SQLite
    # autoincrement would otherwise assign 1 to the first row inserted in
    # this test's fresh in-memory DB, accidentally granting the admin
    # bypass regardless of the rights being tested here.

    rights = Rights(
        courses=PermissionsWithOwn(
            action_create=False,
            action_read=True,
            action_read_own=True,
            action_update=False,
            action_update_own=False,
            action_delete=False,
            action_delete_own=False,
        ),
        users=_base_permission(),
        usergroups=_base_permission(),
        collections=_base_permission(),
        organizations=_base_permission(),
        coursechapters=_base_permission(),
        activities=_base_permission(),
        roles=_base_permission(),
        communications=_base_permission(),
        announcements=_base_permission(action_create=announcements_create),
        dashboard=DashboardPermission(action_access=True),
    )
    role = Role(
        id=role_id,
        name=name,
        description="",
        role_type=RoleTypeEnum.TYPE_GLOBAL,
        role_uuid=f"role_{uuid4()}",
        rights=rights,
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )
    # Union[Rights, dict] re-validates a plain dict passed at construction
    # time back into a Rights object, so serialize *after* construction —
    # matches the same workaround setup.py uses for the same reason.
    role.rights = role.rights.dict()
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


def _make_user_with_role(
    session: Session, org: Organization, role, username: str
) -> User:
    user = User(
        user_uuid=f"usr_{uuid4()}",
        username=username,
        email=f"{username}@example.com",
        password="hashed_password",
        first_name="Test",
        last_name="User",
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    session.add(
        UserOrganization(
            user_id=user.id,
            org_id=org.id,
            role_id=role.id,
            creation_date=str(datetime.now(timezone.utc)),
            update_date=str(datetime.now(timezone.utc)),
        )
    )
    session.commit()
    return user


ANNOUNCEMENTS_CREATE = [("announcements", "create")]


class TestAnnouncementCreateAuthorization:
    @pytest.mark.asyncio
    async def test_role_with_announcements_create_right_is_authorized(
        self, session: Session, org: Organization
    ):
        instructor_role = _make_role(session, "Instructor", announcements_create=True)
        user = _make_user_with_role(session, org, instructor_role, "instructor_user")

        assert (
            await authorization_verify_has_rights(
                user.id, ANNOUNCEMENTS_CREATE, session
            )
            is True
        )

    @pytest.mark.asyncio
    async def test_role_without_announcements_create_right_is_denied(
        self, session: Session, org: Organization
    ):
        student_role = _make_role(session, "User", announcements_create=False)
        user = _make_user_with_role(session, org, student_role, "student_user")

        assert (
            await authorization_verify_has_rights(
                user.id, ANNOUNCEMENTS_CREATE, session
            )
            is False
        )

    @pytest.mark.asyncio
    async def test_admin_role_id_bypasses_rights_check(
        self, session: Session, org: Organization
    ):
        """Admin (role id 1) is authorized even without an explicit
        announcements right, since ADMIN_ROLE_IDS short-circuits the check."""
        from src.db.roles import Role, RoleTypeEnum

        admin_role = Role(
            id=1,
            name="Admin",
            description="",
            role_type=RoleTypeEnum.TYPE_GLOBAL,
            role_uuid="role_global_admin_test",
            rights={},
            creation_date=str(datetime.now(timezone.utc)),
            update_date=str(datetime.now(timezone.utc)),
        )
        session.add(admin_role)
        session.commit()
        session.refresh(admin_role)
        user = _make_user_with_role(session, org, admin_role, "admin_user")

        assert (
            await authorization_verify_has_rights(
                user.id, ANNOUNCEMENTS_CREATE, session
            )
            is True
        )
