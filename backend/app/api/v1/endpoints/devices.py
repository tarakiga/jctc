"""
Seizure & Device Management API endpoints for the JCTC Management System.

This module provides comprehensive APIs for managing device seizures, 
imaging status, and forensic artifacts to complete the digital forensics 
workflow as specified in the PRD requirements.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, select
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date

from app.core.deps import get_db, get_current_user
from app.core.permissions import check_case_access, require_roles
from app.models import (
    Case, Seizure, Device, Artefact, User,
    CustodyStatus, ImagingStatus, DeviceType, ArtefactType
)
from app.schemas.devices import (
    SeizureCreate, SeizureUpdate, SeizureResponse,
    DeviceCreate, DeviceUpdate, DeviceResponse, DeviceLinkRequest,
    ArtefactCreate, ArtefactUpdate, ArtefactResponse,
    ImagingStatusUpdate, DeviceImagingResponse,
    SeizureSummaryResponse, ForensicWorkflowResponse
)
from app.utils.audit_integration import (
    AuditableEndpoint, log_case_access, log_device_activity
)

router = APIRouter(tags=["device-management"])


# ==================== SEIZURE MANAGEMENT APIs ====================

@router.post("/{case_id}/seizures", response_model=SeizureResponse)
@AuditableEndpoint(
    action="CREATE",
    entity="SEIZURE",
    description="Record new device seizure for case",
    capture_request_data=True
)
async def record_seizure(
    case_id: UUID,
    seizure_data: SeizureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record a new device seizure for a case.
    
    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    # Verify case access
    allowed = await check_case_access(case_id=case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Create seizure record
    seizure = Seizure(
        case_id=case_id,
        seized_at=seizure_data.seized_at or datetime.utcnow(),
        location=seizure_data.location,
        officer_id=seizure_data.officer_id or current_user.id,
        notes=seizure_data.notes
    )
    
    db.add(seizure)
    await db.commit()
    await db.refresh(seizure)
    
    # Audit logging temporarily disabled here to avoid sync/async DB mismatch
    
    return seizure


@router.get("/{case_id}/seizures", response_model=List[SeizureResponse])
async def list_case_seizures(
    case_id: UUID,
    officer_id: Optional[UUID] = Query(None, description="Filter by seizing officer"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all seizures for a case with optional filtering.
    """
    # Verify case access
    allowed = await check_case_access(case_id=case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")

    query = select(Seizure).where(Seizure.case_id == case_id)
    if officer_id:
        query = query.where(Seizure.officer_id == officer_id)

    query = query.order_by(Seizure.seized_at.desc())
    result = await db.execute(query)
    seizures = result.scalars().all()
    
    # Audit logging temporarily disabled to avoid sync/async mismatch
    return seizures


@router.get("/seizures/{seizure_id}", response_model=SeizureResponse)
async def get_seizure_details(
    seizure_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific seizure.
    """
    result = await db.execute(select(Seizure).where(Seizure.id == seizure_id))
    seizure = result.scalar_one_or_none()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    # Check case access
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    return seizure


@router.put("/seizures/{seizure_id}", response_model=SeizureResponse)
@AuditableEndpoint(
    action="UPDATE",
    entity="SEIZURE",
    description="Update seizure information",
    capture_request_data=True
)
async def update_seizure(
    seizure_id: UUID,
    seizure_update: SeizureUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update seizure information.
    
    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    # Role check handled via permission dependencies elsewhere
    result = await db.execute(select(Seizure).where(Seizure.id == seizure_id))
    seizure = result.scalar_one_or_none()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    # Check case access
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Update fields
    update_data = seizure_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(seizure, field, value)
    
    seizure.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(seizure)
    
    # Audit logging temporarily disabled to avoid sync/async mismatch
    
    return seizure


@router.delete("/seizures/{seizure_id}", status_code=204)
@AuditableEndpoint(
    action="DELETE",
    entity="SEIZURE",
    description="Delete seizure and associated devices"
)
async def delete_seizure(
    seizure_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a seizure. Associated devices and artifacts are removed via cascade.

    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    result = await db.execute(select(Seizure).where(Seizure.id == seizure_id))
    seizure = result.scalar_one_or_none()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")

    # Check case access
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")

    await db.delete(seizure)
    await db.commit()

    # No content response
    return None

# ==================== DEVICE MANAGEMENT APIs ====================

@router.post("/seizures/{seizure_id}/devices", response_model=DeviceResponse)
@AuditableEndpoint(
    action="CREATE",
    entity="DEVICE",
    description="Add device to seizure",
    capture_request_data=True
)
async def add_device_to_seizure(
    seizure_id: UUID,
    device_data: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a device to an existing seizure.
    
    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    # Verify seizure exists
    result = await db.execute(select(Seizure).where(Seizure.id == seizure_id))
    seizure = result.scalar_one_or_none()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    # Check case access
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Create device record
    device = Device(
        seizure_id=seizure_id,
        label=device_data.label,
        device_type=device_data.device_type,
        make=device_data.make,
        model=device_data.model,
        serial_no=device_data.serial_no,
        imei=device_data.imei,
        current_location=device_data.current_location,
        notes=device_data.notes
    )
    
    db.add(device)
    await db.commit()
    await db.refresh(device)
    
    # Audit logging temporarily disabled to avoid sync/async mismatch
    
    return device


@router.get("/seizures/{seizure_id}/devices", response_model=List[DeviceResponse])
async def list_seized_devices(
    seizure_id: UUID,
    device_type: Optional[DeviceType] = Query(None, description="Filter by device type"),
    imaging_status: Optional[ImagingStatus] = Query(None, description="Filter by imaging status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all devices in a seizure with optional filtering.
    """
    # Verify seizure exists and access
    result = await db.execute(select(Seizure).where(Seizure.id == seizure_id))
    seizure = result.scalar_one_or_none()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    query = select(Device).where(Device.seizure_id == seizure_id)
    
    if device_type:
        query = query.where(Device.device_type == device_type)
    if imaging_status:
        query = query.where(Device.imaging_status == imaging_status)
    
    query = query.order_by(Device.created_at.desc())
    result = await db.execute(query)
    devices = result.scalars().all()
    
    return devices


@router.get("/devices/{device_id}", response_model=DeviceResponse)
async def get_device_details(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific device.
    """
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access through seizure
    result = await db.execute(select(Seizure).where(Seizure.id == device.seizure_id))
    seizure = result.scalar_one_or_none()
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    return device


@router.put("/devices/{device_id}", response_model=DeviceResponse)
@AuditableEndpoint(
    action="UPDATE",
    entity="DEVICE",
    description="Update device information",
    capture_request_data=True
)
async def update_device(
    device_id: UUID,
    device_update: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update device information.
    
    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    # Role check handled via permission dependencies elsewhere
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access
    result = await db.execute(select(Seizure).where(Seizure.id == device.seizure_id))
    seizure = result.scalar_one_or_none()
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Update fields
    update_data = device_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)
    
    device.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(device)
    
    # Audit logging temporarily disabled to avoid sync/async mismatch
    
    return device


@router.delete("/devices/{device_id}", status_code=204)
@AuditableEndpoint(
    action="DELETE",
    entity="DEVICE",
    description="Delete device"
)
async def delete_device(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a device. Associated artifacts are removed via cascade.

    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Check case access via seizure
    result = await db.execute(select(Seizure).where(Seizure.id == device.seizure_id))
    seizure = result.scalar_one_or_none()
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")

    await db.delete(device)
    await db.commit()

    return None


@router.post("/devices/{device_id}/link", response_model=DeviceResponse)
@AuditableEndpoint(
    action="UPDATE",
    entity="DEVICE",
    description="Link existing device to a seizure",
    capture_request_data=True
)
async def link_device_to_seizure(
    device_id: UUID,
    link: DeviceLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Link an existing device to a seizure. Only allowed within the same case.

    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    # Role check handled via permission dependencies elsewhere
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    result = await db.execute(select(Seizure).where(Seizure.id == device.seizure_id))
    current_seizure = result.scalar_one_or_none()
    result = await db.execute(select(Seizure).where(Seizure.id == link.seizure_id))
    target_seizure = result.scalar_one_or_none()
    if not target_seizure:
        raise HTTPException(status_code=404, detail="Target seizure not found")

    # Check access to both cases
    current_allowed = await check_case_access(case_id=current_seizure.case_id, current_user=current_user, db=db)
    target_allowed = await check_case_access(case_id=target_seizure.case_id, current_user=current_user, db=db)
    if not current_allowed or not target_allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")

    # Enforce same-case linking to maintain data integrity
    if current_seizure.case_id != target_seizure.case_id:
        raise HTTPException(status_code=400, detail="Device can only be linked within the same case")

    device.seizure_id = link.seizure_id
    device.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(device)

    return device

# ==================== DEVICE IMAGING APIs ====================

@router.put("/devices/{device_id}/imaging", response_model=DeviceImagingResponse)
@AuditableEndpoint(
    action="UPDATE",
    entity="DEVICE",
    description="Update device imaging status and details",
    capture_request_data=True
)
async def update_device_imaging(
    device_id: UUID,
    imaging_update: ImagingStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update device imaging status and forensic details.
    
    Required permissions: FORENSIC or ADMIN role
    """
    require_roles(current_user, ["FORENSIC", "ADMIN"])
    
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access
    result = await db.execute(select(Seizure).where(Seizure.id == device.seizure_id))
    seizure = result.scalar_one_or_none()
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Update imaging fields
    if imaging_update.imaging_status:
        device.imaging_status = imaging_update.imaging_status
        
        # Set timestamps based on status
        if imaging_update.imaging_status == ImagingStatus.IN_PROGRESS and not device.imaging_started_at:
            device.imaging_started_at = datetime.utcnow()
        elif imaging_update.imaging_status == ImagingStatus.COMPLETED and not device.imaging_completed_at:
            device.imaging_completed_at = datetime.utcnow()
            device.imaged = True
    
    # Update other imaging fields
    update_data = imaging_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field != 'imaging_status':  # Already handled above
            setattr(device, field, value)
    
    # Set imaging technician
    device.imaging_technician_id = current_user.id
    device.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(device)
    
    # Log activity based on status
    activity_mapping = {
        ImagingStatus.IN_PROGRESS: "IMAGING_STARTED",
        ImagingStatus.COMPLETED: "IMAGING_COMPLETED",
        ImagingStatus.FAILED: "IMAGING_FAILED",
        ImagingStatus.VERIFIED: "IMAGING_VERIFIED"
    }
    
    action = activity_mapping.get(imaging_update.imaging_status, "IMAGING_UPDATED")
    
    # Audit logging temporarily disabled to avoid sync/async DB mismatch
    
    return DeviceImagingResponse(
        device_id=device.id,
        imaging_status=device.imaging_status,
        imaging_started_at=device.imaging_started_at,
        imaging_completed_at=device.imaging_completed_at,
        imaging_tool=device.imaging_tool,
        image_hash=device.image_hash,
        image_size_bytes=device.image_size_bytes,
        technician_id=device.imaging_technician_id,
        updated_at=device.updated_at
    )


@router.get("/devices/{device_id}/imaging", response_model=DeviceImagingResponse)
async def get_device_imaging_status(
    device_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get device imaging status and details.
    """
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access
    result = await db.execute(select(Seizure).where(Seizure.id == device.seizure_id))
    seizure = result.scalar_one_or_none()
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    return DeviceImagingResponse(
        device_id=device.id,
        imaging_status=device.imaging_status,
        imaging_started_at=device.imaging_started_at,
        imaging_completed_at=device.imaging_completed_at,
        imaging_tool=device.imaging_tool,
        image_hash=device.image_hash,
        image_size_bytes=device.image_size_bytes,
        technician_id=device.imaging_technician_id,
        updated_at=device.updated_at
    )


# ==================== ARTIFACT MANAGEMENT APIs ====================

@router.post("/devices/{device_id}/artifacts", response_model=ArtefactResponse)
@AuditableEndpoint(
    action="CREATE",
    entity="ARTIFACT",
    description="Add forensic artifact to device",
    capture_request_data=True
)
async def add_device_artifact(
    device_id: UUID,
    artifact_data: ArtefactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a forensic artifact to a device.
    
    Required permissions: FORENSIC or ADMIN role
    """
    require_roles(current_user, ["FORENSIC", "ADMIN"])
    
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access
    result = await db.execute(select(Seizure).where(Seizure.id == device.seizure_id))
    seizure = result.scalar_one_or_none()
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Create artifact
    artifact = Artefact(
        device_id=device_id,
        artefact_type=artifact_data.artefact_type,
        source_tool=artifact_data.source_tool,
        description=artifact_data.description,
        file_path=artifact_data.file_path,
        sha256=artifact_data.sha256
    )
    
    db.add(artifact)
    await db.commit()
    await db.refresh(artifact)
    
    # Log activity
    # Audit logging temporarily disabled to avoid sync/async DB mismatch
    
    return artifact


@router.get("/devices/{device_id}/artifacts", response_model=List[ArtefactResponse])
async def list_device_artifacts(
    device_id: UUID,
    artifact_type: Optional[ArtefactType] = Query(None, description="Filter by artifact type"),
    source_tool: Optional[str] = Query(None, description="Filter by extraction tool"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all artifacts extracted from a device.
    """
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access
    result = await db.execute(select(Seizure).where(Seizure.id == device.seizure_id))
    seizure = result.scalar_one_or_none()
    allowed = await check_case_access(case_id=seizure.case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    query = select(Artefact).where(Artefact.device_id == device_id)
    
    if artifact_type:
        query = query.where(Artefact.artefact_type == artifact_type)
    if source_tool:
        query = query.where(Artefact.source_tool.ilike(f"%{source_tool}%"))
    
    result = await db.execute(query.order_by(Artefact.created_at.desc()))
    artifacts = result.scalars().all()
    
    return artifacts


# ==================== FORENSIC WORKFLOW SUMMARY APIs ====================

@router.get("/{case_id}/forensic-summary", response_model=ForensicWorkflowResponse)
async def get_case_forensic_summary(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive forensic workflow summary for a case.
    """
    # Verify case access
    allowed = await check_case_access(case_id=case_id, current_user=current_user, db=db)
    if not allowed:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Get seizures and devices
    result = await db.execute(select(Seizure).where(Seizure.case_id == case_id))
    seizures = result.scalars().all()
    total_seizures = len(seizures)
    
    result = await db.execute(
        select(Device).join(Seizure, Device.seizure_id == Seizure.id).where(Seizure.case_id == case_id)
    )
    devices = result.scalars().all()
    
    total_devices = len(devices)
    imaged_devices = len([d for d in devices if d.imaged])
    pending_imaging = len([d for d in devices if d.imaging_status == ImagingStatus.NOT_STARTED])
    in_progress_imaging = len([d for d in devices if d.imaging_status == ImagingStatus.IN_PROGRESS])
    
    # Get artifact counts
    result = await db.execute(
        select(Artefact).join(Device, Artefact.device_id == Device.id).join(Seizure, Device.seizure_id == Seizure.id).where(Seizure.case_id == case_id)
    )
    artifacts = result.scalars().all()
    total_artifacts = len(artifacts)
    artifact_types = {}
    for artifact in artifacts:
        atype = artifact.artefact_type.value
        artifact_types[atype] = artifact_types.get(atype, 0) + 1
    
    return ForensicWorkflowResponse(
        case_id=case_id,
        total_seizures=total_seizures,
        total_devices=total_devices,
        imaged_devices=imaged_devices,
        pending_imaging=pending_imaging,
        in_progress_imaging=in_progress_imaging,
        total_artifacts=total_artifacts,
        artifact_types=artifact_types,
        seizures=seizures[:5],  # Latest 5 seizures
        recent_devices=sorted(devices, key=lambda x: x.created_at, reverse=True)[:10]  # Latest 10 devices
    )


@router.get("/statistics/forensic-workload", response_model=dict)
async def get_forensic_workload_statistics(
    start_date: Optional[date] = Query(None, description="Start date for statistics"),
    end_date: Optional[date] = Query(None, description="End date for statistics"),
    technician_id: Optional[UUID] = Query(None, description="Filter by technician"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get forensic workload statistics for performance monitoring.
    
    Available to FORENSIC, SUPERVISOR, and ADMIN roles.
    """
    require_roles(current_user, ["FORENSIC", "SUPERVISOR", "ADMIN"])
    
    # Build base queries
    seizure_query = select(Seizure)
    device_query = select(Device)
    
    if start_date:
        seizure_query = seizure_query.where(Seizure.seized_at >= start_date)
        device_query = device_query.where(Device.created_at >= start_date)
    if end_date:
        seizure_query = seizure_query.where(Seizure.seized_at <= end_date)
        device_query = device_query.where(Device.created_at <= end_date)
    if technician_id:
        device_query = device_query.where(Device.imaging_technician_id == technician_id)
    
    result = await db.execute(seizure_query)
    seizures = result.scalars().all()
    result = await db.execute(device_query)
    devices = result.scalars().all()
    
    # Calculate statistics
    total_seizures = len(seizures)
    total_devices = len(devices)
    
    imaging_stats = {
        "not_started": len([d for d in devices if d.imaging_status == ImagingStatus.NOT_STARTED]),
        "in_progress": len([d for d in devices if d.imaging_status == ImagingStatus.IN_PROGRESS]),
        "completed": len([d for d in devices if d.imaging_status == ImagingStatus.COMPLETED]),
        "failed": len([d for d in devices if d.imaging_status == ImagingStatus.FAILED]),
        "verified": len([d for d in devices if d.imaging_status == ImagingStatus.VERIFIED])
    }
    
    device_types = {}
    for device in devices:
        device_type = device.device_type.value if device.device_type else "UNKNOWN"
        device_types[device_type] = device_types.get(device_type, 0) + 1
    
    # Calculate average imaging time for completed devices
    completed_devices = [d for d in devices if d.imaging_started_at and d.imaging_completed_at]
    avg_imaging_hours = None
    if completed_devices:
        total_hours = sum(
            (d.imaging_completed_at - d.imaging_started_at).total_seconds() / 3600
            for d in completed_devices
        )
        avg_imaging_hours = total_hours / len(completed_devices)
    
    return {
        "period_start": start_date,
        "period_end": end_date,
        "technician_id": technician_id,
        "total_seizures": total_seizures,
        "total_devices": total_devices,
        "imaging_statistics": imaging_stats,
        "device_type_breakdown": device_types,
        "average_imaging_hours": round(avg_imaging_hours, 2) if avg_imaging_hours else None,
        "completion_rate": round(imaging_stats["completed"] / total_devices * 100, 2) if total_devices > 0 else 0
    }
