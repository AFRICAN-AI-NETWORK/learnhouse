from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlmodel import Session, select
from src.core.events.database import get_db_session
from src.security.auth import get_current_user
from src.db.users import PublicUser
from src.db.communications import Campaign, CampaignCreate, CampaignRead
from src.services.communications.dispatcher import create_campaign, dispatch_campaign

router = APIRouter()


@router.post("/")
async def api_create_campaign(
    request: Request,
    background_tasks: BackgroundTasks,
    campaign_object: CampaignCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CampaignRead:
    """
    Create and start a new communication campaign.
    """
    # Note: Logic to restrict non-admins from creating campaigns should be added
    org_id = int(request.headers.get("x-org-id", 0))
    
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
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[CampaignRead]:
    """
    Get all campaigns in the organization.
    """
    org_id = current_user.org_id # Preferred over header if available
    statement = select(Campaign).where(Campaign.org_id == org_id)
    results = db_session.exec(statement).all()
    return [CampaignRead.model_validate(r) for r in results]


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
