from typing import Optional
from uuid import uuid4
from fastapi import UploadFile, HTTPException, status
from sqlmodel import Session, select
import logging

from src.db.chat.attachments import MessageAttachment
from src.db.chat.messages import Message

logger = logging.getLogger(__name__)

# Try to import boto3, but make it optional
try:
    import boto3
    from botocore.exceptions import ClientError
    _BOTO3_AVAILABLE = True
except ImportError:
    _BOTO3_AVAILABLE = False
    logger.warning("boto3 not available, file uploads will not work")

# Try to import PIL for thumbnail generation
try:
    from PIL import Image
    import io
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False
    logger.warning("PIL/Pillow not available, thumbnail generation will not work")


class AttachmentService:
    """Service for handling file attachments."""
    
    # Allowed file types and sizes
    ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
    ALLOWED_DOCUMENT_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ]
    
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
    
    @staticmethod
    async def upload_attachment(
        db: Session,
        message_uuid: str,
        file: UploadFile,
        user_id: int
    ) -> MessageAttachment:
        """Upload file attachment to S3 and create database record."""
        
        if not _BOTO3_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="File upload service is not available (boto3 not installed)"
            )
        
        # Get message
        message = db.exec(
            select(Message)
            .where(Message.message_uuid == message_uuid)
        ).first()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Verify user is sender
        if message.sender_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to add attachments to this message"
            )
        
        # Validate file type
        if not await AttachmentService._is_valid_file_type(file.content_type):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file.content_type} is not allowed"
            )
        
        # Validate file size
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > AttachmentService.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum of {AttachmentService.MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Upload to S3
        try:
            from config.config import get_learnhouse_config
            config = get_learnhouse_config()
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=config.aws_config.aws_access_key_id,
                aws_secret_access_key=config.aws_config.aws_secret_access_key,
                region_name=config.aws_config.aws_region
            )
            
            attachment_uuid = f"att_{uuid4()}"
            s3_key = f"chat/attachments/{attachment_uuid}/{file.filename}"
            
            s3_client.upload_fileobj(
                file.file,
                config.aws_config.aws_bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': file.content_type or 'application/octet-stream',
                    'ACL': 'private'
                }
            )
            
            # Generate presigned URL for file access (7 days)
            file_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': config.aws_config.aws_bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=3600 * 24 * 7
            )
            
            # Generate thumbnail for images
            thumbnail_url = None
            if file.content_type in AttachmentService.ALLOWED_IMAGE_TYPES:
                await file.seek(0)
                file_content = await file.read()
                thumbnail_url = await AttachmentService._generate_thumbnail(
                    s3_client, config.aws_config.aws_bucket_name, s3_key, file_content
                )
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Attachment upload error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload attachment"
            )
        
        # Create database record
        attachment = MessageAttachment(
            attachment_uuid=attachment_uuid,
            message_id=message.id,
            file_name=file.filename or "unnamed",
            file_type=file.content_type or "application/octet-stream",
            file_size=file_size,
            file_url=file_url,
            thumbnail_url=thumbnail_url,
            upload_status="completed"
        )
        
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
        
        logger.info(f"Attachment {attachment_uuid} uploaded for message {message_uuid}")
        
        return attachment
    
    @staticmethod
    async def _is_valid_file_type(content_type: Optional[str]) -> bool:
        """Validate file MIME type."""
        if not content_type:
            return False
            
        allowed_types = (
            AttachmentService.ALLOWED_IMAGE_TYPES +
            AttachmentService.ALLOWED_VIDEO_TYPES +
            AttachmentService.ALLOWED_DOCUMENT_TYPES
        )
        return content_type in allowed_types
    
    @staticmethod
    async def _generate_thumbnail(
        s3_client,
        bucket_name: str,
        original_key: str,
        file_content: bytes
    ) -> Optional[str]:
        """Generate thumbnail for images."""
        
        if not _PIL_AVAILABLE:
            logger.warning("PIL not available, skipping thumbnail generation")
            return None
        
        try:
            # Open image
            image = Image.open(io.BytesIO(file_content))
            
            # Convert RGBA to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Generate thumbnail
            thumbnail_size = (300, 300)
            image.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)
            
            # Save thumbnail to bytes
            thumb_bytes = io.BytesIO()
            image.save(thumb_bytes, format='JPEG', quality=85)
            thumb_bytes.seek(0)
            
            # Upload thumbnail to S3
            thumbnail_key = original_key.replace('/attachments/', '/thumbnails/')
            s3_client.upload_fileobj(
                thumb_bytes,
                bucket_name,
                thumbnail_key,
                ExtraArgs={
                    'ContentType': 'image/jpeg',
                    'ACL': 'private'
                }
            )
            
            # Generate presigned URL
            thumbnail_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': thumbnail_key
                },
                ExpiresIn=3600 * 24 * 7
            )
            
            logger.debug(f"Generated thumbnail for {original_key}")
            return thumbnail_url
            
        except Exception as e:
            logger.error(f"Failed to generate thumbnail: {e}")
            return None
