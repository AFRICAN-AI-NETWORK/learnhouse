from datetime import datetime, timezone
import uuid
from sqlmodel import Session, select
from typing import List, Optional

from src.db.communications import Campaign, CampaignCreate, CampaignStatus

async def create_campaign_draft(db_session: Session, org_id: int, user_id: int, campaign_data: CampaignCreate) -> Campaign:
    campaign = Campaign(
        org_id=org_id,
        created_by_user_id=user_id,
        campaign_uuid=str(uuid.uuid4()),
        status=CampaignStatus.DRAFT,
        creation_date=datetime.now(timezone.utc).isoformat(),
        update_date=datetime.now(timezone.utc).isoformat(),
        **campaign_data.dict()
    )
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)
    return campaign

async def update_campaign(db_session: Session, campaign_id: int, update_data: dict) -> Campaign:
    campaign = db_session.get(Campaign, campaign_id)
    if not campaign:
        raise ValueError("Campaign not found")
        
    for key, value in update_data.items():
        setattr(campaign, key, value)
        
    campaign.update_date = datetime.now(timezone.utc).isoformat()
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)
    return campaign

async def get_campaign(db_session: Session, campaign_id: int) -> Optional[Campaign]:
    return db_session.get(Campaign, campaign_id)

async def list_org_campaigns(db_session: Session, org_id: int, skip: int = 0, limit: int = 50) -> List[Campaign]:
    return db_session.exec(
        select(Campaign).where(Campaign.org_id == org_id).offset(skip).limit(limit)
    ).all()

async def cancel_campaign(db_session: Session, campaign_id: int) -> Campaign:
    campaign = db_session.get(Campaign, campaign_id)
    if not campaign:
        raise ValueError("Campaign not found")
        
    if campaign.status in [CampaignStatus.SENT, CampaignStatus.FAILED, CampaignStatus.CANCELLED]:
        raise ValueError(f"Cannot cancel campaign in status: {campaign.status}")
        
    campaign.status = CampaignStatus.CANCELLED
    campaign.update_date = datetime.now(timezone.utc).isoformat()
    db_session.add(campaign)
    db_session.commit()
    db_session.refresh(campaign)
    return campaign
