"""Pydantic schemas for LookupValue API."""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class LookupValueBase(BaseModel):
    """Base schema for lookup values."""
    value: str = Field(..., min_length=1, max_length=100, description="The enum value")
    label: str = Field(..., min_length=1, max_length=255, description="Display label")
    description: Optional[str] = Field(None, description="Optional description")
    is_active: bool = Field(True, description="Whether value is active")
    sort_order: int = Field(0, description="Display order")
    color: Optional[str] = Field(None, max_length=7, description="Badge color (hex)")
    icon: Optional[str] = Field(None, max_length=50, description="Icon name")


class LookupValueCreate(LookupValueBase):
    """Schema for creating a lookup value."""
    category: str = Field(..., min_length=1, max_length=100, description="Category key")


class LookupValueUpdate(BaseModel):
    """Schema for updating a lookup value."""
    label: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    color: Optional[str] = Field(None, max_length=7)
    icon: Optional[str] = Field(None, max_length=50)


class LookupValueResponse(LookupValueBase):
    """Schema for lookup value response."""
    id: UUID
    category: str
    is_system: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    
    class Config:
        from_attributes = True


class LookupCategoryInfo(BaseModel):
    """Schema for category information."""
    key: str
    name: str
    description: str
    count: int = 0
    active_count: int = 0


class LookupCategoryResponse(BaseModel):
    """Schema for category with its values."""
    key: str
    name: str
    description: str
    values: List[LookupValueResponse]


class LookupValueBulkUpdate(BaseModel):
    """Schema for bulk updating lookup values."""
    ids: List[UUID]
    is_active: Optional[bool] = None
    

class LookupValueUsageCheck(BaseModel):
    """Schema for checking if a value is in use."""
    value_id: UUID
    is_in_use: bool
    usage_count: int
    usage_details: List[str] = []
