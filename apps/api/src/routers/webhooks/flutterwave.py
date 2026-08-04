from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.services.payments.webhooks.payments_flutterwave_webhooks import \
    handle_flutterwave_webhook

router = APIRouter()


@router.post("/flutterwave")
async def flutterwave_webhook(
    request: Request,
    db_session: Session = Depends(get_db_session),
):
    """Webhook endpoint for Flutterwave"""
    return await handle_flutterwave_webhook(request, db_session)
