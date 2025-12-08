from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from app.database.base import get_db
from app.models.evidence import EvidenceItem, ChainOfCustody
from app.models.case import Case
from app.schemas.evidence import EvidenceResponse, EvidenceListResponse
from app.schemas.chain_of_custody import ChainOfCustodyResponse, ChainOfCustodyCreate
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
    
    # Apply pagination and eager load collector
    query = query.offset(skip).limit(limit).options(selectinload(EvidenceItem.collector), selectinload(EvidenceItem.case))
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
            
        collected_by_name = "System"
        if item.collector:
            collected_by_name = item.collector.full_name
        
        item_dict = {
            "id": str(item.id),
            "evidence_number": f"EVD-{str(item.id)[:8].upper()}",  # Generate evidence number from ID
            "type": str(item.category.value) if item.category else "PHYSICAL",
            "description": item.notes or item.label,
            "label": item.label,
            "case_id": str(item.case_id),
            "collected_at": item.collected_at, # Return correct field
            "collected_by": str(item.collected_by) if item.collected_by else None,
            "collected_by_name": collected_by_name, 
            "chain_of_custody_status": chain_status,
            "storage_location": item.storage_location,
            "sha256": item.sha256,
            "retention_policy": item.retention_policy,
            "notes": item.notes,
            "file_path": item.file_path,
            "file_size": item.file_size,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        }
        
        # Add case information if available
        if item.case:
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
    
    # Eager load collector and case to avoid lazy load errors
    result = await db.execute(
        select(EvidenceItem)
        .options(selectinload(EvidenceItem.collector), selectinload(EvidenceItem.case))
        .where(EvidenceItem.id == evidence_id)
    )
    evidence = result.scalar_one_or_none()
    
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
        
    collected_by_name = "System"
    if evidence.collector:
        collected_by_name = evidence.collector.full_name

    # Construct response dictionary manually to include computed fields
    return {
        "id": str(evidence.id),
        "evidence_number": f"EVD-{str(evidence.id)[:8].upper()}",
        "type": str(evidence.category.value) if evidence.category else "PHYSICAL",
        "description": evidence.notes or evidence.label, # Map notes to description
        "label": evidence.label, # Ensure label is passed
        "case_id": str(evidence.case_id),
        "case_number": evidence.case.case_number if evidence.case else None,
        "case_title": evidence.case.title if evidence.case else None,
        "collected_at": evidence.collected_at,
        "collected_by": str(evidence.collected_by) if evidence.collected_by else None,
        "collected_by_name": collected_by_name,
        "chain_of_custody_status": "SECURE", # TODO: Compute real status from chain
        "storage_location": evidence.storage_location,
        "sha256": evidence.sha256,
        "retention_policy": evidence.retention_policy,
        "notes": evidence.notes,
        "file_path": evidence.file_path,
        "file_size": evidence.file_size,
        "created_at": evidence.created_at,
        "updated_at": evidence.updated_at
    }


