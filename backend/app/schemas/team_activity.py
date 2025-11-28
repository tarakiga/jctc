"""Pydantic schemas for team activity management."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.user import WorkActivity


class TeamActivityBase(BaseModel):
    """Base schema for team activity."""
    
    activity_type: WorkActivity = Field(..., description="Type of team activity")
    title: str = Field(..., min_length=1, max_length=255, description="Activity title")
    description: Optional[str] = Field(None, description="Activity description")
    start_time: datetime = Field(..., description="Activity start time")
    end_time: datetime = Field(..., description="Activity end time")


class TeamActivityCreate(TeamActivityBase):
    """Schema for creating a team activity."""
    
    user_id: UUID = Field(..., description="User ID for the activity")


class TeamActivityUpdate(BaseModel):
    """Schema for updating a team activity."""
    
    activity_type: Optional[WorkActivity] = Field(None, description="Type of team activity")
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Activity title")
    description: Optional[str] = Field(None, description="Activity description")
    start_time: Optional[datetime] = Field(None, description="Activity start time")
    end_time: Optional[datetime] = Field(None, description="Activity end time")


class TeamActivityResponse(TeamActivityBase):
    """Schema for team activity response."""
    
    id: UUID = Field(..., description="Activity ID")
    user_id: UUID = Field(..., description="User ID for the activity")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        """Pydantic configuration."""
        from_attributes = True


class TeamActivityWithUser(TeamActivityResponse):
    """Schema for team activity with user information."""
    
    user_name: str = Field(..., description="User full name")
    user_email: str = Field(..., description="User email")
    user_work_activity: Optional[WorkActivity] = Field(None, description="User's current work activity")


class TeamActivityFilter(BaseModel):
    """Schema for filtering team activities."""
    
    user_id: Optional[UUID] = Field(None, description="Filter by user ID")
    activity_type: Optional[WorkActivity] = Field(None, description="Filter by activity type")
    start_date: Optional[datetime] = Field(None, description="Filter activities starting after this date")
    end_date: Optional[datetime] = Field(None, description="Filter activities ending before this date")
    include_user_info: bool = Field(True, description="Include user information in response")


class TeamActivityList(BaseModel):
    """Schema for team activity list response."""
    
    items: list[TeamActivityWithUser] = Field(..., description="List of team activities")
    total: int = Field(..., description="Total number of activities")
    page: int = Field(1, description="Current page number")
    size: int = Field(50, description="Page size")
    pages: int = Field(..., description="Total number of pages")