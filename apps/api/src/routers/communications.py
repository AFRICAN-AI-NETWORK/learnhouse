
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    UploadFile,
)
from sqlmodel import Session, select

from src.core.events.database import get_db_session
from src.db.communications import (
    CampaignCreate,
    CampaignRead,
    CampaignRecipient,
    CampaignRecipientStatus,
)
from src.db.courses.activities import Activity, ActivityTypeEnum
from src.db.courses.chapters import Chapter
from src.db.courses.courses import Course
from src.db.organizations import Organization
from src.db.user_organizations import UserOrganization
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.communications.campaigns import (
    cancel_campaign,
    create_campaign_draft,
    get_campaign,
    list_org_campaigns,
    update_campaign,
)
from src.services.communications.dispatch import queue_campaign_recipients
from src.services.utils.upload_content import upload_file

router = APIRouter()


def _resolve_org_id(db_session: Session, user_id: int, org_slug: str | None = None) -> int:
    """Resolve org_id from the user's organization membership and optional slug."""
    if org_slug:
        statement = (
            select(Organization.id)
            .join(UserOrganization, Organization.id == UserOrganization.org_id)
            .where(Organization.slug == org_slug)
            .where(UserOrganization.user_id == user_id)
        )
        org_id = db_session.exec(statement).first()
        if not org_id:
            raise HTTPException(
                status_code=403,
                detail=f"User is not a member of organization '{org_slug}'",
            )
        return org_id

    # Fallback to first org if slug is not provided (legacy behavior)
    statement = select(UserOrganization.org_id).where(
        UserOrganization.user_id == user_id
    )
    org_id = db_session.exec(statement).first()
    if not org_id:
        raise HTTPException(
            status_code=403, detail="User has no organization membership"
        )
    return org_id


@router.post("/drafts")
async def api_create_campaign_draft(
    request: Request,
    campaign_object: CampaignCreate,
    org_slug: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CampaignRead:
    """Create a new campaign draft."""
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)
    campaign = await create_campaign_draft(
        db_session, org_id, current_user.id, campaign_object
    )
    return CampaignRead.model_validate(campaign)


@router.patch("/{campaign_id}")
async def api_update_campaign(
    campaign_id: int,
    update_data: dict,
    org_slug: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CampaignRead:
    """Update a campaign draft."""
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)
    campaign = await get_campaign(db_session, campaign_id)
    if not campaign or campaign.org_id != org_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    updated = await update_campaign(db_session, campaign_id, update_data)
    return CampaignRead.model_validate(updated)


@router.post("/{campaign_id}/send")
async def api_send_campaign(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    org_slug: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CampaignRead:
    """Queue a campaign for sending."""
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)
    campaign = await get_campaign(db_session, campaign_id)
    if not campaign or campaign.org_id != org_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    background_tasks.add_task(queue_campaign_recipients, campaign_id)
    return CampaignRead.model_validate(campaign)


@router.post("/{campaign_id}/cancel")
async def api_cancel_campaign(
    campaign_id: int,
    org_slug: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CampaignRead:
    """Cancel a pending/queued campaign."""
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)
    campaign = await get_campaign(db_session, campaign_id)
    if not campaign or campaign.org_id != org_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    try:
        updated = await cancel_campaign(db_session, campaign_id)
        return CampaignRead.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
async def api_get_campaigns(
    org_slug: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> list[CampaignRead]:
    """Get all campaigns in the organization."""
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)
    campaigns = await list_org_campaigns(db_session, org_id)
    return [CampaignRead.model_validate(c) for c in campaigns]


@router.get("/{campaign_id}")
async def api_get_campaign_detail(
    campaign_id: int,
    org_slug: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
) -> CampaignRead:
    """Get details of a specific campaign."""
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)
    campaign = await get_campaign(db_session, campaign_id)
    if not campaign or campaign.org_id != org_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignRead.model_validate(campaign)


@router.get("/{campaign_id}/recipients")
async def api_get_campaign_recipients(
    campaign_id: int,
    status: CampaignRecipientStatus | None = None,
    org_slug: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Get recipients of a campaign with optional status filter."""
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)
    campaign = await get_campaign(db_session, campaign_id)
    if not campaign or campaign.org_id != org_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    query = select(CampaignRecipient).where(CampaignRecipient.campaign_id == campaign_id)
    if status:
        query = query.where(CampaignRecipient.status == status)
        
    recipients = db_session.exec(query).all()
    return recipients


@router.post("/upload-image")
async def api_upload_campaign_image(
    image_file: UploadFile,
    org_slug: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Upload an image to use as a campaign header.
    Returns the filename and full content URL.
    """
    org_id = _resolve_org_id(db_session, current_user.id, org_slug)

    # Get org_uuid from org_id
    org = db_session.exec(select(Organization).where(Organization.id == org_id)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    filename = await upload_file(
        file=image_file,
        directory="campaigns",
        type_of_dir="orgs",
        uuid=org.org_uuid,
        allowed_types=["image"],
        filename_prefix="campaign_header",
        max_size=5 * 1024 * 1024,  # 5MB
    )

    return {
        "filename": filename,
        "content_url": f"content/orgs/{org.org_uuid}/campaigns/{filename}",
    }


@router.get("/live-sessions")
async def api_get_live_sessions(
    org_slug: str | None = None,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Get all live sessions in the organization."""
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
