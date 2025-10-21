"""
Pydantic schemas for prosecution workflow in the JCTC Management System.

This module defines the data validation and serialization schemas for:
- Criminal charges and charge management
- Court sessions and scheduling
- Case outcomes and dispositions
- Prosecution statistics and analytics
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID

from app.models import ChargeStatus, Disposition


# ==================== CHARGE SCHEMAS ====================

class ChargeBase(BaseModel):
    """Base schema for charge data."""
    statute: str = Field(..., description="Legal statute/section (e.g., Cybercrimes Act s.38)")
    description: Optional[str] = Field(None, description="Detailed description of the charge")
    status: Optional[ChargeStatus] = Field(None, description="Status of the charge")


class ChargeCreate(ChargeBase):
    """Schema for creating a new charge."""
    filed_at: Optional[datetime] = Field(None, description="When the charge was filed")
    
    @field_validator('statute')
    @classmethod
    def validate_statute(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Statute must be at least 3 characters long')
        return v.strip()


class ChargeUpdate(BaseModel):
    """Schema for updating charge information."""
    statute: Optional[str] = Field(None, description="Updated legal statute")
    description: Optional[str] = Field(None, description="Updated charge description")
    status: Optional[ChargeStatus] = Field(None, description="Updated charge status")
    filed_at: Optional[datetime] = Field(None, description="Updated filing date")


class ChargeResponse(ChargeBase):
    """Schema for charge response data."""
    id: UUID
    case_id: UUID
    filed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID
    
    class Config:
        from_attributes = True


# ==================== COURT SESSION SCHEMAS ====================

class CourtSessionBase(BaseModel):
    """Base schema for court session data."""
    session_date: Optional[datetime] = Field(None, description="Date and time of court session")
    court: Optional[str] = Field(None, description="Court name/location")
    judge: Optional[str] = Field(None, description="Judge presiding over the session")
    session_type: Optional[str] = Field(None, description="Type of session (hearing, trial, sentencing, etc.)")
    notes: Optional[str] = Field(None, description="Additional notes about the session")


class CourtSessionCreate(CourtSessionBase):
    """Schema for creating a new court session."""
    session_date: datetime = Field(..., description="Date and time of court session")
    court: str = Field(..., min_length=3, description="Court name/location")
    session_type: str = Field(..., min_length=3, description="Type of session")
    
    @field_validator('session_date')
    @classmethod
    def validate_session_date(cls, v):
        if v and v < datetime.utcnow():
            raise ValueError('Court session cannot be scheduled in the past')
        return v
    
    @field_validator('court', 'session_type')
    @classmethod
    def validate_required_fields(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Field must be at least 3 characters long')
        return v.strip()


class CourtSessionUpdate(BaseModel):
    """Schema for updating court session information."""
    session_date: Optional[datetime] = Field(None, description="Updated session date")
    court: Optional[str] = Field(None, description="Updated court name")
    judge: Optional[str] = Field(None, description="Updated judge name")
    session_type: Optional[str] = Field(None, description="Updated session type")
    notes: Optional[str] = Field(None, description="Updated notes")


class CourtSessionResponse(CourtSessionBase):
    """Schema for court session response data."""
    id: UUID
    case_id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID
    
    class Config:
        from_attributes = True


# ==================== OUTCOME SCHEMAS ====================

class OutcomeBase(BaseModel):
    """Base schema for case outcome data."""
    disposition: Disposition = Field(..., description="Final case disposition")
    sentence: Optional[str] = Field(None, description="Sentence details if convicted")
    restitution: Optional[Decimal] = Field(None, description="Restitution amount if applicable")
    notes: Optional[str] = Field(None, description="Additional outcome notes")


class OutcomeCreate(OutcomeBase):
    """Schema for creating a case outcome."""
    closed_at: Optional[datetime] = Field(None, description="When the case was closed")
    
    @field_validator('restitution')
    @classmethod
    def validate_restitution(cls, v):
        if v is not None and v < 0:
            raise ValueError('Restitution amount cannot be negative')
        return v
    
    @field_validator('sentence')
    @classmethod
    def validate_sentence_for_conviction(cls, v, info):
        # If convicted, sentence should be provided
        if 'disposition' in info.data and info.data['disposition'] == Disposition.CONVICTED:
            if not v or len(v.strip()) < 5:
                raise ValueError('Sentence details required for conviction')
        return v


class OutcomeUpdate(BaseModel):
    """Schema for updating case outcome."""
    disposition: Optional[Disposition] = Field(None, description="Updated disposition")
    sentence: Optional[str] = Field(None, description="Updated sentence details")
    restitution: Optional[Decimal] = Field(None, description="Updated restitution amount")
    notes: Optional[str] = Field(None, description="Updated notes")
    closed_at: Optional[datetime] = Field(None, description="Updated closure date")


class OutcomeResponse(OutcomeBase):
    """Schema for case outcome response data."""
    id: UUID
    case_id: UUID
    closed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID
    
    class Config:
        from_attributes = True


# ==================== PROSECUTION SUMMARY SCHEMAS ====================

class ProsecutionSummaryResponse(BaseModel):
    """Schema for comprehensive prosecution summary."""
    case_id: UUID
    total_charges: int = Field(..., description="Total number of charges filed")
    active_charges: int = Field(..., description="Number of active/filed charges")
    withdrawn_charges: int = Field(..., description="Number of withdrawn charges")
    total_court_sessions: int = Field(..., description="Total number of court sessions")
    upcoming_sessions: int = Field(..., description="Number of upcoming court sessions")
    case_outcome: Optional[OutcomeResponse] = Field(None, description="Final case outcome if available")
    latest_court_session: Optional[CourtSessionResponse] = Field(None, description="Most recent court session")
    charges: List[ChargeResponse] = Field([], description="List of all charges")
    court_sessions: List[CourtSessionResponse] = Field([], description="Recent court sessions (max 5)")
    
    class Config:
        from_attributes = True


# ==================== STATISTICS SCHEMAS ====================

class ChargeStatisticsResponse(BaseModel):
    """Schema for charge statistics and prosecution metrics."""
    total_charges: int = Field(..., description="Total number of charges in period")
    filed_charges: int = Field(..., description="Number of charges currently filed")
    withdrawn_charges: int = Field(..., description="Number of withdrawn charges")
    amended_charges: int = Field(..., description="Number of amended charges")
    total_outcomes: int = Field(..., description="Total number of case outcomes")
    convictions: int = Field(..., description="Number of convictions")
    conviction_rate: float = Field(..., description="Conviction rate as percentage")
    period_start: Optional[date] = Field(None, description="Statistics period start date")
    period_end: Optional[date] = Field(None, description="Statistics period end date")
    
    class Config:
        from_attributes = True


# ==================== PROSECUTION ACTIVITY SCHEMAS ====================

class ProsecutionActivityResponse(BaseModel):
    """Schema for prosecution activity tracking."""
    id: UUID
    case_id: UUID
    activity_type: str = Field(..., description="Type of prosecution activity")
    description: str = Field(..., description="Activity description")
    performed_by: UUID = Field(..., description="User who performed the activity")
    performed_at: datetime = Field(..., description="When the activity was performed")
    details: Optional[dict] = Field(None, description="Additional activity details")
    
    class Config:
        from_attributes = True


class CourtScheduleResponse(BaseModel):
    """Schema for court schedule overview."""
    case_id: UUID
    case_title: str
    case_number: str
    next_session_date: Optional[datetime]
    next_session_type: Optional[str]
    court: Optional[str]
    judge: Optional[str]
    days_until_session: Optional[int]
    total_sessions_scheduled: int
    
    class Config:
        from_attributes = True


class ProsecutionWorkloadResponse(BaseModel):
    """Schema for prosecutor workload analysis."""
    prosecutor_id: UUID
    prosecutor_name: str
    active_cases: int
    total_charges_filed: int
    upcoming_court_sessions: int
    pending_outcomes: int
    conviction_rate: float
    average_case_duration_days: Optional[float]
    
    class Config:
        from_attributes = True


# ==================== BULK OPERATION SCHEMAS ====================

class BulkChargeOperation(BaseModel):
    """Schema for bulk charge operations."""
    operation: str = Field(..., description="Operation type: withdraw, update_status")
    charge_ids: List[UUID] = Field(..., description="List of charge IDs to operate on")
    reason: Optional[str] = Field(None, description="Reason for bulk operation")
    new_status: Optional[ChargeStatus] = Field(None, description="New status for charges")
    
    @field_validator('charge_ids')
    @classmethod
    def validate_charge_ids(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one charge ID must be provided')
        if len(v) > 100:
            raise ValueError('Cannot process more than 100 charges at once')
        return v


class BulkOperationResult(BaseModel):
    """Schema for bulk operation results."""
    operation: str
    total_requested: int
    successful: int
    failed: int
    errors: List[str] = Field([], description="List of error messages")
    processed_ids: List[UUID] = Field([], description="Successfully processed item IDs")
    
    class Config:
        from_attributes = True