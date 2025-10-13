from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.case import CaseStatus, LocalInternational, AssignmentRole


class CaseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    case_type_id: Optional[UUID] = None
    description: Optional[str] = None
    severity: Optional[int] = Field(None, ge=1, le=5)
    local_or_international: LocalInternational
    originating_country: str = Field(default="NG", max_length=2)
    cooperating_countries: Optional[List[str]] = None
    mlat_reference: Optional[str] = Field(None, max_length=100)


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    case_type_id: Optional[UUID] = None
    description: Optional[str] = None
    severity: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[CaseStatus] = None
    local_or_international: Optional[LocalInternational] = None
    originating_country: Optional[str] = Field(None, max_length=2)
    cooperating_countries: Optional[List[str]] = None
    mlat_reference: Optional[str] = Field(None, max_length=100)
    lead_investigator: Optional[UUID] = None


class CaseResponse(CaseBase):
    id: UUID
    case_number: str
    status: CaseStatus
    date_reported: datetime
    date_assigned: Optional[datetime] = None
    created_by: Optional[UUID] = None
    lead_investigator: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
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


class LookupCaseTypeResponse(BaseModel):
    id: UUID
    code: str
    label: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True
