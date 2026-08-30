import re

from sqlmodel import Session, select

from src.db.communications import CampaignTargetType
from src.db.roles import Role
from src.db.trail_runs import TrailRun
from src.db.user_organizations import UserOrganization
from src.db.users import User


async def resolve_campaign_targets(
    db_session: Session, 
    org_id: int, 
    target_type: CampaignTargetType, 
    target_metadata: dict
) -> set[str]:
    """Resolves a target audience into a set of lowercase email addresses."""
    emails: set[str] = set()

    if target_type == CampaignTargetType.ALL:
        # Get all active org users with email
        users = db_session.exec(
            select(User.email)
            .join(UserOrganization, UserOrganization.user_id == User.id)
            .where(UserOrganization.organization_id == org_id, User.email.is_not(None))
        ).all()
        emails.update(u.lower() for u in users if u)

    elif target_type == CampaignTargetType.WAITLIST:
        # Get waitlist users for the org
        # Assuming WaitlistCoursePreference or Waitlist Config relates to org_id
        # Assuming WaitlistEmailLog has the emails
        from src.db.waitlist import WaitlistEmailLog
        logs = db_session.exec(
            select(WaitlistEmailLog.email)
            .where(WaitlistEmailLog.org_id == org_id)
        ).all()
        emails.update(e.lower() for e in logs if e)

    elif target_type == CampaignTargetType.COURSE:
        # Get users enrolled in a specific course
        course_uuid = target_metadata.get("course_uuid")
        if course_uuid:
            from src.db.courses.courses import Course
            from src.db.trails import Trail
            users = db_session.exec(
                select(User.email)
                .join(TrailRun, TrailRun.user_id == User.id)
                .join(Trail, Trail.id == TrailRun.trail_id)
                .join(Course, Course.id == TrailRun.course_id)
                .where(Course.course_uuid == course_uuid, Course.org_id == org_id, User.email.is_not(None))
            ).all()
            emails.update(u.lower() for u in users if u)

    elif target_type == CampaignTargetType.ROLES:
        # Users with selected org role names
        role_names = target_metadata.get("roles", [])
        if role_names:
            users = db_session.exec(
                select(User.email)
                .join(UserOrganization, UserOrganization.user_id == User.id)
                .join(Role, Role.id == UserOrganization.role_id)
                .where(UserOrganization.organization_id == org_id, Role.name.in_(role_names), User.email.is_not(None))
            ).all()
            emails.update(u.lower() for u in users if u)

    elif target_type == CampaignTargetType.CUSTOM_EMAILS:
        # Manually pasted emails
        custom_emails = target_metadata.get("emails", [])
        if isinstance(custom_emails, str):
            custom_emails = [e.strip() for e in custom_emails.split(",") if e.strip()]
            
        if isinstance(custom_emails, list):
            # Basic validation
            email_pattern = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
            for e in custom_emails:
                if isinstance(e, str):
                    e = e.strip().lower()
                    if email_pattern.match(e):
                        emails.add(e)

    return emails
