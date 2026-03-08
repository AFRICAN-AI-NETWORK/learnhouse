from typing import Optional, List
from enum import Enum
from fastapi import HTTPException, status
from sqlmodel import Session, select, func
from src.db.users import User
from src.db.user_organizations import UserOrganization
from src.db.roles import Role


class ChatRole(str, Enum):
    """Chat role definitions to avoid hardcoded strings."""
    STUDENT = "student"
    LEARNER = "learner"
    USER = "user"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"
    MAINTAINER = "maintainer"


# Roles that can chat with everyone
_PRIVILEGED_ROLES = [
    ChatRole.STUDENT, ChatRole.LEARNER, ChatRole.USER,
    ChatRole.INSTRUCTOR, ChatRole.ADMIN, ChatRole.MAINTAINER,
]

# Permission matrix: maps a role to the list of roles it can chat with
CHAT_PERMISSION_MATRIX = {
    ChatRole.STUDENT: [ChatRole.INSTRUCTOR],
    ChatRole.LEARNER: [ChatRole.INSTRUCTOR],
    ChatRole.USER: [ChatRole.INSTRUCTOR],
    ChatRole.INSTRUCTOR: _PRIVILEGED_ROLES,
    ChatRole.ADMIN: _PRIVILEGED_ROLES,
    ChatRole.MAINTAINER: _PRIVILEGED_ROLES,
}

# Target roles for listing chatable users (same structure as permission matrix)
CHATABLE_TARGETS = {
    ChatRole.STUDENT: [ChatRole.INSTRUCTOR.value],
    ChatRole.LEARNER: [ChatRole.INSTRUCTOR.value],
    ChatRole.USER: [ChatRole.INSTRUCTOR.value],
    ChatRole.INSTRUCTOR: [r.value for r in _PRIVILEGED_ROLES],
    ChatRole.ADMIN: [r.value for r in _PRIVILEGED_ROLES],
    ChatRole.MAINTAINER: [r.value for r in _PRIVILEGED_ROLES],
}


async def verify_chat_permission(
    db: Session,
    current_user_id: int,
    target_user_id: int,
    org_id: int
) -> bool:
    """
    Verify if current user has permission to chat with target user.
    
    Rules:
    - Regular users can ONLY chat with instructors
    - Instructors can chat with users, other instructors, admins, maintainers
    - Admins can chat with ANYONE (students, instructors, other admins, maintainers)
    - Maintainers can chat with ANYONE (students, instructors, admins, other maintainers)
    - All chats must be within same organization
    """
    
    # Get both users' roles in the organization
    current_user_role = await get_user_role_in_org(db, current_user_id, org_id)
    target_user_role = await get_user_role_in_org(db, target_user_id, org_id)
    
    if not current_user_role or not target_user_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="One or both users are not members of this organization"
        )
    
    # Extract role names (normalize to lowercase) and map to ChatRole enum
    current_role_name = current_user_role.name.lower()
    target_role_name = target_user_role.name.lower()
    
    try:
        current_chat_role = ChatRole(current_role_name)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unknown role '{current_role_name}' for chat permissions"
        )
    
    try:
        target_chat_role = ChatRole(target_role_name)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unknown role '{target_role_name}' for chat permissions"
        )
    
    # Check if current user's role allows chatting with target user's role
    allowed_targets = CHAT_PERMISSION_MATRIX.get(current_chat_role, [])
    
    if target_chat_role not in allowed_targets:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Users with role '{current_role_name}' cannot chat with users with role '{target_role_name}'"
        )
    
    return True


async def get_user_role_in_org(
    db: Session,
    user_id: int,
    org_id: int
) -> Optional[Role]:
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
    db: Session,
    current_user_id: int,
    org_id: int
) -> List[User]:
    """
    Get list of users that current user can chat with in organization.
    """
    current_user_role = await get_user_role_in_org(db, current_user_id, org_id)
    
    if not current_user_role:
        return []
    
    current_role_name = current_user_role.name.lower()
    
    # Look up allowed target roles from the centralized permission map
    try:
        current_chat_role = ChatRole(current_role_name)
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
