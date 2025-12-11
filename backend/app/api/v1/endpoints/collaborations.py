"""Collaborations API endpoints."""
from typing import Dict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.base import get_db
from app.models.user import User
from app.utils.dependencies import get_current_user
from datetime import datetime
import uuid

router = APIRouter()


@router.patch("/{collaboration_id}/")
async def update_collaboration(
    collaboration_id: UUID,
    update_data: Dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a collaboration."""
    # Stub response for now
    return {
        "id": str(collaboration_id),
        "case_id": update_data.get('case_id'),
        "partner_org": update_data.get('partner_org'),
        "partner_type": update_data.get('partner_type', 'OTHER'),
        "contact_person": update_data.get('contact_person'),
        "contact_email": update_data.get('contact_email'),
        "contact_phone": update_data.get('contact_phone'),
        "reference_no": update_data.get('reference_no'),
        "scope": update_data.get('scope'),
        "mou_reference": update_data.get('mou_reference'),
        "status": update_data.get('status', 'ACTIVE'),
        "initiated_at": update_data.get('initiated_at'),
        "completed_at": update_data.get('completed_at'),
        "notes": update_data.get('notes'),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }


@router.delete("/{collaboration_id}/")
async def delete_collaboration(
    collaboration_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a collaboration."""
    return {"message": "Collaboration deleted successfully", "id": str(collaboration_id)}
