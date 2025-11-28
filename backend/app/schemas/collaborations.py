from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr

from app.models.misc import CollaborationStatus, PartnerType


class CollaborationBase(BaseModel):
    """Base schema for collaboration data."""
    partner_org: str = Field(..., min_length=1, max_length=255, description="Partner organization code or name")
    partner_type: PartnerType = Field(..., description="Type of partner organization")
    contact_person: str = Field(..., min_length=1, max_length=255, description="Full name of contact person")
    contact_email: EmailStr = Field(..., description="Contact email address")
    contact_phone: str = Field(..., min_length=1, max_length=50, description="Contact phone number")
    scope: str = Field(..., min_length=10, max_length=5000, description="Scope of collaboration")
    reference_no: Optional[str] = Field(None, max_length=100, description="Partner's reference or case number")
    mou_reference: Optional[str] = Field(None, max_length=255, description="Reference to governing MoU or framework")
    notes: Optional[str] = Field(None, max_length=5000, description="Coordination notes")


class CollaborationCreate(CollaborationBase):
    """Schema for creating a new collaboration."""
    case_id: UUID = Field(..., description="ID of the case this collaboration relates to")


class CollaborationUpdate(BaseModel):
    """Schema for updating a collaboration."""
    partner_org: Optional[str] = Field(None, min_length=1, max_length=255)
    partner_type: Optional[PartnerType] = None
    contact_person: Optional[str] = Field(None, min_length=1, max_length=255)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, min_length=1, max_length=50)
    scope: Optional[str] = Field(None, min_length=10, max_length=5000)
    reference_no: Optional[str] = Field(None, max_length=100)
    mou_reference: Optional[str] = Field(None, max_length=255)
    status: Optional[CollaborationStatus] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=5000)


class CollaborationResponse(CollaborationBase):
    """Schema for collaboration response data."""
    id: UUID
    case_id: UUID
    status: CollaborationStatus
    initiated_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CollaborationListResponse(BaseModel):
    """Schema for paginated collaboration list."""
    items: list[CollaborationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CollaborationStatusUpdate(BaseModel):
    """Schema for updating collaboration status."""
    status: CollaborationStatus
    completed_at: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=5000)


class CollaborationSummary(BaseModel):
    """Schema for collaboration statistics/summary."""
    total_collaborations: int
    by_status: dict[str, int]
    by_partner_type: dict[str, int]
    active_count: int
    completed_count: int
