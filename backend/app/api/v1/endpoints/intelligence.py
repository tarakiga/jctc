from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.database.base import get_db
from app.models.intelligence import IntelligenceRecord, IntelCategory, IntelStatus, IntelPriority, IntelligenceCaseLink
from app.models.user import User, UserRole
from app.schemas.intelligence import IntelRecord, IntelRecordCreate, IntelRecordUpdate, IntelRecordList
from app.utils.dependencies import get_current_active_user

router = APIRouter()

@router.get("/", response_model=IntelRecordList)
async def list_intelligence(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    category: Optional[IntelCategory] = None,
    status_filter: Optional[IntelStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List intelligence records with filtering."""
    query = select(IntelligenceRecord).options(
        selectinload(IntelligenceRecord.author),
        selectinload(IntelligenceRecord.tags),
        selectinload(IntelligenceRecord.attachments),
        selectinload(IntelligenceRecord.case_links)
    )
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                IntelligenceRecord.title.ilike(search_term),
                IntelligenceRecord.description.ilike(search_term),
                IntelligenceRecord.source.ilike(search_term)
            )
        )
    
    if category:
        query = query.filter(IntelligenceRecord.category == category)
        
    if status_filter:
        query = query.filter(IntelligenceRecord.status == status_filter)
        
    # Confidentiality check: 
    # If user is not supervisor/admin, they might need specific access? 
    # For now, we assume all active users can view, but frontend hides sensitive details if needed?
    # Or strict: Only supervisors see confidential?
    # Let's enforce: If confidential, only show to Author or Supervisor/Admin? 
    # Plan said "Confidential records require elevated permissions".
    # Implementation:
    if current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INVESTIGATOR]:
         # Restrict confidential rows? Or just filter them out?
         # Filtering out is safer.
         query = query.filter(
             or_(
                 IntelligenceRecord.is_confidential == False,
                 IntelligenceRecord.author_id == current_user.id
             )
         )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.execute(count_query)
    total_count = total.scalar() or 0

    # Paginate
    query = query.order_by(IntelligenceRecord.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    
    # Map author_name if needed
    for item in items:
        if item.author:
            item.author_name = item.author.full_name
            
    return IntelRecordList(total=total_count, items=items)


@router.post("/", response_model=IntelRecord)
async def create_intelligence(
    record_in: IntelRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new intelligence record."""
    
    db_record = IntelligenceRecord(
        title=record_in.title,
        description=record_in.description,
        source=record_in.source,
        category=record_in.category,
        priority=record_in.priority,
        status=record_in.status,
        is_confidential=record_in.is_confidential,
        author_id=current_user.id
    )
    
    # Handle tags later or now? Schema says tags: List[str]
    # We need to create Tag objects
    from app.models.intelligence import IntelligenceTag
    
    for tag_str in record_in.tags:
        tag_obj = IntelligenceTag(tag=tag_str)
        db_record.tags.append(tag_obj)
        
    db.add(db_record)
    await db.commit()
    await db.refresh(db_record)
    
    # Re-fetch with relations to ensure response model works
    query = select(IntelligenceRecord).where(IntelligenceRecord.id == db_record.id).options(
        selectinload(IntelligenceRecord.author),
        selectinload(IntelligenceRecord.tags),
        selectinload(IntelligenceRecord.attachments),
        selectinload(IntelligenceRecord.case_links)
    )
    result = await db.execute(query)
    record = result.scalar_one()
    if record.author:
        record.author_name = record.author.full_name
        
    return record


@router.get("/{id}", response_model=IntelRecord)
async def get_intelligence(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get basic intelligence details."""
    query = select(IntelligenceRecord).where(IntelligenceRecord.id == id).options(
        selectinload(IntelligenceRecord.author),
        selectinload(IntelligenceRecord.tags),
        selectinload(IntelligenceRecord.attachments),
        selectinload(IntelligenceRecord.case_links) # This gives objects, but schema expects structure
    )
    result = await db.execute(query)
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Intelligence record not found")
        
    # Access control
    if record.is_confidential:
         if current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INVESTIGATOR] and record.author_id != current_user.id:
              raise HTTPException(status_code=403, detail="Not authorized to view confidential record")

    if record.author:
        record.author_name = record.author.full_name
        
    return record


@router.put("/{id}", response_model=IntelRecord)
async def update_intelligence(
    id: UUID,
    record_in: IntelRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update intelligence record."""
    query = select(IntelligenceRecord).where(IntelligenceRecord.id == id).options(
        selectinload(IntelligenceRecord.tags)
    )
    result = await db.execute(query)
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Intelligence record not found")
        
    # Access: Author or Supervisor+
    if record.author_id != current_user.id and current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this record")
        
    update_data = record_in.model_dump(exclude_unset=True)
    
    # Handle tags specially if present
    tags_in = update_data.pop('tags', None)
    
    for field, value in update_data.items():
        setattr(record, field, value)
        
    if tags_in is not None:
        # Clear existing
        # record.tags = [] # This might not work with cascade perfectly if not flushed?
        # Direct list replacement works in SQLAlchemy normally
        from app.models.intelligence import IntelligenceTag
        record.tags = [IntelligenceTag(tag=t) for t in tags_in]
        
    await db.commit()
    await db.refresh(record)
    
    # Refetch for response
    query_refresh = select(IntelligenceRecord).where(IntelligenceRecord.id == id).options(
        selectinload(IntelligenceRecord.author),
        selectinload(IntelligenceRecord.tags),
        selectinload(IntelligenceRecord.attachments),
        selectinload(IntelligenceRecord.case_links)
    )
    result_refresh = await db.execute(query_refresh)
    updated_record = result_refresh.scalar_one()
    if updated_record.author:
        updated_record.author_name = updated_record.author.full_name
        
    return updated_record


@router.delete("/{id}")
async def delete_intelligence(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete intelligence record."""
    result = await db.execute(select(IntelligenceRecord).where(IntelligenceRecord.id == id))
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(status_code=404, detail="Intelligence record not found")
    
    # Access: Supervisor or Admin ONLY? Or Author?
    # Usually delete is restricted.
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPERVISOR]:
         if record.author_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this record")
    
    await db.delete(record)
    await db.commit()
    
    return {"message": "Record deleted successfully"}


@router.post("/{id}/link-case", response_model=dict)
async def link_case(
    id: UUID,
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Link an intelligence record to a case."""
    # check record
    result = await db.execute(select(IntelligenceRecord).where(IntelligenceRecord.id == id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
        
    # check exists
    existing = await db.execute(select(IntelligenceCaseLink).where(
        IntelligenceCaseLink.record_id == id,
        IntelligenceCaseLink.case_id == case_id
    ))
    if existing.scalar_one_or_none():
        return {"message": "Already linked"}
        
    link = IntelligenceCaseLink(record_id=id, case_id=case_id)
    db.add(link)
    await db.commit()
    
    return {"message": "Linked successfully"}
