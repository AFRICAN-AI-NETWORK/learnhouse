from enum import Enum

from fastapi import HTTPException, status
from sqlmodel import Session, func, select

from src.db.roles import Role
from src.db.user_organizations import UserOrganization
from src.db.users import User


class ChatRole(str, Enum):
    """Chat role definitions to avoid hardcoded strings."""

    STUDENT = "student"
    LEARNER = "learner"
    USER = "user"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"
    MAINTAINER = "maintainer"
    # Support / staff roles
    TEACHING_ASSISTANT = "teaching assistant"
    STUDENT_SUCCESS_COORDINATOR = "students success coordinator"
    STUDENT_MENTOR = "students mentor"
    COMMUNITY_MANAGER = "community manager"
    LEAD_INSTRUCTOR = "lead instructor"


def _normalize_role_name(role_name: str) -> str:
    """Normalize role names for robust matching across case/spacing variants."""
    return " ".join(role_name.strip().lower().split())


_ROLE_NAME_ALIASES: dict[str, ChatRole] = {
    "student": ChatRole.STUDENT,
    "learner": ChatRole.LEARNER,
    "user": ChatRole.USER,
    "instructor": ChatRole.INSTRUCTOR,
    "admin": ChatRole.ADMIN,
    "maintainer": ChatRole.MAINTAINER,
    "teaching assistant": ChatRole.TEACHING_ASSISTANT,
    "teaching_assistant": ChatRole.TEACHING_ASSISTANT,
    "student success coordinator": ChatRole.STUDENT_SUCCESS_COORDINATOR,
    "students success coordinator": ChatRole.STUDENT_SUCCESS_COORDINATOR,
    "student mentor": ChatRole.STUDENT_MENTOR,
    "students mentor": ChatRole.STUDENT_MENTOR,
    "community manager": ChatRole.COMMUNITY_MANAGER,
    "community_manager": ChatRole.COMMUNITY_MANAGER,
    "lead instructor": ChatRole.LEAD_INSTRUCTOR,
    "lead_instructor": ChatRole.LEAD_INSTRUCTOR,
}


def _resolve_chat_role(role_name: str) -> ChatRole:
    """Resolve a DB role name to the canonical chat role enum."""
    normalized = _normalize_role_name(role_name)
    if normalized in _ROLE_NAME_ALIASES:
        return _ROLE_NAME_ALIASES[normalized]
    return ChatRole(normalized)


# Roles that can chat with everyone
_PRIVILEGED_ROLES = [
    ChatRole.STUDENT,
    ChatRole.LEARNER,
    ChatRole.USER,
    ChatRole.INSTRUCTOR,
    ChatRole.ADMIN,
    ChatRole.MAINTAINER,
    ChatRole.TEACHING_ASSISTANT,
    ChatRole.STUDENT_SUCCESS_COORDINATOR,
    ChatRole.STUDENT_MENTOR,
    ChatRole.COMMUNITY_MANAGER,
    ChatRole.LEAD_INSTRUCTOR,
]

# Roles that students/learners/users are allowed to reach
_STUDENT_REACHABLE_ROLES = [
    ChatRole.INSTRUCTOR,
    ChatRole.TEACHING_ASSISTANT,
    ChatRole.STUDENT_SUCCESS_COORDINATOR,
    ChatRole.STUDENT_MENTOR,
    ChatRole.COMMUNITY_MANAGER,
    ChatRole.LEAD_INSTRUCTOR,
]

# Permission matrix: maps a role to the list of roles it can chat with
CHAT_PERMISSION_MATRIX = {
    ChatRole.STUDENT: _STUDENT_REACHABLE_ROLES,
    ChatRole.LEARNER: _STUDENT_REACHABLE_ROLES,
    ChatRole.USER: _STUDENT_REACHABLE_ROLES,
    ChatRole.INSTRUCTOR: _PRIVILEGED_ROLES,
    ChatRole.ADMIN: _PRIVILEGED_ROLES,
    ChatRole.MAINTAINER: _PRIVILEGED_ROLES,
    ChatRole.TEACHING_ASSISTANT: _PRIVILEGED_ROLES,
    ChatRole.STUDENT_SUCCESS_COORDINATOR: _PRIVILEGED_ROLES,
    ChatRole.STUDENT_MENTOR: _PRIVILEGED_ROLES,
    ChatRole.COMMUNITY_MANAGER: _PRIVILEGED_ROLES,
    ChatRole.LEAD_INSTRUCTOR: _PRIVILEGED_ROLES,
}

