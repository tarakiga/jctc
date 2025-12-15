"""
AWS S3 Storage Utility Module

Provides functions for uploading, downloading, and managing files in AWS S3.
Used for evidence files, generated reports, and attachments.
"""

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from pathlib import Path
from typing import Optional, Tuple, BinaryIO
import logging
import mimetypes
from datetime import datetime
import uuid

from app.config.settings import settings

logger = logging.getLogger(__name__)


class S3StorageError(Exception):
    """Custom exception for S3 storage operations"""
    pass


def get_s3_client():
    """Get configured S3 client"""
    if not settings.s3_enabled:
        raise S3StorageError("S3 storage is not enabled. Set S3_ENABLED=true")
    
    if not settings.s3_access_key or not settings.s3_secret_key:
        raise S3StorageError("S3 credentials not configured")
    
    try:
        client = boto3.client(
            's3',
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            endpoint_url=settings.s3_endpoint_url if settings.s3_endpoint_url else None
        )
        return client
    except Exception as e:
        logger.error(f"Failed to create S3 client: {e}")
        raise S3StorageError(f"Failed to create S3 client: {e}")


def upload_file(
    file_path: str,
    s3_key: Optional[str] = None,
    folder: str = "uploads",
    content_type: Optional[str] = None
) -> Tuple[str, str]:
    """
    Upload a file to S3.
    
    Args:
        file_path: Local path to the file
        s3_key: Optional S3 object key (auto-generated if not provided)
        folder: S3 folder prefix (e.g., 'evidence', 'reports')
        content_type: MIME type of the file
    
    Returns:
        Tuple of (s3_key, s3_url)
    """
    client = get_s3_client()
    local_path = Path(file_path)
    
    if not local_path.exists():
        raise S3StorageError(f"File not found: {file_path}")
    
    # Generate S3 key if not provided
    if not s3_key:
        timestamp = datetime.utcnow().strftime("%Y/%m/%d")
        unique_id = str(uuid.uuid4())[:8]
        s3_key = f"{folder}/{timestamp}/{unique_id}_{local_path.name}"
    
    # Detect content type
    if not content_type:
        content_type, _ = mimetypes.guess_type(str(local_path))
        content_type = content_type or 'application/octet-stream'
    
    try:
        extra_args = {
            'ContentType': content_type,
            'ServerSideEncryption': 'AES256'
        }
        
        client.upload_file(
            str(local_path),
            settings.s3_bucket_name,
            s3_key,
            ExtraArgs=extra_args
        )
        
        s3_url = f"s3://{settings.s3_bucket_name}/{s3_key}"
        logger.info(f"Uploaded file to S3: {s3_key}")
        
        return s3_key, s3_url
        
    except ClientError as e:
        logger.error(f"Failed to upload file to S3: {e}")
        raise S3StorageError(f"Failed to upload file: {e}")


def upload_fileobj(
    file_obj: BinaryIO,
    filename: str,
    folder: str = "uploads",
    content_type: Optional[str] = None
) -> Tuple[str, str]:
    """
    Upload a file object (from upload) to S3.
    
    Args:
        file_obj: File-like object
        filename: Original filename
        folder: S3 folder prefix
        content_type: MIME type
    
    Returns:
        Tuple of (s3_key, s3_url)
    """
    client = get_s3_client()
    
    # Generate S3 key
    timestamp = datetime.utcnow().strftime("%Y/%m/%d")
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = filename.replace(" ", "_")
    s3_key = f"{folder}/{timestamp}/{unique_id}_{safe_filename}"
    
    # Detect content type
    if not content_type:
        content_type, _ = mimetypes.guess_type(filename)
        content_type = content_type or 'application/octet-stream'
    
    try:
        extra_args = {
            'ContentType': content_type,
            'ServerSideEncryption': 'AES256'
        }
        
        client.upload_fileobj(
            file_obj,
            settings.s3_bucket_name,
            s3_key,
            ExtraArgs=extra_args
        )
        
        s3_url = f"s3://{settings.s3_bucket_name}/{s3_key}"
        logger.info(f"Uploaded file object to S3: {s3_key}")
        
        return s3_key, s3_url
        
    except ClientError as e:
        logger.error(f"Failed to upload file object to S3: {e}")
        raise S3StorageError(f"Failed to upload file: {e}")


