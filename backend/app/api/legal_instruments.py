from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime, date

from app.database import get_db
from app.models.legal import LegalInstrument
from app.models.case import Case
from app.schemas.legal_instruments import (
    LegalInstrumentCreate,
    LegalInstrumentResponse,
    LegalInstrumentUpdate,
    LegalInstrumentWithCase,
    LegalInstrumentSearchResponse
)
from app.utils.auth import get_current_user
from app.schemas.user import User

router = APIRouter()

@router.post("/", response_model=LegalInstrumentResponse, status_code=status.HTTP_201_CREATED)
async def create_legal_instrument(
    instrument: LegalInstrumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new legal instrument (warrant, MLAT, etc.)"""
    
    # Check if case exists
    if instrument.case_id:
        case = db.query(Case).filter(Case.id == instrument.case_id).first()
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Case not found"
            )
    
    # Generate instrument ID
    instrument_id = str(uuid.uuid4())
    
    # Create legal instrument record
    db_instrument = LegalInstrument(
        id=instrument_id,
        type=instrument.type,
        reference_number=instrument.reference_number,
        title=instrument.title,
        description=instrument.description,
        case_id=instrument.case_id,
        issuing_authority=instrument.issuing_authority,
        issuing_country=instrument.issuing_country,
        receiving_authority=instrument.receiving_authority,
        receiving_country=instrument.receiving_country,
        issue_date=instrument.issue_date,
        expiry_date=instrument.expiry_date,
        execution_deadline=instrument.execution_deadline,
        status=instrument.status or "DRAFT",
        priority=instrument.priority or "MEDIUM",
        subject_matter=instrument.subject_matter,
        legal_basis=instrument.legal_basis,
        conditions=instrument.conditions,
        notes=instrument.notes,
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    try:
        db.add(db_instrument)
        db.commit()
        db.refresh(db_instrument)
        
        return LegalInstrumentResponse.from_orm(db_instrument)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create legal instrument: {str(e)}"
        )

@router.get("/{instrument_id}", response_model=LegalInstrumentWithCase)
async def get_legal_instrument(
    instrument_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get legal instrument details with case information"""
    
    instrument = db.query(LegalInstrument).filter(LegalInstrument.id == instrument_id).first()
    if not instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Legal instrument not found"
        )
    
    return LegalInstrumentWithCase.from_orm(instrument)

@router.get("/", response_model=List[LegalInstrumentResponse])
async def list_legal_instruments(
    type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    issuing_country: Optional[str] = None,
    receiving_country: Optional[str] = None,
    case_id: Optional[str] = None,
    expiring_soon: Optional[bool] = None,  # Within 30 days
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List legal instruments with optional filters"""
    
    query = db.query(LegalInstrument)
    
    if type:
        query = query.filter(LegalInstrument.type == type)
    if status:
        query = query.filter(LegalInstrument.status == status)
    if priority:
        query = query.filter(LegalInstrument.priority == priority)
    if issuing_country:
        query = query.filter(LegalInstrument.issuing_country == issuing_country)
    if receiving_country:
        query = query.filter(LegalInstrument.receiving_country == receiving_country)
    if case_id:
        query = query.filter(LegalInstrument.case_id == case_id)
    
    if expiring_soon:
        from datetime import timedelta
        thirty_days_from_now = date.today() + timedelta(days=30)
        query = query.filter(
            LegalInstrument.expiry_date <= thirty_days_from_now,
            LegalInstrument.expiry_date >= date.today(),
            LegalInstrument.status.in_(["ACTIVE", "PENDING", "ISSUED"])
        )
    
    instruments = query.order_by(LegalInstrument.created_at.desc()).offset(skip).limit(limit).all()
    return [LegalInstrumentResponse.from_orm(instrument) for instrument in instruments]

@router.put("/{instrument_id}", response_model=LegalInstrumentResponse)
async def update_legal_instrument(
    instrument_id: str,
    instrument_update: LegalInstrumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update legal instrument"""
    
    db_instrument = db.query(LegalInstrument).filter(LegalInstrument.id == instrument_id).first()
    if not db_instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Legal instrument not found"
        )
    
    # Update fields
    update_data = instrument_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_instrument, field, value)
    
    db_instrument.updated_at = datetime.utcnow()
    db_instrument.updated_by = current_user.id
    
    try:
        db.commit()
        db.refresh(db_instrument)
        return LegalInstrumentResponse.from_orm(db_instrument)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update legal instrument: {str(e)}"
        )