# Target roles for listing chatable users (same structure as permission matrix)
CHATABLE_TARGETS = {
    ChatRole.STUDENT: [r.value for r in _STUDENT_REACHABLE_ROLES],
    ChatRole.LEARNER: [r.value for r in _STUDENT_REACHABLE_ROLES],
    ChatRole.USER: [r.value for r in _STUDENT_REACHABLE_ROLES],
    ChatRole.INSTRUCTOR: [r.value for r in _PRIVILEGED_ROLES],
    ChatRole.ADMIN: [r.value for r in _PRIVILEGED_ROLES],
    ChatRole.MAINTAINER: [r.value for r in _PRIVILEGED_ROLES],
    ChatRole.TEACHING_ASSISTANT: [r.value for r in _PRIVILEGED_ROLES],
    ChatRole.STUDENT_SUCCESS_COORDINATOR: [r.value for r in _PRIVILEGED_ROLES],
    ChatRole.STUDENT_MENTOR: [r.value for r in _PRIVILEGED_ROLES],
    ChatRole.COMMUNITY_MANAGER: [r.value for r in _PRIVILEGED_ROLES],
    ChatRole.LEAD_INSTRUCTOR: [r.value for r in _PRIVILEGED_ROLES],
}


async def verify_chat_permission(
    db: Session, current_user_id: int, target_user_id: int, org_id: int
) -> bool:
    """
    Verify if current user has permission to chat with target user.

        Rules:
        - Students/Learners/Users can chat with Instructors and support staff roles
            (Teaching Assistant, Students Success Coordinator, Students Mentor,
             Community Manager, Lead Instructor)
        - Students cannot chat with students
        - Students cannot chat with admins/maintainers
        - Support staff roles can chat with all supported roles, including students
        - Instructors/Admins/Maintainers can chat with all supported roles
        - All chats must be within same organization
    """

    # Get both users' roles in the organization
    current_user_role = await get_user_role_in_org(db, current_user_id, org_id)
    target_user_role = await get_user_role_in_org(db, target_user_id, org_id)

    if not current_user_role or not target_user_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="One or both users are not members of this organization",
        )

    # Extract role names and map to canonical ChatRole enum
    current_role_name = _normalize_role_name(current_user_role.name)
    target_role_name = _normalize_role_name(target_user_role.name)

    try:
        current_chat_role = _resolve_chat_role(current_role_name)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unknown role '{current_role_name}' for chat permissions",
        )

    try:
        target_chat_role = _resolve_chat_role(target_role_name)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unknown role '{target_role_name}' for chat permissions",
        )

    # Check if current user's role allows chatting with target user's role
    allowed_targets = CHAT_PERMISSION_MATRIX.get(current_chat_role, [])

    if target_chat_role not in allowed_targets:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Users with role '{current_role_name}' cannot chat with users with role '{target_role_name}'",
        )

    return True


async def get_user_role_in_org(
    db: Session, user_id: int, org_id: int
) -> Role | None:
    """Get user's role in specific organization."""
    statement = (
        select(Role)
        .join(UserOrganization, UserOrganization.role_id == Role.id)
        .where(UserOrganization.user_id == user_id)
        .where(UserOrganization.org_id == org_id)
    )
    result = db.exec(statement).first()
    return result


async def get_chatable_users_for_user(
    db: Session, current_user_id: int, org_id: int
) -> list[User]:
    """
    Get list of users that current user can chat with in organization.
    """
    current_user_role = await get_user_role_in_org(db, current_user_id, org_id)

    if not current_user_role:
        return []

    current_role_name = _normalize_role_name(current_user_role.name)

    # Look up allowed target roles from the centralized permission map
    try:
        current_chat_role = _resolve_chat_role(current_role_name)
    except ValueError:
        return []

    target_role_names = CHATABLE_TARGETS.get(current_chat_role, [])

    if not target_role_names:
        return []

    # Query users with target roles in the organization (case-insensitive role matching)
    statement = (
        select(User)
        .join(UserOrganization, UserOrganization.user_id == User.id)
        .join(Role, Role.id == UserOrganization.role_id)
        .where(UserOrganization.org_id == org_id)
        .where(func.lower(Role.name).in_(target_role_names))
        .where(User.id != current_user_id)
    )

    results = db.exec(statement).all()
    return list(results)
