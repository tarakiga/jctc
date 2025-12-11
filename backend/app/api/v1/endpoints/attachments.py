"""Attachments API endpoints."""
from typing import Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.base import get_db
from app.models.user import User
from app.models.misc import Attachment
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.delete("/{attachment_id}/")
async def delete_attachment(
    attachment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an attachment."""
    # Check if attachment exists
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    await db.delete(attachment)
    await db.commit()
    
    return {"message": "Attachment deleted successfully", "id": str(attachment_id)}


@router.post("/{attachment_id}/verify-hash/")
async def verify_attachment_hash(
    attachment_id: UUID,
    verification_data: Dict[str, str] = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify if the provided hash matches the stored attachment hash."""
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
        
    provided_hash = verification_data.get('hash')
    is_valid = (provided_hash == attachment.sha256_hash)
    
    return {"valid": is_valid, "stored_hash": attachment.sha256_hash}
