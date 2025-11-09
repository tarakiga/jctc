from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from app.database.base import get_db
from app.models.evidence import EvidenceItem
from app.models.case import Case
from app.schemas.evidence import EvidenceResponse, EvidenceListResponse
from app.utils.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=EvidenceListResponse)
async def list_evidence(
    search: Optional[str] = Query(None, description="Search by evidence number or description"),
    type: Optional[str] = Query(None, description="Filter by evidence type"),
    chain_of_custody_status: Optional[str] = Query(None, description="Filter by chain of custody status"),
    case_id: Optional[str] = Query(None, description="Filter by case ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all evidence items with optional filters"""
    
    # Build query with eager loading of relationships
    query = select(EvidenceItem).options(
        selectinload(EvidenceItem.case),
        selectinload(EvidenceItem.chain_entries)
    )
    
    # Apply filters
    filters = []
    if search:
        filters.append(
            or_(
                EvidenceItem.label.ilike(f"%{search}%"),
                EvidenceItem.notes.ilike(f"%{search}%")
            )
        )
    
    if type:
        filters.append(EvidenceItem.category == type)
    
    if case_id:
        filters.append(EvidenceItem.case_id == case_id)
    
    if filters:
        query = query.where(*filters)
    
    # Get total count
    count_query = select(func.count(EvidenceItem.id))
    if filters:
        count_query = count_query.where(*filters)
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    evidence_items = result.scalars().all()
    
    # Enrich with case information
    enriched_items = []
    for item in evidence_items:
        # Get chain of custody status from latest entry
        chain_status = "SECURE"  # default
        if item.chain_entries:
            latest_entry = max(item.chain_entries, key=lambda x: x.timestamp)
            chain_status = latest_entry.action
        
        item_dict = {
            "id": str(item.id),
            "evidence_number": f"EVD-{str(item.id)[:8].upper()}",  # Generate evidence number from ID
            "type": str(item.category) if item.category else "PHYSICAL",
            "description": item.notes or item.label,
            "case_id": str(item.case_id),
            "collected_date": item.created_at,
            "collected_by": "System",  # Would need to track this separately
            "chain_of_custody_status": chain_status,
            "storage_location": item.storage_location,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        }
        
        # Add case information if available
        if hasattr(item, 'case') and item.case:
            item_dict["case_number"] = item.case.case_number
            item_dict["case_title"] = item.case.title
        
        enriched_items.append(item_dict)
    
    return {
        "items": enriched_items,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific evidence item by ID"""
    
    result = await db.execute(select(EvidenceItem).where(EvidenceItem.id == evidence_id))
    evidence = result.scalar_one_or_none()
    
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    return evidence
