"""Charges API endpoints."""
from typing import Dict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.base import get_db
from app.models.user import User
from app.models.prosecution import Charge, ChargeStatus
from app.utils.dependencies import get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/")
async def create_charge_global(
    charge_data: Dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new charge."""
    # Verify case exists if case_id is provided
    if charge_data.get('case_id'):
        from app.models.case import Case
        case_result = await db.execute(select(Case).where(Case.id == UUID(charge_data['case_id'])))
        case_obj = case_result.scalar_one_or_none()
        
        if not case_obj:
            raise HTTPException(status_code=404, detail="Case not found")
    
    # Parse filed_at date
    filed_at = datetime.fromisoformat(charge_data.get('filed_at').replace('Z', '+00:00')) if charge_data.get('filed_at') else datetime.utcnow()
    
    # Create charge
    new_charge = Charge(
        case_id=UUID(charge_data['case_id']),
        statute=charge_data.get('statute', ''),
        statute_section=charge_data.get('statute_section', ''),
        description=charge_data.get('description', ''),
        filed_at=filed_at,
        status=ChargeStatus(charge_data.get('status', 'FILED')),
        notes=charge_data.get('notes'),
        created_by=current_user.id
    )
    
    db.add(new_charge)
    await db.commit()
    await db.refresh(new_charge)
    
    # Return response
    return {
        "id": str(new_charge.id),
        "case_id": str(new_charge.case_id),
        "statute": new_charge.statute,
        "statute_section": new_charge.statute_section,
        "description": new_charge.description,
        "filed_at": new_charge.filed_at.isoformat() if new_charge.filed_at else None,
        "status": new_charge.status.value if new_charge.status else None,
        "notes": new_charge.notes,
        "created_at": new_charge.created_at.isoformat() if new_charge.created_at else None,
        "updated_at": new_charge.updated_at.isoformat() if new_charge.updated_at else None,
        "created_by": str(new_charge.created_by),
        "created_by_name": current_user.full_name or current_user.email
    }

@router.patch("/{charge_id}/")
async def update_charge(
    charge_id: UUID,
    update_data: Dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a charge's details."""
    # Find the charge
    result = await db.execute(select(Charge).where(Charge.id == charge_id))
    charge = result.scalar_one_or_none()
    
    if not charge:
        raise HTTPException(status_code=404, detail="Charge not found")
    
    # Update fields
    if 'statute' in update_data:
        charge.statute = update_data['statute']
    if 'statute_section' in update_data:
        charge.statute_section = update_data['statute_section']
    if 'description' in update_data:
        charge.description = update_data['description']
    if 'filed_at' in update_data and update_data['filed_at']:
        charge.filed_at = datetime.fromisoformat(update_data['filed_at'].replace('Z', '+00:00'))
    if 'status' in update_data:
        charge.status = ChargeStatus(update_data['status'])
    if 'notes' in update_data:
        charge.notes = update_data['notes']
    
    await db.commit()
    await db.refresh(charge)
    
    return {
        "id": str(charge.id),
        "case_id": str(charge.case_id),
        "statute": charge.statute,
        "statute_section": charge.statute_section,
        "description": charge.description,
        "filed_at": charge.filed_at.isoformat() if charge.filed_at else None,
        "status": charge.status.value if charge.status else None,
        "notes": charge.notes,
        "created_at": charge.created_at.isoformat() if charge.created_at else None,
        "updated_at": charge.updated_at.isoformat() if charge.updated_at else None,
        "created_by": str(charge.created_by) if charge.created_by else None,
        "created_by_name": current_user.full_name or current_user.email
    }

@router.delete("/{charge_id}/")
async def delete_charge(
    charge_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a charge."""
    # Find the charge
    result = await db.execute(select(Charge).where(Charge.id == charge_id))
    charge = result.scalar_one_or_none()
    
    if not charge:
        raise HTTPException(status_code=404, detail="Charge not found")
    
    # Delete the charge
    await db.delete(charge)
    await db.commit()
    
    return {"message": "Charge deleted successfully", "id": str(charge_id)}
