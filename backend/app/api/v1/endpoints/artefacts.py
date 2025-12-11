"""Artefacts API endpoints."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database.base import get_db
from app.models.evidence import Artefact, Evidence, ArtefactType
from app.models.user import User
from app.utils.dependencies import get_current_user

router = APIRouter()

# Request/Response Models
class ArtefactCreateRequest(BaseModel):
    case_id: str
    device_id: Optional[str] = None
    artefact_type: str
    source_tool: str
    description: str
    extracted_at: str
    tags: List[str] = []
    file_path: Optional[str] = None
    sha256: Optional[str] = None

class ArtefactUpdateRequest(BaseModel):
    artefact_type: Optional[str] = None
    source_tool: Optional[str] = None
    description: Optional[str] = None
    extracted_at: Optional[str] = None
    tags: Optional[List[str]] = None

@router.post("/")
async def create_artefact_global(
    artefact_data: ArtefactCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a forensic artefact.
    
    Can be linked to a case and optionally to a specific evidence item (device).
    If device_id is provided, the artefact will be linked to that evidence item.
    Otherwise, it will be created at the case level (requires a default evidence item).
    """
    # If device_id is provided, use it as evidence_id
    if artefact_data.device_id:
        evidence_id = UUID(artefact_data.device_id)
        
        # Verify evidence exists
        result = await db.execute(select(Evidence).where(Evidence.id == evidence_id))
        evidence = result.scalar_one_or_none()
        if not evidence:
            raise HTTPException(status_code=404, detail="Evidence item not found")
    else:
        # If no device_id, we need to find or create a default evidence item for this case
        # For now, raise an error requiring device_id
        raise HTTPException(
            status_code=400, 
            detail="device_id is required. Artefacts must be linked to a specific evidence item."
        )
    
    # Create artefact
    artefact = Artefact(
        evidence_id=evidence_id,
        artefact_type=ArtefactType(artefact_data.artefact_type),
        source_tool=artefact_data.source_tool,
        description=artefact_data.description,
        file_path=artefact_data.file_path,
        sha256=artefact_data.sha256
    )
    
    db.add(artefact)
    await db.commit()
    await db.refresh(artefact)
    
    # Return with enriched data
    return {
        "id": str(artefact.id),
        "evidence_id": str(artefact.evidence_id),
        "case_id": artefact_data.case_id,
        "device_id": str(artefact.evidence_id),
        "device_label": evidence.label if evidence else None,
        "artefact_type": artefact.artefact_type.value if artefact.artefact_type else None,
        "source_tool": artefact.source_tool,
        "description": artefact.description,
        "file_path": artefact.file_path,
        "file_name": artefact.file_path.split('/')[-1] if artefact.file_path else None,
        "file_hash": artefact.sha256,
        "file_size": None,
        "tags": artefact_data.tags,
        "extracted_at": artefact_data.extracted_at,
        "created_at": artefact.created_at.isoformat() if artefact.created_at else None,
        "updated_at": artefact.updated_at.isoformat() if artefact.updated_at else None
    }

@router.patch("/{artefact_id}/")
async def update_artefact(
    artefact_id: UUID,
    update_data: ArtefactUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an artefact's metadata."""
    result = await db.execute(select(Artefact).where(Artefact.id == artefact_id))
    artefact = result.scalar_one_or_none()
    
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")
    
    # Update fields
    if update_data.artefact_type:
        artefact.artefact_type = ArtefactType(update_data.artefact_type)
    if update_data.source_tool:
        artefact.source_tool = update_data.source_tool
    if update_data.description:
        artefact.description = update_data.description
    
    await db.commit()
    await db.refresh(artefact)
    
    # Get evidence for enrichment
    evidence_result = await db.execute(select(Evidence).where(Evidence.id == artefact.evidence_id))
    evidence = evidence_result.scalar_one_or_none()
    
    return {
        "id": str(artefact.id),
        "evidence_id": str(artefact.evidence_id),
        "device_id": str(artefact.evidence_id),
        "device_label": evidence.label if evidence else None,
        "artefact_type": artefact.artefact_type.value if artefact.artefact_type else None,
        "source_tool": artefact.source_tool,
        "description": artefact.description,
        "file_path": artefact.file_path,
        "file_name": artefact.file_path.split('/')[-1] if artefact.file_path else None,
        "file_hash": artefact.sha256,
        "tags": update_data.tags or [],
        "extracted_at": update_data.extracted_at,
        "created_at": artefact.created_at.isoformat() if artefact.created_at else None,
        "updated_at": artefact.updated_at.isoformat() if artefact.updated_at else None
    }

@router.delete("/{artefact_id}/")
async def delete_artefact(
    artefact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an artefact."""
    result = await db.execute(select(Artefact).where(Artefact.id == artefact_id))
    artefact = result.scalar_one_or_none()
    
    if not artefact:
        raise HTTPException(status_code=404, detail="Artefact not found")
    
    await db.delete(artefact)
    await db.commit()
    
    return {"message": "Artefact deleted successfully"}
