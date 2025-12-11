from typing import List, Optional, Dict

from uuid import UUID

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query, Form, File, UploadFile, Body

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

    - reporter: NEW - Party data for the reporter (preferred)

    - reporter_type: Type of reporter (ANONYMOUS, VICTIM, PARENT, LEA, NGO) - DEPRECATED

    - reporter_name: Name if not anonymous - DEPRECATED

    - reporter_contact: Contact info {phone, email} - DEPRECATED

    - lga_state_location: Location in Nigeria (LGA/State)

    - incident_datetime: When the incident occurred

    

    Returns 422 Validation Error if required fields are missing or invalid.

    """

    import logging

    from app.models.party import Party, PartyType

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

    

    # Prepare reporter contact as dict for JSONB storage (legacy support)

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

        # Legacy reporter fields (kept for backward compatibility)

        reporter_type=case_data.reporter_type,

        reporter_name=case_data.reporter_name,

        reporter_contact=reporter_contact_dict

    )

    

    try:

        db.add(db_case)

        await db.commit()

        await db.refresh(db_case)

        

        # NEW: Create reporter as Party if reporter data is provided

        # This is the new consolidated approach

        if case_data.reporter:

            reporter_data = case_data.reporter

            # Map reporter_type to PartyType if provided

            party_type_str = reporter_data.get('party_type', 'COMPLAINANT')

            try:

                party_type = PartyType(party_type_str)

            except ValueError:

                # Default to COMPLAINANT if invalid type

                party_type = PartyType.COMPLAINANT

            

            reporter_party = Party(

                case_id=db_case.id,

                party_type=party_type,

                full_name=reporter_data.get('full_name') or case_data.reporter_name,

                contact=reporter_data.get('contact') or reporter_contact_dict,

                is_reporter=True,

                notes=reporter_data.get('notes', 'Case reporter')

            )

            db.add(reporter_party)

            await db.commit()

            logger.info(f"Reporter party created for case {case_number}")

        elif case_data.reporter_name or case_data.reporter_contact:

            # Backward compatibility: Create reporter Party from legacy fields

            # Map ReporterType to PartyType

            party_type_mapping = {

                'ANONYMOUS': PartyType.COMPLAINANT,

                'VICTIM': PartyType.VICTIM,

                'PARENT': PartyType.COMPLAINANT,

                'LEA': PartyType.WITNESS,

                'NGO': PartyType.WITNESS,

                'CORPORATE': PartyType.COMPLAINANT,

                'WHISTLEBLOWER': PartyType.WITNESS,

            }

            party_type = party_type_mapping.get(

                case_data.reporter_type.value if case_data.reporter_type else 'ANONYMOUS',

                PartyType.COMPLAINANT

            )

            

            reporter_party = Party(

                case_id=db_case.id,

                party_type=party_type,

                full_name=case_data.reporter_name,

                contact=reporter_contact_dict,

                is_reporter=True,

                notes=f"Case reporter (type: {case_data.reporter_type.value if case_data.reporter_type else 'ANONYMOUS'})"

            )

            db.add(reporter_party)

            await db.commit()

            logger.info(f"Reporter party created from legacy fields for case {case_number}")
        
        # NEW: Create initial collaboration if provided
        if case_data.collaboration:
            from app.models.misc import CaseCollaboration, PartnerType, CollaborationStatus
            
            collab_data = case_data.collaboration
            
            # Use 'OTHER' as default partner type if not provided or invalid
            try:
                partner_type_val = collab_data.get('partner_type', 'OTHER')
                partner_type = PartnerType(partner_type_val)
            except ValueError:
                partner_type = PartnerType.OTHER

            # Create new collaboration
            new_collab = CaseCollaboration(
                case_id=db_case.id,
                partner_org=collab_data.get('partner_org', 'Unknown Partner'),
                partner_type=partner_type,
                contact_person=collab_data.get('contact_person', 'Unknown'),
                contact_email=collab_data.get('contact_email', 'unknown@example.com'),
                contact_phone=collab_data.get('contact_phone', 'N/A'),
                reference_no=collab_data.get('reference_no'),
                scope=collab_data.get('scope', 'Initial collaboration scope'),
                mou_reference=collab_data.get('mou_reference'),
                status=CollaborationStatus.INITIATED,
                initiated_at=datetime.utcnow(),
                notes=collab_data.get('notes')
            )
            
            db.add(new_collab)
            await db.commit()
            logger.info(f"Initial collaboration created for case {case_number}")

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

    

    # NEW: Fetch reporter party (party with is_reporter=True)

    from app.models.party import Party

    reporter_party_result = await db.execute(

        select(Party).filter(

            and_(

                Party.case_id == case_id,

                Party.is_reporter == True

            )

        )

    )

    reporter_party = reporter_party_result.scalar_one_or_none()

    

    # Create response with case_type label and reporter

    response = CaseResponse.model_validate(case)

    response.case_type = case_type_label

    

    # Add reporter party to response

    if reporter_party:

        response.reporter = {

            "id": str(reporter_party.id),

            "party_type": reporter_party.party_type.value if reporter_party.party_type else None,

            "full_name": reporter_party.full_name,

            "contact": reporter_party.contact,

            "is_reporter": True

        }

    

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

    from app.models.evidence import Evidence

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

    evidence_query = select(Evidence).options(

        selectinload(Evidence.chain_entries)

    ).where(Evidence.case_id == case_id)

    

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



@router.post("/{case_id}/tasks/")

async def create_case_task(

    case_id: UUID,

    task_data: Dict = Body(...),

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """Create a new task for a specific case."""

    from app.models.task import TaskStatus

    from datetime import datetime

    

    # Verify case exists

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    # Parse due_at if provided

    due_at_datetime = None

    if task_data.get('due_at'):

        try:

            due_at_datetime = datetime.fromisoformat(task_data['due_at'].replace('Z', '+00:00'))

        except:

            pass

    

    # Create task

    new_task = Task(

        case_id=case_id,

        title=task_data.get('title', ''),

        description=task_data.get('description'),

        assigned_to=UUID(task_data['assigned_to']) if task_data.get('assigned_to') else None,

        due_at=due_at_datetime,

        priority=task_data.get('priority', 3),

        status=TaskStatus(task_data.get('status', 'OPEN'))

    )

    

    db.add(new_task)

    await db.commit()

    await db.refresh(new_task)

    

    # Get assignee info if assigned

    assignee_name = None

    if new_task.assigned_to:

        assignee_result = await db.execute(select(User).where(User.id == new_task.assigned_to))

        assignee = assignee_result.scalar_one_or_none()

        if assignee:

            assignee_name = assignee.full_name

    

    return {

        "id": str(new_task.id),

        "case_id": str(new_task.case_id),

        "title": new_task.title,

        "description": new_task.description,

        "assigned_to": str(new_task.assigned_to) if new_task.assigned_to else None,

        "assigned_to_name": assignee_name,

        "due_at": new_task.due_at.isoformat() if new_task.due_at else None,

        "priority": new_task.priority,

        "status": new_task.status.value if new_task.status else "OPEN",

        "created_at": new_task.created_at.isoformat() if new_task.created_at else None,

        "updated_at": new_task.updated_at.isoformat() if new_task.updated_at else None

    }



@router.get("/{case_id}/legal-instruments/")

async def get_case_legal_instruments(

    case_id: UUID,

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """Get all legal instruments for a specific case."""

    from app.models.legal import LegalInstrument

    

    # Verify case exists

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    # Get legal instruments for the case

    instruments_result = await db.execute(

        select(LegalInstrument)

        .where(LegalInstrument.case_id == case_id)

        .order_by(LegalInstrument.created_at.desc())

    )

    instruments = instruments_result.scalars().all()

    

    return [{

        "id": str(instr.id),

        "case_id": str(instr.case_id),

        "type": instr.type.value if instr.type else None,

        "reference_no": instr.reference_no,

        "issuing_authority": instr.issuing_authority,

        "issued_at": instr.issued_at.isoformat() if instr.issued_at else None,

        "expires_at": instr.expires_at.isoformat() if instr.expires_at else None,

        "status": instr.status.value if instr.status else None,

        "notes": instr.notes,

        "created_at": instr.created_at.isoformat() if instr.created_at else None,

        "updated_at": instr.updated_at.isoformat() if instr.updated_at else None

    } for instr in instruments]



@router.post("/{case_id}/legal-instruments/")

async def create_legal_instrument(

    case_id: UUID,

    instrument_data: Dict = Body(...),

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """Create a new legal instrument for a case."""

    from app.models.legal import LegalInstrument, LegalInstrumentType, LegalInstrumentStatus

    from datetime import datetime

    

    # Verify case exists

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    # Parse dates

    issued_at = datetime.fromisoformat(instrument_data.get('issued_at').replace('Z', '+00:00'))

    expires_at = None

    if instrument_data.get('expires_at'):

        try:

            expires_at = datetime.fromisoformat(instrument_data['expires_at'].replace('Z', '+00:00'))

        except:

            pass

    

    # Create instrument

    new_instrument = LegalInstrument(

        case_id=case_id,

        type=LegalInstrumentType(instrument_data.get('instrument_type')),

        reference_no=instrument_data.get('reference_no'),

        issuing_authority=instrument_data.get('issuing_authority'),

        issued_at=issued_at,

        expires_at=expires_at,

        status=LegalInstrumentStatus(instrument_data.get('status', 'REQUESTED')),

        document_hash=instrument_data.get('document_hash'),

        notes=instrument_data.get('notes')

    )

    

    db.add(new_instrument)

    await db.commit()

    await db.refresh(new_instrument)

    

    return {

        "id": str(new_instrument.id),

        "case_id": str(new_instrument.case_id),

        "instrument_type": new_instrument.type.value if new_instrument.type else None,

        "reference_no": new_instrument.reference_no,

        "issuing_authority": new_instrument.issuing_authority,

        "issued_at": new_instrument.issued_at.isoformat() if new_instrument.issued_at else None,

        "expires_at": new_instrument.expires_at.isoformat() if new_instrument.expires_at else None,

        "status": new_instrument.status.value if new_instrument.status else None,

        "document_hash": new_instrument.document_hash,

        "notes": new_instrument.notes,

        "created_at": new_instrument.created_at.isoformat() if new_instrument.created_at else None,

        "updated_at": new_instrument.updated_at.isoformat() if new_instrument.updated_at else None

    }



@router.delete("/{case_id}/legal-instruments/{instrument_id}/")

async def delete_legal_instrument(

    case_id: UUID,

    instrument_id: UUID,

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """Delete a legal instrument."""

    from app.models.legal import LegalInstrument

    

    # Verify instrument exists and belongs to the case

    result = await db.execute(

        select(LegalInstrument).where(

            LegalInstrument.id == instrument_id,

            LegalInstrument.case_id == case_id

        )

    )

    instrument = result.scalar_one_or_none()

    

    if not instrument:

        raise HTTPException(status_code=404, detail="Legal instrument not found")

    

    await db.delete(instrument)

    await db.commit()

    

    return {"message": "Legal instrument deleted successfully", "id": str(instrument_id)}



@router.get("/{case_id}/charges/")

async def get_case_charges(

    case_id: UUID,

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """

    Get all charges for a specific case.

    """

    from app.models.prosecution import Charge

    from app.models.user import User as UserModel

    

    # Verify case exists

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    # Get charges for the case with creator information

    charges_result = await db.execute(

        select(Charge, UserModel)

        .outerjoin(UserModel, Charge.created_by == UserModel.id)

        .where(Charge.case_id == case_id)

        .order_by(Charge.filed_at.desc())

    )

    charges_with_users = charges_result.all()

    

    # Format response

    return [{

        "id": str(charge.id),

        "case_id": str(charge.case_id),

        "statute": charge.statute,

        "statute_section": charge.statute_section,

        "description": charge.description,

        "filed_at": charge.filed_at.isoformat() if charge.filed_at else None,

        "status": charge.status.value if charge.status else None,

        "notes": charge.notes,

        "created_at": charge.created_at.isoformat() if charge.created_at else None,

        "updated_at": charge.updated_at.isoformat() if charge.updated_at else None,

        "created_by": str(charge.created_by) if charge.created_by else None,

        "created_by_name": user.full_name if user else None

    } for charge, user in charges_with_users]





@router.get("/{case_id}/artefacts/")

async def get_case_artefacts(

    case_id: UUID,

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """Get all forensic artefacts for all evidence items in a specific case."""

    from app.models.evidence import Evidence, Artefact

    from app.schemas.evidence import ArtefactResponse

    

    # Verify case exists

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    # Get all evidence items for the case

    evidence_result = await db.execute(

        select(Evidence).where(Evidence.case_id == case_id)

    )

    evidence_items = evidence_result.scalars().all()

    evidence_ids = [item.id for item in evidence_items]

    

    # If no evidence, return empty list

    if not evidence_ids:

        return []

    

    # Get all artefacts for all evidence items

    artefacts_result = await db.execute(

        select(Artefact)

        .where(Artefact.evidence_id.in_(evidence_ids))

        .order_by(Artefact.created_at.desc())

    )

    artefacts = artefacts_result.scalars().all()

    

    # Create a mapping of evidence_id to evidence label for enrichment

    evidence_map = {str(item.id): item.label for item in evidence_items}

    

    # Return artefacts with device_label enrichment

    return [{

        "id": str(artefact.id),

        "evidence_id": str(artefact.evidence_id),

        "case_id": str(case_id),

        "device_id": str(artefact.evidence_id),  # For backwards compatibility

        "device_label": evidence_map.get(str(artefact.evidence_id)),

        "artefact_type": artefact.artefact_type.value if artefact.artefact_type else None,

        "source_tool": artefact.source_tool,

        "description": artefact.description,

        "file_path": artefact.file_path,

        "file_name": artefact.file_path.split('/')[-1] if artefact.file_path else None,

        "file_hash": artefact.sha256,

        "file_size": None,  # Not stored in current schema

        "tags": [],  # Not stored in current schema

        "extracted_at": artefact.created_at.isoformat() if artefact.created_at else None,

        "created_at": artefact.created_at.isoformat() if artefact.created_at else None,

        "updated_at": artefact.updated_at.isoformat() if artefact.updated_at else None

    } for artefact in artefacts]



@router.get("/{case_id}/forensic-reports/")

async def get_case_forensic_reports(

    case_id: UUID,

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """

    Get all forensic reports for a specific case.

    

    NOTE: This is currently a stub endpoint that returns an empty list.

    Full implementation pending for ForensicReport model and storage.

    """

    # Verify case exists

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    # TODO: Implement forensic reports model and storage

    # For now, return empty list to prevent 404 errors in UI

    return []



@router.post("/{case_id}/forensic-reports/")

async def upload_forensic_report(

    case_id: UUID,

    report_type: str = Form(...),

    tool_name: str = Form(...),

    tool_version: str = Form(...),

    generated_at: str = Form(...),

    file: UploadFile = File(...),

    file_hash: str = Form(...),

    device_id: str = Form(None),

    tool_binary_hash: str = Form(None),

    notes: str = Form(None),

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """Upload a forensic report for a case."""

    from app.models.forensic import ForensicReport

    from datetime import datetime

    

    # Verify case exists

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    # Get device label if device_id provided

    device_label = None

    if device_id:

        from app.models.evidence import Evidence

        evidence_result = await db.execute(select(Evidence).where(Evidence.id == UUID(device_id)))

        evidence = evidence_result.scalar_one_or_none()

        if evidence:

            device_label = evidence.label

    

    # Read file content

    content = await file.read()

    file_size = len(content)

    

    # Parse generated_at date

    generated_at_dt = datetime.fromisoformat(generated_at.replace('Z', '+00:00'))

    

    # Create forensic report

    new_report = ForensicReport(

        case_id=case_id,

        device_id=UUID(device_id) if device_id else None,

        report_type=report_type,

        tool_name=tool_name,

        tool_version=tool_version,

        tool_binary_hash=tool_binary_hash,

        file_name=file.filename,

        file_size=file_size,

        file_hash=file_hash,

        generated_at=generated_at_dt,

        generated_by=current_user.id,

        notes=notes

    )

    

    db.add(new_report)

    await db.commit()

    await db.refresh(new_report)

    

    # Return response

    return {

        "id": str(new_report.id),

        "case_id": str(new_report.case_id),

        "device_id": str(new_report.device_id) if new_report.device_id else None,

        "device_label": device_label,

        "report_type": new_report.report_type,

        "tool_name": new_report.tool_name,

        "tool_version": new_report.tool_version,

        "tool_binary_hash": new_report.tool_binary_hash,

        "file_name": new_report.file_name,

        "file_size": new_report.file_size,

        "file_hash": new_report.file_hash,

        "generated_at": new_report.generated_at.isoformat() if new_report.generated_at else None,

        "generated_by": str(new_report.generated_by),

        "generated_by_name": current_user.full_name or current_user.email,

        "notes": new_report.notes,

        "created_at": new_report.created_at.isoformat() if new_report.created_at else None,

        "updated_at": new_report.updated_at.isoformat() if new_report.updated_at else None

    }



# ==================== COURT SESSIONS MANAGEMENT ====================



@router.get("/{case_id}/court-sessions/")

async def get_court_sessions(

    case_id: UUID,

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """Get all court sessions for a case."""

    from app.models.prosecution import CourtSession

    

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    result = await db.execute(

        select(CourtSession)

        .where(CourtSession.case_id == case_id)

        .order_by(CourtSession.session_date.desc())

    )

    sessions = result.scalars().all()

    

    return [{

        "id": str(session.id),

        "case_id": str(session.case_id),

        "session_date": session.session_date.isoformat() if session.session_date else None,

        "court": session.court,

        "judge": session.judge,

        "session_type": session.session_type,

        "notes": session.notes,

        "created_at": session.created_at.isoformat() if session.created_at else None

    } for session in sessions]





@router.post("/{case_id}/court-sessions/")

async def create_court_session(

    case_id: UUID,

    session_data: Dict = Body(...),

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """Create a new court session for a case."""

    from app.models.prosecution import CourtSession

    from datetime import datetime

    

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    session_date = datetime.fromisoformat(session_data.get('session_date').replace('Z', '+00:00')) if session_data.get('session_date') else None

    

    new_session = CourtSession(

        case_id=case_id,

        session_date=session_date,

        court=session_data.get('court'),

        judge=session_data.get('judge'),

        session_type=session_data.get('session_type'),

        notes=session_data.get('notes')

    )

    

    db.add(new_session)

    await db.commit()

    await db.refresh(new_session)

    

    return {

        "id": str(new_session.id),

        "case_id": str(new_session.case_id),

        "session_date": new_session.session_date.isoformat() if new_session.session_date else None,

        "court": new_session.court,

        "judge": new_session.judge,

        "session_type": new_session.session_type,

        "notes": new_session.notes,

        "created_at": new_session.created_at.isoformat() if new_session.created_at else None

    }





# ==================== CASE OUTCOMES MANAGEMENT ====================



@router.get("/{case_id}/outcomes/")

async def get_case_outcomes(

    case_id: UUID,

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """Get all outcomes for a case."""

    from app.models.prosecution import Outcome

    

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    result = await db.execute(

        select(Outcome)

        .where(Outcome.case_id == case_id)

        .order_by(Outcome.closed_at.desc())

    )

    outcomes = result.scalars().all()

    

    return [{

        "id": str(outcome.id),

        "case_id": str(outcome.case_id),

        "disposition": outcome.disposition.value if outcome.disposition else None,

        "sentence": outcome.sentence,

        "restitution": float(outcome.restitution) if outcome.restitution else None,

        "closed_at": outcome.closed_at.isoformat() if outcome.closed_at else None,

        "notes": outcome.notes,

        "created_at": outcome.created_at.isoformat() if outcome.created_at else None

    } for outcome in outcomes]





@router.post("/{case_id}/outcomes/")

async def create_case_outcome(

    case_id: UUID,

    outcome_data: Dict = Body(...),

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_active_user)

):

    """Record a case outcome."""

    from app.models.prosecution import Outcome, Disposition

    from datetime import datetime

    from decimal import Decimal

    

    case_result = await db.execute(select(Case).where(Case.id == case_id))

    case_obj = case_result.scalar_one_or_none()

    

    if not case_obj:

        raise HTTPException(status_code=404, detail="Case not found")

    

    closed_at = datetime.fromisoformat(outcome_data.get('closed_at').replace('Z', '+00:00')) if outcome_data.get('closed_at') else datetime.utcnow()

    

    restitution = None

    if outcome_data.get('restitution'):

        restitution = Decimal(str(outcome_data['restitution']))

    

    new_outcome = Outcome(

        case_id=case_id,

        disposition=Disposition(outcome_data.get('disposition')) if outcome_data.get('disposition') else None,

        sentence=outcome_data.get('sentence'),

        restitution=restitution,

        closed_at=closed_at,

        notes=outcome_data.get('notes')

    )

    

    db.add(new_outcome)

    await db.commit()

    await db.refresh(new_outcome)

    

    return {

        "id": str(new_outcome.id),

        "case_id": str(new_outcome.case_id),

        "disposition": new_outcome.disposition.value if new_outcome.disposition else None,

        "sentence": new_outcome.sentence,

        "restitution": float(new_outcome.restitution) if new_outcome.restitution else None,

        "closed_at": new_outcome.closed_at.isoformat() if new_outcome.closed_at else None,

        "notes": new_outcome.notes,

        "created_at": new_outcome.created_at.isoformat() if new_outcome.created_at else None

    }



@router.get('/{case_id}/international-requests/')
async def get_international_requests(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    if not case_obj:
        raise HTTPException(status_code=404, detail='Case not found')
    return []


# ==================== COLLABORATIONS MANAGEMENT ====================

@router.get('/{case_id}/collaborations/')
async def get_collaborations(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all collaborations for a case."""
    from app.models.misc import CaseCollaboration
    
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    if not case_obj:
        raise HTTPException(status_code=404, detail='Case not found')
    
    # Query collaborations from database
    result = await db.execute(
        select(CaseCollaboration)
        .where(CaseCollaboration.case_id == case_id)
        .order_by(CaseCollaboration.initiated_at.desc())
    )
    collaborations = result.scalars().all()
    
    return [{
        'id': str(collab.id),
        'case_id': str(collab.case_id),
        'partner_org': collab.partner_org,
        'partner_type': collab.partner_type.value if collab.partner_type else None,
        'contact_person': collab.contact_person,
        'contact_email': collab.contact_email,
        'contact_phone': collab.contact_phone,
        'reference_no': collab.reference_no,
        'scope': collab.scope,
        'mou_reference': collab.mou_reference,
        'status': collab.status.value if collab.status else None,
        'initiated_at': collab.initiated_at.isoformat() if collab.initiated_at else None,
        'completed_at': collab.completed_at.isoformat() if collab.completed_at else None,
        'notes': collab.notes,
        'created_at': collab.created_at.isoformat() if collab.created_at else None,
        'updated_at': collab.updated_at.isoformat() if collab.updated_at else None
    } for collab in collaborations]


