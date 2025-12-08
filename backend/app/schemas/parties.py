"""Pydantic schemas for Party API."""

from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class PartyType(str, Enum):
    SUSPECT = "SUSPECT"
    VICTIM = "VICTIM"
    WITNESS = "WITNESS"
    COMPLAINANT = "COMPLAINANT"


class PartyBase(BaseModel):
    """Base schema for party."""
    party_type: PartyType = Field(..., description="Type of party")
    full_name: Optional[str] = Field(None, max_length=255)
    alias: Optional[str] = Field(None, max_length=255)
    national_id: Optional[str] = Field(None, max_length=50)
    dob: Optional[date] = Field(None, description="Date of birth")
    nationality: Optional[str] = Field(None, max_length=2, description="ISO country code")
    gender: Optional[str] = Field(None, max_length=20)
    contact: Optional[Dict[str, Any]] = Field(None, description="Contact info: {phone, email, address}")
    notes: Optional[str] = None
    
    # Guardian contact for minors (victims under 18)
    guardian_contact: Optional[Dict[str, Any]] = Field(None, description="Guardian contact info: {name, phone, email, relationship}")
    
    # Safeguarding flags for victims
    safeguarding_flags: Optional[List[str]] = Field(None, description="Safeguarding needs: medical, shelter, counselling, legal-aid")
    
    class Config:
        populate_by_name = True


class PartyCreate(PartyBase):
    """Schema for creating a party."""
    case_id: UUID = Field(..., description="Case ID the party belongs to")


class PartyUpdate(BaseModel):
    """Schema for updating a party."""
    party_type: Optional[PartyType] = None
    full_name: Optional[str] = None
    alias: Optional[str] = None
    national_id: Optional[str] = None
    dob: Optional[date] = None
    nationality: Optional[str] = None
    gender: Optional[str] = None
    contact: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    guardian_contact: Optional[Dict[str, Any]] = None
    safeguarding_flags: Optional[List[str]] = None
    
    class Config:
        populate_by_name = True


class PartyResponse(PartyBase):
    """Schema for party response."""
    id: UUID
    case_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True


class CaseSummary(BaseModel):
    """Summary of a case for party association."""
    id: UUID
    case_number: str
    title: str
    status: str
    
    class Config:
        from_attributes = True


class PartyWithCases(PartyResponse):
    """Party with associated cases."""
    cases: List[CaseSummary] = []


class PartySearchResponse(BaseModel):
    """Search result for party."""
    id: UUID
    party_type: PartyType
    full_name: Optional[str] = None
    alias: Optional[str] = None
    national_id: Optional[str] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True
