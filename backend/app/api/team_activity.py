"""Team Activity API endpoints."""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, select, func

from app.database import get_db
from app.models.user import User, TeamActivity, WorkActivity, UserRole
from app.schemas.team_activity import (
    TeamActivityCreate,
    TeamActivityUpdate,
    TeamActivityResponse,
    TeamActivityWithUser,
    TeamActivityFilter,
    TeamActivityList
)
from app.core.deps import get_current_user
from app.utils.dependencies import require_role

router = APIRouter()


@router.get("/", response_model=TeamActivityList)
async def list_team_activities(
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[UUID] = None,
    activity_type: Optional[WorkActivity] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    include_user_info: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List team activities with optional filtering."""
    
    query = select(TeamActivity)
    
    # Parse date strings to datetime
    parsed_start_date = None
    parsed_end_date = None
    if start_date:
        try:
            parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except ValueError:
            # Try parsing as date only
            from datetime import date
            parsed_start_date = datetime.combine(date.fromisoformat(start_date), datetime.min.time())
    if end_date:
        try:
            parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            # Try parsing as date only
            from datetime import date
            parsed_end_date = datetime.combine(date.fromisoformat(end_date), datetime.max.time())
    
    # Apply filters
    if user_id:
        query = query.filter(TeamActivity.user_id == user_id)
    if activity_type:
        query = query.filter(TeamActivity.activity_type == activity_type)
    if parsed_start_date:
        query = query.filter(TeamActivity.start_time >= parsed_start_date)
    if parsed_end_date:
        query = query.filter(TeamActivity.end_time <= parsed_end_date)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    activities = result.scalars().all()
    
    # Build response with user info if requested
    items = []
    for activity in activities:
        if include_user_info:
            user_result = await db.execute(select(User).filter(User.id == activity.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                activity_with_user = TeamActivityWithUser(
                    id=activity.id,
                    user_id=activity.user_id,
                    activity_type=activity.activity_type,
                    title=activity.title,
                    description=activity.description,
                    start_time=activity.start_time,
                    end_time=activity.end_time,
                    created_at=activity.created_at,
                    updated_at=activity.updated_at,
                    user_name=user.full_name,
                    user_email=user.email,
                    user_work_activity=user.work_activity
                )
                items.append(activity_with_user)
        else:
            items.append(TeamActivityResponse.from_orm(activity))
    
    return TeamActivityList(
        items=items,
        total=total,
        page=(skip // limit) + 1,
        size=limit,
        pages=(total + limit - 1) // limit
    )


# Export router for use in main API
__all__ = ["router"]


@router.post("/", response_model=TeamActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_team_activity(
    activity: TeamActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Create a new team activity (admin only)."""
    
    # Verify user exists
    result = await db.execute(select(User).filter(User.id == activity.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create activity
    db_activity = TeamActivity(
        user_id=activity.user_id,
        activity_type=activity.activity_type,
        title=activity.title,
        description=activity.description,
        start_time=activity.start_time,
        end_time=activity.end_time
    )
    
    db.add(db_activity)
    await db.commit()
    await db.refresh(db_activity)
    
    return TeamActivityResponse.from_orm(db_activity)


@router.get("/{activity_id}", response_model=TeamActivityWithUser)
async def get_team_activity(
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific team activity by ID."""
    
    result = await db.execute(select(TeamActivity).filter(TeamActivity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team activity not found"
        )
    
    # Get user info
    result = await db.execute(select(User).filter(User.id == activity.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found for this activity"
        )
    
    return TeamActivityWithUser(
        id=activity.id,
        user_id=activity.user_id,
        activity_type=activity.activity_type,
        title=activity.title,
        description=activity.description,
        start_time=activity.start_time,
        end_time=activity.end_time,
        created_at=activity.created_at,
        updated_at=activity.updated_at,
        user_name=user.full_name if user.full_name else user.email,
        user_email=user.email,
        user_work_activity=user.work_activity
    )


@router.put("/{activity_id}", response_model=TeamActivityResponse)
async def update_team_activity(
    activity_id: UUID,
    activity: TeamActivityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Update a team activity (admin only)."""
    
    result = await db.execute(select(TeamActivity).filter(TeamActivity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team activity not found"
        )
    
    # Update fields if provided
    update_data = activity.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(activity, field, value)
    
    activity.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(activity)
    
    return TeamActivityResponse.from_orm(activity)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team_activity(
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete a team activity (admin only)."""
    
    result = await db.execute(select(TeamActivity).filter(TeamActivity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team activity not found"
        )
    
    await db.delete(activity)
    await db.commit()


@router.get("/users/{user_id}/activities", response_model=TeamActivityList)
async def list_user_activities(
    user_id: UUID,
    skip: int = 0,
    limit: int = 50,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List activities for a specific user."""
    
    # Verify user exists
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    query = select(TeamActivity).filter(TeamActivity.user_id == user_id)
    
    # Parse date strings to datetime
    if start_date:
        try:
            parsed_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except ValueError:
            from datetime import date
            parsed_start = datetime.combine(date.fromisoformat(start_date), datetime.min.time())
        query = query.filter(TeamActivity.start_time >= parsed_start)
    if end_date:
        try:
            parsed_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            from datetime import date
            parsed_end = datetime.combine(date.fromisoformat(end_date), datetime.max.time())
        query = query.filter(TeamActivity.end_time <= parsed_end)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    activities = result.scalars().all()
    
    items = []
    for activity in activities:
        items.append(TeamActivityWithUser(
            id=activity.id,
            user_id=activity.user_id,
            activity_type=activity.activity_type,
            title=activity.title,
            description=activity.description,
            start_time=activity.start_time,
            end_time=activity.end_time,
            created_at=activity.created_at,
            updated_at=activity.updated_at,
            user_name=user.full_name if user.full_name else user.email,
            user_email=user.email,
            user_work_activity=user.work_activity
        ))
    
    return TeamActivityList(
        items=items,
        total=total,
        page=(skip // limit) + 1,
        size=limit,
        pages=(total + limit - 1) // limit
    )