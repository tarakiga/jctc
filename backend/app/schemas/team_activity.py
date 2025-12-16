"""Pydantic schemas for team activity management."""

from datetime import datetime
from typing import Optional, List
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
    
    user_id: UUID = Field(..., description="User ID (creator) for the activity")
    attendee_ids: Optional[List[UUID]] = Field(default=[], description="List of attendee user IDs")


class TeamActivityUpdate(BaseModel):
    """Schema for updating a team activity."""
    
    activity_type: Optional[WorkActivity] = Field(None, description="Type of team activity")
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Activity title")
    description: Optional[str] = Field(None, description="Activity description")
    start_time: Optional[datetime] = Field(None, description="Activity start time")
    end_time: Optional[datetime] = Field(None, description="Activity end time")
    attendee_ids: Optional[List[UUID]] = Field(None, description="List of attendee user IDs")


# Simple user summary for attendee list
class UserSummary(BaseModel):
    """Simplified user info for attendee lists."""
    id: UUID
    full_name: str
    email: str
    
    class Config:
        from_attributes = True


class TeamActivityResponse(TeamActivityBase):
    """Schema for team activity response."""
    
    id: UUID = Field(..., description="Activity ID")
    user_id: UUID = Field(..., description="User ID (creator) for the activity")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    attendees: List[UserSummary] = Field(default=[], description="List of attendees")

    class Config:
        """Pydantic configuration."""
        from_attributes = True


class TeamActivityWithUser(TeamActivityResponse):
    """Schema for team activity with user (creator) information."""
    
    user_name: str = Field(..., description="Creator's full name")
    user_email: str = Field(..., description="Creator's email")
    user_work_activity: Optional[WorkActivity] = Field(None, description="Creator's current work activity")


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