@router.delete("/{instrument_id}")
async def delete_legal_instrument(
    instrument_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete legal instrument (soft delete)"""
    
    db_instrument = db.query(LegalInstrument).filter(LegalInstrument.id == instrument_id).first()
    if not db_instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Legal instrument not found"
        )
    
    # Soft delete
    db_instrument.status = "CANCELLED"
    db_instrument.updated_at = datetime.utcnow()
    db_instrument.updated_by = current_user.id
    
    try:
        db.commit()
        return {"message": "Legal instrument cancelled successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel legal instrument: {str(e)}"
        )

@router.post("/{instrument_id}/execute")
async def execute_legal_instrument(
    instrument_id: str,
    execution_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark legal instrument as executed"""
    
    db_instrument = db.query(LegalInstrument).filter(LegalInstrument.id == instrument_id).first()
    if not db_instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Legal instrument not found"
        )
    
    # Check if instrument can be executed
    if db_instrument.status not in ["ACTIVE", "ISSUED", "PENDING"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot execute instrument with status: {db_instrument.status}"
        )
    
    # Update status to executed
    db_instrument.status = "EXECUTED"
    db_instrument.execution_date = datetime.utcnow().date()
    
    if execution_notes:
        current_notes = db_instrument.notes or ""
        db_instrument.notes = f"{current_notes}\n\nExecution Notes ({datetime.utcnow().strftime('%Y-%m-%d %H:%M')}): {execution_notes}"
    
    db_instrument.updated_at = datetime.utcnow()
    db_instrument.updated_by = current_user.id
    
    try:
        db.commit()
        db.refresh(db_instrument)
        return {
            "message": "Legal instrument executed successfully",
            "instrument_id": instrument_id,
            "execution_date": db_instrument.execution_date,
            "status": db_instrument.status
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute legal instrument: {str(e)}"
        )

