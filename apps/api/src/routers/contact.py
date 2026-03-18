from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from src.services.email.utils import send_email
import os

router = APIRouter()

class ContactForm(BaseModel):
    name: str
    email: EmailStr
    message: str

@router.post("/contact")
async def contact_submit(form: ContactForm, request: Request):
    # Basic anti-spam: check for too many requests from same IP
    client_ip = request.client.host
    # Optionally, add rate limiting or CAPTCHA here

    # Compose email
    subject = f"Contact Form Submission from {form.name}"
    body = f"""
    <div style='font-family:sans-serif;'>
        <h2>Contact Form Submission</h2>
        <p><strong>Name:</strong> {form.name}</p>
        <p><strong>Email:</strong> {form.email}</p>
        <p><strong>Message:</strong><br>{form.message}</p>
    </div>
    """
    try:
        send_email(
            to=os.getenv("CONTACT_RECEIVER_EMAIL", "education@africanainetwork.com"),
            subject=subject,
            body=body
        )
        return {"success": True, "message": "Email sent successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
