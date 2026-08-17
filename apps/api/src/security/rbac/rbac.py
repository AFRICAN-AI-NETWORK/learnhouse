from collections.abc import Sequence
from typing import Literal

from fastapi import HTTPException, Request, status
from sqlalchemy import null
from sqlmodel import Session, select
import asyncio

from src.db.collections import Collection
from src.db.courses.courses import Course
from src.db.resource_authors import (
    ResourceAuthor,
    ResourceAuthorshipEnum,
    ResourceAuthorshipStatusEnum,
)
from src.db.roles import Role
from src.db.user_organizations import UserOrganization
from src.security.rbac.utils import (
    check_course_permissions_with_own,
    check_element_type,
)

# Role ids that are treated as organization administrators. Admins bypass the
# fine-grained rights checks (they implicitly hold every permission).
ADMIN_ROLE_IDS = {1, 2}


def _select_user_roles(user_id: int):
    """Roles bound to the user's organization(s) plus standard (global) roles."""
    return (
        select(Role)
        .join(UserOrganization)
        .where((UserOrganization.org_id == Role.org_id) | (Role.org_id == null()))
        .where(UserOrganization.user_id == user_id)
    )


def _rights_grant(rights, resource: str, action: str) -> bool:
    """
    Return True if a role's ``rights`` payload grants ``action`` on ``resource``.

    Handles ``rights`` stored either as a plain dict (JSON column) or as a
    pydantic object, mirroring the lookup style used elsewhere in this module.
    """
    if not rights:
        return False

    resource_rights = (
        rights.get(resource)
        if isinstance(rights, dict)
        else getattr(rights, resource, None)
    )
    if not resource_rights:
        return False

    action_key = f"action_{action}"
    if isinstance(resource_rights, dict):
        return bool(resource_rights.get(action_key, False))
    return bool(getattr(resource_rights, action_key, False))


# Tested and working
async def authorization_verify_if_element_is_public(
    request,
    element_uuid: str,
    action: Literal["read"],
    db_session: Session,
):
    element_nature = await check_element_type(element_uuid)
    # Verifies if the element is public
    if element_nature == ("courses") and action == "read":
        if element_nature == "courses":
            statement = select(Course).where(
                Course.public == True, Course.course_uuid == element_uuid
            )
            loop = asyncio.get_running_loop()
            course = await loop.run_in_executor(
                None, lambda: db_session.exec(statement).first()
            )
            if course:
                return True
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User rights : You don't have the right to perform this action",
                )

    if element_nature == "collections" and action == "read":
        statement = select(Collection).where(
            Collection.public == True, Collection.collection_uuid == element_uuid
        )
        loop = asyncio.get_running_loop()
        collection = await loop.run_in_executor(
            None, lambda: db_session.exec(statement).first()
        )
        if collection:
            return True
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User rights : You don't have the right to perform this action",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User rights : You don't have the right to perform this action",
        )


# Tested and working
async def authorization_verify_if_user_is_author(
    request,
    user_id: int,
    action: Literal["read", "update", "delete", "create"],
    element_uuid: str,
    db_session: Session,
):
    # For create action, we don't need to check existing resource
    if action == "create":
        return True  # Allow creation if user is authenticated

    if action in ["update", "delete", "read"]:
        # Fix: Filter by BOTH resource_uuid and user_id to correctly check inheritance for all authors
        statement = select(ResourceAuthor).where(
            ResourceAuthor.resource_uuid == element_uuid,
            ResourceAuthor.user_id == int(user_id),
            ResourceAuthor.authorship_status == ResourceAuthorshipStatusEnum.ACTIVE,
        )
        loop = asyncio.get_running_loop()
        resource_author = await loop.run_in_executor(
            None, lambda: db_session.exec(statement).first()
        )

        if resource_author:
            # Defense in depth: Verify user_id matches (fixes unit test edge cases)
            try:
                author_id = resource_author.user_id
                if int(author_id) != int(user_id):
                    return False
            except (AttributeError, TypeError, ValueError):
                # In production, the DB filter in the query handles this.
                # In tests, generic mocks are ignored here.
                pass

            # All active authorship roles have "read" access
            if action == "read":
                return True

            # Only CREATOR, MAINTAINER, and CONTRIBUTOR have write/delete access
            if resource_author.authorship in [
                ResourceAuthorshipEnum.CREATOR,
                ResourceAuthorshipEnum.MAINTAINER,
                ResourceAuthorshipEnum.CONTRIBUTOR,
            ]:
                return True

        return False
    return False


