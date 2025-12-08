from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import joinedload
from app.database.base import get_db
from app.models.case import Case, CaseStatus, CaseAssignment, AssignmentRole
from app.models.user import User, UserRole
from app.models.task import ActionLog, Task
from app.schemas.case import (
    CaseCreate, CaseUpdate, CaseResponse, 
    CaseAssignmentCreate, CaseAssignmentResponse
)
from app.models.lookup_value import LookupValue
from app.utils.dependencies import get_current_active_user, require_role
import secrets
import string

router = APIRouter()

def generate_case_number() -> str:
    """Generate unique case number."""
    year = datetime.now().year
    random_part = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"JCTC-{year}-{random_part}"

@router.post("/", response_model=CaseResponse)
async def create_case(
    case_data: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.INTAKE, UserRole.INVESTIGATOR, UserRole.SUPERVISOR, UserRole.ADMIN))
):
    """
    Create a new case with full intake information.
    
    Accepts intake fields including:
    - risk_flags: List of risk indicators (child_safety, imminent_harm, trafficking, sextortion)
    - platforms_implicated: List of social media/tech platforms involved
    - intake_channel: How the case was reported (WALK_IN, HOTLINE, EMAIL, REFERRAL, API)
    - reporter_type: Type of reporter (ANONYMOUS, VICTIM, PARENT, LEA, NGO)
    - reporter_name: Name if not anonymous
    - reporter_contact: Contact info {phone, email}
    - lga_state_location: Location in Nigeria (LGA/State)
    - incident_datetime: When the incident occurred
    
    Returns 422 Validation Error if required fields are missing or invalid.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Generate unique case number
    case_number = generate_case_number()
    
    # Ensure case number is unique
    while True:
        result = await db.execute(select(Case).filter(Case.case_number == case_number))
        if not result.scalar_one_or_none():
            break
        case_number = generate_case_number()
    
    # Normalize risk flags from frontend format to backend format
    risk_flags = []
    if case_data.risk_flags:
        flag_mapping = {
            'child': 'CHILD_SAFETY',
            'imminent_harm': 'IMMINENT_HARM',
            'trafficking': 'TRAFFICKING',
            'sextortion': 'SEXTORTION',
        }
        for flag in case_data.risk_flags:
            normalized = flag_mapping.get(flag, flag.upper().replace(' ', '_'))
            risk_flags.append(normalized)
    
    # Prepare reporter contact as dict for JSONB storage
    reporter_contact_dict = None
    if case_data.reporter_contact:
        reporter_contact_dict = {
            'phone': case_data.reporter_contact.phone,
            'email': case_data.reporter_contact.email
        }
    
    # Store case_type directly as string (references lookup_values category='case_type')
    case_type_value = case_data.case_type  # Use the value directly
    
    # Create new case with all intake fields
    # Determine initial status
    initial_status = CaseStatus.OPEN
    if case_data.status:
        try:
            initial_status = CaseStatus(case_data.status)
        except ValueError:
            # If invalid status, use default
            pass
    
    db_case = Case(
        case_number=case_number,
        title=case_data.title,
        case_type=case_type_value,  # Store case_type string directly
        description=case_data.description,
        severity=case_data.severity,
        status=initial_status,  # Use the status from form or default to OPEN
        date_reported=case_data.date_reported or datetime.utcnow(),
        local_or_international=case_data.local_or_international,
        originating_country=case_data.originating_country,
        cooperating_countries=case_data.cooperating_countries,
        mlat_reference=case_data.mlat_reference,
        created_by=current_user.id,
        # New intake fields
        intake_channel=case_data.intake_channel,
        risk_flags=risk_flags,
        platforms_implicated=case_data.platforms_implicated,
        lga_state_location=case_data.lga_state_location,
        incident_datetime=case_data.incident_datetime,
        reporter_type=case_data.reporter_type,
        reporter_name=case_data.reporter_name,
        reporter_contact=reporter_contact_dict
    )
    
    try:
        db.add(db_case)
        await db.commit()
        await db.refresh(db_case)
        logger.info(f"Case created successfully: {case_number} by user {current_user.id}")
        return db_case
    except Exception as e:
        await db.rollback()
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Failed to create case: {str(e)}")
        print(f"=== CASE CREATION ERROR ===\n{error_trace}\n=== END ERROR ===")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create case: {str(e)}"
        )

@router.get("/", response_model=List[CaseResponse])
async def list_cases(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[CaseStatus] = None,
    local_or_international: Optional[str] = None,
    severity: Optional[int] = Query(None, ge=1, le=5),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List cases with filtering options."""
    query = select(Case)
    
    # Apply filters
    filters = []
    
    if status:
        filters.append(Case.status == status)
    
    if local_or_international:
        filters.append(Case.local_or_international == local_or_international)
    
    if severity:
        filters.append(Case.severity == severity)
    
    if search:
        search_filter = or_(
            Case.title.ilike(f"%{search}%"),
            Case.case_number.ilike(f"%{search}%"),
            Case.description.ilike(f"%{search}%")
        )
        filters.append(search_filter)
    
    # Role-based access control
    if current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        # Non-supervisors can only see cases they created or are assigned to
        access_filter = or_(
            Case.created_by == current_user.id,
            Case.lead_investigator == current_user.id,
            Case.id.in_(
                select(CaseAssignment.case_id).filter(
                    CaseAssignment.user_id == current_user.id
                )
            )
        )
        filters.append(access_filter)
    
    if filters:
        query = query.filter(and_(*filters))
    
    query = query.offset(skip).limit(limit).order_by(Case.date_reported.desc())
    result = await db.execute(query)
    cases = result.scalars().all()
    
    return cases

