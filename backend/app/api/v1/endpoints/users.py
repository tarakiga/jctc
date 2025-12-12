from typing import List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.base import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserStatsResponse
from app.utils.auth import get_password_hash
from app.utils.dependencies import get_current_active_user, require_admin, require_supervisor_or_admin

router = APIRouter()

@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new user (Admin only)."""
    # Check if user already exists
    result = await db.execute(select(User).filter(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        org_unit=user_data.org_unit,
        is_active=user_data.is_active,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    return db_user

@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_supervisor_or_admin)
):
    """Get user statistics."""
    # Total users
    total = await db.execute(select(func.count(User.id)))
    total_users = total.scalar() or 0
    
    # Active users
    active = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    active_users = active.scalar() or 0
    
    # By Role
    # Validating if we can group by enum
    roles_result = await db.execute(select(User.role, func.count(User.id)).group_by(User.role))
    users_by_role = {str(role): count for role, count in roles_result.all()}
    
    # New users this month
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    new_users = await db.execute(select(func.count(User.id)).where(User.created_at >= start_of_month))
    new_users_this_month = new_users.scalar() or 0
    
    # Last month comparison (simple logic: just count prev month)
    # Simplified for now: just return 0 or mock
    last_month_comparison = 0 
    
    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        users_by_role=users_by_role,
        new_users_this_month=new_users_this_month,
        last_month_comparison=last_month_comparison
    )

@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role: UserRole = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_supervisor_or_admin)
):
    """List users with optional filtering."""
    query = select(User)
    
    if active_only:
        query = query.filter(User.is_active == True)
    
    if role:
        query = query.filter(User.role == role)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user by ID."""
    # Users can view their own profile, supervisors/admins can view any
    if user_id != current_user.id and current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user"
        )
    
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update user."""
    # Users can update their own profile (limited fields), admins can update any
    if user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
    
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # If user is updating their own profile, restrict certain fields
    if user_id == current_user.id and current_user.role != UserRole.ADMIN:
        # Users can only update their name and org_unit
        if user_update.role is not None or user_update.is_active is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify role or active status"
            )
    
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    return user

@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete user permanently (Admin only)."""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Cannot delete yourself
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Hard delete the user
    await db.delete(user)
    await db.commit()
    
    return {"message": "User deleted successfully"}