# Tested and working
async def authorization_verify_based_on_roles(
    request: Request,
    user_id: int,
    action: Literal["read", "update", "delete", "create"],
    element_uuid: str,
    db_session: Session,
):
    element_type = await check_element_type(element_uuid)

    # Get user roles bound to an organization and standard roles
    statement = (
        select(Role)
        .join(UserOrganization)
        .where((UserOrganization.org_id == Role.org_id) | (Role.org_id == null()))
        .where(UserOrganization.user_id == user_id)
    )

    loop = asyncio.get_running_loop()
    user_roles_in_organization_and_standard_roles = await loop.run_in_executor(
        None, lambda: db_session.exec(statement).all()
    )

    # Check if user is the author of the resource for "own" permissions
    is_author = False
    if action in ["update", "delete", "read"]:
        is_author = await authorization_verify_if_user_is_author(
            request, user_id, action, element_uuid, db_session
        )

    # Check all roles until we find one that grants the permission
    for role in user_roles_in_organization_and_standard_roles:
        role = Role.model_validate(role)
        if role.rights:
            rights = role.rights

            # Safely get element_rights whether rights is a dict or object
            element_rights = None
            if isinstance(rights, dict):
                element_rights = rights.get(element_type)
            else:
                element_rights = getattr(rights, element_type, None)

            if element_rights:
                # Special handling for courses with PermissionsWithOwn
                if element_type == "courses":
                    if await check_course_permissions_with_own(
                        element_rights, action, is_author
                    ):
                        return True
                else:
                    # For non-course resources, check general permissions
                    # Safely get action value whether element_rights is a dict or object
                    action_key = f"action_{action}"
                    has_permission = False
                    if isinstance(element_rights, dict):
                        has_permission = element_rights.get(action_key, False)
                    else:
                        has_permission = getattr(element_rights, action_key, False)

                    if has_permission:
                        return True

    # If we get here, no role granted the permission
    return False


async def authorization_verify_based_on_org_admin_status(
    request: Request,
    user_id: int,
    action: Literal["read", "update", "delete", "create"],
    element_uuid: str,
    db_session: Session,
):
    await check_element_type(element_uuid)

    loop = asyncio.get_running_loop()
    user_roles_in_organization_and_standard_roles = await loop.run_in_executor(
        None, lambda: db_session.exec(_select_user_roles(user_id)).all()
    )

    # Check if user has an admin role in any organization
    for role in user_roles_in_organization_and_standard_roles:
        role = Role.model_validate(role)
        if role.id in ADMIN_ROLE_IDS:
            return True

    return False


async def authorization_verify_has_rights(
    user_id: int,
    requirements: Sequence[tuple[str, str]],
    db_session: Session,
) -> bool:
    """
    Permission-based authorization that is not tied to a specific resource uuid.

    Returns True when the user either holds an admin role, or has a single role
    whose ``rights`` grant *every* ``(resource, action)`` pair in ``requirements``.
    This lets any role an organization configures (admin, maintainer, community
    manager, student coordinator, project manager, ...) be granted access purely
    through its rights, with no code change per role.
    """
    loop = asyncio.get_running_loop()
    roles = await loop.run_in_executor(
        None, lambda: db_session.exec(_select_user_roles(user_id)).all()
    )

    for role in roles:
        role = Role.model_validate(role)
        if role.id in ADMIN_ROLE_IDS:
            return True
        if all(
            _rights_grant(role.rights, resource, action)
            for resource, action in requirements
        ):
            return True

    return False


# Tested and working
async def authorization_verify_based_on_roles_and_authorship(
    request: Request,
    user_id: int,
    action: Literal["read", "update", "delete", "create"],
    element_uuid: str,
    db_session: Session,
):
    isAuthor = await authorization_verify_if_user_is_author(
        request, user_id, action, element_uuid, db_session
    )

    isRole = await authorization_verify_based_on_roles(
        request, user_id, action, element_uuid, db_session
    )

    if isAuthor or isRole:
        return True
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User rights (roles & authorship) : You don't have the right to perform this action",
        )


async def authorization_verify_if_user_is_anon(user_id: int):
    if user_id == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You should be logged in to perform this action",
        )
