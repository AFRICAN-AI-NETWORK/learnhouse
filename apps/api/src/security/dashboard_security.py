"""
RBAC for the staff-facing student dashboard.

Access is permission-based rather than role-hardcoded: any role whose ``rights``
grant both dashboard access and read access to users qualifies. This deliberately
covers admins, maintainers, community managers, student coordinators and project
managers without a code change per role — an organization grants access by
configuring the role's rights.
"""

from fastapi import HTTPException, status
from sqlmodel import Session

from src.db.users import AnonymousUser, PublicUser
from src.security.rbac.rbac import authorization_verify_has_rights

# A qualifying role must be able to open the dashboard *and* read user data.
STUDENT_DASHBOARD_RIGHTS: tuple[tuple[str, str], ...] = (
    ("dashboard", "access"),
    ("users", "read"),
)


async def verify_student_dashboard_access(
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> None:
    """
    Ensure ``current_user`` may view the student dashboard.

    Raises:
        HTTPException 401: the request is unauthenticated (anonymous user).
        HTTPException 403: the user lacks the required dashboard rights.
    """
    if current_user is None or getattr(current_user, "id", 0) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access the student dashboard",
        )

    authorized = await authorization_verify_has_rights(
        current_user.id, STUDENT_DASHBOARD_RIGHTS, db_session
    )
    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access the student dashboard",
        )
