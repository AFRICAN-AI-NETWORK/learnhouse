from fastapi import Depends, APIRouter
from pydantic import BaseModel
from sqlmodel import Session
from src.services.health.health import check_health
from src.core.events.database import get_db_session


router = APIRouter()


class DetailedHealthResponse(BaseModel):
    status: str
    timestamp: str
    environment: str
    database_healthy: bool
    service: str


@router.get("", response_model=DetailedHealthResponse)
async def health(db_session: Session = Depends(get_db_session)):
    return await check_health(db_session)

