"""
Evidence & Seizure Management API endpoints.
Consolidates Device and Evidence management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
import shutil
import os
from pathlib import Path
import json
import hashlib

from app.core.deps import get_db, get_current_user
from app.core.permissions import check_case_access, require_roles
from app.models.evidence import (
    Seizure, Evidence, Artefact, EvidenceCategory,
    CustodyStatus, ImagingStatus, DeviceType, ArtefactType
)
from app.models.user import User

from app.schemas.evidence import ( # Updated imports
    SeizureCreate, SeizureUpdate, SeizureResponse,
    EvidenceCreate, EvidenceUpdate, EvidenceResponse, 
    ArtefactCreate, ArtefactUpdate, ArtefactResponse,
    ImagingStatusUpdate, DeviceImagingResponse,
    ForensicWorkflowResponse
)
from app.config.settings import settings

# Upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Audit integration (commented out or updated if entity names changed)
# from app.utils.audit_integration import AuditableEndpoint

router = APIRouter(tags=["evidence"])

# ==================== GLOBAL EVIDENCE LISTING ====================

@router.get("", response_model=List[EvidenceResponse])
async def list_all_evidence(
    category: Optional[str] = Query(None, description="Filter by category (DIGITAL, PHYSICAL, DOCUMENT)"),
    search: Optional[str] = Query(None, description="Search in label, description, or evidence_number"),
    limit: int = Query(100, le=500, description="Maximum items to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all evidence across all cases with optional filtering."""
    from sqlalchemy.orm import selectinload
    from app.models.case import Case
    
    # Build base query
    query = select(Evidence).options(
        selectinload(Evidence.collector)  # Load collector user info
    ).order_by(Evidence.created_at.desc())
    
    # Apply category filter
    if category:
        query = query.where(Evidence.category == category)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Evidence.label.ilike(search_term)) |
            (Evidence.description.ilike(search_term)) |
            (Evidence.evidence_number.ilike(search_term))
        )
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    evidence_items = result.scalars().all()
    
    # Enrich with case data
    enriched_items = []
    for item in evidence_items:
        # Fetch case number for display
        case_result = await db.execute(select(Case).where(Case.id == item.case_id))
        case = case_result.scalar_one_or_none()
        
        # Build enriched response
        item_dict = {
            "id": item.id,
            "case_id": item.case_id,
            "case_number": case.case_number if case else None,  # Add case_number for display
            "seizure_id": item.seizure_id,
            "label": item.label,
            "evidence_number": item.label,  # Evidence uses label as identifier
            "category": item.category,
            "evidence_type": item.evidence_type,
            "make": item.make,
            "model": item.model,
            "serial_no": item.serial_no,
            "description": item.description,
            "storage_location": item.storage_location,
            "retention_policy": item.retention_policy,
            "notes": item.notes,
            "collected_at": item.collected_at,
            "collected_by": item.collected_by,
            "collected_by_name": item.collector.full_name if item.collector else None,
            "sha256_hash": item.sha256,  # Model uses sha256
            "file_path": item.file_path,
            "file_size": item.file_size,
            "is_active": True,  # Default to True since model doesn't have this
            "created_at": item.created_at,
            "updated_at": item.updated_at,
        }
        enriched_items.append(item_dict)
    
    return enriched_items


# ==================== SEIZURE MANAGEMENT APIs ====================

