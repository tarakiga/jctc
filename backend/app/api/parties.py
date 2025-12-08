from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List, Optional
import uuid
from datetime import datetime

from app.database.base import get_db
from app.models.party import Party
from app.models.case import Case
from app.schemas.parties import (
    PartyCreate,
    PartyResponse,
    PartyUpdate,
    PartyWithCases,
    PartySearchResponse
)
from app.utils.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=PartyResponse, status_code=status.HTTP_201_CREATED)
async def create_party(
    party: PartyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new party (suspect, victim, or witness)"""
    
    # Generate party ID
    party_id = str(uuid.uuid4())
    
    # Create party record
    db_party = Party(
        id=party_id,
        case_id=party.case_id,
        party_type=party.party_type,
        full_name=party.full_name,
        alias=party.alias,
        national_id=party.national_id,
        dob=party.dob,
        nationality=party.nationality,
        gender=party.gender,
        contact=party.contact,
        notes=party.notes,
        guardian_contact=party.guardian_contact,
        safeguarding_flags=party.safeguarding_flags,
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    try:
        db.add(db_party)
        await db.commit()
        await db.refresh(db_party)
        return db_party
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create party: {str(e)}"
        )


@router.get("/{party_id}", response_model=PartyResponse)
async def get_party(
    party_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get party details"""
    
    result = await db.execute(select(Party).where(Party.id == party_id))
    party = result.scalar_one_or_none()
    
    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )
    
    return party


@router.get("/", response_model=List[PartyResponse])
async def list_parties(
    party_type: Optional[str] = None,
    nationality: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List parties with optional filters"""
    
    query = select(Party)
    
    if party_type:
        query = query.where(Party.party_type == party_type)
    if nationality:
        query = query.where(Party.nationality == nationality)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    parties = result.scalars().all()
    return list(parties)


@router.get("/case/{case_id}", response_model=List[PartyResponse])
async def get_parties_by_case(
    case_id: str,
    party_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all parties associated with a case"""
    
    # Check if case exists
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Build query
    query = select(Party).where(Party.case_id == case_id)
    
    if party_type:
        query = query.where(Party.party_type == party_type)
    
    result = await db.execute(query)
    parties = result.scalars().all()
    return list(parties)


@router.put("/{party_id}", response_model=PartyResponse)
async def update_party(
    party_id: str,
    party_update: PartyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update party information"""
    
    result = await db.execute(select(Party).where(Party.id == party_id))
    db_party = result.scalar_one_or_none()
    
    if not db_party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )
    
    # Update fields
    update_data = party_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_party, field, value)
    
    db_party.updated_at = datetime.utcnow()
    db_party.updated_by = current_user.id
    
    try:
        await db.commit()
        await db.refresh(db_party)
        return db_party
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update party: {str(e)}"
        )


@router.patch("/{party_id}/", response_model=PartyResponse)
async def patch_party(
    party_id: str,
    party_update: PartyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Patch party information (partial update)"""
    return await update_party(party_id, party_update, db, current_user)


@router.delete("/{party_id}")
async def delete_party(
    party_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete party (hard delete)"""
    
    result = await db.execute(select(Party).where(Party.id == party_id))
    db_party = result.scalar_one_or_none()
    
    if not db_party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )
    
    try:
        await db.delete(db_party)
        await db.commit()
        return {"message": "Party deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete party: {str(e)}"
        )


@router.post("/search", response_model=List[PartySearchResponse])
async def search_parties(
    full_name: Optional[str] = None,
    alias: Optional[str] = None,
    national_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search parties by name, alias, or national ID"""
    
    query = select(Party)
    
    if full_name:
        query = query.where(Party.full_name.ilike(f"%{full_name}%"))
    if alias:
        query = query.where(Party.alias.ilike(f"%{alias}%"))
    if national_id:
        query = query.where(Party.national_id == national_id)
    
    query = query.limit(50)  # Limit search results
    result = await db.execute(query)
    parties = result.scalars().all()
    return list(parties)