@router.post("/", response_model=EvidenceResponse)
async def create_evidence(
    evidence_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new evidence item"""
    from uuid import UUID as PyUUID
    from app.models.evidence import EvidenceCategory
    
    # Validate case exists
    case_id = evidence_data.get('case_id')
    if not case_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="case_id is required"
        )
    
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Map frontend fields to backend model
    category = evidence_data.get('type', 'PHYSICAL')
    if category == 'DIGITAL':
        category = EvidenceCategory.DIGITAL
    else:
        category = EvidenceCategory.PHYSICAL
    
    collected_at_str = evidence_data.get('collected_at')
    collected_at = None
    if collected_at_str:
        try:
            collected_at = datetime.fromisoformat(collected_at_str.replace('Z', '+00:00'))
        except ValueError:
            pass

    # Create evidence item
    evidence = EvidenceItem(
        case_id=case_id,
        label=(evidence_data.get('description') or 'Untitled Evidence')[:255],
        category=category,
        storage_location=evidence_data.get('location_collected') or evidence_data.get('storage_location'),
        notes=f"{evidence_data.get('description', '')}\n\n{evidence_data.get('notes', '')}".strip(),
        retention_policy=evidence_data.get('retention_policy', '7Y_AFTER_CLOSE'),
        collected_at=collected_at,
        collected_by=current_user.id
    )
    
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)
    
    # Return in the expected format
    return {
        "id": str(evidence.id),
        "evidence_number": f"EVD-{str(evidence.id)[:8].upper()}",
        "type": str(evidence.category.value) if evidence.category else "PHYSICAL",
        "description": evidence.notes or evidence.label,
        "case_id": str(evidence.case_id),
        "collected_at": evidence.collected_at,
        "collected_by": str(evidence.collected_by) if evidence.collected_by else None,
        "collected_by_name": current_user.full_name,
        "chain_of_custody_status": "SECURE",
        "storage_location": evidence.storage_location,
        "sha256": evidence.sha256,
        "retention_policy": evidence.retention_policy,
        "notes": evidence.notes,
        "file_path": evidence.file_path,
        "file_size": evidence.file_size,
        "created_at": evidence.created_at,
        "updated_at": evidence.updated_at
    }


@router.put("/{evidence_id}", response_model=EvidenceResponse)
async def update_evidence(
    evidence_id: str,
    evidence_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an evidence item"""
    result = await db.execute(select(EvidenceItem).where(EvidenceItem.id == evidence_id))
    evidence = result.scalar_one_or_none()
    
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Update fields
    if 'description' in evidence_data or 'notes' in evidence_data:
        new_notes = f"{evidence_data.get('description', '')}\n\n{evidence_data.get('notes', '')}".strip()
        if new_notes:
            evidence.notes = new_notes
        if evidence_data.get('description'): # Only update label if description provided? Or keep label separate?
            # Model uses label as title usually.
             pass 
    if 'label' in evidence_data:
        evidence.label = evidence_data['label']
    if 'storage_location' in evidence_data:
        evidence.storage_location = evidence_data['storage_location']
    if 'location_collected' in evidence_data:
        evidence.storage_location = evidence_data['location_collected']
    if 'retention_policy' in evidence_data:
        evidence.retention_policy = evidence_data['retention_policy']
    
    await db.commit()
    await db.refresh(evidence)
    
    return {
        "id": str(evidence.id),
        "evidence_number": f"EVD-{str(evidence.id)[:8].upper()}",
        "type": str(evidence.category.value) if evidence.category else "PHYSICAL",
        "description": evidence.notes or evidence.label,
        "case_id": str(evidence.case_id),
        "collected_at": evidence.collected_at,
        "collected_by": str(evidence.collected_by) if evidence.collected_by else None,
        "collected_by_name": "System",
        "chain_of_custody_status": "SECURE",
        "storage_location": evidence.storage_location,
        "sha256": evidence.sha256,
        "retention_policy": evidence.retention_policy,
        "notes": evidence.notes,
        "file_path": evidence.file_path,
        "file_size": evidence.file_size,
        "created_at": evidence.created_at,
        "updated_at": evidence.updated_at
    }


@router.delete("/{evidence_id}")
async def delete_evidence(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an evidence item"""
    result = await db.execute(select(EvidenceItem).where(EvidenceItem.id == evidence_id))
    evidence = result.scalar_one_or_none()
    
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    await db.delete(evidence)
    await db.commit()
    
    return {"detail": "Evidence deleted successfully"}


@router.post("/upload", response_model=EvidenceResponse)
async def create_evidence_with_files(
    case_id: str = Form(...),
    label: str = Form(...),
    category: str = Form(...),
    description: str = Form(None),
    notes: str = Form(None),
    storage_location: str = Form(None),
    retention_policy: str = Form("CASE_CLOSE_PLUS_7"),
    collected_at: str = Form(None),
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new evidence item with attached files"""
    from app.models.evidence import EvidenceCategory
    import shutil
    import os
    import hashlib
    
    # Validate case
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # Create evidence item
    # Map category string to Enum
    try:
        category_enum = EvidenceCategory(category)
    except ValueError:
        category_enum = EvidenceCategory.PHYSICAL # Default fallback
    
    collected_at_dt = None
    if collected_at:
        try:
            collected_at_dt = datetime.fromisoformat(collected_at.replace('Z', '+00:00'))
        except ValueError:
            pass

    evidence = EvidenceItem(
        case_id=case_id,
        label=label[:255],
        category=category_enum,
        storage_location=storage_location,
        retention_policy=retention_policy,
        notes=f"{description or ''}\n\n{notes or ''}".strip(),
        collected_at=collected_at_dt, # Store the actual collected date
        collected_by=current_user.id # Store the current user as collector
    )
    
    if collected_at:
        # If explicitly provided, use it. Otherwise it's None.
        pass
        
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)
    
    # Process files
    # Create uploads directory if not exists
    upload_dir = os.path.join("uploads", str(evidence.id))
    os.makedirs(upload_dir, exist_ok=True)
    
    first_file_hash = None
    
    for i, file in enumerate(files):
        file_path = os.path.join(upload_dir, file.filename)
        sha256_hash = hashlib.sha256()
        
        # Read and write in chunks to calculate hash
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(8192)
                if not chunk:
                    break
                sha256_hash.update(chunk)
                buffer.write(chunk)
                
        # Capture hash of the first file for the evidence record
        if i == 0:
            first_file_hash = sha256_hash.hexdigest()
            
    # Update evidence with file info
    if first_file_hash:
        evidence.sha256 = first_file_hash
        # Update file info from first file
        evidence.file_path = files[0].filename
        # Calculate size of first file
        file_path = os.path.join(upload_dir, files[0].filename)
        evidence.file_size = os.path.getsize(file_path)
        
        await db.commit()
        await db.refresh(evidence)
    
    return {
        "id": str(evidence.id),
        "evidence_number": f"EVD-{str(evidence.id)[:8].upper()}",
        "type": str(evidence.category.value),
        "description": evidence.notes, # Mapping notes back to description
        "label": evidence.label,
        "case_id": str(evidence.case_id),
        "collected_at": evidence.collected_at, # Return correct field name
        "collected_by": str(evidence.collected_by), # Return ID
        "collected_by_name": current_user.full_name, # Return resolved name
        "chain_of_custody_status": "SECURE",
        "storage_location": evidence.storage_location,
        "sha256": evidence.sha256,
        "retention_policy": evidence.retention_policy,
        "notes": evidence.notes,
        "file_path": evidence.file_path,
        "file_size": evidence.file_size,
        "created_at": evidence.created_at,
        "updated_at": evidence.updated_at
    }


@router.post("/{evidence_id}/upload", response_model=EvidenceResponse)
async def upload_evidence_file(
    evidence_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a file to an existing evidence item"""
    import shutil
    import os
    import hashlib
    
    result = await db.execute(select(EvidenceItem).where(EvidenceItem.id == evidence_id))
    evidence = result.scalar_one_or_none()
    
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
        
    # Save file
    upload_dir = os.path.join("uploads", str(evidence.id))
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    sha256_hash = hashlib.sha256()
    
    with open(file_path, "wb") as buffer:
        while True:
            chunk = await file.read(8192)
            if not chunk:
                break
            sha256_hash.update(chunk)
            buffer.write(chunk)
            
        
    # Update evidence with hash and file info
    evidence.sha256 = sha256_hash.hexdigest()
    evidence.file_path = file.filename
    evidence.file_size = os.path.getsize(file_path)
    
    await db.commit()
    await db.refresh(evidence)
        
    return {
        "id": str(evidence.id),
        "evidence_number": f"EVD-{str(evidence.id)[:8].upper()}",
        "type": str(evidence.category.value),
        "description": evidence.notes or evidence.label,
        "case_id": str(evidence.case_id),
        "collected_at": evidence.collected_at,
        "collected_by": str(evidence.collected_by) if evidence.collected_by else None,
        "collected_by_name": "System",
        "chain_of_custody_status": "SECURE",
        "storage_location": evidence.storage_location,
        "sha256": evidence.sha256,
        "retention_policy": evidence.retention_policy,
        "notes": evidence.notes,
        "file_path": evidence.file_path,
        "file_size": evidence.file_size,
        "created_at": evidence.created_at,
        "updated_at": evidence.updated_at
    }


@router.post("/{evidence_id}/upload-multiple", response_model=EvidenceResponse)
async def upload_multiple_files(
    evidence_id: str,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload multiple files to an existing evidence item"""
    import shutil
    import os
    import hashlib
    
    result = await db.execute(select(EvidenceItem).where(EvidenceItem.id == evidence_id))
    evidence = result.scalar_one_or_none()
    
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
        
    # Save files
    upload_dir = os.path.join("uploads", str(evidence.id))
    os.makedirs(upload_dir, exist_ok=True)
    
    first_file_hash = None
    
    for i, file in enumerate(files):
        file_path = os.path.join(upload_dir, file.filename)
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(8192)
                if not chunk:
                    break
                sha256_hash.update(chunk)
                buffer.write(chunk)
        
        if i == 0:
            first_file_hash = sha256_hash.hexdigest()
            
    # Update evidence hash if it doesn't exist
    if not evidence.sha256 and first_file_hash:
        evidence.sha256 = first_file_hash
        evidence.file_path = files[0].filename
        file_path = os.path.join(upload_dir, files[0].filename)
        evidence.file_size = os.path.getsize(file_path)
        
        await db.commit()
        await db.refresh(evidence)
            
    return {
        "id": str(evidence.id),
        "evidence_number": f"EVD-{str(evidence.id)[:8].upper()}",
        "type": str(evidence.category.value),
        "description": evidence.notes or evidence.label,
        "case_id": str(evidence.case_id),
        "collected_at": evidence.collected_at,
        "collected_by": str(evidence.collected_by) if evidence.collected_by else None,
        "collected_by_name": "System",
        "chain_of_custody_status": "SECURE",
        "storage_location": evidence.storage_location,
        "sha256": evidence.sha256,
        "retention_policy": evidence.retention_policy,
        "notes": evidence.notes,
        "file_path": evidence.file_path,
        "file_size": evidence.file_size,
        "created_at": evidence.created_at,
        "updated_at": evidence.updated_at
    }


@router.get("/{evidence_id}/custody", response_model=List[ChainOfCustodyResponse])
async def get_evidence_custody(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get chain of custody history for an evidence item"""
    # Verify evidence exists
    result = await db.execute(select(EvidenceItem).where(EvidenceItem.id == evidence_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Evidence not found")

    result = await db.execute(
        select(ChainOfCustody)
        .where(ChainOfCustody.evidence_id == evidence_id)
        .order_by(ChainOfCustody.timestamp.desc())
        .options(
            selectinload(ChainOfCustody.from_user_obj),
            selectinload(ChainOfCustody.to_user_obj)
        )
    )
    entries = result.scalars().all()
    
    response = []
    for entry in entries:
        response.append({
            "id": entry.id,
            "evidence_id": entry.evidence_id,
            "action": entry.action,
            "custodian_from": entry.from_user,
            "custodian_to": entry.to_user,
            "custodian_from_name": entry.from_user_obj.full_name if entry.from_user_obj else None,
            "custodian_to_name": entry.to_user_obj.full_name if entry.to_user_obj else "Unknown",
            "location_to": entry.location,
            "purpose": entry.details,
            "notes": entry.details,
            "timestamp": entry.timestamp,
            "created_by": entry.from_user or current_user.id,
            "created_by_name": entry.from_user_obj.full_name if entry.from_user_obj else "System",
            "signature_verified": False,
            "requires_approval": False
        })
    return response


@router.post("/{evidence_id}/custody", response_model=ChainOfCustodyResponse)
async def create_custody_entry(
    evidence_id: str,
    entry_in: ChainOfCustodyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a new chain of custody entry"""
    # Verify evidence
    result = await db.execute(select(EvidenceItem).where(EvidenceItem.id == evidence_id))
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    # Create entry
    entry = ChainOfCustody(
        evidence_id=evidence_id,
        action=entry_in.action,
        from_user=entry_in.custodian_from or current_user.id,
        to_user=entry_in.custodian_to,
        location=entry_in.location_to,
        details=entry_in.notes or entry_in.purpose,
        timestamp=datetime.utcnow()
    )
    
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    
    # Reload relationships for response
    result = await db.execute(
        select(ChainOfCustody)
        .where(ChainOfCustody.id == entry.id)
        .options(
            selectinload(ChainOfCustody.from_user_obj),
            selectinload(ChainOfCustody.to_user_obj)
        )
    )
    entry = result.scalar_one()
    
    return {
        "id": entry.id,
        "evidence_id": entry.evidence_id,
        "action": entry.action,
        "custodian_from": entry.from_user,
        "custodian_to": entry.to_user,
        "custodian_from_name": entry.from_user_obj.full_name if entry.from_user_obj else None,
        "custodian_to_name": entry.to_user_obj.full_name if entry.to_user_obj else "Unknown",
        "location_to": entry.location,
        "purpose": entry.details,
        "notes": entry.details,
        "timestamp": entry.timestamp,
        "created_by": current_user.id,
        "created_by_name": current_user.full_name,
        "signature_verified": False,
        "requires_approval": False
    }

@router.delete("/{evidence_id}/custody/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custody_entry(
    evidence_id: str,
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a chain of custody entry"""
    # Verify evidence exists (optional but good practice)
    evidence_result = await db.execute(select(EvidenceItem).where(EvidenceItem.id == evidence_id))
    if not evidence_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Evidence not found")

    # Verify entry exists and belongs to evidence
    result = await db.execute(
        select(ChainOfCustody)
        .where(
            ChainOfCustody.id == entry_id,
            ChainOfCustody.evidence_id == evidence_id
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Custody entry not found")
        
    # TODO: Add specific permission checks here if needed (e.g. only creator/admin)
    
    await db.delete(entry)
    await db.commit()