@router.post('/{case_id}/collaborations/')
async def create_collaboration(
    case_id: UUID,
    collab_data: Dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new collaboration for a case."""
    from app.models.misc import CaseCollaboration, PartnerType, CollaborationStatus
    from datetime import datetime
    
    # Verify case exists
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    
    if not case_obj:
        raise HTTPException(status_code=404, detail='Case not found')
    
    # Parse dates
    initiated_at = datetime.fromisoformat(collab_data.get('initiated_at').replace('Z', '+00:00')) if collab_data.get('initiated_at') else datetime.utcnow()
    
    # Create new collaboration
    new_collab = CaseCollaboration(
        case_id=case_id,
        partner_org=collab_data.get('partner_org'),
        partner_type=PartnerType(collab_data.get('partner_type', 'OTHER')),
        contact_person=collab_data.get('contact_person'),
        contact_email=collab_data.get('contact_email'),
        contact_phone=collab_data.get('contact_phone'),
        reference_no=collab_data.get('reference_no'),
        scope=collab_data.get('scope'),
        mou_reference=collab_data.get('mou_reference'),
        status=CollaborationStatus(collab_data.get('status', 'INITIATED')),
        initiated_at=initiated_at,
        notes=collab_data.get('notes')
    )
    
    db.add(new_collab)
    await db.commit()
    await db.refresh(new_collab)
    
    return {
        'id': str(new_collab.id),
        'case_id': str(new_collab.case_id),
        'partner_org': new_collab.partner_org,
        'partner_type': new_collab.partner_type.value if new_collab.partner_type else None,
        'contact_person': new_collab.contact_person,
        'contact_email': new_collab.contact_email,
        'contact_phone': new_collab.contact_phone,
        'reference_no': new_collab.reference_no,
        'scope': new_collab.scope,
        'mou_reference': new_collab.mou_reference,
        'status': new_collab.status.value if new_collab.status else None,
        'initiated_at': new_collab.initiated_at.isoformat() if new_collab.initiated_at else None,
        'completed_at': new_collab.completed_at.isoformat() if new_collab.completed_at else None,
        'notes': new_collab.notes,
        'created_at': new_collab.created_at.isoformat() if new_collab.created_at else None,
        'updated_at': new_collab.updated_at.isoformat() if new_collab.updated_at else None
    }


# ==================== ATTACHMENTS MANAGEMENT ====================

@router.get('/{case_id}/attachments/')
async def get_attachments(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.misc import Attachment
    
    # Verify case exists
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    
    if not case_obj:
        raise HTTPException(status_code=404, detail='Case not found')
    
    # Query attachments
    result = await db.execute(select(Attachment).where(Attachment.case_id == case_id))
    attachments = result.scalars().all()
    
    return [{
        'id': str(att.id),
        'case_id': str(att.case_id),
        'title': att.title,
        'filename': att.filename,
        'file_size': att.file_size,
        'file_type': att.file_type,
        'classification': att.classification.value if att.classification else None,
        'sha256_hash': att.sha256_hash,
        'virus_scan_status': att.virus_scan_status.value if att.virus_scan_status else None,
        'virus_scan_details': att.virus_scan_details,
        'uploaded_by': str(att.uploaded_by),
        'uploaded_at': att.uploaded_at.isoformat() if att.uploaded_at else None,
        'download_url': att.download_url,
        'notes': att.notes
    } for att in attachments]


@router.post('/{case_id}/attachments/')
async def create_attachment(
    case_id: UUID,
    att_data: Dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.misc import Attachment, AttachmentClassification, VirusScanStatus
    import uuid as uuid_module
    
    # Verify case exists
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    
    if not case_obj:
        raise HTTPException(status_code=404, detail='Case not found')
        
    new_attachment = Attachment(
        case_id=case_id,
        title=att_data.get('title'),
        filename=att_data.get('filename'),
        file_size=att_data.get('file_size'),
        file_type=att_data.get('file_type'),
        classification=AttachmentClassification(att_data.get('classification', 'LE_SENSITIVE')),
        sha256_hash=att_data.get('sha256_hash'),
        virus_scan_status=VirusScanStatus.PENDING,
        uploaded_by=current_user.id,
        notes=att_data.get('notes')
    )
    
    db.add(new_attachment)
    await db.commit()
    await db.refresh(new_attachment)
    
    return {
        'id': str(new_attachment.id),
        'case_id': str(new_attachment.case_id),
        'title': new_attachment.title,
        'filename': new_attachment.filename,
        'file_size': new_attachment.file_size,
        'file_type': new_attachment.file_type,
        'classification': new_attachment.classification.value,
        'sha256_hash': new_attachment.sha256_hash,
        'virus_scan_status': new_attachment.virus_scan_status.value,
        'virus_scan_details': new_attachment.virus_scan_details,
        'uploaded_by': str(new_attachment.uploaded_by),
        'uploaded_at': new_attachment.uploaded_at.isoformat(),
        'download_url': new_attachment.download_url,
        'notes': new_attachment.notes
    }
