"""Access-control tests for the student dashboard.

The dashboard is permission-based: admins and any role granted both
``dashboard.action_access`` and ``users.action_read`` may view it; everyone else
is rejected.
"""

import pytest
from fastapi import HTTPException

from src.db.users import AnonymousUser
from src.security.dashboard_security import verify_student_dashboard_access

from .conftest import current_user


@pytest.mark.asyncio
async def test_admin_is_allowed(session, admin_user):
    # Should not raise.
    await verify_student_dashboard_access(current_user(admin_user), session)


@pytest.mark.asyncio
async def test_role_with_rights_is_allowed(session, coordinator_user):
    # Non-admin staff role with dashboard + users-read rights.
    await verify_student_dashboard_access(current_user(coordinator_user), session)


@pytest.mark.asyncio
async def test_plain_student_is_forbidden(session, student_user):
    with pytest.raises(HTTPException) as exc:
        await verify_student_dashboard_access(current_user(student_user), session)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_anonymous_is_unauthorized(session):
    with pytest.raises(HTTPException) as exc:
        await verify_student_dashboard_access(AnonymousUser(), session)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_access_without_users_read_is_forbidden(
    session, org, student_role
):
    """A role with dashboard access but no users-read must not get in."""
    from .conftest import make_user

    student_role.rights = {"dashboard": {"action_access": True}}
    session.add(student_role)
    session.commit()

    user = make_user(session, org, student_role, "partial", "partial@test.com")
    with pytest.raises(HTTPException) as exc:
        await verify_student_dashboard_access(current_user(user), session)
    assert exc.value.status_code == 403