@router.get("/warrants", response_model=List[LegalInstrumentResponse])
async def list_warrants(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    issuing_country: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all warrants"""
    
    query = db.query(LegalInstrument).filter(
        LegalInstrument.type.in_(["SEARCH_WARRANT", "ARREST_WARRANT", "PRODUCTION_ORDER"])
    )
    
    if status:
        query = query.filter(LegalInstrument.status == status)
    if priority:
        query = query.filter(LegalInstrument.priority == priority)
    if issuing_country:
        query = query.filter(LegalInstrument.issuing_country == issuing_country)
    
    warrants = query.order_by(LegalInstrument.created_at.desc()).offset(skip).limit(limit).all()
    return [LegalInstrumentResponse.from_orm(warrant) for warrant in warrants]

@router.get("/mlats", response_model=List[LegalInstrumentResponse])
async def list_mlats(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    requesting_country: Optional[str] = None,
    requested_country: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all MLATs (Mutual Legal Assistance Treaties)"""
    
    query = db.query(LegalInstrument).filter(
        LegalInstrument.type.in_(["MLAT_REQUEST", "MLAT_INCOMING", "MLAT_OUTGOING"])
    )
    
    if status:
        query = query.filter(LegalInstrument.status == status)
    if priority:
        query = query.filter(LegalInstrument.priority == priority)
    if requesting_country:
        query = query.filter(LegalInstrument.issuing_country == requesting_country)
    if requested_country:
        query = query.filter(LegalInstrument.receiving_country == requested_country)
    
    mlats = query.order_by(LegalInstrument.created_at.desc()).offset(skip).limit(limit).all()
    return [LegalInstrumentResponse.from_orm(mlat) for mlat in mlats]

@router.get("/expiring", response_model=List[LegalInstrumentResponse])
async def get_expiring_instruments(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get legal instruments expiring within specified days"""
    
    from datetime import timedelta
    target_date = date.today() + timedelta(days=days)
    
    expiring_instruments = db.query(LegalInstrument).filter(
        LegalInstrument.expiry_date <= target_date,
        LegalInstrument.expiry_date >= date.today(),
        LegalInstrument.status.in_(["ACTIVE", "PENDING", "ISSUED"])
    ).order_by(LegalInstrument.expiry_date.asc()).all()
    
    return [LegalInstrumentResponse.from_orm(instrument) for instrument in expiring_instruments]

@router.get("/deadline-alerts")
async def get_deadline_alerts(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get alerts for instruments with upcoming execution deadlines"""
    
    from datetime import timedelta
    target_date = date.today() + timedelta(days=days)
    
    upcoming_deadlines = db.query(LegalInstrument).filter(
        LegalInstrument.execution_deadline <= target_date,
        LegalInstrument.execution_deadline >= date.today(),
        LegalInstrument.status.in_(["ACTIVE", "PENDING", "ISSUED"])
    ).order_by(LegalInstrument.execution_deadline.asc()).all()
    
    alerts = []
    for instrument in upcoming_deadlines:
        days_remaining = (instrument.execution_deadline - date.today()).days
        
        urgency = "LOW"
        if days_remaining <= 1:
            urgency = "CRITICAL"
        elif days_remaining <= 3:
            urgency = "HIGH"
        elif days_remaining <= 7:
            urgency = "MEDIUM"
        
        alerts.append({
            "instrument_id": instrument.id,
            "type": instrument.type,
            "reference_number": instrument.reference_number,
            "title": instrument.title,
            "execution_deadline": instrument.execution_deadline,
            "days_remaining": days_remaining,
            "urgency": urgency,
            "case_id": instrument.case_id,
            "priority": instrument.priority
        })
    
    return {
        "alerts": alerts,
        "total_alerts": len(alerts),
        "critical": len([a for a in alerts if a["urgency"] == "CRITICAL"]),
        "high": len([a for a in alerts if a["urgency"] == "HIGH"]),
        "medium": len([a for a in alerts if a["urgency"] == "MEDIUM"]),
        "low": len([a for a in alerts if a["urgency"] == "LOW"])
    }

@router.post("/search", response_model=List[LegalInstrumentSearchResponse])
async def search_legal_instruments(
    reference_number: Optional[str] = None,
    title: Optional[str] = None,
    subject_matter: Optional[str] = None,
    issuing_authority: Optional[str] = None,
    receiving_authority: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Advanced search for legal instruments"""
    
    query = db.query(LegalInstrument).filter(LegalInstrument.status != "CANCELLED")
    
    if reference_number:
        query = query.filter(LegalInstrument.reference_number.ilike(f"%{reference_number}%"))
    if title:
        query = query.filter(LegalInstrument.title.ilike(f"%{title}%"))
    if subject_matter:
        query = query.filter(LegalInstrument.subject_matter.ilike(f"%{subject_matter}%"))
    if issuing_authority:
        query = query.filter(LegalInstrument.issuing_authority.ilike(f"%{issuing_authority}%"))
    if receiving_authority:
        query = query.filter(LegalInstrument.receiving_authority.ilike(f"%{receiving_authority}%"))
    if date_from:
        query = query.filter(LegalInstrument.issue_date >= date_from)
    if date_to:
        query = query.filter(LegalInstrument.issue_date <= date_to)
    
    instruments = query.order_by(LegalInstrument.issue_date.desc()).limit(50).all()
    return [LegalInstrumentSearchResponse.from_orm(instrument) for instrument in instruments]

@router.get("/statistics")
async def get_legal_instruments_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics about legal instruments"""
    
    total_instruments = db.query(LegalInstrument).count()
    
    # Count by type
    type_counts = db.query(
        LegalInstrument.type,
        db.func.count(LegalInstrument.id).label('count')
    ).group_by(LegalInstrument.type).all()
    
    # Count by status
    status_counts = db.query(
        LegalInstrument.status,
        db.func.count(LegalInstrument.id).label('count')
    ).group_by(LegalInstrument.status).all()
    
    # Count by priority
    priority_counts = db.query(
        LegalInstrument.priority,
        db.func.count(LegalInstrument.id).label('count')
    ).group_by(LegalInstrument.priority).all()
    
    # Expiring soon (next 30 days)
    from datetime import timedelta
    thirty_days = date.today() + timedelta(days=30)
    expiring_soon = db.query(LegalInstrument).filter(
        LegalInstrument.expiry_date <= thirty_days,
        LegalInstrument.expiry_date >= date.today(),
        LegalInstrument.status.in_(["ACTIVE", "PENDING", "ISSUED"])
    ).count()
    
    # Overdue (past execution deadline)
    overdue = db.query(LegalInstrument).filter(
        LegalInstrument.execution_deadline < date.today(),
        LegalInstrument.status.in_(["ACTIVE", "PENDING", "ISSUED"])
    ).count()
    
    return {
        "total_instruments": total_instruments,
        "by_type": {item.type: item.count for item in type_counts},
        "by_status": {item.status: item.count for item in status_counts},
        "by_priority": {item.priority: item.count for item in priority_counts},
        "expiring_soon": expiring_soon,
        "overdue": overdue
    }

@router.post("/{instrument_id}/extend-deadline")
async def extend_deadline(
    instrument_id: str,
    new_deadline: date,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extend the execution deadline of a legal instrument"""
    
    db_instrument = db.query(LegalInstrument).filter(LegalInstrument.id == instrument_id).first()
    if not db_instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Legal instrument not found"
        )
    
    if db_instrument.status not in ["ACTIVE", "PENDING", "ISSUED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot extend deadline for instruments with current status"
        )
    
    old_deadline = db_instrument.execution_deadline
    db_instrument.execution_deadline = new_deadline
    
    # Add note about deadline extension
    current_notes = db_instrument.notes or ""
    extension_note = f"\n\nDeadline Extended ({datetime.utcnow().strftime('%Y-%m-%d %H:%M')}): From {old_deadline} to {new_deadline}. Reason: {reason}"
    db_instrument.notes = current_notes + extension_note
    
    db_instrument.updated_at = datetime.utcnow()
    db_instrument.updated_by = current_user.id
    
    try:
        db.commit()
        db.refresh(db_instrument)
        return {
            "message": "Deadline extended successfully",
            "instrument_id": instrument_id,
            "old_deadline": old_deadline,
            "new_deadline": new_deadline,
            "reason": reason
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extend deadline: {str(e)}"
        )