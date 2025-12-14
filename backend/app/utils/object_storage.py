"""
S3-compatible object storage client for evidence and artefact files.

Supports:
- AWS S3
- MinIO (self-hosted S3-compatible)
- Any S3-compatible storage (Wasabi, DigitalOcean Spaces, etc.)

Falls back to local file storage when S3 is not configured.
"""
import os
import io
import hashlib
import logging
from typing import Optional, BinaryIO, Dict, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import mimetypes

logger = logging.getLogger(__name__)

# Try to import boto3, but don't fail if not available
try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError, NoCredentialsError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    logger.warning("boto3 not installed. S3 storage will not be available.")


class ObjectStorageConfig:
    """Configuration for S3-compatible object storage."""
    
    def __init__(
        self,
        enabled: bool = False,
        endpoint_url: Optional[str] = None,      # MinIO/custom endpoint
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        region: str = "us-east-1",
        bucket_name: str = "jctc-evidence",
        use_ssl: bool = True,
        signature_version: str = "s3v4",
        # Local fallback
        local_storage_path: str = "./storage",
        # Upload settings
        multipart_threshold: int = 8 * 1024 * 1024,  # 8MB
        max_concurrency: int = 10,
        # Presigned URL settings
        presigned_url_expiry: int = 3600,  # 1 hour
    ):
        self.enabled = enabled and BOTO3_AVAILABLE
        self.endpoint_url = endpoint_url
        self.access_key = access_key
        self.secret_key = secret_key
        self.region = region
        self.bucket_name = bucket_name
        self.use_ssl = use_ssl
        self.signature_version = signature_version
        self.local_storage_path = local_storage_path
        self.multipart_threshold = multipart_threshold
        self.max_concurrency = max_concurrency
        self.presigned_url_expiry = presigned_url_expiry


