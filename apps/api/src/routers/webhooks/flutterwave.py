from fastapi import APIRouter, Depends, Request, HTTPException
from sqlmodel import Session, select
from src.core.events.database import get_db_session
from src.db.users import User
from src.db.courses.courses import Course
from src.services.trail.trail import add_course_to_trail
import os
import hmac
import hashlib

router = APIRouter()

@router.post("/flutterwave")
async def flutterwave_webhook(
    request: Request,
    db_session: Session = Depends(get_db_session),
):
    # Verify the webhook signature
    expected_hash = os.getenv("FLUTTERWAVE_WEBHOOK_HASH")
    signature = request.headers.get("verif-hash")
    
    if not expected_hash:
        raise HTTPException(status_code=500, detail="Webhook hash not configured")
        
    if not signature or signature != expected_hash:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Only process completed charges
    if payload.get("event") == "charge.completed" and payload.get("data", {}).get("status") == "successful":
        data = payload.get("data", {})
        meta = data.get("meta", {})
        
        user_email = data.get("customer", {}).get("email")
        course_uuid = meta.get("course_uuid")
        
        if not user_email or not course_uuid:
            # Maybe not an enrollment transaction, skip
            return {"status": "ok"}
            
        # Find user by email
        statement = select(User).where(User.email == user_email)
        user = db_session.exec(statement).first()
        
        if not user:
            # User not found, perhaps they haven't been created yet.
            # Usually they are created before checkout, but if not, we can't enroll them.
            return {"status": "user_not_found"}
            
        # Find course by uuid
        statement = select(Course).where(Course.course_uuid == course_uuid)
        course = db_session.exec(statement).first()
        
        if not course:
            return {"status": "course_not_found"}

        # Enroll the user (this simulates the backend enrollment logic)
        try:
            # add_course_to_trail requires a PublicUser object and request. We might need to bypass request
            # since it's a webhook. `add_course_to_trail` signature:
            # async def add_course_to_trail(request: Request, user: PublicUser, course_uuid: str, db_session: Session)
            # We can mock PublicUser
            from src.db.users import PublicUser
            public_user = PublicUser(**user.model_dump())
            await add_course_to_trail(request, public_user, course_uuid, db_session)
        except HTTPException as e:
            # If already exists, we can ignore 400
            if e.status_code == 400 and "already exists" in str(e.detail):
                pass
            else:
                # Other error
                pass

    return {"status": "ok"}
