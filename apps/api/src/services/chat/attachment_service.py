"""
Chat attachment service.

Uses the same upload pipeline as the rest of the codebase (DRY):
  src.services.utils.upload_content.upload_file  →  upload_content()

Files are stored under:
  content/orgs/{org_uuid}/chat/conversations/{conversation_uuid}/attachments/{attachment_uuid}/

They are served as static files via the existing /content mount in app.py.

Allowed file types mirror the existing file_validation.FILE_TYPES:
  - image  : jpg, jpeg, png, gif, webp
  - video  : mp4, webm
  - document: pdf
"""

import logging
import os
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlmodel import Session, select

from src.db.chat.attachments import MessageAttachment
from src.db.chat.messages import Message
from src.services.utils.upload_content import upload_file

logger = logging.getLogger(__name__)

# Re-use the same type groups defined in file_validation.FILE_TYPES
CHAT_ALLOWED_TYPES = ["image", "video", "document"]

# Max 100 MB (matches existing block upload limit)
CHAT_MAX_FILE_SIZE = 100 * 1024 * 1024


class AttachmentService:
    """Service for handling chat file attachments.

    Uses the shared upload_file() utility so storage backend (filesystem / S3)
    is transparently handled by the existing infrastructure.
    """

    @staticmethod
    async def upload_attachment(
        db: Session,
        message_uuid: str,
        file: UploadFile,
        user_id: int,
        org_uuid: str,
        org_id: int,
        conversation_uuid: str,
    ) -> MessageAttachment:
        """Upload a file attachment and create a DB record.

        Args:
            db: Database session.
            message_uuid: UUID of the message this attachment belongs to.
            file: The uploaded file from the multipart request.
            user_id: ID of the requesting user (must be the message sender).
            org_uuid: Organisation UUID — used for the storage path namespace.
            org_id: Organisation integer ID — stored on the attachment record.
            conversation_uuid: Conversation UUID — used for the storage path.

        Returns:
            The persisted MessageAttachment record.
        """

        # ── Resolve message ──────────────────────────────────────────────────
        message = db.exec(
            select(Message).where(Message.message_uuid == message_uuid)
        ).first()

        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found",
            )

        # Only the sender can attach files to their own message
        if message.sender_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to add attachments to this message",
            )

        # ── Generate unique attachment ID ────────────────────────────────────
        attachment_uuid = f"att_{uuid4()}"

        
        # Windows MAX_PATH (260 chars) when combined with the CWD.
        directory = f"chat/{attachment_uuid}"

        try:
            # upload_file() handles:
            #   1. File validation (magic bytes, size, extension) via file_validation.py
            #   2. Safe filename generation (UUID-prefixed, alphanumeric extension)
            #   3. Writing to filesystem OR S3 depending on config
            saved_filename = await upload_file(
                file=file,
                directory=directory,
                type_of_dir="orgs",
                uuid=org_uuid,
                allowed_types=CHAT_ALLOWED_TYPES,
                filename_prefix="attachment",
                max_size=CHAT_MAX_FILE_SIZE,
            )
        except HTTPException:
            raise  # Re-raise validation errors as-is (4xx)
        except Exception as exc:
            logger.error("Attachment upload failed for message %s: %s", message_uuid, exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload attachment",
            )

        # ── Measure file size ────────────────────────────────────────────────
        # File was already read by upload_file; seek to end for size.
        try:
            file.file.seek(0, os.SEEK_END)
            file_size = file.file.tell()
            file.file.seek(0)
        except Exception:
            file_size = 0

        # ── Build absolute URL (served by StaticFiles at /content) ──────────
        
        from config.config import get_learnhouse_config
        _config = get_learnhouse_config()
        api_base = _config.hosting_config.app_base_url.rstrip("/")
        file_url = f"{api_base}/content/orgs/{org_uuid}/{directory}/{saved_filename}"

        # ── Persist to DB ────────────────────────────────────────────────────
        attachment = MessageAttachment(
            attachment_uuid=attachment_uuid,
            message_id=message.id,  # type: ignore[arg-type]
            org_id=org_id,
            file_name=file.filename or saved_filename,
            file_type=file.content_type or "application/octet-stream",
            file_size=min(file_size, CHAT_MAX_FILE_SIZE),
            file_url=file_url,
            thumbnail_url=None,
            upload_status="completed",
        )

        db.add(attachment)
        db.commit()
        db.refresh(attachment)

        logger.info(
            "Attachment %s uploaded for message %s (org=%s)",
            attachment_uuid,
            message_uuid,
            org_uuid,
        )

        return attachment

    @staticmethod
    async def get_message_attachments(
        db: Session,
        message_uuid: str,
        user_id: int,
    ) -> list[MessageAttachment]:
        """Get all attachments for a message.

        Args:
            db: Database session.
            message_uuid: UUID of the message.
            user_id: Requesting user — must be a participant of the conversation.

        Returns:
            List of attachments.
        """
        message = db.exec(
            select(Message).where(Message.message_uuid == message_uuid)
        ).first()

        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found",
            )

        if user_id not in (message.sender_id, message.receiver_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this message",
            )

        attachments = db.exec(
            select(MessageAttachment).where(
                MessageAttachment.message_id == message.id
            )
        ).all()

        return list(attachments)
