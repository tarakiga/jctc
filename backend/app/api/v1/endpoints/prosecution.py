"""
Prosecution Workflow API endpoints for the JCTC Management System.

This module provides comprehensive APIs for managing the prosecution workflow,
including charges, court sessions, and case outcomes. These endpoints complete
the PRD requirements for prosecution case management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date

from app.core.deps import get_db, get_current_user
from app.models import (
    Case, Charge, CourtSession, Outcome, User, 
    ChargeStatus, Disposition
)
from app.models.user import UserRole
from app.schemas.prosecution import (
    ChargeCreate, ChargeUpdate, ChargeResponse,
    CourtSessionCreate, CourtSessionUpdate, CourtSessionResponse,
    OutcomeCreate, OutcomeUpdate, OutcomeResponse,
    ProsecutionSummaryResponse, ChargeStatisticsResponse
)
from app.utils.audit_integration import (
    AuditableEndpoint, log_case_access, log_prosecution_activity
)

router = APIRouter(prefix="/prosecution", tags=["prosecution"])


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def require_roles(current_user: User, allowed_roles: list) -> None:
    """
    Check if user's role is in the list of allowed roles.
    Raises HTTPException if not authorized.
    
    Args:
        current_user: The authenticated user
        allowed_roles: List of role names that are allowed
    """
    # Handle both enum and string role values
    role_value = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_value.upper() not in [r.upper() for r in allowed_roles]:
        raise HTTPException(
            status_code=403,
            detail=f"Required roles: {allowed_roles}"
        )


def check_case_access(db: Session, case_id, current_user: User):
    """
    Check if user has access to a specific case.
    Returns the case if accessible, None otherwise.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        return None
    
    # Admins have access to all cases
    role_value = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_value.upper() == "ADMIN":
        return case
    
    # Supervisors have access to all cases
    if role_value.upper() == "SUPERVISOR":
        return case
    
    # Check if user is assigned to the case
    if hasattr(case, 'assigned_officer_id') and case.assigned_officer_id == current_user.id:
        return case
    
    # Allow prosecution-related roles
    allowed_roles = ["INVESTIGATOR", "PROSECUTOR", "FORENSIC", "INTAKE", "LIAISON"]
    if role_value.upper() in allowed_roles:
        return case
    
    return None


# ==================== CHARGE MANAGEMENT APIs ====================

