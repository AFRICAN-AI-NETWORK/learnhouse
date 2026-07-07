"""
Marketer KYC Service - Identity verification
KYC must be VERIFIED before a marketer can request their first payout.
Government ID numbers are stored only as SHA-256 hashes; the DB-level unique
constraint on the hash is the hard anti-duplication guarantee. Document files
are stored as S3 keys and signed on demand for admin review only.
"""

import hashlib
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select, and_

from config.config import get_learnhouse_config
from src.db.referrals.marketer_kyc import (
    MarketerKYC,
    KYCStatus,
    KYCDocumentType,
    MAX_KYC_SUBMISSIONS,
)
from src.db.users import User
from src.services.referrals.marketers import (
    get_marketer_by_user,
    marketer_error,
)

logger = logging.getLogger(__name__)

KYC_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
KYC_ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/pdf": "pdf",
}
KYC_S3_BUCKET = "learnhouse-media"
KYC_PRESIGNED_URL_EXPIRY = 900  # 15 minutes


def hash_id_number(id_number: str) -> str:
    """SHA-256 hex of the government ID number (uppercase, trimmed)"""
    normalized = (id_number or "").strip().upper()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


async def upload_kyc_document(
    file: UploadFile, org_id: int, marketer_id: int, kind: str
) -> str:
    """
    Validate and store a KYC document. Returns the storage key (never a
    public URL). Files live under the restricted marketer-kyc/ prefix.

    Raises:
        MKTR_204 unsupported file type, MKTR_205 file too large
    """
    content_type = (file.content_type or "").lower()
    if content_type not in KYC_ALLOWED_CONTENT_TYPES:
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_204",
            "File type not supported — use JPEG, PNG, or PDF",
            field=kind,
        )

    content = await file.read()
    if len(content) > KYC_MAX_FILE_SIZE:
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_205",
            "File size exceeds the 10MB limit",
            field=kind,
        )

    extension = KYC_ALLOWED_CONTENT_TYPES[content_type]
    storage_key = (
        f"marketer-kyc/{org_id}/{marketer_id}/{uuid4()}_{kind}.{extension}"
    )

    config = get_learnhouse_config()
    content_delivery = config.hosting_config.content_delivery.type

    if content_delivery == "s3api":
        import boto3

        s3 = boto3.client(
            "s3",
            endpoint_url=config.hosting_config.content_delivery.s3api.endpoint_url,
        )
        s3.put_object(Bucket=KYC_S3_BUCKET, Key=storage_key, Body=content)
    else:
        # Filesystem mode (dev): store under content/ like other uploads
        local_path = Path("content") / storage_key
        os.makedirs(local_path.parent, exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(content)

    logger.info(f"Stored KYC document {kind} for marketer {marketer_id}")
    return storage_key


def generate_kyc_document_url(s3_key: str) -> str:
    """
    Generate a pre-signed URL (15-min expiry) for a KYC document.
    Only called inside admin-authenticated endpoints — marketers never
    receive their document URLs back after upload.
    """
    config = get_learnhouse_config()
    content_delivery = config.hosting_config.content_delivery.type

    if content_delivery == "s3api":
        import boto3

        s3 = boto3.client(
            "s3",
            endpoint_url=config.hosting_config.content_delivery.s3api.endpoint_url,
        )
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": KYC_S3_BUCKET, "Key": s3_key},
            ExpiresIn=KYC_PRESIGNED_URL_EXPIRY,
        )

    # Filesystem mode (dev): serve via the local content path
    return f"/content/{s3_key}"


async def submit_kyc(
    marketer_id: int,
    org_id: int,
    user_id: int,
    document_type: KYCDocumentType,
    id_number: str,
    front_key: str,
    selfie_key: str,
    db_session: Session,
    back_key: Optional[str] = None,
) -> MarketerKYC:
    """
    Submit (or resubmit) KYC documents. Sets status PENDING_REVIEW.

    Raises:
        MKTR_201 duplicate government ID, MKTR_202 max submissions reached,
        MKTR_203 back image missing for two-sided documents
    """
    # Back image is required for NATIONAL_ID and DRIVERS_LICENSE
    if document_type in (
        KYCDocumentType.NATIONAL_ID,
        KYCDocumentType.DRIVERS_LICENSE,
    ) and not back_key:
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_203",
            "Back image of the document is required for this document type",
            field="back_file",
        )

    id_hash = hash_id_number(id_number)

    existing = db_session.exec(
        select(MarketerKYC).where(MarketerKYC.marketer_id == marketer_id)
    ).first()

    # Uniqueness pre-check (DB constraint is the hard guarantee below)
    duplicate = db_session.exec(
        select(MarketerKYC).where(
            and_(
                MarketerKYC.id_number_hash == id_hash,
                MarketerKYC.marketer_id != marketer_id,
            )
        )
    ).first()
    if duplicate:
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_201",
            "This government ID is already linked to another account",
            field="id_number",
        )

    if existing:
        if existing.status == KYCStatus.VERIFIED:
            # Already verified — nothing to resubmit
            return existing
        if existing.submission_count >= MAX_KYC_SUBMISSIONS:
            raise marketer_error(
                status.HTTP_400_BAD_REQUEST,
                "MKTR_202",
                "Maximum KYC submission attempts reached — contact support",
            )
        existing.document_type = document_type
        existing.id_number_hash = id_hash
        existing.document_front_url = front_key
        existing.document_back_url = back_key
        existing.selfie_url = selfie_key
        existing.status = KYCStatus.PENDING_REVIEW
        existing.rejection_reason = None
        existing.submission_count += 1
        existing.update_date = datetime.now()
        kyc = existing
    else:
        kyc = MarketerKYC(
            marketer_id=marketer_id,
            user_id=user_id,
            org_id=org_id,
            document_type=document_type,
            id_number_hash=id_hash,
            document_front_url=front_key,
            document_back_url=back_key,
            selfie_url=selfie_key,
            status=KYCStatus.PENDING_REVIEW,
            submission_count=1,
            creation_date=datetime.now(),
            update_date=datetime.now(),
        )

    db_session.add(kyc)
    try:
        db_session.commit()
    except IntegrityError:
        # uq_kyc_id_number_hash — DB-level anti-duplication guarantee
        db_session.rollback()
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_201",
            "This government ID is already linked to another account",
            field="id_number",
        )
    db_session.refresh(kyc)

    logger.info(
        f"KYC submitted for marketer {marketer_id} "
        f"(attempt {kyc.submission_count}/{MAX_KYC_SUBMISSIONS})"
    )
    return kyc


