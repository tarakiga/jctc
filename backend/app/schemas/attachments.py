from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.models.misc import AttachmentClassification, VirusScanStatus


class AttachmentBase(BaseModel):
    """Base schema for attachment data."""
    title: str = Field(..., min_length=1, max_length=500, description="Descriptive title for the attachment")
    filename: str = Field(..., min_length=1, max_length=255, description="Original filename")
    file_size: int = Field(..., gt=0, description="File size in bytes")
    file_type: str = Field(..., min_length=1, max_length=100, description="MIME type (e.g., application/pdf)")
    classification: AttachmentClassification = Field(
        default=AttachmentClassification.LE_SENSITIVE,
        description="Security classification level"
    )
    sha256_hash: str = Field(..., min_length=64, max_length=64, description="SHA-256 hash for integrity verification")
    notes: Optional[str] = Field(None, max_length=5000, description="Additional context about the attachment")


class AttachmentCreate(AttachmentBase):
    """Schema for creating a new attachment."""
    case_id: UUID = Field(..., description="ID of the case this attachment belongs to")
    
    @field_validator('sha256_hash')
    @classmethod
    def validate_sha256(cls, v: str) -> str:
        """Validate SHA-256 hash format (64 hex characters)."""
        if not all(c in '0123456789abcdefABCDEF' for c in v):
            raise ValueError('SHA-256 hash must contain only hexadecimal characters')
        return v.lower()


class AttachmentUpdate(BaseModel):
    """Schema for updating an attachment (limited fields)."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    classification: Optional[AttachmentClassification] = None
    notes: Optional[str] = Field(None, max_length=5000)
    virus_scan_status: Optional[VirusScanStatus] = None
    virus_scan_details: Optional[str] = Field(None, max_length=2000)
    file_path: Optional[str] = Field(None, max_length=500)
    download_url: Optional[str] = Field(None, max_length=1000)


class AttachmentResponse(AttachmentBase):
    """Schema for attachment response data."""
    id: UUID
    case_id: UUID
    file_path: Optional[str] = None
    download_url: Optional[str] = None
    virus_scan_status: VirusScanStatus
    virus_scan_details: Optional[str] = None
    uploaded_by: UUID
    uploaded_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AttachmentListResponse(BaseModel):
    """Schema for paginated attachment list."""
    items: list[AttachmentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AttachmentHashVerification(BaseModel):
    """Schema for hash verification request."""
    expected_hash: str = Field(..., min_length=64, max_length=64)
    
    @field_validator('expected_hash')
    @classmethod
    def validate_sha256(cls, v: str) -> str:
        """Validate SHA-256 hash format."""
        if not all(c in '0123456789abcdefABCDEF' for c in v):
            raise ValueError('SHA-256 hash must contain only hexadecimal characters')
        return v.lower()


class AttachmentHashVerificationResponse(BaseModel):
    """Schema for hash verification response."""
    is_valid: bool
    stored_hash: str
    provided_hash: str
    message: str
