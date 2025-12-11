from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid
from datetime import datetime

from app.core.deps import get_db, get_current_user
from app.models.evidence import Evidence
from app.models.chain_of_custody import ChainOfCustodyEntry
from app.schemas.chain_of_custody import (
    ChainOfCustodyCreate,
    ChainOfCustodyResponse,
    ChainOfCustodyHistoryResponse,
    CustodyTransferCreate
)
from app.models.user import User

router = APIRouter()

@router.post("/{evidence_id}/entries", response_model=ChainOfCustodyResponse, status_code=status.HTTP_201_CREATED)
async def create_custody_entry(
    evidence_id: str,
    custody_entry: ChainOfCustodyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chain of custody entry"""
    
    # Check if evidence exists
    result = await db.execute(select(Evidence).filter(Evidence.id == evidence_id))
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Generate custody entry ID
    entry_id = str(uuid.uuid4())
    
    # Create custody entry
    db_entry = ChainOfCustodyEntry(
        id=entry_id,
        evidence_id=evidence_id,
        action=custody_entry.action,
        custodian_from=custody_entry.custodian_from,
        custodian_to=custody_entry.custodian_to,
        location_from=custody_entry.location_from,
        location_to=custody_entry.location_to,
        purpose=custody_entry.purpose,
        notes=custody_entry.notes,
        signature_path=custody_entry.signature_path,
        signature_verified=custody_entry.signature_verified or False,
        requires_approval=custody_entry.requires_approval or False,
        approval_status=custody_entry.approval_status or "PENDING" if custody_entry.requires_approval else None,
        timestamp=custody_entry.timestamp or datetime.utcnow(),
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    try:
        db.add(db_entry)
        await db.commit()
        
        # Re-fetch with relationships to ensure names are available
        result = await db.execute(
            select(ChainOfCustodyEntry)
            .options(
                selectinload(ChainOfCustodyEntry.from_custodian),
                selectinload(ChainOfCustodyEntry.to_custodian),
                selectinload(ChainOfCustodyEntry.creator),
                selectinload(ChainOfCustodyEntry.approver)
            )
            .filter(ChainOfCustodyEntry.id == entry_id)
        )
        full_entry = result.scalar_one()
        
        return ChainOfCustodyResponse.model_validate(full_entry)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create custody entry: {str(e)}"
        )

@router.get("/{evidence_id}/history", response_model=ChainOfCustodyHistoryResponse)
async def get_custody_history(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get complete chain of custody history for evidence"""
    
    # Check if evidence exists
    result = await db.execute(select(Evidence).filter(Evidence.id == evidence_id))
    evidence = result.scalar_one_or_none()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Get all custody entries ordered by timestamp
    entries_result = await db.execute(
        select(ChainOfCustodyEntry)
        .options(
            selectinload(ChainOfCustodyEntry.from_custodian),
            selectinload(ChainOfCustodyEntry.to_custodian),
            selectinload(ChainOfCustodyEntry.creator),
            selectinload(ChainOfCustodyEntry.approver)
        )
        .filter(ChainOfCustodyEntry.evidence_id == evidence_id)
        .order_by(ChainOfCustodyEntry.timestamp.asc())
    )
    custody_entries = entries_result.scalars().all()
    
    return ChainOfCustodyHistoryResponse(
        evidence_id=evidence_id,
        evidence_label=evidence.label,
        total_entries=len(custody_entries),
        entries=[ChainOfCustodyResponse.from_orm(entry) for entry in custody_entries]
    )

@router.get("/{evidence_id}/current-custodian")
async def get_current_custodian(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current custodian of evidence"""
    
    # Check if evidence exists
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Get most recent custody entry
    latest_entry = db.query(ChainOfCustodyEntry).filter(
        ChainOfCustodyEntry.evidence_id == evidence_id
    ).order_by(ChainOfCustodyEntry.timestamp.desc()).first()
    
    if not latest_entry:
        return {
            "evidence_id": evidence_id,
            "current_custodian": None,
            "current_location": None,
            "last_action": None,
            "last_update": None
        }

@router.post("/{evidence_id}/entries/{entry_id}/approve", response_model=ChainOfCustodyResponse)
async def approve_custody_entry(
    evidence_id: str,
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a custody entry that requires four-eyes approval"""
    
    # Check if evidence exists
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Get the custody entry
    entry = db.query(ChainOfCustodyEntry).filter(
        ChainOfCustodyEntry.id == entry_id,
        ChainOfCustodyEntry.evidence_id == evidence_id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custody entry not found"
        )
    
    # Check if approval is required and pending
    if not entry.requires_approval or entry.approval_status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This entry does not require approval or is not pending"
        )
    
    # Check if user is not the same as the creator (four-eyes principle)
    if entry.created_by == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot approve your own custody entry"
        )
    
    # Update approval status
    entry.approval_status = "APPROVED"
    entry.approved_by = current_user.id
    entry.approval_timestamp = datetime.utcnow()
    
    try:
        db.commit()
        db.refresh(entry)
        return ChainOfCustodyResponse.from_orm(entry)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve custody entry: {str(e)}"
        )