async def approve_kyc(
    kyc_id: int, org_id: int, admin_user_id: int, db_session: Session
) -> MarketerKYC:
    """Approve a KYC submission — payouts unlock for the marketer"""
    kyc = db_session.get(MarketerKYC, kyc_id)
    if not kyc or kyc.org_id != org_id:
        raise marketer_error(
            status.HTTP_404_NOT_FOUND, "MKTR_405", "KYC record not found"
        )

    kyc.status = KYCStatus.VERIFIED
    kyc.reviewed_by_user_id = admin_user_id
    kyc.reviewed_at = datetime.now()
    kyc.rejection_reason = None
    kyc.update_date = datetime.now()
    db_session.add(kyc)
    db_session.commit()
    db_session.refresh(kyc)

    user = db_session.get(User, kyc.user_id)
    if user:
        try:
            from src.services.referrals.marketer_emails import (
                send_marketer_kyc_verified_email,
            )

            send_marketer_kyc_verified_email(user.email, user.username)
        except Exception as e:
            logger.error(f"Failed to send KYC verified email: {e}")

    logger.info(f"KYC {kyc_id} approved by admin {admin_user_id}")
    return kyc


async def reject_kyc(
    kyc_id: int, org_id: int, reason: str, admin_user_id: int, db_session: Session
) -> MarketerKYC:
    """Reject a KYC submission; marketer can resubmit if attempts remain"""
    kyc = db_session.get(MarketerKYC, kyc_id)
    if not kyc or kyc.org_id != org_id:
        raise marketer_error(
            status.HTTP_404_NOT_FOUND, "MKTR_405", "KYC record not found"
        )

    kyc.status = KYCStatus.REJECTED
    kyc.rejection_reason = reason
    kyc.reviewed_by_user_id = admin_user_id
    kyc.reviewed_at = datetime.now()
    kyc.update_date = datetime.now()
    db_session.add(kyc)
    db_session.commit()
    db_session.refresh(kyc)

    user = db_session.get(User, kyc.user_id)
    if user:
        try:
            from src.services.referrals.marketer_emails import (
                send_marketer_kyc_rejected_email,
            )

            attempts_remaining = max(
                0, MAX_KYC_SUBMISSIONS - kyc.submission_count
            )
            send_marketer_kyc_rejected_email(
                user.email, user.username, reason, attempts_remaining
            )
        except Exception as e:
            logger.error(f"Failed to send KYC rejected email: {e}")

    logger.info(f"KYC {kyc_id} rejected by admin {admin_user_id}: {reason}")
    return kyc


async def get_kyc_status(marketer_id: int, db_session: Session) -> KYCStatus:
    """Current KYC status for a marketer (UNVERIFIED when never submitted)"""
    kyc = db_session.exec(
        select(MarketerKYC).where(MarketerKYC.marketer_id == marketer_id)
    ).first()
    return kyc.status if kyc else KYCStatus.UNVERIFIED


async def validate_payout_prerequisites(
    user_id: int, org_id: int, db_session: Session
) -> None:
    """
    Validate every payout prerequisite in order, raising the specific error:
    1. MKTR_305 — country not set on profile
    2. MKTR_206 — KYC unverified (or rejected)
    3. MKTR_207 — KYC pending review
    4. MKTR_304 — no active payment method
    Called at the start of create_payout_request for marketer payouts.
    """
    user = db_session.get(User, user_id)
    country = None
    if user:
        if isinstance(user.profile, dict):
            country = user.profile.get("country")
        if not country and isinstance(user.details, dict):
            country = user.details.get("country")
    if not country:
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_305",
            "Country not set on profile — update your profile before requesting a payout",
        )

    marketer = await get_marketer_by_user(user_id, org_id, db_session)
    if not marketer:
        raise marketer_error(
            status.HTTP_404_NOT_FOUND, "MKTR_401", "Marketer not found"
        )

    kyc_status = await get_kyc_status(marketer.id, db_session)
    if kyc_status in (KYCStatus.UNVERIFIED, KYCStatus.REJECTED):
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_206",
            "KYC required before payout — complete identity verification first",
        )
    if kyc_status == KYCStatus.PENDING_REVIEW:
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_207",
            "KYC is under review — payouts unlock once verification is complete",
        )

    from src.services.referrals.payouts import get_active_payment_method

    payment_method = await get_active_payment_method(marketer.id, db_session)
    if not payment_method:
        raise marketer_error(
            status.HTTP_400_BAD_REQUEST,
            "MKTR_304",
            "No payment method saved — add bank or mobile money details first",
        )
