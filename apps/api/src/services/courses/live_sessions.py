from datetime import datetime
from typing import List
from fastapi import HTTPException, Request, status
from sqlmodel import Session, select
from src.db.courses.live_sessions import (
    LiveSessionRegistration,
    LiveSessionRegistrationCreate,
    LiveSessionRegistrationRead,
)
from src.db.users import PublicUser, User
from src.db.courses.activities import Activity
from src.services.communications.notifications import (
    send_session_confirmation_email, 
    send_enrolment_invitation_email,
    send_session_reminder_email
)


async def register_for_live_session(
    request: Request,
    activity_uuid: str,
    current_user: PublicUser,
    db_session: Session,
) -> LiveSessionRegistrationRead:
    """
    Register a student for a live session.
    """
    # Check if already registered
    statement = select(LiveSessionRegistration).where(
        LiveSessionRegistration.activity_uuid == activity_uuid,
        LiveSessionRegistration.user_id == current_user.id,
    )
    existing = db_session.exec(statement).first()
    if existing:
        return LiveSessionRegistrationRead.model_validate(existing)

    # Create registration
    # Note: org_id logic can be derived from the activity or user groups
    # For now, we assume user registration is linked to their current session organization
    org_id = int(request.headers.get("x-org-id", 0))
    
    registration = LiveSessionRegistration(
        activity_uuid=activity_uuid,
        user_id=current_user.id,
        org_id=org_id,
        creation_date=datetime.now().isoformat(),
    )
    db_session.add(registration)
    db_session.commit()
    db_session.refresh(registration)
    
    # Automated Confirmation Email
    activity = db_session.exec(select(Activity).where(Activity.activity_uuid == activity_uuid)).first()
    user = db_session.get(User, current_user.id)
    if activity and user:
        send_session_confirmation_email(user, activity)
    
    return LiveSessionRegistrationRead.model_validate(registration)


async def get_live_session_registrations(
    activity_uuid: str,
    db_session: Session,
) -> list[LiveSessionRegistrationRead]:
    """
    Get all participants for a live session.
    """
    statement = select(LiveSessionRegistration).where(
        LiveSessionRegistration.activity_uuid == activity_uuid
    )
    results = db_session.exec(statement).all()
    return [LiveSessionRegistrationRead.model_validate(r) for r in results]


async def is_user_registered(
    activity_uuid: str,
    user_id: int,
    db_session: Session,
) -> bool:
    """
    Check if a user is registered for a specific session.
    """
    statement = select(LiveSessionRegistration).where(
        LiveSessionRegistration.activity_uuid == activity_uuid,
        LiveSessionRegistration.user_id == user_id,
    )
    result = db_session.exec(statement).first()
    return result is not None


async def send_manual_notifications(
    db_session: Session,
    activity_uuid: str,
    user_ids: List[int],
    notification_type: str = "CONFIRMATION"
):
    """
    Manually trigger notifications for a specific session.
    Supported types: 'CONFIRMATION', 'ENROLMENT'
    """
    activity = db_session.exec(select(Activity).where(Activity.activity_uuid == activity_uuid)).first()
    if not activity:
        return

    users = db_session.exec(select(User).where(User.id.in_(user_ids))).all()
    
    for user in users:
        if notification_type == "CONFIRMATION":
            send_session_confirmation_email(user, activity)
        elif notification_type == "REMINDER":
            send_session_reminder_email(user, activity)
        elif notification_type == "ENROLMENT":
            send_enrolment_invitation_email(user, activity)
