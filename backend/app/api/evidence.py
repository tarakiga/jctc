from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from app.database import get_db
from app.models.evidence import Evidence, ChainOfCustody
from app.schemas.evidence import (
    EvidenceCreate, 
    EvidenceResponse, 
    EvidenceUpdate,
    EvidenceFileAttachmentResponse,
    EvidenceWithAttachments
)
from app.utils.auth import get_current_user
from app.utils.evidence import (
    save_uploaded_file,
    generate_evidence_storage_path,
    is_allowed_file_type,
    get_max_file_size,
    verify_file_integrity,
    validate_evidence_label,
    EvidenceIntegrityError,
    EvidenceStorageError
)
from app.schemas.user import User

router = APIRouter()

@router.post("/", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def create_evidence(
    evidence: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new evidence item"""
    
    # Validate evidence label
    if not validate_evidence_label(evidence.label):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid evidence label format"
        )
    
    # Check if case exists
    from app.models.case import Case
    case = db.query(Case).filter(Case.id == evidence.case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Generate evidence ID
    evidence_id = str(uuid.uuid4())
    
    # Create evidence record
    db_evidence = Evidence(
        id=evidence_id,
        label=evidence.label,
        description=evidence.description,
        type=evidence.type,
        source=evidence.source,
        acquired_date=evidence.acquired_date,
        acquired_by=evidence.acquired_by,
        location_found=evidence.location_found,
        case_id=evidence.case_id,
        status=evidence.status or "COLLECTED",
        retention_policy=evidence.retention_policy or "5Y_AFTER_CLOSE",
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    try:
        db.add(db_evidence)
        db.commit()
        db.refresh(db_evidence)
        
        return EvidenceResponse.from_orm(db_evidence)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create evidence: {str(e)}"
        )

@router.get("/{evidence_id}", response_model=EvidenceWithAttachments)
async def get_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get evidence item with file attachments"""
    
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    return EvidenceWithAttachments.from_orm(evidence)

@router.get("/", response_model=List[EvidenceResponse])
async def list_evidence(
    case_id: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List evidence items with optional filters"""
    
    query = db.query(Evidence)
    
    if case_id:
        query = query.filter(Evidence.case_id == case_id)
    if status:
        query = query.filter(Evidence.status == status)
    if type:
        query = query.filter(Evidence.type == type)
    
    evidence_items = query.offset(skip).limit(limit).all()
    return [EvidenceResponse.from_orm(item) for item in evidence_items]

@router.put("/{evidence_id}", response_model=EvidenceResponse)
async def update_evidence(
    evidence_id: str,
    evidence_update: EvidenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update evidence item"""
    
    db_evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not db_evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Validate label if being updated
    if evidence_update.label and not validate_evidence_label(evidence_update.label):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid evidence label format"
        )
    
    # Update fields
    update_data = evidence_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_evidence, field, value)
    
    db_evidence.updated_at = datetime.utcnow()
    db_evidence.updated_by = current_user.id
    
    try:
        db.commit()
        db.refresh(db_evidence)
        return EvidenceResponse.from_orm(db_evidence)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update evidence: {str(e)}"
        )

@router.delete("/{evidence_id}")
async def delete_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete evidence item (soft delete)"""
    
    db_evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not db_evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Soft delete
    db_evidence.status = "DELETED"
    db_evidence.updated_at = datetime.utcnow()
    db_evidence.updated_by = current_user.id
    
    try:
        db.commit()
        return {"message": "Evidence deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete evidence: {str(e)}"
        )

@router.post("/{evidence_id}/files", response_model=EvidenceFileAttachmentResponse)
async def upload_evidence_file(
    evidence_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload file attachment to evidence item"""
    
    # Check if evidence exists
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Validate file type
    if not is_allowed_file_type(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed"
        )
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > get_max_file_size():
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum limit"
        )
    
    # Reset file pointer
    await file.seek(0)
    
    try:
        # Generate storage path
        attachment_id = str(uuid.uuid4())
        storage_path = generate_evidence_storage_path(
            evidence.case_id, 
            evidence_id, 
            f"{attachment_id}_{file.filename}"
        )
        
        # Save file and calculate hash
        file_path, sha256_hash, file_size = await save_uploaded_file(file, storage_path)
        
        # Create file attachment record
        db_attachment = EvidenceFileAttachment(
            id=attachment_id,
            evidence_id=evidence_id,
            filename=file.filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=file.content_type,
            sha256_hash=sha256_hash,
            description=description,
            uploaded_by=current_user.id,
            uploaded_at=datetime.utcnow()
        )
        
        db.add(db_attachment)
        db.commit()
        db.refresh(db_attachment)
        
        return EvidenceFileAttachmentResponse.from_orm(db_attachment)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

@router.get("/{evidence_id}/files", response_model=List[EvidenceFileAttachmentResponse])
async def list_evidence_files(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List file attachments for evidence item"""
    
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    attachments = db.query(EvidenceFileAttachment).filter(
        EvidenceFileAttachment.evidence_id == evidence_id
    ).all()
    
    return [EvidenceFileAttachmentResponse.from_orm(att) for att in attachments]

@router.post("/{evidence_id}/verify")
async def verify_evidence_integrity(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify integrity of all files attached to evidence"""
    
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    attachments = db.query(EvidenceFileAttachment).filter(
        EvidenceFileAttachment.evidence_id == evidence_id
    ).all()
    
    verification_results = []
    
    for attachment in attachments:
        try:
            is_valid = await verify_file_integrity(
                attachment.file_path, 
                attachment.sha256_hash
            )
            verification_results.append({
                "file_id": attachment.id,
                "filename": attachment.filename,
                "is_valid": is_valid,
                "expected_hash": attachment.sha256_hash
            })
        except Exception as e:
            verification_results.append({
                "file_id": attachment.id,
                "filename": attachment.filename,
                "is_valid": False,
                "error": str(e)
            })
    
    return {
        "evidence_id": evidence_id,
        "total_files": len(attachments),
        "verification_results": verification_results,
        "all_valid": all(result.get("is_valid", False) for result in verification_results)
    }

@router.delete("/{evidence_id}/files/{file_id}")
async def delete_evidence_file(
    evidence_id: str,
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete file attachment from evidence"""
    
    attachment = db.query(EvidenceFileAttachment).filter(
        EvidenceFileAttachment.id == file_id,
        EvidenceFileAttachment.evidence_id == evidence_id
    ).first()
    
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File attachment not found"
        )
    
    try:
        db.delete(attachment)
        db.commit()
        return {"message": "File attachment deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file attachment: {str(e)}"
        )