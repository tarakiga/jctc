from pydantic import BaseModel, Field, validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.evidence import EvidenceCategory, CustodyStatus, CustodyAction


class EvidenceItemBase(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    category: EvidenceCategory
    storage_location: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None


class EvidenceItemCreate(EvidenceItemBase):
    case_id: UUID
    retention_policy: Optional[str] = Field("7Y_AFTER_CLOSE", max_length=100)


class EvidenceItemUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=255)
    storage_location: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    retention_policy: Optional[str] = Field(None, max_length=100)


class EvidenceItemResponse(EvidenceItemBase):
    id: UUID
    case_id: UUID
    sha256: Optional[str] = None
    retention_policy: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChainOfCustodyBase(BaseModel):
    action: CustodyAction
    location: Optional[str] = Field(None, max_length=255)
    details: Optional[str] = None


class ChainOfCustodyCreate(ChainOfCustodyBase):
    evidence_id: UUID
    from_user: Optional[UUID] = None  # Optional for SEIZED action
    to_user: UUID


class ChainOfCustodyResponse(ChainOfCustodyBase):
    id: UUID
    evidence_id: UUID
    from_user: Optional[UUID] = None
    to_user: UUID
    timestamp: datetime
    
    class Config:
        from_attributes = True


class EvidenceWithChainResponse(EvidenceItemResponse):
    """Evidence item with complete chain of custody"""
    chain_entries: List[ChainOfCustodyResponse] = []


class EvidenceHashVerificationRequest(BaseModel):
    file_content: bytes = Field(..., description="File content to verify against stored hash")


class EvidenceHashVerificationResponse(BaseModel):
    evidence_id: UUID
    stored_hash: str
    computed_hash: str
    is_valid: bool
    verified_at: datetime


class EvidenceSearchFilters(BaseModel):
    case_id: Optional[UUID] = None
    category: Optional[EvidenceCategory] = None
    storage_location: Optional[str] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    has_hash: Optional[bool] = None


class BulkEvidenceTransferRequest(BaseModel):
    evidence_ids: List[UUID] = Field(..., min_items=1)
    to_user: UUID
    location: str = Field(..., max_length=255)
    details: Optional[str] = None


class BulkEvidenceTransferResponse(BaseModel):
    transferred_count: int
    failed_transfers: List[UUID] = []
    transfer_timestamp: datetime