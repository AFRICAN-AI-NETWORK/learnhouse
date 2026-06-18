import os
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import Session, select
from src.db.organizations import Organization


async def check_database_health(db_session: Session) -> bool:
    statement = select(Organization)
    result = db_session.exec(statement)

    if not result:
        return False

    return True


async def check_health(db_session: Session) -> dict:
    # Check database health
    database_healthy = await check_database_health(db_session)

    if not database_healthy:
        raise HTTPException(status_code=503, detail="Database is not healthy")

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": os.environ.get("ENVIRONMENT", "production"),
        "database_healthy": True,
        "service": "learnhouse-api",
    }
