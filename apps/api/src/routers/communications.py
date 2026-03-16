from fastapi import APIRouter, Depends, Request, BackgroundTasks, HTTPException
from sqlmodel import Session, select
from src.core.events.database import get_db_session
from src.security.auth import get_current_user
from src.db.users import PublicUser, User
from src.db.user_organizations import UserOrganization
from src.db.organizations import Organization
from src.db.communications import Campaign, CampaignCreate, CampaignRead
from src.services.communications.dispatcher import create_campaign, dispatch_campaign

router = APIRouter()


def _resolve_org_id(db_session: Session, user_id: int, org_slug: str = None) -> int:
    """Resolve org_id from the user's organization membership and optional slug."""
    if org_slug:
        statement = (
            select(Organization.id)
            .join(UserOrganization, Organization.id == UserOrganization.org_id)
            .where(Organization.org_slug == org_slug)
            .where(UserOrganization.user_id == user_id)
        )
        org_id = db_session.exec(statement).first()
        if not org_id:
            raise HTTPException(status_code=403, detail=f"User is not a member of organization '{org_slug}'")
        return org_id
    
    # Fallback to first org if slug is not provided (legacy behavior)
    statement = select(UserOrganization.org_id).where(
        UserOrganization.user_id == user_id
    )
    org_id = db_session.exec(statement).first()
    if not org_id:
        raise HTTPException(status_code=403, detail="User has no organization membership")
    return org_id


@router.post("/")
async def api_create_campaign(
    request: Request,
    background_tasks: BackgroundTasks,
    campaign_object: CampaignCreate,
    org_slug: str = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CampaignRead:
    """
    Create and start a new communication campaign.
    """
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)
    
    campaign = await create_campaign(
        db_session, 
        campaign_object.model_dump(), 
        org_id, 
        current_user.id
    )
    
    # Start the dispatching in the background
    background_tasks.add_task(dispatch_campaign, campaign.id, db_session)
    
    return CampaignRead.model_validate(campaign)


@router.get("/")
async def api_get_campaigns(
    org_slug: str = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[CampaignRead]:
    """
    Get all campaigns in the organization.
    """
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)
    statement = select(Campaign).where(Campaign.org_id == org_id)
    results = db_session.exec(statement).all()
    return [CampaignRead.model_validate(r) for r in results]
from src.db.courses.activities import Activity, ActivityTypeEnum
from src.db.courses.chapters import Chapter
from src.db.courses.courses import Course


@router.get("/live-sessions")
async def api_get_live_sessions(
    org_slug: str = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get all live sessions in the organization.
    """
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)
    
    statement = (
        select(Activity, Course.name)
        .join(Chapter, Activity.chapter_id == Chapter.id)
        .join(Course, Chapter.course_id == Course.id)
        .where(Course.org_id == org_id)
        .where(Activity.activity_type == ActivityTypeEnum.TYPE_LIVE_SESSION)
        .order_by(Activity.created_at.desc())
    )
    
    results = db_session.exec(statement).all()
    
    sessions = []
    for activity, course_name in results:
        activity_dict = activity.model_dump()
        activity_dict["course_name"] = course_name
        sessions.append(activity_dict)
        
    return sessions


@router.get("/{campaign_id}")
async def api_get_campaign(
    campaign_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CampaignRead:
    """
    Get details of a specific campaign.
    """
    campaign = db_session.get(Campaign, campaign_id)
    return CampaignRead.model_validate(campaign)
