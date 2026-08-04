import os
from pathlib import Path
from typing import Literal, Optional

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile

from config.config import get_learnhouse_config
from src.security.file_validation import validate_upload


# new method to handle windows long path issues when saving files locally
def _to_windows_safe_path(path: Path) -> str:
    resolved = str(path.resolve())

    if os.name != "nt":
        return resolved

    if resolved.startswith("\\\\?\\"):
        return resolved

    if len(resolved) >= 248:
        if resolved.startswith("\\\\"):
            return "\\\\?\\UNC\\" + resolved[2:]
        return "\\\\?\\" + resolved

    return resolved


def ensure_directory_exists(directory: str | Path):
    directory_path = Path(directory)
    os.makedirs(_to_windows_safe_path(directory_path), exist_ok=True)


async def upload_file(
    file: UploadFile,
    directory: str,
    type_of_dir: Literal["orgs", "users"],
    uuid: str,
    allowed_types: list[str],
    filename_prefix: str,
    max_size: Optional[int] = None,
) -> str:
    """
    Secure file upload with validation.

    Args:
        file: The uploaded file
        directory: Target directory (e.g., "logos", "avatars")
        type_of_dir: "orgs" or "users"
        uuid: Organization or user UUID
        allowed_types: List of allowed file types ('image', 'video', 'document')
        filename_prefix: Prefix for the generated filename
        max_size: Maximum file size in bytes (optional)

    Returns:
        The saved filename
    """
    from uuid import uuid4

    from src.security.file_validation import get_safe_filename

    # Validate the file
    _, content = validate_upload(file, allowed_types, max_size)

    # Generate safe filename
    filename = get_safe_filename(file.filename, f"{uuid4()}_{filename_prefix}")

    # Save the file
    await upload_content(
        directory=directory,
        type_of_dir=type_of_dir,
        uuid=uuid,
        file_binary=content,
        file_and_format=filename,
        allowed_formats=None,  # Already validated
    )

    return filename


async def upload_content(
    directory: str,
    type_of_dir: Literal["orgs", "users"],
    uuid: str,  # org_uuid or user_uuid
    file_binary: bytes,
    file_and_format: str,
    allowed_formats: Optional[list[str]] = None,
):
    # Get Learnhouse Config
    learnhouse_config = get_learnhouse_config()

    file_format = file_and_format.split(".")[-1].strip().lower()

    # Get content delivery method
    content_delivery = learnhouse_config.hosting_config.content_delivery.type

    # Check if format file is allowed
    if allowed_formats:
        if file_format not in allowed_formats:
            raise HTTPException(
                status_code=400,
                detail=f"File format {file_format} not allowed",
            )

    local_directory = Path("content") / type_of_dir / uuid / Path(directory)
    ensure_directory_exists(local_directory)
    local_file_path = local_directory / file_and_format
    s3_key_directory = directory.replace("\\", "/").strip("/")
    s3_key = f"content/{type_of_dir}/{uuid}/{s3_key_directory}/{file_and_format}"

    if content_delivery == "filesystem":
        # upload file to server
        with open(_to_windows_safe_path(local_file_path), "wb") as f:
            f.write(file_binary)
            f.close()

    elif content_delivery == "s3api":
        # Upload to server then to s3 (AWS Keys are stored in environment variables and are loaded by boto3)
        # TODO: Improve implementation of this
        print("Uploading to s3...")
        s3 = boto3.client(
            "s3",
            endpoint_url=learnhouse_config.hosting_config.content_delivery.s3api.endpoint_url,
        )

        # Upload file to server
        with open(_to_windows_safe_path(local_file_path), "wb") as f:
            f.write(file_binary)
            f.close()

        print("Uploading to s3 using boto3...")
        try:
            s3.upload_file(
                _to_windows_safe_path(local_file_path),
                "learnhouse-media",
                s3_key,
            )
        except ClientError as e:
            print(e)

        print("Checking if file exists in s3...")
        try:
            s3.head_object(
                Bucket="learnhouse-media",
                Key=s3_key,
            )
            print("File upload successful!")
        except Exception as e:
            print(f"An error occurred: {str(e)}")
