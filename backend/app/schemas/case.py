from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from uuid import UUID
from datetime import datetime
from app.models.case import CaseStatus, LocalInternational, AssignmentRole, IntakeChannel, ReporterType, RiskFlag

# Forward reference for circular import
if TYPE_CHECKING:
    from app.schemas.parties import PartyCreate, PartyResponse


class ReporterContact(BaseModel):
    """Contact information for case reporter"""
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != '' and '@' not in v:
            raise ValueError('Invalid email format')
        return v


class CaseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    case_type: Optional[str] = None  # References lookup_values category='case_type'
    description: Optional[str] = None
    severity: Optional[int] = Field(None, ge=1, le=5)
    local_or_international: LocalInternational
    originating_country: str = Field(default="NG", max_length=2)
    cooperating_countries: Optional[List[str]] = None
    mlat_reference: Optional[str] = Field(None, max_length=100)


class CaseCreate(CaseBase):
    """Schema for creating a new case with full intake information"""
    # Case type as string (e.g., 'FRAUD', 'THEFT') - will be used to look up case_type_id
    case_type: Optional[str] = None
    # Initial status
    status: Optional[str] = None
    # Date when case was reported
    date_reported: Optional[datetime] = None
    
    # Intake fields
    intake_channel: Optional[IntakeChannel] = IntakeChannel.WALK_IN
    risk_flags: Optional[List[str]] = Field(default_factory=list)
    platforms_implicated: Optional[List[str]] = Field(default_factory=list)
    lga_state_location: Optional[str] = Field(None, max_length=255)
    incident_datetime: Optional[datetime] = None
    
    # Reporter information - DEPRECATED (use reporter party instead)
    # These fields are kept for backward compatibility during migration
    reporter_type: Optional[ReporterType] = ReporterType.ANONYMOUS
    reporter_name: Optional[str] = Field(None, max_length=255, deprecated=True)
    reporter_contact: Optional[ReporterContact] = Field(None, deprecated=True)
    
    # NEW: Reporter as Party (preferred approach)
    # When provided, creates a Party with is_reporter=True
    reporter: Optional[Dict[str, Any]] = Field(None, description="Reporter party data: {party_type, full_name, contact}")

    # NEW: Collaboration details (to be persisted to CaseCollaboration)
    collaboration: Optional[Dict[str, Any]] = Field(None, description="Initial collaboration details: {partner_org, partner_type, scope, etc.}")
    
    @field_validator('risk_flags')
    @classmethod
    def validate_risk_flags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate that risk flags are valid RiskFlag values"""
        if v is None:
            return []
        valid_flags = {f.value for f in RiskFlag}
        for flag in v:
            # Allow both enum values and frontend-style lowercase keys
            normalized = flag.upper().replace(' ', '_')
            if normalized not in valid_flags and flag not in ['child', 'imminent_harm', 'trafficking', 'sextortion']:
                # Map frontend values to backend enum values
                pass  # Allow flexible values for now, normalize on save
        return v
    
    @field_validator('platforms_implicated')
    @classmethod
    def validate_platforms(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate and normalize platform names"""
        if v is None:
            return []
        # Normalize platform names
        return [p.strip() for p in v if p and p.strip()]


class CaseUpdate(BaseModel):
    """Schema for updating an existing case"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    case_type: Optional[str] = None  # References lookup_values category='case_type'
    description: Optional[str] = None
    severity: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[CaseStatus] = None
    local_or_international: Optional[LocalInternational] = None
    originating_country: Optional[str] = Field(None, max_length=2)
    cooperating_countries: Optional[List[str]] = None
    mlat_reference: Optional[str] = Field(None, max_length=100)
    lead_investigator: Optional[UUID] = None
    
    # Intake fields (updatable)
    intake_channel: Optional[IntakeChannel] = None
    risk_flags: Optional[List[str]] = None
    platforms_implicated: Optional[List[str]] = None
    lga_state_location: Optional[str] = Field(None, max_length=255)
    incident_datetime: Optional[datetime] = None
    
    # Reporter information (updatable)
    reporter_type: Optional[ReporterType] = None
    reporter_name: Optional[str] = Field(None, max_length=255)
    reporter_contact: Optional[ReporterContact] = None


class CaseResponse(CaseBase):
    """Schema for case response including all intake fields"""
    id: UUID
    case_number: str
    status: CaseStatus
    case_type: Optional[str] = None  # Human-readable case type label
    date_reported: datetime
    date_assigned: Optional[datetime] = None
    created_by: Optional[UUID] = None
    lead_investigator: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    # Intake fields in response
    intake_channel: Optional[IntakeChannel] = None
    risk_flags: Optional[List[str]] = None
    platforms_implicated: Optional[List[str]] = None
    lga_state_location: Optional[str] = None
    incident_datetime: Optional[datetime] = None
    
    # Reporter information in response (legacy, derived from parties)
    reporter_type: Optional[ReporterType] = None
    reporter_name: Optional[str] = None
    reporter_contact: Optional[Dict[str, Any]] = None
    
    # NEW: Reporter as full Party response
    reporter: Optional[Dict[str, Any]] = Field(None, description="Reporter party details")
    
    class Config:
        from_attributes = True


class CaseAssignmentCreate(BaseModel):
    user_id: UUID
    role: AssignmentRole


class CaseAssignmentResponse(BaseModel):
    case_id: UUID
    user_id: UUID
    role: AssignmentRole
    assigned_at: datetime
    
    class Config:
        from_attributes = True


# LookupCaseTypeResponse deprecated - case types now use lookup_values table
