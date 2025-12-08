"""API endpoints for managing lookup values (admin only)."""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.database.base import get_db
from app.models.user import User, UserRole
from app.models.lookup_value import LookupValue, LOOKUP_CATEGORIES
from app.schemas.lookup_value import (
    LookupValueCreate,
    LookupValueUpdate,
    LookupValueResponse,
    LookupCategoryInfo,
    LookupCategoryResponse,
    LookupValueBulkUpdate,
    LookupValueUsageCheck
)
from app.utils.dependencies import get_current_active_user, require_role

router = APIRouter()


@router.get("/categories", response_model=List[LookupCategoryInfo])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """List all available lookup categories with counts."""
    categories = []
    
    for key, info in LOOKUP_CATEGORIES.items():
        # Get counts for this category
        result = await db.execute(
            select(
                func.count(LookupValue.id).label('total'),
                func.count(LookupValue.id).filter(LookupValue.is_active == True).label('active')
            ).where(LookupValue.category == key)
        )
        row = result.first()
        
        categories.append(LookupCategoryInfo(
            key=key,
            name=info["name"],
            description=info["description"],
            count=row.total if row else 0,
            active_count=row.active if row else 0
        ))
    
    return sorted(categories, key=lambda x: x.name)


@router.get("/categories/{category}", response_model=LookupCategoryResponse)
async def get_category_values(
    category: str,
    include_inactive: bool = Query(False, description="Include inactive values"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Get all values for a specific category."""
    if category not in LOOKUP_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category '{category}' not found"
        )
    
    query = select(LookupValue).where(LookupValue.category == category)
    
    if not include_inactive:
        query = query.where(LookupValue.is_active == True)
    
    query = query.order_by(LookupValue.sort_order, LookupValue.label)
    
    result = await db.execute(query)
    values = result.scalars().all()
    
    info = LOOKUP_CATEGORIES[category]
    return LookupCategoryResponse(
        key=category,
        name=info["name"],
        description=info["description"],
        values=[LookupValueResponse.model_validate(v) for v in values]
    )


@router.post("/values", response_model=LookupValueResponse, status_code=status.HTTP_201_CREATED)
async def create_lookup_value(
    data: LookupValueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Create a new lookup value."""
    if data.category not in LOOKUP_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{data.category}'"
        )
    
    # Check for duplicate value in category
    existing = await db.execute(
        select(LookupValue).where(
            and_(
                LookupValue.category == data.category,
                LookupValue.value == data.value.upper()
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Value '{data.value}' already exists in category '{data.category}'"
        )
    
    # Get max sort order
    max_order = await db.execute(
        select(func.max(LookupValue.sort_order)).where(
            LookupValue.category == data.category
        )
    )
    next_order = (max_order.scalar() or 0) + 1
    
    lookup_value = LookupValue(
        category=data.category,
        value=data.value.upper(),  # Normalize to uppercase
        label=data.label,
        description=data.description,
        is_active=data.is_active,
        sort_order=data.sort_order or next_order,
        color=data.color,
        icon=data.icon,
        is_system=False,  # User-created values are not system values
        created_by=current_user.id
    )
    
    db.add(lookup_value)
    await db.commit()
    await db.refresh(lookup_value)
    
    return LookupValueResponse.model_validate(lookup_value)


@router.get("/values/{value_id}", response_model=LookupValueResponse)
async def get_lookup_value(
    value_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Get a specific lookup value by ID."""
    result = await db.execute(
        select(LookupValue).where(LookupValue.id == value_id)
    )
    lookup_value = result.scalar_one_or_none()
    
    if not lookup_value:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lookup value not found"
        )
    
    return LookupValueResponse.model_validate(lookup_value)


@router.put("/values/{value_id}", response_model=LookupValueResponse)
async def update_lookup_value(
    value_id: UUID,
    data: LookupValueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Update a lookup value."""
    result = await db.execute(
        select(LookupValue).where(LookupValue.id == value_id)
    )
    lookup_value = result.scalar_one_or_none()
    
    if not lookup_value:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lookup value not found"
        )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lookup_value, field, value)
    
    lookup_value.updated_by = current_user.id
    lookup_value.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(lookup_value)
    
    return LookupValueResponse.model_validate(lookup_value)


@router.delete("/values/{value_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lookup_value(
    value_id: UUID,
    force: bool = Query(False, description="Force delete even if in use"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete a lookup value (deactivates system values)."""
    result = await db.execute(
        select(LookupValue).where(LookupValue.id == value_id)
    )
    lookup_value = result.scalar_one_or_none()
    
    if not lookup_value:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lookup value not found"
        )
    
    # System values can only be deactivated, not deleted
    if lookup_value.is_system:
        lookup_value.is_active = False
        lookup_value.updated_by = current_user.id
        lookup_value.updated_at = datetime.utcnow()
        await db.commit()
        return
    
    # TODO: Check if value is in use before deleting (optional with force=True)
    
    await db.delete(lookup_value)
    await db.commit()


@router.post("/values/bulk-update", response_model=List[LookupValueResponse])
async def bulk_update_values(
    data: LookupValueBulkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Bulk update multiple lookup values."""
    result = await db.execute(
        select(LookupValue).where(LookupValue.id.in_(data.ids))
    )
    values = result.scalars().all()
    
    if len(values) != len(data.ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some lookup values not found"
        )
    
    for value in values:
        if data.is_active is not None:
            value.is_active = data.is_active
        value.updated_by = current_user.id
        value.updated_at = datetime.utcnow()
    
    await db.commit()
    
    # Refresh all values
    for value in values:
        await db.refresh(value)
    
    return [LookupValueResponse.model_validate(v) for v in values]


@router.post("/values/reorder")
async def reorder_values(
    category: str,
    value_ids: List[UUID],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Reorder values within a category."""
    if category not in LOOKUP_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'"
        )
    
    for i, value_id in enumerate(value_ids):
        result = await db.execute(
            select(LookupValue).where(
                and_(
                    LookupValue.id == value_id,
                    LookupValue.category == category
                )
            )
        )
        value = result.scalar_one_or_none()
        if value:
            value.sort_order = i
            value.updated_by = current_user.id
            value.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Values reordered successfully"}


@router.get("/dropdown/{category}", response_model=List[LookupValueResponse])
async def get_dropdown_values(
    category: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get active values for dropdown use (any authenticated user)."""
    if category not in LOOKUP_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category '{category}' not found"
        )
    
    result = await db.execute(
        select(LookupValue).where(
            and_(
                LookupValue.category == category,
                LookupValue.is_active == True
            )
        ).order_by(LookupValue.sort_order, LookupValue.label)
    )
    values = result.scalars().all()
    
    return [LookupValueResponse.model_validate(v) for v in values]
