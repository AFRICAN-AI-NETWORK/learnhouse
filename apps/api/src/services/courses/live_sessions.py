from datetime import datetime
from typing import List
from fastapi import Request
from sqlmodel import Session, select
from src.db.courses.live_sessions import (
    LiveSessionRegistration,
    LiveSessionRegistrationRead,
)
from src.db.users import PublicUser, User
from src.db.courses.activities import Activity
from src.services.communications.notifications import (
    send_session_confirmation_email, 
    send_enrolment_invitation_email,
    send_session_reminder_email
)
from src.db.organization_config import OrganizationConfig
from src.services.integrations.youtube import YouTubeService


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


async def end_live_session(
    activity_uuid: str,
    db_session: Session,
):
    """
    End a live session:
    1. Transition YouTube broadcast to 'complete' if it exists.
    2. Mark activity as concluded manually.
    """
    activity = db_session.exec(
        select(Activity).where(Activity.activity_uuid == activity_uuid)
    ).first()
    
    if not activity:
        return {"error": "Activity not found"}

    # 1. YouTube Transition
    details = activity.details or {}
    youtube_video_id = details.get("youtube_video_id")
    
    if youtube_video_id:
        try:
            # Fetch Org Config for credentials
            statement = select(OrganizationConfig).where(OrganizationConfig.org_id == activity.org_id)
            org_config_obj = db_session.exec(statement).first()
            
            if org_config_obj and org_config_obj.config:
                yt_config = org_config_obj.config.get('integrations', {}).get('youtube')
                if yt_config:
                    yt_service = YouTubeService(yt_config)
                    await yt_service.end_broadcast(youtube_video_id)
        except Exception as e:
            print(f"[LIVE_SESSIONS_SERVICE] YouTube End Failed: {str(e)}")
            # Log but continue to mark as ended locally

    # 2. Update status
    details.update({"is_concluded_manually": True})
    activity.details = details
    db_session.add(activity)
    db_session.commit()
    db_session.refresh(activity)
    
    return {"status": "success", "activity_uuid": activity_uuid}
