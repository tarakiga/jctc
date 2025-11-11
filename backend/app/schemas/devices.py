"""
Pydantic schemas for Seizure & Device Management endpoints in the JCTC Management System.

These schemas define the request/response models for device seizure, 
imaging status, and forensic artifact management operations.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID

from app.models import ImagingStatus, DeviceType, ArtefactType, CustodyStatus


# ==================== SEIZURE SCHEMAS ====================

class SeizureBase(BaseModel):
    """Base schema for seizure information."""
    seized_at: Optional[datetime] = Field(None, description="When the seizure occurred")
    location: str = Field(..., min_length=1, max_length=500, description="Location of seizure")
    officer_id: Optional[UUID] = Field(None, description="ID of seizing officer")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional notes about seizure")


class SeizureCreate(SeizureBase):
    """Schema for creating a new seizure record."""
    pass


class SeizureUpdate(BaseModel):
    """Schema for updating seizure information."""
    seized_at: Optional[datetime] = None
    location: Optional[str] = Field(None, min_length=1, max_length=500)
    officer_id: Optional[UUID] = None
    notes: Optional[str] = Field(None, max_length=2000)


class SeizureResponse(SeizureBase):
    """Response schema for seizure information."""
    id: UUID
    case_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SeizureSummaryResponse(BaseModel):
    """Summary response schema for seizure overview."""
    id: UUID
    case_id: UUID
    seized_at: datetime
    location: str
    device_count: int = Field(description="Number of devices in this seizure")
    officer_name: Optional[str] = Field(description="Name of seizing officer")


# ==================== DEVICE SCHEMAS ====================

class DeviceBase(BaseModel):
    """Base schema for device information."""
    label: str = Field(..., min_length=1, max_length=200, description="Device label/identifier")
    device_type: Optional[DeviceType] = Field(None, description="Type of device")
    make: Optional[str] = Field(None, max_length=100, description="Device manufacturer")
    model: Optional[str] = Field(None, max_length=100, description="Device model")
    serial_no: Optional[str] = Field(None, max_length=200, description="Serial number")
    imei: Optional[str] = Field(None, max_length=20, description="IMEI number for mobile devices")
    current_location: Optional[str] = Field(None, max_length=500, description="Current physical location")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional notes")


class DeviceCreate(DeviceBase):
    """Schema for adding a device to a seizure."""
    pass


class DeviceUpdate(BaseModel):
    """Schema for updating device information."""
    label: Optional[str] = Field(None, min_length=1, max_length=200)
    device_type: Optional[DeviceType] = None
    make: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_no: Optional[str] = Field(None, max_length=200)
    imei: Optional[str] = Field(None, max_length=20)
    current_location: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)


class DeviceLinkRequest(BaseModel):
    """Schema for linking an existing device to a seizure."""
    seizure_id: UUID


class DeviceResponse(DeviceBase):
    """Response schema for device information."""
    id: UUID
    seizure_id: UUID
    imaged: bool = Field(description="Whether device has been successfully imaged")
    imaging_status: ImagingStatus = Field(description="Current imaging status")
    imaging_started_at: Optional[datetime] = Field(None, description="When imaging started")
    imaging_completed_at: Optional[datetime] = Field(None, description="When imaging completed")
    imaging_tool: Optional[str] = Field(None, description="Tool used for imaging")
    image_hash: Optional[str] = Field(None, description="Hash of the forensic image")
    image_size_bytes: Optional[int] = Field(None, description="Size of image in bytes")
    imaging_technician_id: Optional[UUID] = Field(None, description="ID of imaging technician")
    forensic_notes: Optional[str] = Field(None, description="Forensic analysis notes")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== IMAGING STATUS SCHEMAS ====================

class ImagingStatusUpdate(BaseModel):
    """Schema for updating device imaging status and details."""
    imaging_status: Optional[ImagingStatus] = Field(None, description="New imaging status")
    imaging_tool: Optional[str] = Field(None, max_length=200, description="Tool used for imaging")
    image_hash: Optional[str] = Field(None, max_length=64, description="SHA256 hash of image")
    image_size_bytes: Optional[int] = Field(None, ge=0, description="Size of image in bytes")
    forensic_notes: Optional[str] = Field(None, max_length=5000, description="Forensic analysis notes")
    
    @field_validator('image_hash')
    @classmethod
    def validate_hash(cls, v):
        if v and len(v) != 64:
            raise ValueError('Image hash must be 64 characters (SHA256)')
        return v


class DeviceImagingResponse(BaseModel):
    """Response schema for device imaging status and details."""
    device_id: UUID
    imaging_status: ImagingStatus
    imaging_started_at: Optional[datetime]
    imaging_completed_at: Optional[datetime]
    imaging_tool: Optional[str]
    image_hash: Optional[str]
    image_size_bytes: Optional[int]
    technician_id: Optional[UUID]
    updated_at: datetime


# ==================== ARTIFACT SCHEMAS ====================

class ArtefactBase(BaseModel):
    """Base schema for forensic artifacts."""
    artefact_type: ArtefactType = Field(..., description="Type of artifact")
    source_tool: str = Field(..., min_length=1, max_length=200, description="Tool used to extract artifact")
    description: str = Field(..., min_length=1, max_length=1000, description="Description of artifact")
    file_path: Optional[str] = Field(None, max_length=1000, description="Path to artifact file")
    sha256: Optional[str] = Field(None, max_length=64, description="SHA256 hash of artifact file")
    
    @field_validator('sha256')
    @classmethod
    def validate_sha256(cls, v):
        if v and len(v) != 64:
            raise ValueError('SHA256 hash must be 64 characters')
        return v


class ArtefactCreate(ArtefactBase):
    """Schema for adding an artifact to a device."""
    pass


class ArtefactUpdate(BaseModel):
    """Schema for updating artifact information."""
    artefact_type: Optional[ArtefactType] = None
    source_tool: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=1000)
    file_path: Optional[str] = Field(None, max_length=1000)
    sha256: Optional[str] = Field(None, max_length=64)
    
    @field_validator('sha256')
    @classmethod
    def validate_sha256(cls, v):
        if v and len(v) != 64:
            raise ValueError('SHA256 hash must be 64 characters')
        return v


class ArtefactResponse(ArtefactBase):
    """Response schema for artifact information."""
    id: UUID
    device_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== FORENSIC WORKFLOW SUMMARY SCHEMAS ====================

class ForensicWorkflowResponse(BaseModel):
    """Comprehensive forensic workflow summary for a case."""
    case_id: UUID
    total_seizures: int = Field(description="Total number of seizures")
    total_devices: int = Field(description="Total number of devices")
    imaged_devices: int = Field(description="Number of successfully imaged devices")
    pending_imaging: int = Field(description="Devices pending imaging")
    in_progress_imaging: int = Field(description="Devices currently being imaged")
    total_artifacts: int = Field(description="Total artifacts extracted")
    artifact_types: Dict[str, int] = Field(description="Breakdown of artifact types")
    seizures: List[SeizureResponse] = Field(description="Recent seizures")
    recent_devices: List[DeviceResponse] = Field(description="Recent devices")


# ==================== BULK OPERATION SCHEMAS ====================

class BulkDeviceUpdate(BaseModel):
    """Schema for bulk updating device information."""
    device_ids: List[UUID] = Field(..., min_items=1, max_items=50, description="Device IDs to update")
    updates: DeviceUpdate = Field(..., description="Updates to apply to all devices")


class BulkImagingStatusUpdate(BaseModel):
    """Schema for bulk updating imaging status."""
    device_ids: List[UUID] = Field(..., min_items=1, max_items=20, description="Device IDs to update")
    imaging_status: ImagingStatus = Field(..., description="New imaging status")
    notes: Optional[str] = Field(None, max_length=1000, description="Notes for bulk update")


class BulkOperationResponse(BaseModel):
    """Response schema for bulk operations."""
    total_requested: int = Field(description="Total items requested for update")
    successful_updates: int = Field(description="Number of successful updates")
    failed_updates: int = Field(description="Number of failed updates")
    errors: List[str] = Field(description="List of error messages")
    updated_device_ids: List[UUID] = Field(description="IDs of successfully updated devices")


# ==================== CHAIN OF CUSTODY SCHEMAS ====================

class CustodyTransferRequest(BaseModel):
    """Schema for transferring device custody."""
    new_location: str = Field(..., min_length=1, max_length=500, description="New custody location")
    transfer_reason: str = Field(..., min_length=1, max_length=1000, description="Reason for transfer")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional transfer notes")


class CustodyTransferResponse(BaseModel):
    """Response schema for custody transfer."""
    device_id: UUID
    previous_location: Optional[str]
    new_location: str
    transfer_reason: str
    transferred_by: UUID
    transferred_at: datetime
    notes: Optional[str]


# ==================== DEVICE SEARCH SCHEMAS ====================

class DeviceSearchRequest(BaseModel):
    """Schema for advanced device search."""
    case_id: Optional[UUID] = None
    device_type: Optional[DeviceType] = None
    imaging_status: Optional[ImagingStatus] = None
    make: Optional[str] = None
    model: Optional[str] = None
    serial_no: Optional[str] = None
    imei: Optional[str] = None
    seized_from: Optional[date] = None
    seized_to: Optional[date] = None
    location: Optional[str] = None
    technician_id: Optional[UUID] = None
    has_artifacts: Optional[bool] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "device_type": "MOBILE",
                "imaging_status": "COMPLETED",
                "seized_from": "2024-01-01",
                "seized_to": "2024-12-31",
                "has_artifacts": True
            }
        }


class DeviceSearchResponse(BaseModel):
    """Response schema for device search results."""
    total_results: int = Field(description="Total number of matching devices")
    devices: List[DeviceResponse] = Field(description="Matching devices")
    search_criteria: DeviceSearchRequest = Field(description="Applied search criteria")


# ==================== EXPORT SCHEMAS ====================

class ForensicReportExportRequest(BaseModel):
    """Schema for exporting forensic reports."""
    case_id: UUID
    include_seizures: bool = Field(default=True, description="Include seizure information")
    include_devices: bool = Field(default=True, description="Include device details")
    include_artifacts: bool = Field(default=True, description="Include artifact information")
    include_imaging_details: bool = Field(default=True, description="Include imaging status/details")
    format: str = Field(default="pdf", pattern="^(pdf|excel|csv)$", description="Export format")


class ForensicReportExportResponse(BaseModel):
    """Response schema for forensic report export."""
    case_id: UUID
    export_format: str
    file_url: str = Field(description="URL to download the exported report")
    generated_at: datetime
    generated_by: UUID
    expires_at: datetime = Field(description="When the download link expires")