@router.post("/{evidence_id}/entries/{entry_id}/reject", response_model=ChainOfCustodyResponse)
async def reject_custody_entry(
    evidence_id: str,
    entry_id: str,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject a custody entry that requires four-eyes approval"""
    
    # Check if evidence exists
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Get the custody entry
    entry = db.query(ChainOfCustodyEntry).filter(
        ChainOfCustodyEntry.id == entry_id,
        ChainOfCustodyEntry.evidence_id == evidence_id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custody entry not found"
        )
    
    # Check if approval is required and pending
    if not entry.requires_approval or entry.approval_status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This entry does not require approval or is not pending"
        )
    
    # Check if user is not the same as the creator (four-eyes principle)
    if entry.created_by == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot reject your own custody entry"
        )
    
    # Update approval status
    entry.approval_status = "REJECTED"
    entry.approved_by = current_user.id
    entry.approval_timestamp = datetime.utcnow()
    if reason:
        entry.notes = f"{entry.notes or ''}\n\nRejection reason: {reason}".strip()
    
    try:
        db.commit()
        db.refresh(entry)
        return ChainOfCustodyResponse.from_orm(entry)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject custody entry: {str(e)}"
        )

@router.get("/{evidence_id}/entries/{entry_id}/receipt")
async def generate_custody_receipt(
    evidence_id: str,
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a custody transfer receipt"""
    
    # Check if evidence exists
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Get the custody entry
    entry = db.query(ChainOfCustodyEntry).filter(
        ChainOfCustodyEntry.id == entry_id,
        ChainOfCustodyEntry.evidence_id == evidence_id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custody entry not found"
        )
    
    # Generate receipt URL (in a real implementation, this would generate a PDF or document)
    receipt_url = f"/api/receipts/custody/{entry_id}.pdf"
    
    return {"receipt_url": receipt_url}
    
    return {
        "evidence_id": evidence_id,
        "current_custodian": latest_entry.custodian_to,
        "current_location": latest_entry.location_to,
        "last_action": latest_entry.action,
        "last_update": latest_entry.timestamp
    }

@router.post("/{evidence_id}/transfer", response_model=ChainOfCustodyResponse)
async def transfer_custody(
    evidence_id: str,
    transfer: CustodyTransferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Transfer custody of evidence to another person/location"""
    
    # Check if evidence exists
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Get current custody status
    latest_entry = db.query(ChainOfCustodyEntry).filter(
        ChainOfCustodyEntry.evidence_id == evidence_id
    ).order_by(ChainOfCustodyEntry.timestamp.desc()).first()
    
    # Determine the custodian_from based on latest entry
    custodian_from = latest_entry.custodian_to if latest_entry else transfer.custodian_from
    location_from = latest_entry.location_to if latest_entry else transfer.location_from
    
    # Create transfer entry
    entry_id = str(uuid.uuid4())
    
    db_entry = ChainOfCustodyEntry(
        id=entry_id,
        evidence_id=evidence_id,
        action="TRANSFER",
        custodian_from=custodian_from,
        custodian_to=transfer.custodian_to,
        location_from=location_from,
        location_to=transfer.location_to,
        purpose=transfer.purpose,
        notes=transfer.notes,
        timestamp=datetime.utcnow(),
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    try:
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        
        return ChainOfCustodyResponse.from_orm(db_entry)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transfer custody: {str(e)}"
        )

@router.post("/{evidence_id}/checkout", response_model=ChainOfCustodyResponse)
async def checkout_evidence(
    evidence_id: str,
    checkout_to: str,
    location_to: str,
    purpose: str,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check out evidence for analysis or examination"""
    
    # Check if evidence exists
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Get current custody status
    latest_entry = db.query(ChainOfCustodyEntry).filter(
        ChainOfCustodyEntry.evidence_id == evidence_id
    ).order_by(ChainOfCustodyEntry.timestamp.desc()).first()
    
    custodian_from = latest_entry.custodian_to if latest_entry else "EVIDENCE_STORAGE"
    location_from = latest_entry.location_to if latest_entry else "EVIDENCE_ROOM"
    
    # Create checkout entry
    entry_id = str(uuid.uuid4())
    
    db_entry = ChainOfCustodyEntry(
        id=entry_id,
        evidence_id=evidence_id,
        action="CHECKOUT",
        custodian_from=custodian_from,
        custodian_to=checkout_to,
        location_from=location_from,
        location_to=location_to,
        purpose=purpose,
        notes=notes,
        timestamp=datetime.utcnow(),
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    try:
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        
        return ChainOfCustodyResponse.from_orm(db_entry)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to checkout evidence: {str(e)}"
        )

@router.post("/{evidence_id}/checkin", response_model=ChainOfCustodyResponse)
async def checkin_evidence(
    evidence_id: str,
    location_to: Optional[str] = "EVIDENCE_ROOM",
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check in evidence back to storage"""
    
    # Check if evidence exists
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Get current custody status
    latest_entry = db.query(ChainOfCustodyEntry).filter(
        ChainOfCustodyEntry.evidence_id == evidence_id
    ).order_by(ChainOfCustodyEntry.timestamp.desc()).first()
    
    if not latest_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No previous custody record found"
        )
    
    # Create checkin entry
    entry_id = str(uuid.uuid4())
    
    db_entry = ChainOfCustodyEntry(
        id=entry_id,
        evidence_id=evidence_id,
        action="CHECKIN",
        custodian_from=latest_entry.custodian_to,
        custodian_to="EVIDENCE_STORAGE",
        location_from=latest_entry.location_to,
        location_to=location_to,
        purpose="RETURN_TO_STORAGE",
        notes=notes,
        timestamp=datetime.utcnow(),
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    try:
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        
        return ChainOfCustodyResponse.from_orm(db_entry)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to checkin evidence: {str(e)}"
        )

@router.get("/{evidence_id}/gaps")
async def check_custody_gaps(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check for gaps in chain of custody"""
    
    # Check if evidence exists
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    # Get all custody entries ordered by timestamp
    entries = db.query(ChainOfCustodyEntry).filter(
        ChainOfCustodyEntry.evidence_id == evidence_id
    ).order_by(ChainOfCustodyEntry.timestamp.asc()).all()
    
    gaps = []
    issues = []
    
    for i in range(len(entries) - 1):
        current_entry = entries[i]
        next_entry = entries[i + 1]
        
        # Check for custodian continuity
        if current_entry.custodian_to != next_entry.custodian_from:
            gaps.append({
                "type": "CUSTODIAN_MISMATCH",
                "entry1_id": current_entry.id,
                "entry2_id": next_entry.id,
                "timestamp1": current_entry.timestamp,
                "timestamp2": next_entry.timestamp,
                "description": f"Custodian mismatch: {current_entry.custodian_to} -> {next_entry.custodian_from}"
            })
        
        # Check for location continuity  
        if current_entry.location_to != next_entry.location_from:
            gaps.append({
                "type": "LOCATION_MISMATCH",
                "entry1_id": current_entry.id,
                "entry2_id": next_entry.id,
                "timestamp1": current_entry.timestamp,
                "timestamp2": next_entry.timestamp,
                "description": f"Location mismatch: {current_entry.location_to} -> {next_entry.location_from}"
            })
        
        # Check for time gaps (more than 1 hour between entries might be suspicious)
        time_diff = next_entry.timestamp - current_entry.timestamp
        if time_diff.total_seconds() > 3600:  # 1 hour
            issues.append({
                "type": "TIME_GAP",
                "entry1_id": current_entry.id,
                "entry2_id": next_entry.id,
                "timestamp1": current_entry.timestamp,
                "timestamp2": next_entry.timestamp,
                "gap_hours": round(time_diff.total_seconds() / 3600, 2),
                "description": f"Large time gap: {round(time_diff.total_seconds() / 3600, 2)} hours"
            })
    
    return {
        "evidence_id": evidence_id,
        "total_entries": len(entries),
        "gaps_found": len(gaps),
        "issues_found": len(issues),
        "gaps": gaps,
        "issues": issues,
        "chain_intact": len(gaps) == 0
    }

@router.get("/", response_model=List[ChainOfCustodyResponse])
async def list_custody_entries(
    case_id: Optional[str] = None,
    custodian: Optional[str] = None,
    action: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List chain of custody entries with filters"""
    
    query = db.query(ChainOfCustodyEntry)
    
    if case_id:
        # Join with Evidence to filter by case_id
        query = query.join(Evidence).filter(Evidence.case_id == case_id)
    
    if custodian:
        query = query.filter(
            (ChainOfCustodyEntry.custodian_from == custodian) |
            (ChainOfCustodyEntry.custodian_to == custodian)
        )
    
    if action:
        query = query.filter(ChainOfCustodyEntry.action == action)
    
    entries = query.order_by(ChainOfCustodyEntry.timestamp.desc()).offset(skip).limit(limit).all()
    return [ChainOfCustodyResponse.from_orm(entry) for entry in entries]

@router.delete("/{evidence_id}/entries/{entry_id}")
async def delete_custody_entry(
    evidence_id: str,
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete chain of custody entry (admin only - breaks chain)"""
    
    # Check if user has admin privileges
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete custody entries"
        )
    
    entry = db.query(ChainOfCustodyEntry).filter(
        ChainOfCustodyEntry.id == entry_id,
        ChainOfCustodyEntry.evidence_id == evidence_id
    ).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custody entry not found"
        )
    
    try:
        db.delete(entry)
        db.commit()
        return {"message": "Custody entry deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete custody entry: {str(e)}"
        )