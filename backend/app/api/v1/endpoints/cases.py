from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import joinedload
from app.database.base import get_db
from app.models.case import Case, CaseStatus, CaseAssignment, AssignmentRole
from app.models.user import User, UserRole, LookupCaseType
from app.schemas.case import (
    CaseCreate, CaseUpdate, CaseResponse, 
    CaseAssignmentCreate, CaseAssignmentResponse,
    LookupCaseTypeResponse
)
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
    """Create a new case."""
    # Generate unique case number
    case_number = generate_case_number()
    
    # Ensure case number is unique
    while True:
        result = await db.execute(select(Case).filter(Case.case_number == case_number))
        if not result.scalar_one_or_none():
            break
        case_number = generate_case_number()
    
    # Create new case
    db_case = Case(
        case_number=case_number,
        title=case_data.title,
        case_type_id=case_data.case_type_id,
        description=case_data.description,
        severity=case_data.severity,
        local_or_international=case_data.local_or_international,
        originating_country=case_data.originating_country,
        cooperating_countries=case_data.cooperating_countries,
        mlat_reference=case_data.mlat_reference,
        created_by=current_user.id
    )
    
    db.add(db_case)
    await db.commit()
    await db.refresh(db_case)
    
    return db_case

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
    
    return case

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

# Case types endpoints
@router.get("/types/", response_model=List[LookupCaseTypeResponse])
async def list_case_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List available case types."""
    result = await db.execute(select(LookupCaseType).order_by(LookupCaseType.label))
    case_types = result.scalars().all()
    return case_types