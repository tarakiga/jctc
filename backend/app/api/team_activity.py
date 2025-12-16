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


def normalize_activity_type(activity_type):
    """Normalize activity_type to uppercase for Pydantic enum compatibility."""
    if activity_type is None:
        return None
    if isinstance(activity_type, str):
        return activity_type.upper()
    # If it's already an enum, get the value
    if hasattr(activity_type, 'value'):
        return activity_type.value.upper()
    return str(activity_type).upper()


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
    
    # Import for response building
    from app.schemas.team_activity import UserSummary
    from sqlalchemy.orm import selectinload
    
    # Build response with user info if requested
    items = []
    for activity in activities:
        # Load attendees for this activity
        activity_query = select(TeamActivity).options(selectinload(TeamActivity.attendees)).filter(TeamActivity.id == activity.id)
        activity_result = await db.execute(activity_query)
        activity_with_attendees = activity_result.scalar_one()
        
        attendees_response = [
            UserSummary(id=u.id, full_name=u.full_name, email=u.email) 
            for u in activity_with_attendees.attendees
        ]
        
        if include_user_info:
            user_result = await db.execute(select(User).filter(User.id == activity.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                activity_with_user = TeamActivityWithUser(
                    id=activity.id,
                    user_id=activity.user_id,
                    activity_type=normalize_activity_type(activity.activity_type),
                    title=activity.title,
                    description=activity.description,
                    start_time=activity.start_time,
                    end_time=activity.end_time,
                    created_at=activity.created_at,
                    updated_at=activity.updated_at,
                    user_name=user.full_name,
                    user_email=user.email,
                    user_work_activity=user.work_activity,
                    attendees=attendees_response
                )
                items.append(activity_with_user)
        else:
            items.append(TeamActivityResponse(
                id=activity.id,
                user_id=activity.user_id,
                activity_type=normalize_activity_type(activity.activity_type),
                title=activity.title,
                description=activity.description,
                start_time=activity.start_time,
                end_time=activity.end_time,
                created_at=activity.created_at,
                updated_at=activity.updated_at,
                attendees=attendees_response
            ))
    
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
    
    # Verify creator user exists
    result = await db.execute(select(User).filter(User.id == activity.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Convert timezone-aware datetimes to naive (UTC) for database storage
    start_time = activity.start_time
    end_time = activity.end_time
    
    if start_time.tzinfo is not None:
        start_time = start_time.replace(tzinfo=None)
    if end_time.tzinfo is not None:
        end_time = end_time.replace(tzinfo=None)
    
    # Create activity
    db_activity = TeamActivity(
        user_id=activity.user_id,
        activity_type=activity.activity_type,
        title=activity.title,
        description=activity.description,
        start_time=start_time,
        end_time=end_time
    )
    
    db.add(db_activity)
    await db.flush()  # Get ID before adding attendees
    
    # Add attendees if provided - use explicit INSERT to avoid async relationship issues
    attendee_users = []
    if activity.attendee_ids:
        from app.models.user import team_activity_attendees
        
        for attendee_id in activity.attendee_ids:
            # Verify attendee exists
            attendee_result = await db.execute(select(User).filter(User.id == attendee_id))
            attendee = attendee_result.scalar_one_or_none()
            if attendee:
                # Insert into association table directly
                await db.execute(
                    team_activity_attendees.insert().values(
                        activity_id=db_activity.id,
                        user_id=attendee_id
                    )
                )
                attendee_users.append(attendee)
    
    await db.commit()
    await db.refresh(db_activity)
    
    # Build response with attendees
    # Build response with attendees
    from app.schemas.team_activity import UserSummary
    attendees_response = [
        UserSummary(id=u.id, full_name=u.full_name, email=u.email) 
        for u in attendee_users
    ]
    
    # Send Calendar Invitations (Async, non-blocking for response)
    try:
        if attendee_users:
            from app.services.email_service import EmailService
            email_service = EmailService(db)
            
            # Format times (Assuming UTC in DB, converting to friendly string)
            # Ideally this should be localized to user's timezone, but defaulting to sensible format
            start_str = db_activity.start_time.strftime("%A, %B %d, %Y at %I:%M %p")
            end_str = db_activity.end_time.strftime("%I:%M %p")
            
            for attendee in attendee_users:
                if not attendee.email:
                    continue
                
                # We await here, but in a production scaled app this should be a background task (Celery/RQ)
                await email_service.send_templated_email(
                    to_emails=[attendee.email],
                    template_key="calendar_invite",
                    variables={
                        "title": db_activity.title,
                        "start_time": start_str,
                        "end_time": end_str,
                        "location": "JCTC HQ",  # TODO: Add location field to model
                        "description": db_activity.description or "No description provided.",
                        "organizer": current_user.full_name or current_user.email,
                    }
                )
    except Exception as e:
        # Log error but don't fail the request
        print(f"Failed to send calendar invitations: {str(e)}")
    
    return TeamActivityResponse(
        id=db_activity.id,
        user_id=db_activity.user_id,
        activity_type=db_activity.activity_type,
        title=db_activity.title,
        description=db_activity.description,
        start_time=db_activity.start_time,
        end_time=db_activity.end_time,
        created_at=db_activity.created_at,
        updated_at=db_activity.updated_at,
        attendees=attendees_response
    )


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
    
    # Import selectinload and association table
    from sqlalchemy.orm import selectinload
    from app.models.user import team_activity_attendees
    
    # Load activity WITH PRE-EXISTING ATTENDEES (to calc diff)
    result = await db.execute(
        select(TeamActivity)
        .options(selectinload(TeamActivity.attendees))
        .filter(TeamActivity.id == activity_id)
    )
    db_activity = result.scalar_one_or_none()
    
    if not db_activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team activity not found"
        )
    
    # Update fields if provided
    update_data = activity.dict(exclude_unset=True)
    new_attendee_ids = update_data.pop('attendee_ids', None) # Remove from dict to handle separately
    
    # Strip timezone info from datetime fields (DB uses TIMESTAMP WITHOUT TIME ZONE)
    if 'start_time' in update_data and update_data['start_time'] is not None:
        if update_data['start_time'].tzinfo is not None:
            update_data['start_time'] = update_data['start_time'].replace(tzinfo=None)
    if 'end_time' in update_data and update_data['end_time'] is not None:
        if update_data['end_time'].tzinfo is not None:
            update_data['end_time'] = update_data['end_time'].replace(tzinfo=None)
    
    for field, value in update_data.items():
        setattr(db_activity, field, value)
    
    db_activity.updated_at = datetime.utcnow()
    
    # Handle Attendees Update
    newly_added_attendees = []
    
    if new_attendee_ids is not None:
        # Get current attendee IDs
        current_attendee_ids = {u.id for u in db_activity.attendees}
        target_attendee_ids = set(new_attendee_ids)
        
        ids_to_add = target_attendee_ids - current_attendee_ids
        ids_to_remove = current_attendee_ids - target_attendee_ids
        
        # Remove old attendees
        if ids_to_remove:
            await db.execute(
                team_activity_attendees.delete().where(
                    and_(
                        team_activity_attendees.c.activity_id == activity_id,
                        team_activity_attendees.c.user_id.in_(ids_to_remove)
                    )
                )
            )
        
        # Add new attendees
        if ids_to_add:
            # Verify they exist and fetch objects (for response & email)
            res = await db.execute(select(User).filter(User.id.in_(ids_to_add)))
            users_to_add = res.scalars().all()
            
            for user_to_add in users_to_add:
                # Insert implementation
                await db.execute(
                    team_activity_attendees.insert().values(
                        activity_id=activity_id,
                        user_id=user_to_add.id
                    )
                )
                newly_added_attendees.append(user_to_add)
    
    await db.commit()
    
    # Expire attendees relationship so it reloads on next access (expire is synchronous)
    db.expire(db_activity, ['attendees'])
    await db.refresh(db_activity)
    
    # Send Emails to NEW Attendees
    if newly_added_attendees:
        try:
            from app.services.email_service import EmailService
            email_service = EmailService(db)
            
            # Use same formatting as create
            start_str = db_activity.start_time.strftime("%A, %B %d, %Y at %I:%M %p")
            end_str = db_activity.end_time.strftime("%I:%M %p")
            
            for attendee in newly_added_attendees:
                if not attendee.email:
                    continue
                    
                await email_service.send_templated_email(
                    to_emails=[attendee.email],
                    template_key="calendar_invite",
                    variables={
                        "title": db_activity.title,
                        "start_time": start_str,
                        "end_time": end_str,
                        "location": "JCTC HQ", 
                        "description": db_activity.description or "No description provided.",
                        "organizer": current_user.full_name or current_user.email,
                    }
                )
        except Exception as e:
            print(f"Failed to send update invitations: {str(e)}")
            # Do not fail request
    
    # Manually construct response or rely on from_orm to trigger lazy load (which works because we refreshed)
    # But from_orm expects 'attendees' to be populated. Since we expired/refreshed, accessing .attendees should trigger selectin/lazy load.
    # CAUTION: In async, accessing lazy loaded relationship requires loop if strict lazy. 
    # But we used selectinload earlier on the SAME object? No, we expired it.
    # To be safe, let's just return what from_orm needs, which might trigger implicit IO?
    # No, Pydantic from_orm checks attributes. If attribute is not loaded, SQLAlchemy might raise MissingGreenlet if lazy loading in async context without await.
    # SOLUTION: Use selectinload in a fresh query or handle response manually.
    
    # Re-fetch completely to be safe and ensure clean state for response
    final_result = await db.execute(
        select(TeamActivity)
        .options(selectinload(TeamActivity.attendees))
        .filter(TeamActivity.id == activity_id)
    )
    final_activity = final_result.scalar_one()

    # Re-map attendees to UserSummary schema format manually to avoid any ambiguity
    from app.schemas.team_activity import UserSummary
    attendees_response = [
        UserSummary(id=u.id, full_name=u.full_name, email=u.email) 
        for u in final_activity.attendees
    ]

    return TeamActivityResponse(
        id=final_activity.id,
        user_id=final_activity.user_id,
        activity_type=final_activity.activity_type,
        title=final_activity.title,
        description=final_activity.description,
        start_time=final_activity.start_time,
        end_time=final_activity.end_time,
        created_at=final_activity.created_at,
        updated_at=final_activity.updated_at,
        attendees=attendees_response
    )


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