@router.post("/{case_id}/charges", response_model=ChargeResponse)
@AuditableEndpoint(
    action="CREATE",
    entity="CHARGE",
    description="File criminal charges for case",
    capture_request_data=True
)
async def file_charges(
    case_id: UUID,
    charge_data: ChargeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    File criminal charges for a case.
    
    Required permissions: PROSECUTOR role
    """
    # Verify user has prosecutor role
    require_roles(current_user, ["PROSECUTOR", "ADMIN"])
    
    # Verify case exists and user has access
    case = check_case_access(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Create new charge
    charge = Charge(
        case_id=case_id,
        statute=charge_data.statute,
        description=charge_data.description,
        filed_at=charge_data.filed_at or datetime.utcnow(),
        status=charge_data.status or ChargeStatus.FILED,
        created_by=current_user.id,
        updated_by=current_user.id
    )
    
    db.add(charge)
    db.commit()
    db.refresh(charge)
    
    # Log prosecution activity
    log_prosecution_activity(
        db=db,
        user_id=current_user.id,
        case_id=case_id,
        action="CHARGES_FILED",
        details={
            "charge_id": str(charge.id),
            "statute": charge_data.statute,
            "status": charge_data.status.value if charge_data.status else "FILED"
        }
    )
    
    return charge


@router.get("/{case_id}/charges", response_model=List[ChargeResponse])
async def list_case_charges(
    case_id: UUID,
    status: Optional[ChargeStatus] = Query(None, description="Filter by charge status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all charges for a case with optional status filtering.
    """
    # Verify case access
    case = check_case_access(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Build query
    query = db.query(Charge).filter(Charge.case_id == case_id)
    
    if status:
        query = query.filter(Charge.status == status)
    
    charges = query.order_by(Charge.filed_at.desc()).all()
    
    # Log access
    log_case_access(
        db=db,
        user_id=current_user.id,
        case_id=case_id,
        action="VIEW_CHARGES"
    )
    
    return charges


@router.get("/charges/{charge_id}", response_model=ChargeResponse)
async def get_charge_details(
    charge_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific charge.
    """
    charge = db.query(Charge).filter(Charge.id == charge_id).first()
    if not charge:
        raise HTTPException(status_code=404, detail="Charge not found")
    
    # Check case access
    case = check_case_access(db, charge.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    return charge


@router.put("/charges/{charge_id}", response_model=ChargeResponse)
@AuditableEndpoint(
    action="UPDATE",
    entity="CHARGE",
    description="Update charge information",
    capture_request_data=True
)
async def update_charge(
    charge_id: UUID,
    charge_update: ChargeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update charge information.
    
    Required permissions: PROSECUTOR role
    """
    require_roles(current_user, ["PROSECUTOR", "ADMIN"])
    
    charge = db.query(Charge).filter(Charge.id == charge_id).first()
    if not charge:
        raise HTTPException(status_code=404, detail="Charge not found")
    
    # Check case access
    case = check_case_access(db, charge.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Update fields
    update_data = charge_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(charge, field, value)
    
    charge.updated_by = current_user.id
    charge.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(charge)
    
    # Log activity
    log_prosecution_activity(
        db=db,
        user_id=current_user.id,
        case_id=charge.case_id,
        action="CHARGE_UPDATED",
        details={
            "charge_id": str(charge_id),
            "updated_fields": list(update_data.keys())
        }
    )
    
    return charge


@router.delete("/charges/{charge_id}")
@AuditableEndpoint(
    action="DELETE",
    entity="CHARGE",
    description="Withdraw criminal charge",
    capture_request_data=True
)
async def withdraw_charge(
    charge_id: UUID,
    reason: str = Query(..., description="Reason for withdrawing charge"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Withdraw a criminal charge.
    
    Required permissions: PROSECUTOR role or ADMIN
    """
    require_roles(current_user, ["PROSECUTOR", "ADMIN"])
    
    charge = db.query(Charge).filter(Charge.id == charge_id).first()
    if not charge:
        raise HTTPException(status_code=404, detail="Charge not found")
    
    # Check case access
    case = check_case_access(db, charge.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Update charge status to withdrawn
    charge.status = ChargeStatus.WITHDRAWN
    charge.updated_by = current_user.id
    charge.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Log activity
    log_prosecution_activity(
        db=db,
        user_id=current_user.id,
        case_id=charge.case_id,
        action="CHARGE_WITHDRAWN",
        details={
            "charge_id": str(charge_id),
            "reason": reason
        }
    )
    
    return {"message": "Charge withdrawn successfully", "charge_id": charge_id}


# ==================== COURT SESSION MANAGEMENT APIs ====================

@router.post("/{case_id}/court-sessions", response_model=CourtSessionResponse)
@AuditableEndpoint(
    action="CREATE",
    entity="COURT_SESSION",
    description="Schedule court session for case",
    capture_request_data=True
)
async def schedule_court_session(
    case_id: UUID,
    session_data: CourtSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Schedule a court session for a case.
    
    Required permissions: PROSECUTOR role
    """
    require_roles(current_user, ["PROSECUTOR", "ADMIN"])
    
    # Verify case access
    case = check_case_access(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Create court session
    court_session = CourtSession(
        case_id=case_id,
        session_date=session_data.session_date,
        court=session_data.court,
        judge=session_data.judge,
        session_type=session_data.session_type,
        notes=session_data.notes,
        created_by=current_user.id,
        updated_by=current_user.id
    )
    
    db.add(court_session)
    db.commit()
    db.refresh(court_session)
    
    # Log activity
    log_prosecution_activity(
        db=db,
        user_id=current_user.id,
        case_id=case_id,
        action="COURT_SESSION_SCHEDULED",
        details={
            "session_id": str(court_session.id),
            "session_date": session_data.session_date.isoformat() if session_data.session_date else None,
            "court": session_data.court,
            "session_type": session_data.session_type
        }
    )
    
    return court_session


@router.get("/{case_id}/court-sessions", response_model=List[CourtSessionResponse])
async def list_court_sessions(
    case_id: UUID,
    upcoming_only: bool = Query(False, description="Show only upcoming sessions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List court sessions for a case.
    """
    # Verify case access
    case = check_case_access(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    query = db.query(CourtSession).filter(CourtSession.case_id == case_id)
    
    if upcoming_only:
        query = query.filter(CourtSession.session_date >= datetime.utcnow())
    
    sessions = query.order_by(CourtSession.session_date.desc()).all()
    
    return sessions


@router.get("/court-sessions/{session_id}", response_model=CourtSessionResponse)
async def get_court_session_details(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a court session.
    """
    session = db.query(CourtSession).filter(CourtSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Court session not found")
    
    # Check case access
    case = check_case_access(db, session.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    return session


@router.put("/court-sessions/{session_id}", response_model=CourtSessionResponse)
@AuditableEndpoint(
    action="UPDATE",
    entity="COURT_SESSION",
    description="Update court session details",
    capture_request_data=True
)
async def update_court_session(
    session_id: UUID,
    session_update: CourtSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update court session details.
    
    Required permissions: PROSECUTOR role
    """
    require_roles(current_user, ["PROSECUTOR", "ADMIN"])
    
    session = db.query(CourtSession).filter(CourtSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Court session not found")
    
    # Check case access
    case = check_case_access(db, session.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Update fields
    update_data = session_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)
    
    session.updated_by = current_user.id
    session.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(session)
    
    # Log activity
    log_prosecution_activity(
        db=db,
        user_id=current_user.id,
        case_id=session.case_id,
        action="COURT_SESSION_UPDATED",
        details={
            "session_id": str(session_id),
            "updated_fields": list(update_data.keys())
        }
    )
    
    return session


# ==================== CASE OUTCOME MANAGEMENT APIs ====================

@router.post("/{case_id}/outcomes", response_model=OutcomeResponse)
@AuditableEndpoint(
    action="CREATE",
    entity="CASE_OUTCOME",
    description="Record case outcome and disposition",
    capture_request_data=True
)
async def record_case_outcome(
    case_id: UUID,
    outcome_data: OutcomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record the final outcome and disposition for a case.
    
    Required permissions: PROSECUTOR role
    """
    require_roles(current_user, ["PROSECUTOR", "ADMIN"])
    
    # Verify case access
    case = check_case_access(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Check if outcome already exists
    existing_outcome = db.query(Outcome).filter(Outcome.case_id == case_id).first()
    if existing_outcome:
        raise HTTPException(
            status_code=400, 
            detail="Case outcome already recorded. Use update endpoint to modify."
        )
    
    # Create outcome
    outcome = Outcome(
        case_id=case_id,
        disposition=outcome_data.disposition,
        sentence=outcome_data.sentence,
        restitution=outcome_data.restitution,
        closed_at=outcome_data.closed_at or datetime.utcnow(),
        notes=outcome_data.notes,
        created_by=current_user.id,
        updated_by=current_user.id
    )
    
    db.add(outcome)
    
    # Update case status to closed
    case.status = "CLOSED"
    case.updated_by = current_user.id
    case.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(outcome)
    
    # Log activity
    log_prosecution_activity(
        db=db,
        user_id=current_user.id,
        case_id=case_id,
        action="CASE_OUTCOME_RECORDED",
        details={
            "outcome_id": str(outcome.id),
            "disposition": outcome_data.disposition.value,
            "case_closed": True
        }
    )
    
    return outcome


@router.get("/{case_id}/outcomes", response_model=List[OutcomeResponse])
async def get_case_outcomes(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get case outcomes (usually there should be only one per case).
    """
    # Verify case access
    case = check_case_access(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    outcomes = db.query(Outcome).filter(Outcome.case_id == case_id).all()
    return outcomes


@router.put("/outcomes/{outcome_id}", response_model=OutcomeResponse)
@AuditableEndpoint(
    action="UPDATE",
    entity="CASE_OUTCOME",
    description="Update case outcome details",
    capture_request_data=True
)
async def update_case_outcome(
    outcome_id: UUID,
    outcome_update: OutcomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update case outcome details.
    
    Required permissions: PROSECUTOR role
    """
    require_roles(current_user, ["PROSECUTOR", "ADMIN"])
    
    outcome = db.query(Outcome).filter(Outcome.id == outcome_id).first()
    if not outcome:
        raise HTTPException(status_code=404, detail="Case outcome not found")
    
    # Check case access
    case = check_case_access(db, outcome.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Update fields
    update_data = outcome_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(outcome, field, value)
    
    outcome.updated_by = current_user.id
    outcome.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(outcome)
    
    # Log activity
    log_prosecution_activity(
        db=db,
        user_id=current_user.id,
        case_id=outcome.case_id,
        action="CASE_OUTCOME_UPDATED",
        details={
            "outcome_id": str(outcome_id),
            "updated_fields": list(update_data.keys())
        }
    )
    
    return outcome


# ==================== PROSECUTION ANALYTICS & SUMMARY APIs ====================

@router.get("/{case_id}/summary", response_model=ProsecutionSummaryResponse)
async def get_prosecution_summary(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive prosecution summary for a case.
    """
    # Verify case access
    case = check_case_access(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Get charges
    charges = db.query(Charge).filter(Charge.case_id == case_id).all()
    
    # Get court sessions
    court_sessions = db.query(CourtSession).filter(
        CourtSession.case_id == case_id
    ).order_by(CourtSession.session_date.desc()).all()
    
    # Get outcome
    outcome = db.query(Outcome).filter(Outcome.case_id == case_id).first()
    
    # Calculate prosecution metrics
    total_charges = len(charges)
    active_charges = len([c for c in charges if c.status == ChargeStatus.FILED])
    withdrawn_charges = len([c for c in charges if c.status == ChargeStatus.WITHDRAWN])
    
    upcoming_sessions = len([
        s for s in court_sessions 
        if s.session_date and s.session_date >= datetime.utcnow()
    ])
    
    return ProsecutionSummaryResponse(
        case_id=case_id,
        total_charges=total_charges,
        active_charges=active_charges,
        withdrawn_charges=withdrawn_charges,
        total_court_sessions=len(court_sessions),
        upcoming_sessions=upcoming_sessions,
        case_outcome=outcome,
        latest_court_session=court_sessions[0] if court_sessions else None,
        charges=charges,
        court_sessions=court_sessions[:5]  # Latest 5 sessions
    )


@router.get("/statistics/charges", response_model=ChargeStatisticsResponse)
async def get_charge_statistics(
    start_date: Optional[date] = Query(None, description="Start date for statistics"),
    end_date: Optional[date] = Query(None, description="End date for statistics"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get prosecution statistics and metrics.
    
    Available to PROSECUTOR, SUPERVISOR, and ADMIN roles.
    """
    require_roles(current_user, ["PROSECUTOR", "SUPERVISOR", "ADMIN"])
    
    # Build base query
    query = db.query(Charge)
    
    if start_date:
        query = query.filter(Charge.filed_at >= start_date)
    if end_date:
        query = query.filter(Charge.filed_at <= end_date)
    
    charges = query.all()
    
    # Calculate statistics
    total_charges = len(charges)
    filed_charges = len([c for c in charges if c.status == ChargeStatus.FILED])
    withdrawn_charges = len([c for c in charges if c.status == ChargeStatus.WITHDRAWN])
    amended_charges = len([c for c in charges if c.status == ChargeStatus.AMENDED])
    
    # Get outcomes for conviction rate
    outcomes_query = db.query(Outcome)
    if start_date:
        outcomes_query = outcomes_query.filter(Outcome.closed_at >= start_date)
    if end_date:
        outcomes_query = outcomes_query.filter(Outcome.closed_at <= end_date)
    
    outcomes = outcomes_query.all()
    total_outcomes = len(outcomes)
    convictions = len([o for o in outcomes if o.disposition == Disposition.CONVICTED])
    
    conviction_rate = (convictions / total_outcomes * 100) if total_outcomes > 0 else 0
    
    return ChargeStatisticsResponse(
        total_charges=total_charges,
        filed_charges=filed_charges,
        withdrawn_charges=withdrawn_charges,
        amended_charges=amended_charges,
        total_outcomes=total_outcomes,
        convictions=convictions,
        conviction_rate=conviction_rate,
        period_start=start_date,
        period_end=end_date
    )