@router.get("/stats")
async def get_case_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get case statistics."""
    # Total cases count
    total_result = await db.execute(select(func.count(Case.id)))
    total = total_result.scalar()
    
    # Cases by status
    status_result = await db.execute(
        select(Case.status, func.count(Case.id))
        .group_by(Case.status)
    )
    by_status = {str(status): count for status, count in status_result.all()}
    
    # Cases by severity
    severity_result = await db.execute(
        select(Case.severity, func.count(Case.id))
        .group_by(Case.severity)
    )
    by_severity = {severity: count for severity, count in severity_result.all()}
    
    # Recent cases (last 10)
    recent_result = await db.execute(
        select(Case)
        .order_by(Case.created_at.desc())
        .limit(10)
    )
    recent_cases = recent_result.scalars().all()
    
    return {
        "total": total,
        "by_status": by_status,
        "by_severity": by_severity,
        "recent_cases": recent_cases
    }

@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get case by ID."""
    result = await db.execute(select(Case).filter(Case.id == case_id))
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Check access permissions
    if current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        # Check if user has access to this case
        has_access = (
            case.created_by == current_user.id or
            case.lead_investigator == current_user.id
        )
        
        if not has_access:
            # Check case assignments
            assignment_result = await db.execute(
                select(CaseAssignment).filter(
                    and_(
                        CaseAssignment.case_id == case_id,
                        CaseAssignment.user_id == current_user.id
                    )
                )
            )
            if not assignment_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view this case"
                )
    
    # Look up case_type label from lookup_values table
    case_type_label = None
    if case.case_type:
        case_type_result = await db.execute(
            select(LookupValue).filter(
                LookupValue.category == 'case_type',
                LookupValue.value == case.case_type
            )
        )
        case_type_obj = case_type_result.scalar_one_or_none()
        if case_type_obj:
            case_type_label = case_type_obj.label
        else:
            # Fallback to case_type value itself if no label found
            case_type_label = case.case_type
    
    # Create response with case_type label
    response = CaseResponse.model_validate(case)
    response.case_type = case_type_label
    return response

