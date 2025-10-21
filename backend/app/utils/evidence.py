import hashlib
import os
from typing import Tuple, Optional
from pathlib import Path
from datetime import datetime
import aiofiles
from fastapi import UploadFile


async def calculate_sha256_hash(file_content: bytes) -> str:
    """Calculate SHA-256 hash of file content"""
    sha256_hash = hashlib.sha256()
    sha256_hash.update(file_content)
    return sha256_hash.hexdigest()


async def calculate_file_sha256(file_path: str) -> str:
    """Calculate SHA-256 hash of a file"""
    sha256_hash = hashlib.sha256()
    
    async with aiofiles.open(file_path, 'rb') as f:
        while chunk := await f.read(8192):  # Read in 8KB chunks
            sha256_hash.update(chunk)
    
    return sha256_hash.hexdigest()


async def verify_file_integrity(file_path: str, expected_hash: str) -> bool:
    """Verify file integrity against expected SHA-256 hash"""
    if not os.path.exists(file_path):
        return False
    
    actual_hash = await calculate_file_sha256(file_path)
    return actual_hash.lower() == expected_hash.lower()


async def save_uploaded_file(upload_file: UploadFile, storage_path: str) -> Tuple[str, str, int]:
    """
    Save uploaded file and return (file_path, sha256_hash, file_size)
    """
    # Ensure storage directory exists
    os.makedirs(os.path.dirname(storage_path), exist_ok=True)
    
    # Read file content
    file_content = await upload_file.read()
    file_size = len(file_content)
    
    # Calculate hash
    sha256_hash = await calculate_sha256_hash(file_content)
    
    # Save file
    async with aiofiles.open(storage_path, 'wb') as f:
        await f.write(file_content)
    
    # Reset file pointer for potential re-use
    await upload_file.seek(0)
    
    return storage_path, sha256_hash, file_size


def generate_evidence_storage_path(case_id: str, evidence_id: str, filename: str) -> str:
    """Generate secure storage path for evidence file"""
    # Create directory structure: storage/evidence/case_id/evidence_id/filename
    base_path = Path("storage") / "evidence" / case_id / evidence_id
    return str(base_path / filename)


def is_allowed_file_type(filename: str) -> bool:
    """Check if file type is allowed for evidence upload"""
    # Common evidence file types
    allowed_extensions = {
        # Documents
        '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
        # Images
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg',
        # Archives
        '.zip', '.rar', '.7z', '.tar', '.gz',
        # Videos
        '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv',
        # Audio
        '.mp3', '.wav', '.flac', '.aac', '.ogg',
        # Forensic formats
        '.dd', '.e01', '.aff', '.vmdk', '.raw',
        # Email
        '.eml', '.msg', '.pst',
        # Spreadsheets
        '.xls', '.xlsx', '.csv', '.ods',
        # Other
        '.log', '.json', '.xml', '.sql'
    }
    
    file_ext = Path(filename).suffix.lower()
    return file_ext in allowed_extensions


def get_max_file_size() -> int:
    """Get maximum allowed file size in bytes (default 100MB)"""
    return 100 * 1024 * 1024  # 100MB


class EvidenceIntegrityError(Exception):
    """Raised when evidence integrity check fails"""
    pass


class EvidenceStorageError(Exception):
    """Raised when evidence storage operation fails"""
    pass


async def create_evidence_backup(file_path: str, backup_path: str) -> bool:
    """Create a backup copy of evidence file"""
    try:
        # Ensure backup directory exists
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        
        async with aiofiles.open(file_path, 'rb') as src:
            async with aiofiles.open(backup_path, 'wb') as dst:
                while chunk := await src.read(8192):
                    await dst.write(chunk)
        
        # Verify backup integrity
        original_hash = await calculate_file_sha256(file_path)
        backup_hash = await calculate_file_sha256(backup_path)
        
        return original_hash == backup_hash
    except Exception:
        return False


def get_retention_policy_days(retention_policy: str) -> Optional[int]:
    """Convert retention policy string to days"""
    policies = {
        '1Y_AFTER_CLOSE': 365,
        '3Y_AFTER_CLOSE': 365 * 3,
        '5Y_AFTER_CLOSE': 365 * 5,
        '7Y_AFTER_CLOSE': 365 * 7,
        '10Y_AFTER_CLOSE': 365 * 10,
        'PERMANENT': None,  # Never expires
        'LEGAL_HOLD': None,  # Manual review required
    }
    return policies.get(retention_policy)


def validate_evidence_label(label: str) -> bool:
    """Validate evidence label format"""
    # Basic validation: not empty, reasonable length, no special chars
    if not label or len(label.strip()) == 0:
        return False
    if len(label) > 255:
        return False
    
    # Prevent potential security issues
    dangerous_chars = ['<', '>', '&', '"', "'", '/', '\\', '..']
    return not any(char in label for char in dangerous_chars)