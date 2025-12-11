"""
Pydantic schemas for Evidence & Seizure Linkage in the JCTC Management System.
Consolidates previous 'Device' and 'Evidence' schemas.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID

from app.models.evidence import (
    ImagingStatus, DeviceType, ArtefactType, CustodyStatus,
    WarrantType, SeizureStatus, DeviceCondition, EncryptionStatus, AnalysisStatus,
    EvidenceCategory, CustodyAction
)


# ==================== CHAIN OF CUSTODY SCHEMAS ====================

class CustodyActionRequest(BaseModel):
    """Schema for recording a custody action (chain of custody)."""
    action: CustodyAction
    to_user_id: UUID = Field(..., description="User receiving custody")
    location: Optional[str] = Field(None, max_length=255)
    details: Optional[str] = Field(None, description="Notes/Reason for transfer")


class ChainOfCustodyResponse(BaseModel):
    id: UUID
    evidence_id: UUID
    action: CustodyAction
    from_user: Optional[UUID]
    to_user: UUID
    timestamp: datetime
    location: Optional[str]
    details: Optional[str]
    
    class Config:
        from_attributes = True


# ==================== SEIZURE SCHEMAS (Simplified/Referenced) ====================
# Full Seizure management might remain in a separate module or here. 
# For now, including basic Seizure structure as it was in devices.py

class SeizureBase(BaseModel):
    """Base schema for seizure information."""
    seized_at: Optional[datetime] = Field(None, description="When the seizure occurred")
    location: str = Field(..., min_length=1, max_length=500, description="Location of seizure")
    officer_id: Optional[UUID] = Field(None, description="ID of seizing officer")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional notes")
    
    # NEW: Link to authorizing legal instrument
    legal_instrument_id: Optional[UUID] = Field(None, description="ID of authorizing legal instrument (warrant)")
    
    # DEPRECATED: Warrant fields (use legal_instrument_id instead)
    warrant_number: Optional[str] = Field(None, max_length=100, deprecated=True)
    warrant_type: Optional[WarrantType] = Field(None, deprecated=True)
    issuing_authority: Optional[str] = Field(None, max_length=255, deprecated=True)
    
    description: Optional[str] = Field(None, max_length=5000)
    # Note: items_count is deprecated, use evidence_count from response (computed)
    items_count: Optional[int] = Field(None, ge=0, deprecated=True)
    status: Optional[SeizureStatus] = Field(SeizureStatus.COMPLETED)
    
    witnesses: Optional[List[Dict[str, Any]]] = None
    photos: Optional[List[Dict[str, Any]]] = None

class SeizureCreate(SeizureBase):
    """Schema for creating a seizure. Prefer legal_instrument_id over warrant fields."""
    pass

class SeizureUpdate(BaseModel):
    seized_at: Optional[datetime] = None
    location: Optional[str] = Field(None, min_length=1, max_length=500)
    officer_id: Optional[UUID] = None
    notes: Optional[str] = None
    legal_instrument_id: Optional[UUID] = None  # NEW
    warrant_number: Optional[str] = None  # Deprecated
    warrant_type: Optional[WarrantType] = None  # Deprecated
    issuing_authority: Optional[str] = None  # Deprecated
    description: Optional[str] = None
    items_count: Optional[int] = None  # Deprecated
    status: Optional[SeizureStatus] = None
    witnesses: Optional[List[Dict[str, Any]]] = None
    photos: Optional[List[Dict[str, Any]]] = None


# Minimal LegalInstrument response for embedding in SeizureResponse
class LegalInstrumentSummary(BaseModel):
    """Summary of linked legal instrument for seizure response."""
    id: UUID
    type: Optional[str] = None
    reference_no: Optional[str] = None
    issuing_authority: Optional[str] = None
    status: Optional[str] = None
    
    class Config:
        from_attributes = True


class SeizureResponse(SeizureBase):
    id: UUID
    case_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # NEW: Computed evidence count (replaces items_count)
    evidence_count: int = Field(0, description="Number of evidence items linked to this seizure")
    
    # NEW: Linked legal instrument details
    legal_instrument: Optional[LegalInstrumentSummary] = None
    
    class Config:
        from_attributes = True
        use_enum_values = True


# ==================== EVIDENCE (formerly Device) SCHEMAS ====================

class EvidenceBase(BaseModel):
    """Base schema for Evidence (Device) information."""
    label: str = Field(..., min_length=1, max_length=255, description="Evidence label/identifier")
    category: Optional[str] = Field(default='PHYSICAL', max_length=50)  # Changed to string for frontend compatibility
    evidence_type: Optional[str] = Field(None, max_length=50, description="Type of evidence/device")  # Maps to lookup
    
    # Identifiers
    make: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_no: Optional[str] = Field(None, max_length=200)
    imei: Optional[str] = Field(None, max_length=20)
    
    # Physical/State
    storage_capacity: Optional[str] = Field(None, max_length=100)
    operating_system: Optional[str] = Field(None, max_length=100)
    condition: Optional[str] = Field(None, max_length=50)  # Changed to string for frontend compatibility
    description: Optional[str] = Field(None, max_length=5000)
    
    powered_on: Optional[bool] = False
    password_protected: Optional[bool] = False
    encryption_status: Optional[str] = Field(default='UNKNOWN', max_length=50)  # Changed to string for frontend compatibility
    
    # Storage
    storage_location: Optional[str] = Field(None, max_length=500)
    retention_policy: Optional[str] = Field(None, max_length=100)
    
    notes: Optional[str] = Field(None, max_length=2000)
    forensic_notes: Optional[str] = Field(None, max_length=5000)
    
    # File/Collection (Moved from old EvidenceItem)
    collected_at: Optional[datetime] = None
    collected_by: Optional[UUID] = None
    file_path: Optional[str] = None
    sha256: Optional[str] = None


class EvidenceCreate(EvidenceBase):
    """Schema for adding new evidence."""
    # Case ID is typically passed in URL or inferred
    pass

class EvidenceUpdate(BaseModel):
    label: Optional[str] = None
    category: Optional[str] = None  # Changed from enum to string
    evidence_type: Optional[str] = None  # Changed from enum to string
    make: Optional[str] = None
    model: Optional[str] = None
    serial_no: Optional[str] = None
    imei: Optional[str] = None
    storage_capacity: Optional[str] = None
    operating_system: Optional[str] = None
    condition: Optional[str] = None  # Changed from enum to string
    description: Optional[str] = None
    powered_on: Optional[bool] = None
    password_protected: Optional[bool] = None
    encryption_status: Optional[str] = None  # Changed from enum to string
    storage_location: Optional[str] = None
    retention_policy: Optional[str] = None
    notes: Optional[str] = None
    forensic_notes: Optional[str] = None
    collected_at: Optional[datetime] = None
    file_path: Optional[str] = None
    sha256: Optional[str] = None

class EvidenceResponse(EvidenceBase):
    id: UUID
    case_id: Optional[UUID] = None
    seizure_id: Optional[UUID] = None
    
    # Enriched fields for display (populated by API)
    case_number: Optional[str] = None  # Case number for display
    collected_by_name: Optional[str] = None  # Collector's name for display
    sha256_hash: Optional[str] = None  # SHA256 hash (alias for sha256)
    is_active: Optional[bool] = True  # Active status
    evidence_number: Optional[str] = None  # Evidence identifier (usually same as label)
    
    # Imaging status (readonly in response)
    imaged: Optional[bool] = False
    imaging_status: Optional[str] = None  # Changed from enum to string
    imaging_started_at: Optional[datetime] = None
    imaging_completed_at: Optional[datetime] = None
    imaging_tool: Optional[str] = None
    image_hash: Optional[str] = None
    image_size_bytes: Optional[str] = None
    imaging_technician_id: Optional[UUID] = None
    
    custody_status: Optional[str] = None  # Changed from enum to string
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Chain entries removed to avoid async lazy-loading issues
    # Use separate endpoint GET /evidence/{id}/custody for chain of custody entries
    
    class Config:
        from_attributes = True


# ==================== ARTIFACT SCHEMAS ====================

class ArtefactBase(BaseModel):
    artefact_type: ArtefactType
    source_tool: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=1000)
    file_path: Optional[str] = None
    sha256: Optional[str] = None
    
    @field_validator('sha256')
    def validate_sha256(cls, v):
        if v and len(v) != 64:
            raise ValueError('SHA256 hash must be 64 characters')
        return v

class ArtefactCreate(ArtefactBase):
    pass

class ArtefactUpdate(BaseModel):
    artefact_type: Optional[ArtefactType] = None
    source_tool: Optional[str] = None
    description: Optional[str] = None
    file_path: Optional[str] = None
    sha256: Optional[str] = None

class ArtefactResponse(ArtefactBase):
    id: UUID
    evidence_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ==================== IMAGING / BULK / WORKFLOW ====================

class ImagingStatusUpdate(BaseModel):
    imaging_status: Optional[ImagingStatus] = None
    imaging_tool: Optional[str] = None
    image_hash: Optional[str] = None
    image_size_bytes: Optional[str] = None
    forensic_notes: Optional[str] = None

class DeviceImagingResponse(BaseModel): # Kept name for compatibility or rename to EvidenceImagingResponse
    device_id: UUID # map to evidence.id
    imaging_status: ImagingStatus
    imaging_started_at: Optional[datetime]
    imaging_completed_at: Optional[datetime]
    imaging_tool: Optional[str]
    image_hash: Optional[str]
    image_size_bytes: Optional[str]
    technician_id: Optional[UUID]
    updated_at: Optional[datetime]

class ForensicWorkflowResponse(BaseModel):
    case_id: UUID
    total_seizures: int
    total_devices: int
    imaged_devices: int
    pending_imaging: int
    in_progress_imaging: int
    total_artifacts: int
    artifact_types: Dict[str, int]
    seizures: List[SeizureResponse]
    recent_devices: List[EvidenceResponse]

# Legacy/Search
class EvidenceSearchFilters(BaseModel):
    case_id: Optional[UUID] = None
    category: Optional[EvidenceCategory] = None
    storage_location: Optional[str] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    has_hash: Optional[bool] = None