@router.post("/{case_id}/seizures", response_model=SeizureResponse)
async def record_seizure(
    case_id: UUID,
    seizure_data: SeizureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a new seizure for a case."""
    from app.models.party import Party, PartyType
    import logging
    logger = logging.getLogger(__name__)
    
    # Verify case access
    # check_case_access implementation might need verification 
    # assuming simple check for now or using the imported func
    
    # Create seizure record
    seizure = Seizure(
        case_id=case_id,
        seized_at=seizure_data.seized_at or datetime.utcnow(),
        location=seizure_data.location,
        officer_id=seizure_data.officer_id or current_user.id,
        notes=seizure_data.notes,
        # NEW: Link to authorizing legal instrument
        legal_instrument_id=seizure_data.legal_instrument_id,
        # Legacy warrant fields (deprecated but still accepted)
        warrant_number=seizure_data.warrant_number,
        warrant_type=seizure_data.warrant_type,
        issuing_authority=seizure_data.issuing_authority,
        description=seizure_data.description,
        items_count=seizure_data.items_count,  # Deprecated
        status=seizure_data.status,
        witnesses=seizure_data.witnesses  # Store in JSONB for reference
    )
    
    db.add(seizure)
    await db.commit()
    await db.refresh(seizure)
    
    # NEW: Create Party records for each witness
    if seizure_data.witnesses:
        for witness_data in seizure_data.witnesses:
            # witness_data can be a dict with 'name' key or just a name string
            if isinstance(witness_data, dict):
                witness_name = witness_data.get('name', '')
            else:
                witness_name = str(witness_data)
            
            if witness_name:
                witness_party = Party(
                    case_id=case_id,
                    party_type=PartyType.WITNESS,
                    full_name=witness_name,
                    seizure_id=seizure.id,  # Link to this seizure
                    notes=f"Witness to seizure at {seizure_data.location}"
                )
                db.add(witness_party)
        
        await db.commit()
        logger.info(f"Created {len(seizure_data.witnesses)} witness parties for seizure {seizure.id}")
    
    # Return with evidence_count = 0 (new seizure has no evidence yet)
    return seizure

@router.get("/{case_id}/seizures", response_model=List[SeizureResponse])
async def list_case_seizures(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all seizures for a case with computed evidence count."""
    import logging
    from sqlalchemy import func
    from sqlalchemy.orm import selectinload
    
    logger = logging.getLogger(__name__)
    
    try:
        # Query seizures with optional legal_instrument relationship
        query = select(Seizure).options(
            selectinload(Seizure.legal_instrument)
        ).where(Seizure.case_id == case_id).order_by(Seizure.seized_at.desc().nullslast())
        result = await db.execute(query)
        seizures = result.scalars().all()
        
        logger.info(f"Found {len(seizures)} seizures for case {case_id}")
        
        # Build response list with computed evidence_count
        response_list = []
        for seizure in seizures:
            try:
                # Count evidence items linked to this seizure
                count_query = select(func.count(Evidence.id)).where(Evidence.seizure_id == seizure.id)
                count_result = await db.execute(count_query)
                evidence_count = count_result.scalar() or 0
                
                # Build legal_instrument summary if exists
                li_summary = None
                if seizure.legal_instrument:
                    li = seizure.legal_instrument
                    li_summary = {
                        "id": li.id,
                        "type": li.type.value if li.type else None,
                        "reference_no": li.reference_no,
                        "issuing_authority": li.issuing_authority,
                        "status": li.status.value if li.status else None,
                    }
                
                # Create response dict matching SeizureResponse schema
                response_list.append({
                    "id": seizure.id,
                    "case_id": seizure.case_id,
                    "seized_at": seizure.seized_at,
                    "location": seizure.location,
                    "officer_id": seizure.officer_id,
                    "notes": seizure.notes,
                    "legal_instrument_id": seizure.legal_instrument_id,
                    "warrant_number": seizure.warrant_number,
                    "warrant_type": seizure.warrant_type,
                    "issuing_authority": seizure.issuing_authority,
                    "description": seizure.description,
                    "items_count": seizure.items_count,
                    "status": seizure.status,
                    "witnesses": seizure.witnesses,
                    "photos": seizure.photos,
                    "created_at": seizure.created_at,
                    "updated_at": seizure.updated_at,
                    "evidence_count": evidence_count,
                    "legal_instrument": li_summary,
                })
            except Exception as inner_e:
                logger.error(f"Error processing seizure {seizure.id}: {inner_e}", exc_info=True)
                raise
        
        return response_list
        
    except Exception as e:
        logger.error(f"Error listing seizures for case {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing seizures: {str(e)}")

@router.get("/{case_id}/items", response_model=List[EvidenceResponse])
async def list_case_evidence(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all evidence items for a case."""
    query = select(Evidence).where(Evidence.case_id == case_id).order_by(Evidence.collected_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/seizures/{seizure_id}", response_model=SeizureResponse)
async def get_seizure(
    seizure_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single seizure with computed evidence count."""
    from sqlalchemy import func
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(Seizure).options(
            selectinload(Seizure.legal_instrument)
        ).where(Seizure.id == seizure_id)
    )
    seizure = result.scalar_one_or_none()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    # Compute evidence count
    count_query = select(func.count(Evidence.id)).where(Evidence.seizure_id == seizure.id)
    count_result = await db.execute(count_query)
    evidence_count = count_result.scalar() or 0
    
    # Build legal_instrument dict only if it exists
    legal_instrument_dict = None
    if seizure.legal_instrument:
        legal_instrument_dict = {
            "id": seizure.legal_instrument.id,
            "type": seizure.legal_instrument.type.value if seizure.legal_instrument.type else None,
            "reference_no": seizure.legal_instrument.reference_no,
            "issuing_authority": seizure.legal_instrument.issuing_authority,
            "status": seizure.legal_instrument.status.value if seizure.legal_instrument.status else None,
        }
    
    # Build response with computed field
    return {
        "id": seizure.id,
        "case_id": seizure.case_id,
        "seized_at": seizure.seized_at,
        "location": seizure.location,
        "officer_id": seizure.officer_id,
        "notes": seizure.notes,
        "legal_instrument_id": seizure.legal_instrument_id,
        "warrant_number": seizure.warrant_number,
        "warrant_type": seizure.warrant_type,  # Keep enum, Pydantic serializes it
        "issuing_authority": seizure.issuing_authority,
        "description": seizure.description,
        "items_count": seizure.items_count,
        "status": seizure.status,  # Keep enum, Pydantic serializes it
        "witnesses": seizure.witnesses,
        "photos": seizure.photos,
        "created_at": seizure.created_at,
        "updated_at": seizure.updated_at,
        "evidence_count": evidence_count,
        "legal_instrument": legal_instrument_dict,
    }

@router.put("/seizures/{seizure_id}", response_model=SeizureResponse)
async def update_seizure(
    seizure_id: UUID,
    seizure_update: SeizureUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update seizure details."""
    result = await db.execute(select(Seizure).where(Seizure.id == seizure_id))
    seizure = result.scalar_one_or_none()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    update_data = seizure_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(seizure, field, value)
    
    seizure.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(seizure)
    return seizure

@router.delete("/seizures/{seizure_id}", status_code=204)
async def delete_seizure(
    seizure_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a seizure record."""
    result = await db.execute(select(Seizure).where(Seizure.id == seizure_id))
    seizure = result.scalar_one_or_none()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
        
    await db.delete(seizure)
    await db.commit()
    return None

# ==================== EVIDENCE MANAGEMENT APIs ====================

class EvidenceCreateRequest(EvidenceCreate):
    case_id: UUID

@router.post("", response_model=EvidenceResponse) # /evidence
async def create_evidence(
    evidence_data: EvidenceCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new evidence item directly (without explicit seizure, or linked later)."""
    try:
        evidence = Evidence(
            case_id=evidence_data.case_id,
            label=evidence_data.label,
            category=str(evidence_data.category) if evidence_data.category else 'PHYSICAL',
            evidence_type=str(evidence_data.evidence_type) if evidence_data.evidence_type else None,
            make=evidence_data.make,
            model=evidence_data.model,
            serial_no=evidence_data.serial_no,
            imei=evidence_data.imei,
            storage_capacity=evidence_data.storage_capacity,
            operating_system=evidence_data.operating_system,
            condition=str(evidence_data.condition) if evidence_data.condition else None,
            description=evidence_data.description,
            powered_on=evidence_data.powered_on,
            password_protected=evidence_data.password_protected,
            encryption_status=str(evidence_data.encryption_status) if evidence_data.encryption_status else 'UNKNOWN',
            storage_location=evidence_data.storage_location,
            retention_policy=evidence_data.retention_policy,
            notes=evidence_data.notes,
            collected_at=evidence_data.collected_at or datetime.utcnow(),
            collected_by=current_user.id
        )
        
        db.add(evidence)
        await db.commit()
        await db.refresh(evidence)
        return evidence
    except Exception as e:
        await db.rollback()
        import traceback
        print(f"Error creating evidence: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Error creating evidence: {str(e)}")

@router.post("/upload", response_model=EvidenceResponse)
async def upload_evidence(
    case_id: UUID = Form(...),
    label: str = Form(...),
    category: str = Form(...),  # Accept string, will convert to enum
    description: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    storage_location: Optional[str] = Form(None),
    retention_policy: Optional[str] = Form(None),
    collected_at: Optional[str] = Form(None),  # Accept as string, parse manually
    seizure_id: Optional[str] = Form(None),  # Optional - link to a specific seizure
    files: List[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create evidence with file uploads."""
    try:
        # Parse collected_at from ISO string
        parsed_collected_at = datetime.utcnow()
        if collected_at:
            try:
                parsed_collected_at = datetime.fromisoformat(collected_at.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                parsed_collected_at = datetime.utcnow()
        
        # Parse seizure_id if provided
        parsed_seizure_id = None
        if seizure_id and seizure_id.strip():
            try:
                parsed_seizure_id = UUID(seizure_id)
            except (ValueError, TypeError):
                pass  # Invalid UUID, leave as None
        
        evidence = Evidence(
            case_id=case_id,
            seizure_id=parsed_seizure_id,  # Optional link to seizure
            label=label,
            category=str(category) if category else 'PHYSICAL',  # Ensure string
            description=description,
            notes=notes,
            storage_location=storage_location,
            retention_policy=retention_policy,
            collected_at=parsed_collected_at,
            collected_by=current_user.id
        )
        
        db.add(evidence)
        await db.commit()
        await db.refresh(evidence)
        
        # Handle files
        combined_sha256 = None  # Will store hash of all files combined
        total_file_size = 0
        first_file_path = None
        
        if files:
            evidence_dir = UPLOAD_DIR / str(case_id) / str(evidence.id)
            evidence_dir.mkdir(parents=True, exist_ok=True)
            
            # Use a combined hash for all files if multiple
            combined_hasher = hashlib.sha256()
            
            for file in files:
                file_path = evidence_dir / file.filename
                
                # Read file content for hashing
                file_content = await file.read()
                total_file_size += len(file_content)
                
                # Compute individual file hash
                file_hash = hashlib.sha256(file_content).hexdigest()
                combined_hasher.update(file_content)
                
                # Write to disk
                with file_path.open("wb") as buffer:
                    buffer.write(file_content)
                
                if first_file_path is None:
                    first_file_path = str(file_path)
                
                # Create artefact with its hash
                artefact = Artefact(
                    evidence_id=evidence.id,
                    artefact_type=ArtefactType.DOC,  # Defaulting to DOC or OTHER
                    source_tool="Manual Upload",
                    description=f"Uploaded file: {file.filename}",
                    file_path=str(file_path),
                    sha256=file_hash,  # Store individual file hash
                )
                db.add(artefact)
            
            # Store combined hash on evidence
            combined_sha256 = combined_hasher.hexdigest()
            evidence.sha256 = combined_sha256
            evidence.file_size = total_file_size
            evidence.file_path = first_file_path  # Store first file path as reference
            
            await db.commit()
            await db.refresh(evidence)
            
        return evidence
    except Exception as e:
        await db.rollback()
        import traceback
        print(f"Error uploading evidence: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Error uploading evidence: {str(e)}")

@router.post("/seizures/{seizure_id}/items", response_model=EvidenceResponse) # Changed from /devices
async def add_evidence_to_seizure(
    seizure_id: UUID,
    evidence_data: EvidenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add evidence item to a seizure."""
    result = await db.execute(select(Seizure).where(Seizure.id == seizure_id))
    seizure = result.scalar_one_or_none()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    # Create Evidence (formerly Device)
    evidence = Evidence(
        seizure_id=seizure_id,
        case_id=seizure.case_id, # Inherit case_id from seizure
        label=evidence_data.label,
        category=evidence_data.category,
        evidence_type=evidence_data.evidence_type,
        make=evidence_data.make,
        model=evidence_data.model,
        serial_no=evidence_data.serial_no,
        imei=evidence_data.imei,
        storage_capacity=evidence_data.storage_capacity,
        operating_system=evidence_data.operating_system,
        condition=evidence_data.condition,
        description=evidence_data.description,
        powered_on=evidence_data.powered_on,
        password_protected=evidence_data.password_protected,
        encryption_status=evidence_data.encryption_status,
        storage_location=evidence_data.storage_location,
        retention_policy=evidence_data.retention_policy,
        notes=evidence_data.notes,
        collected_at=evidence_data.collected_at or datetime.utcnow(),
        collected_by=current_user.id
    )
    
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)
    return evidence

@router.get("/seizures/{seizure_id}/items", response_model=List[EvidenceResponse])
async def list_seized_evidence(
    seizure_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List evidence items in a seizure."""
    query = select(Evidence).where(Evidence.seizure_id == seizure_id).order_by(Evidence.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence_details(
    evidence_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of specific evidence."""
    result = await db.execute(select(Evidence).where(Evidence.id == evidence_id))
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return evidence

@router.put("/{evidence_id}", response_model=EvidenceResponse)
async def update_evidence(
    evidence_id: UUID,
    evidence_update: EvidenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update evidence details."""
    result = await db.execute(select(Evidence).where(Evidence.id == evidence_id))
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    
    update_data = evidence_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(evidence, field, value)
    
    evidence.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(evidence)
    return evidence

@router.delete("/{evidence_id}", status_code=204)
async def delete_evidence(
    evidence_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete evidence item."""
    result = await db.execute(select(Evidence).where(Evidence.id == evidence_id))
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    
    await db.delete(evidence)
    await db.commit()
    return None

# ==================== ARTEFACT APIs ====================

@router.post("/{evidence_id}/artefacts", response_model=ArtefactResponse)
async def create_artefact(
    evidence_id: UUID,
    artefact_data: ArtefactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add an artefact (e.g. photo, extraction) to evidence."""
    result = await db.execute(select(Evidence).where(Evidence.id == evidence_id))
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    artefact = Artefact(
        evidence_id=evidence_id,
        artefact_type=artefact_data.artefact_type,
        source_tool=artefact_data.source_tool,
        description=artefact_data.description,
        file_path=artefact_data.file_path,
        sha256=artefact_data.sha256
    )
    
    db.add(artefact)
    await db.commit()
    await db.refresh(artefact)
    return artefact

@router.get("/{evidence_id}/artefacts", response_model=List[ArtefactResponse])
async def list_evidence_artefacts(
    evidence_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List artefacts for an evidence item."""
    query = select(Artefact).where(Artefact.evidence_id == evidence_id).order_by(Artefact.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

# ==================== FORENSIC / IMAGING APIs ====================
# Keeping these as they add value for Digital Evidence

@router.put("/{evidence_id}/imaging", response_model=DeviceImagingResponse)
async def update_evidence_imaging(
    evidence_id: UUID,
    imaging_update: ImagingStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_roles(current_user, ["FORENSIC", "ADMIN"])
    result = await db.execute(select(Evidence).where(Evidence.id == evidence_id))
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
        
    if imaging_update.imaging_status:
        evidence.imaging_status = imaging_update.imaging_status
        if imaging_update.imaging_status == ImagingStatus.IN_PROGRESS and not evidence.imaging_started_at:
            evidence.imaging_started_at = datetime.utcnow()
        elif imaging_update.imaging_status == ImagingStatus.COMPLETED and not evidence.imaging_completed_at:
            evidence.imaging_completed_at = datetime.utcnow()
            evidence.imaged = True

    update_data = imaging_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field != 'imaging_status':
            setattr(evidence, field, value)

    evidence.imaging_technician_id = current_user.id
    evidence.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(evidence)
    
    return DeviceImagingResponse(
        device_id=evidence.id,
        imaging_status=evidence.imaging_status,
        imaging_started_at=evidence.imaging_started_at,
        imaging_completed_at=evidence.imaging_completed_at,
        imaging_tool=evidence.imaging_tool,
        image_hash=evidence.image_hash,
        image_size_bytes=evidence.image_size_bytes,
        technician_id=evidence.imaging_technician_id,
        updated_at=evidence.updated_at
    )