@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: UUID,
    case_update: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update case."""
    result = await db.execute(select(Case).filter(Case.id == case_id))
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Check permissions
    can_edit = (
        current_user.role in [UserRole.SUPERVISOR, UserRole.ADMIN] or
        case.created_by == current_user.id or
        case.lead_investigator == current_user.id
    )
    
    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this case"
        )
    
    # Update case fields
    update_data = case_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "lead_investigator" and value:
            # Verify the assigned user exists and is active
            user_result = await db.execute(select(User).filter(User.id == value))
            assignee = user_result.scalar_one_or_none()
            if not assignee or not assignee.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid lead investigator"
                )
            case.date_assigned = datetime.utcnow()
        
        setattr(case, field, value)
    
    await db.commit()
    await db.refresh(case)
    
    return case

@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a case.
    
    Only the following users can delete a case:
    - Admin users
    - The user who created the case
    """
    result = await db.execute(select(Case).filter(Case.id == case_id))
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Check permissions: Admin or case creator only
    can_delete = (
        current_user.role == UserRole.ADMIN or
        case.created_by == current_user.id
    )
    
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this case. Only admins or the case creator can delete cases."
        )
    
    # Delete the case
    await db.delete(case)
    await db.commit()
    
    return None

@router.post("/{case_id}/assign", response_model=CaseAssignmentResponse)
async def assign_user_to_case(
    case_id: UUID,
    assignment: CaseAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR, UserRole.ADMIN))
):
    """Assign user to case."""
    # Verify case exists
    case_result = await db.execute(select(Case).filter(Case.id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Verify user exists and is active
    user_result = await db.execute(select(User).filter(User.id == assignment.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user"
        )
    
    # Check if assignment already exists
    existing_result = await db.execute(
        select(CaseAssignment).filter(
            and_(
                CaseAssignment.case_id == case_id,
                CaseAssignment.user_id == assignment.user_id,
                CaseAssignment.role == assignment.role
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already assigned to case with this role"
        )
    
    # Create assignment
    db_assignment = CaseAssignment(
        case_id=case_id,
        user_id=assignment.user_id,
        role=assignment.role
    )
    
    db.add(db_assignment)
    await db.commit()
    await db.refresh(db_assignment)
    
    return db_assignment

@router.get("/{case_id}/assignments", response_model=List[CaseAssignmentResponse])
async def get_case_assignments(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get case assignments."""
    # Check if case exists and user has access
    case_result = await db.execute(select(Case).filter(Case.id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Check access (same logic as get_case)
    if current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMIN]:
        has_access = (
            case.created_by == current_user.id or
            case.lead_investigator == current_user.id
        )
        
        if not has_access:
            assignment_result = await db.execute(
                select(CaseAssignment).filter(
                    and_(
                        CaseAssignment.case_id == case_id,
                        CaseAssignment.user_id == current_user.id
                    )
                )
            )
            if not assignment_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view case assignments"
                )
    
    result = await db.execute(
        select(CaseAssignment).filter(CaseAssignment.case_id == case_id)
    )
    assignments = result.scalars().all()
    
    return assignments

@router.delete("/{case_id}/assignments/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_case_assignment(
    case_id: UUID,
    user_id: UUID,
    role: Optional[AssignmentRole] = Query(None, description="Role to unassign; if omitted, removes all roles for the user in this case."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPERVISOR, UserRole.ADMIN))
):
    """Remove a case assignment. If `role` is provided, removes that specific role assignment; otherwise removes all assignments for the user in the case."""
    # Verify case exists
    case_result = await db.execute(select(Case).filter(Case.id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    if role:
        result = await db.execute(
            select(CaseAssignment).filter(
                and_(
                    CaseAssignment.case_id == case_id,
                    CaseAssignment.user_id == user_id,
                    CaseAssignment.role == role
                )
            )
        )
        assignment = result.scalar_one_or_none()
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
        await db.delete(assignment)
        await db.commit()
    else:
        result = await db.execute(
            select(CaseAssignment).filter(
                and_(
                    CaseAssignment.case_id == case_id,
                    CaseAssignment.user_id == user_id
                )
            )
        )
        assignments = result.scalars().all()
        if assignments:
            for a in assignments:
                await db.delete(a)
            await db.commit()
    # No content response
    return None

@router.get("/{case_id}/evidence")
async def get_case_evidence(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all evidence for a specific case."""
    from app.models.evidence import EvidenceItem
    from sqlalchemy.orm import selectinload
    
    # Verify case exists
    case_result = await db.execute(select(Case).filter(Case.id == case_id))
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Get evidence for this case
    evidence_query = select(EvidenceItem).options(
        selectinload(EvidenceItem.chain_entries)
    ).where(EvidenceItem.case_id == case_id)
    
    result = await db.execute(evidence_query)
    evidence_items = result.scalars().all()
    
    # Format evidence items
    formatted_evidence = []
    for item in evidence_items:
        # Get chain of custody status from latest entry
        chain_status = "SECURE"
        if item.chain_entries:
            latest_entry = max(item.chain_entries, key=lambda x: x.timestamp)
            chain_status = latest_entry.action
        
        formatted_evidence.append({
            "id": str(item.id),
            "evidence_number": f"EVD-{str(item.id)[:8].upper()}",
            "type": str(item.category) if item.category else "PHYSICAL",
            "description": item.notes or item.label,
            "case_id": str(item.case_id),
            "collected_date": item.created_at,
            "collected_by": "System",
            "chain_of_custody_status": chain_status,
            "storage_location": item.storage_location,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        })
    
    return formatted_evidence

# Case types endpoints
@router.get("/types/")
async def list_case_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List available case types from lookup_values table."""
    result = await db.execute(
        select(LookupValue)
        .filter(LookupValue.category == 'case_type')
        .order_by(LookupValue.sort_order, LookupValue.label)
    )
    case_types = result.scalars().all()
    return [
        {
            "id": str(ct.id),
            "value": ct.value,
            "label": ct.label,
            "color": ct.color
        }
        for ct in case_types
    ]

# Action log endpoints
@router.get("/{case_id}/actions/")
async def get_case_actions(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get action log entries for a case."""
    # Verify case exists
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Fetch action log entries with user info
    actions_query = (
        select(ActionLog)
        .options(joinedload(ActionLog.user))
        .where(ActionLog.case_id == case_id)
        .order_by(ActionLog.created_at.desc())
    )
    
    result = await db.execute(actions_query)
    actions = result.scalars().all()
    
    # Format response
    formatted_actions = []
    for action in actions:
        formatted_actions.append({
            "id": str(action.id),
            "case_id": str(action.case_id),
            "action_type": action.action or "MANUAL_ENTRY",
            "action_details": action.details or "",
            "performed_by": str(action.user_id) if action.user_id else "",
            "performed_by_name": action.user.full_name if action.user else "System",
            "timestamp": action.created_at.isoformat() if action.created_at else None,
            "metadata": {}
        })
    
    return formatted_actions

@router.post("/{case_id}/actions/manual/")
async def create_manual_action(
    case_id: UUID,
    action_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a manual action log entry."""
    # Verify case exists
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Create action log entry
    new_action = ActionLog(
        case_id=case_id,
        user_id=current_user.id,
        action=action_data.get("action_type", "MANUAL_ENTRY"),
        details=action_data.get("action_details", "")
    )
    
    db.add(new_action)
    await db.commit()
    await db.refresh(new_action)
    
    return {
        "id": str(new_action.id),
        "case_id": str(new_action.case_id),
        "action_type": new_action.action,
        "action_details": new_action.details,
        "performed_by": str(current_user.id),
        "performed_by_name": current_user.full_name,
        "timestamp": new_action.created_at.isoformat() if new_action.created_at else None,
        "metadata": {}
    }

@router.get("/{case_id}/tasks/")
async def get_case_tasks(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all tasks for a specific case."""
    # Verify case exists
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Get tasks for the case
    tasks_result = await db.execute(
        select(Task)
        .options(joinedload(Task.assignee))
        .where(Task.case_id == case_id)
        .order_by(Task.created_at.desc())
    )
    tasks = tasks_result.scalars().unique().all()
    
    return [{
        "id": str(task.id),
        "case_id": str(task.case_id),
        "title": task.title,
        "description": task.description,
        "assigned_to": str(task.assigned_to) if task.assigned_to else None,
        "assigned_to_name": task.assignee.full_name if task.assignee else None,
        "due_at": task.due_at.isoformat() if task.due_at else None,
        "priority": task.priority,
        "status": task.status.value if task.status else "OPEN",
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None
    } for task in tasks]
