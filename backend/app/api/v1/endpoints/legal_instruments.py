"""Legal Instruments API endpoints."""
from typing import Dict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.base import get_db
from app.models.user import User
from app.models.legal import LegalInstrument
from app.utils.dependencies import get_current_user
from datetime import datetime

router = APIRouter()


@router.patch("/{instrument_id}/")
async def update_legal_instrument(
    instrument_id: UUID,
    update_data: Dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a legal instrument's details."""
    from app.models.legal import LegalInstrumentType, LegalInstrumentStatus
    
    # Find the instrument
    result = await db.execute(select(LegalInstrument).where(LegalInstrument.id == instrument_id))
    instrument = result.scalar_one_or_none()
    
    if not instrument:
        raise HTTPException(status_code=404, detail="Legal instrument not found")
    
    # Update fields
    if 'instrument_type' in update_data:
        instrument.type = LegalInstrumentType(update_data['instrument_type'])
    if 'reference_no' in update_data:
        instrument.reference_no = update_data['reference_no']
    if 'issuing_authority' in update_data:
        instrument.issuing_authority = update_data['issuing_authority']
    if 'issued_at' in update_data and update_data['issued_at']:
        instrument.issued_at = datetime.fromisoformat(update_data['issued_at'].replace('Z', '+00:00'))
    if 'expires_at' in update_data and update_data['expires_at']:
        instrument.expires_at = datetime.fromisoformat(update_data['expires_at'].replace('Z', '+00:00'))
    if 'status' in update_data:
        instrument.status = LegalInstrumentStatus(update_data['status'])
    if 'notes' in update_data:
        instrument.notes = update_data['notes']
    
    await db.commit()
    await db.refresh(instrument)
    
    return {
        "id": str(instrument.id),
        "case_id": str(instrument.case_id),
        "instrument_type": instrument.type.value if instrument.type else None,
        "reference_no": instrument.reference_no,
        "issuing_authority": instrument.issuing_authority,
        "issued_at": instrument.issued_at.isoformat() if instrument.issued_at else None,
        "expires_at": instrument.expires_at.isoformat() if instrument.expires_at else None,
        "status": instrument.status.value if instrument.status else None,
        "document_hash": instrument.document_hash,
        "notes": instrument.notes,
        "created_at": instrument.created_at.isoformat() if instrument.created_at else None,
        "updated_at": instrument.updated_at.isoformat() if instrument.updated_at else None
    }


@router.delete("/{instrument_id}/")
async def delete_legal_instrument(
    instrument_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a legal instrument."""
    # Find the instrument
    result = await db.execute(select(LegalInstrument).where(LegalInstrument.id == instrument_id))
    instrument = result.scalar_one_or_none()
    
    if not instrument:
        raise HTTPException(status_code=404, detail="Legal instrument not found")
    
    await db.delete(instrument)
    await db.commit()
    
    return {"message": "Legal instrument deleted successfully", "id": str(instrument_id)}