def get_presigned_url(s3_key: str, expiry_seconds: Optional[int] = None, filename: Optional[str] = None) -> str:
    """
    Generate a pre-signed URL for secure file download.
    
    Args:
        s3_key: S3 object key
        expiry_seconds: URL expiration time (default from settings)
        filename: Optional filename for download (triggers download instead of inline view)
    
    Returns:
        Pre-signed URL string
    """
    client = get_s3_client()
    
    if expiry_seconds is None:
        expiry_seconds = settings.s3_presigned_url_expiry
    
    # Build params
    params = {
        'Bucket': settings.s3_bucket_name,
        'Key': s3_key
    }
    
    # Force download by setting Content-Disposition
    if filename:
        params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
    else:
        # Extract filename from key and force download
        key_filename = s3_key.split('/')[-1] if '/' in s3_key else s3_key
        params['ResponseContentDisposition'] = f'attachment; filename="{key_filename}"'
    
    try:
        url = client.generate_presigned_url(
            'get_object',
            Params=params,
            ExpiresIn=expiry_seconds
        )
        return url
        
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        raise S3StorageError(f"Failed to generate download URL: {e}")


def download_file(s3_key: str, local_path: str) -> str:
    """
    Download a file from S3 to local path.
    
    Args:
        s3_key: S3 object key
        local_path: Local destination path
    
    Returns:
        Local file path
    """
    client = get_s3_client()
    
    try:
        local_dir = Path(local_path).parent
        local_dir.mkdir(parents=True, exist_ok=True)
        
        client.download_file(
            settings.s3_bucket_name,
            s3_key,
            local_path
        )
        
        logger.info(f"Downloaded file from S3: {s3_key} -> {local_path}")
        return local_path
        
    except ClientError as e:
        logger.error(f"Failed to download file from S3: {e}")
        raise S3StorageError(f"Failed to download file: {e}")


def delete_file(s3_key: str) -> bool:
    """
    Delete a file from S3.
    
    Args:
        s3_key: S3 object key
    
    Returns:
        True if successful
    """
    client = get_s3_client()
    
    try:
        client.delete_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key
        )
        logger.info(f"Deleted file from S3: {s3_key}")
        return True
        
    except ClientError as e:
        logger.error(f"Failed to delete file from S3: {e}")
        raise S3StorageError(f"Failed to delete file: {e}")


def file_exists(s3_key: str) -> bool:
    """
    Check if a file exists in S3.
    
    Args:
        s3_key: S3 object key
    
    Returns:
        True if file exists
    """
    client = get_s3_client()
    
    try:
        client.head_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key
        )
        return True
    except ClientError:
        return False


def get_file_info(s3_key: str) -> dict:
    """
    Get metadata about a file in S3.
    
    Args:
        s3_key: S3 object key
    
    Returns:
        Dictionary with file metadata
    """
    client = get_s3_client()
    
    try:
        response = client.head_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key
        )
        
        return {
            'size': response.get('ContentLength', 0),
            'content_type': response.get('ContentType', 'application/octet-stream'),
            'last_modified': response.get('LastModified'),
            'etag': response.get('ETag', '').strip('"')
        }
        
    except ClientError as e:
        logger.error(f"Failed to get file info from S3: {e}")
        raise S3StorageError(f"Failed to get file info: {e}")


def is_s3_enabled() -> bool:
    """Check if S3 storage is enabled and configured"""
    return (
        settings.s3_enabled and
        bool(settings.s3_access_key) and
        bool(settings.s3_secret_key) and
        bool(settings.s3_bucket_name)
    )
