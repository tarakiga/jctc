from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.models.evidence import CustodyAction


class ChainOfCustodyBase(BaseModel):
    action: CustodyAction
    location_from: Optional[str] = Field(None, max_length=255)
    location_to: Optional[str] = Field(None, max_length=255)
    purpose: str = Field(..., max_length=500)
    notes: Optional[str] = None
    signature_path: Optional[str] = Field(None, max_length=500)
    signature_verified: bool = False
    requires_approval: bool = False
    approval_status: Optional[str] = Field(None, regex="^(PENDING|APPROVED|REJECTED)$")
    approval_timestamp: Optional[datetime] = None


class ChainOfCustodyCreate(ChainOfCustodyBase):
    evidence_id: UUID
    custodian_from: Optional[UUID] = None  # Optional for initial collection
    custodian_to: UUID
    timestamp: Optional[datetime] = None


class ChainOfCustodyResponse(ChainOfCustodyBase):
    id: UUID
    evidence_id: UUID
    custodian_from: Optional[UUID]
    custodian_to: UUID
    custodian_from_name: Optional[str] = None
    custodian_to_name: str
    timestamp: datetime
    created_by: UUID
    created_by_name: str
    approved_by: Optional[UUID]
    approved_by_name: Optional[str]
    
    class Config:
        from_attributes = True


class ChainOfCustodyHistoryResponse(BaseModel):
    evidence_id: UUID
    evidence_label: str
    total_entries: int
    entries: List[ChainOfCustodyResponse]


class CustodyTransferCreate(BaseModel):
    evidence_ids: List[UUID] = Field(..., min_items=1)
    custodian_to: UUID
    location_to: str = Field(..., max_length=255)
    purpose: str = Field(..., max_length=500)
    notes: Optional[str] = None