class ObjectStorageClient:
    """
    S3-compatible object storage client with local fallback.
    
    Usage:
        config = ObjectStorageConfig(
            enabled=True,
            endpoint_url="http://localhost:9000",  # MinIO
            access_key="minioadmin",
            secret_key="minioadmin",
            bucket_name="jctc-evidence"
        )
        client = ObjectStorageClient(config)
        
        # Upload file
        key = await client.upload_file(file_data, "evidence/case123/device456.img")
        
        # Generate download URL
        url = client.get_presigned_url(key)
        
        # Download file
        data = await client.download_file(key)
    """
    
    def __init__(self, config: ObjectStorageConfig):
        self.config = config
        self._s3_client = None
        
        # Ensure local storage directory exists
        Path(config.local_storage_path).mkdir(parents=True, exist_ok=True)
        
        if config.enabled:
            self._init_s3_client()
    
    def _init_s3_client(self):
        """Initialize boto3 S3 client."""
        if not BOTO3_AVAILABLE:
            logger.error("boto3 not available. Cannot initialize S3 client.")
            return
        
        try:
            boto_config = Config(
                signature_version=self.config.signature_version,
                s3={'addressing_style': 'path'},  # Required for MinIO
                max_pool_connections=self.config.max_concurrency
            )
            
            self._s3_client = boto3.client(
                's3',
                endpoint_url=self.config.endpoint_url,
                aws_access_key_id=self.config.access_key,
                aws_secret_access_key=self.config.secret_key,
                region_name=self.config.region,
                use_ssl=self.config.use_ssl,
                config=boto_config
            )
            
            # Ensure bucket exists
            self._ensure_bucket_exists()
            
            logger.info(f"S3 client initialized for bucket: {self.config.bucket_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            self._s3_client = None
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        if not self._s3_client:
            return
        
        try:
            self._s3_client.head_bucket(Bucket=self.config.bucket_name)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == '404':
                try:
                    self._s3_client.create_bucket(Bucket=self.config.bucket_name)
                    logger.info(f"Created bucket: {self.config.bucket_name}")
                except Exception as create_err:
                    logger.error(f"Failed to create bucket: {create_err}")
            else:
                logger.error(f"Bucket check failed: {e}")
    
    @property
    def is_s3_enabled(self) -> bool:
        """Check if S3 is configured and available."""
        return self.config.enabled and self._s3_client is not None
    
    async def upload_file(
        self,
        file_data: BinaryIO,
        key: str,
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None,
        calculate_hash: bool = True
    ) -> Dict[str, Any]:
        """
        Upload file to object storage.
        
        Args:
            file_data: File-like object or bytes
            key: Storage key/path (e.g., "evidence/case123/device.img")
            content_type: MIME type
            metadata: Additional metadata to store
            calculate_hash: Whether to calculate SHA256 hash
            
        Returns:
            Dict with storage info: {key, size, hash, url, storage_type}
        """
        # Read file data
        if isinstance(file_data, bytes):
            data = file_data
        else:
            data = file_data.read()
        
        size = len(data)
        file_hash = hashlib.sha256(data).hexdigest() if calculate_hash else None
        
        # Detect content type
        if not content_type:
            content_type, _ = mimetypes.guess_type(key)
            content_type = content_type or 'application/octet-stream'
        
        if self.is_s3_enabled:
            return await self._upload_to_s3(data, key, content_type, metadata, size, file_hash)
        else:
            return await self._upload_to_local(data, key, size, file_hash)
    
    async def _upload_to_s3(
        self,
        data: bytes,
        key: str,
        content_type: str,
        metadata: Optional[Dict[str, str]],
        size: int,
        file_hash: Optional[str]
    ) -> Dict[str, Any]:
        """Upload to S3-compatible storage."""
        try:
            extra_args = {'ContentType': content_type}
            if metadata:
                extra_args['Metadata'] = metadata
            
            self._s3_client.put_object(
                Bucket=self.config.bucket_name,
                Key=key,
                Body=data,
                **extra_args
            )
            
            logger.info(f"Uploaded to S3: {key} ({size} bytes)")
            
            return {
                'key': key,
                'size': size,
                'hash': file_hash,
                'url': self.get_presigned_url(key),
                'storage_type': 's3',
                'bucket': self.config.bucket_name,
                'uploaded_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            # Fall back to local storage
            return await self._upload_to_local(data, key, size, file_hash)
    
    async def _upload_to_local(
        self,
        data: bytes,
        key: str,
        size: int,
        file_hash: Optional[str]
    ) -> Dict[str, Any]:
        """Upload to local filesystem."""
        local_path = Path(self.config.local_storage_path) / key
        local_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(local_path, 'wb') as f:
            f.write(data)
        
        logger.info(f"Uploaded to local: {local_path} ({size} bytes)")
        
        return {
            'key': key,
            'size': size,
            'hash': file_hash,
            'path': str(local_path),
            'storage_type': 'local',
            'uploaded_at': datetime.utcnow().isoformat()
        }
    
    async def download_file(self, key: str) -> Tuple[bytes, Dict[str, Any]]:
        """
        Download file from object storage.
        
        Returns:
            Tuple of (file_data, metadata)
        """
        if self.is_s3_enabled:
            return await self._download_from_s3(key)
        else:
            return await self._download_from_local(key)
    
    async def _download_from_s3(self, key: str) -> Tuple[bytes, Dict[str, Any]]:
        """Download from S3-compatible storage."""
        try:
            response = self._s3_client.get_object(
                Bucket=self.config.bucket_name,
                Key=key
            )
            
            data = response['Body'].read()
            metadata = {
                'content_type': response.get('ContentType'),
                'size': response.get('ContentLength'),
                'last_modified': response.get('LastModified'),
                'metadata': response.get('Metadata', {})
            }
            
            return data, metadata
            
        except Exception as e:
            logger.error(f"S3 download failed: {e}")
            # Try local fallback
            return await self._download_from_local(key)
    
    async def _download_from_local(self, key: str) -> Tuple[bytes, Dict[str, Any]]:
        """Download from local filesystem."""
        local_path = Path(self.config.local_storage_path) / key
        
        if not local_path.exists():
            raise FileNotFoundError(f"File not found: {key}")
        
        with open(local_path, 'rb') as f:
            data = f.read()
        
        metadata = {
            'size': len(data),
            'last_modified': datetime.fromtimestamp(local_path.stat().st_mtime)
        }
        
        return data, metadata
    
    def get_presigned_url(
        self,
        key: str,
        expiry: Optional[int] = None,
        method: str = 'get_object'
    ) -> Optional[str]:
        """
        Generate presigned URL for direct file access.
        
        Args:
            key: File key/path
            expiry: URL expiry in seconds (default from config)
            method: S3 method ('get_object' for download, 'put_object' for upload)
            
        Returns:
            Presigned URL or None if S3 not available
        """
        if not self.is_s3_enabled:
            return None
        
        try:
            url = self._s3_client.generate_presigned_url(
                method,
                Params={
                    'Bucket': self.config.bucket_name,
                    'Key': key
                },
                ExpiresIn=expiry or self.config.presigned_url_expiry
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None
    
    async def delete_file(self, key: str) -> bool:
        """Delete file from storage."""
        if self.is_s3_enabled:
            try:
                self._s3_client.delete_object(
                    Bucket=self.config.bucket_name,
                    Key=key
                )
                logger.info(f"Deleted from S3: {key}")
                return True
            except Exception as e:
                logger.error(f"S3 delete failed: {e}")
        
        # Try local
        local_path = Path(self.config.local_storage_path) / key
        if local_path.exists():
            local_path.unlink()
            logger.info(f"Deleted from local: {local_path}")
            return True
        
        return False
    
    async def list_files(
        self,
        prefix: str = "",
        max_keys: int = 1000
    ) -> list:
        """List files in storage with prefix."""
        if self.is_s3_enabled:
            try:
                response = self._s3_client.list_objects_v2(
                    Bucket=self.config.bucket_name,
                    Prefix=prefix,
                    MaxKeys=max_keys
                )
                return [
                    {
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified']
                    }
                    for obj in response.get('Contents', [])
                ]
            except Exception as e:
                logger.error(f"S3 list failed: {e}")
        
        # Local fallback
        local_path = Path(self.config.local_storage_path) / prefix
        files = []
        if local_path.exists():
            for f in local_path.rglob('*'):
                if f.is_file():
                    files.append({
                        'key': str(f.relative_to(self.config.local_storage_path)),
                        'size': f.stat().st_size,
                        'last_modified': datetime.fromtimestamp(f.stat().st_mtime)
                    })
        return files[:max_keys]
    
    def get_file_url(self, key: str, storage_type: str = None) -> str:
        """Get URL or path for a stored file."""
        if storage_type == 's3' or (storage_type is None and self.is_s3_enabled):
            url = self.get_presigned_url(key)
            if url:
                return url
        
        # Return local path
        return str(Path(self.config.local_storage_path) / key)


# Singleton instance
_storage_client: Optional[ObjectStorageClient] = None


def get_object_storage() -> ObjectStorageClient:
    """Get or create singleton storage client."""
    global _storage_client
    
    if _storage_client is None:
        from app.config.settings import settings
        
        config = ObjectStorageConfig(
            enabled=getattr(settings, 's3_enabled', False),
            endpoint_url=getattr(settings, 's3_endpoint_url', None),
            access_key=getattr(settings, 's3_access_key', None),
            secret_key=getattr(settings, 's3_secret_key', None),
            region=getattr(settings, 's3_region', 'us-east-1'),
            bucket_name=getattr(settings, 's3_bucket_name', 'jctc-evidence'),
            use_ssl=getattr(settings, 's3_use_ssl', True),
            local_storage_path=settings.file_storage_path,
            presigned_url_expiry=getattr(settings, 's3_presigned_url_expiry', 3600)
        )
        
        _storage_client = ObjectStorageClient(config)
    
    return _storage_client


def generate_storage_key(
    entity_type: str,
    entity_id: str,
    filename: str,
    case_id: Optional[str] = None
) -> str:
    """
    Generate a standardized storage key for files.
    
    Example: evidence/case123/device456/original_filename.img
    """
    parts = []
    
    if case_id:
        parts.append(f"cases/{case_id}")
    
    parts.append(entity_type)
    parts.append(entity_id)
    
    # Sanitize filename
    safe_filename = "".join(c for c in filename if c.isalnum() or c in '._-')
    parts.append(safe_filename)
    
    return "/".join(parts)
