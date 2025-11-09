"""
Seizure & Device Management API endpoints for the JCTC Management System.

This module provides comprehensive APIs for managing device seizures, 
imaging status, and forensic artifacts to complete the digital forensics 
workflow as specified in the PRD requirements.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
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
    DeviceCreate, DeviceUpdate, DeviceResponse,
    ArtefactCreate, ArtefactUpdate, ArtefactResponse,
    ImagingStatusUpdate, DeviceImagingResponse,
    SeizureSummaryResponse, ForensicWorkflowResponse
)
from app.utils.audit_integration import (
    AuditableEndpoint, log_case_access, log_device_activity
)

router = APIRouter(prefix="/devices", tags=["device-management"])


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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record a new device seizure for a case.
    
    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    # Verify user has appropriate role
    require_roles(current_user, ["FORENSIC", "INVESTIGATOR", "ADMIN"])
    
    # Verify case exists and user has access
    case = check_case_access(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Create seizure record
    seizure = Seizure(
        case_id=case_id,
        seized_at=seizure_data.seized_at or datetime.utcnow(),
        location=seizure_data.location,
        officer_id=seizure_data.officer_id or current_user.id,
        notes=seizure_data.notes,
        created_by=current_user.id,
        updated_by=current_user.id
    )
    
    db.add(seizure)
    db.commit()
    db.refresh(seizure)
    
    # Log activity
    log_device_activity(
        db=db,
        user_id=current_user.id,
        device_id=str(seizure.id),
        action="SEIZURE_RECORDED",
        details={
            "seizure_id": str(seizure.id),
            "location": seizure_data.location,
            "officer_id": str(seizure_data.officer_id) if seizure_data.officer_id else str(current_user.id)
        }
    )
    
    return seizure


@router.get("/{case_id}/seizures", response_model=List[SeizureResponse])
async def list_case_seizures(
    case_id: UUID,
    officer_id: Optional[UUID] = Query(None, description="Filter by seizing officer"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all seizures for a case with optional filtering.
    """
    # Verify case access
    case = check_case_access(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    query = db.query(Seizure).filter(Seizure.case_id == case_id)
    
    if officer_id:
        query = query.filter(Seizure.officer_id == officer_id)
    
    seizures = query.order_by(Seizure.seized_at.desc()).all()
    
    # Log access
    log_case_access(
        db=db,
        user_id=current_user.id,
        case_id=case_id,
        action="VIEW_SEIZURES"
    )
    
    return seizures


@router.get("/seizures/{seizure_id}", response_model=SeizureResponse)
async def get_seizure_details(
    seizure_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific seizure.
    """
    seizure = db.query(Seizure).filter(Seizure.id == seizure_id).first()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    # Check case access
    case = check_case_access(db, seizure.case_id, current_user)
    if not case:
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update seizure information.
    
    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    require_roles(current_user, ["FORENSIC", "INVESTIGATOR", "ADMIN"])
    
    seizure = db.query(Seizure).filter(Seizure.id == seizure_id).first()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    # Check case access
    case = check_case_access(db, seizure.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Update fields
    update_data = seizure_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(seizure, field, value)
    
    seizure.updated_by = current_user.id
    seizure.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(seizure)
    
    # Log activity
    log_device_activity(
        db=db,
        user_id=current_user.id,
        device_id=str(seizure_id),
        action="SEIZURE_UPDATED",
        details={
            "seizure_id": str(seizure_id),
            "updated_fields": list(update_data.keys())
        }
    )
    
    return seizure


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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a device to an existing seizure.
    
    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    require_roles(current_user, ["FORENSIC", "INVESTIGATOR", "ADMIN"])
    
    # Verify seizure exists
    seizure = db.query(Seizure).filter(Seizure.id == seizure_id).first()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    # Check case access
    case = check_case_access(db, seizure.case_id, current_user)
    if not case:
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
        notes=device_data.notes,
        created_by=current_user.id,
        updated_by=current_user.id
    )
    
    db.add(device)
    db.commit()
    db.refresh(device)
    
    # Log activity
    log_device_activity(
        db=db,
        user_id=current_user.id,
        device_id=str(device.id),
        action="DEVICE_ADDED",
        details={
            "device_id": str(device.id),
            "device_type": device_data.device_type.value if device_data.device_type else None,
            "label": device_data.label
        }
    )
    
    return device


@router.get("/seizures/{seizure_id}/devices", response_model=List[DeviceResponse])
async def list_seized_devices(
    seizure_id: UUID,
    device_type: Optional[DeviceType] = Query(None, description="Filter by device type"),
    imaging_status: Optional[ImagingStatus] = Query(None, description="Filter by imaging status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all devices in a seizure with optional filtering.
    """
    # Verify seizure exists and access
    seizure = db.query(Seizure).filter(Seizure.id == seizure_id).first()
    if not seizure:
        raise HTTPException(status_code=404, detail="Seizure not found")
    
    case = check_case_access(db, seizure.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    query = db.query(Device).filter(Device.seizure_id == seizure_id)
    
    if device_type:
        query = query.filter(Device.device_type == device_type)
    if imaging_status:
        query = query.filter(Device.imaging_status == imaging_status)
    
    devices = query.order_by(Device.created_at.desc()).all()
    
    return devices


@router.get("/devices/{device_id}", response_model=DeviceResponse)
async def get_device_details(
    device_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific device.
    """
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access through seizure
    seizure = db.query(Seizure).filter(Seizure.id == device.seizure_id).first()
    case = check_case_access(db, seizure.case_id, current_user)
    if not case:
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update device information.
    
    Required permissions: FORENSIC, INVESTIGATOR, or ADMIN role
    """
    require_roles(current_user, ["FORENSIC", "INVESTIGATOR", "ADMIN"])
    
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access
    seizure = db.query(Seizure).filter(Seizure.id == device.seizure_id).first()
    case = check_case_access(db, seizure.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Update fields
    update_data = device_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)
    
    device.updated_by = current_user.id
    device.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(device)
    
    # Log activity
    log_device_activity(
        db=db,
        user_id=current_user.id,
        device_id=str(device_id),
        action="DEVICE_UPDATED",
        details={
            "device_id": str(device_id),
            "updated_fields": list(update_data.keys())
        }
    )
    
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update device imaging status and forensic details.
    
    Required permissions: FORENSIC or ADMIN role
    """
    require_roles(current_user, ["FORENSIC", "ADMIN"])
    
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access
    seizure = db.query(Seizure).filter(Seizure.id == device.seizure_id).first()
    case = check_case_access(db, seizure.case_id, current_user)
    if not case:
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
    device.updated_by = current_user.id
    device.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(device)
    
    # Log activity based on status
    activity_mapping = {
        ImagingStatus.IN_PROGRESS: "IMAGING_STARTED",
        ImagingStatus.COMPLETED: "IMAGING_COMPLETED",
        ImagingStatus.FAILED: "IMAGING_FAILED",
        ImagingStatus.VERIFIED: "IMAGING_VERIFIED"
    }
    
    action = activity_mapping.get(imaging_update.imaging_status, "IMAGING_UPDATED")
    
    log_device_activity(
        db=db,
        user_id=current_user.id,
        device_id=str(device_id),
        action=action,
        details={
            "device_id": str(device_id),
            "imaging_status": imaging_update.imaging_status.value if imaging_update.imaging_status else None,
            "imaging_tool": imaging_update.imaging_tool,
            "technician_id": str(current_user.id)
        }
    )
    
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get device imaging status and details.
    """
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access
    seizure = db.query(Seizure).filter(Seizure.id == device.seizure_id).first()
    case = check_case_access(db, seizure.case_id, current_user)
    if not case:
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a forensic artifact to a device.
    
    Required permissions: FORENSIC or ADMIN role
    """
    require_roles(current_user, ["FORENSIC", "ADMIN"])
    
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access
    seizure = db.query(Seizure).filter(Seizure.id == device.seizure_id).first()
    case = check_case_access(db, seizure.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    # Create artifact
    artifact = Artefact(
        device_id=device_id,
        artefact_type=artifact_data.artefact_type,
        source_tool=artifact_data.source_tool,
        description=artifact_data.description,
        file_path=artifact_data.file_path,
        sha256=artifact_data.sha256,
        created_by=current_user.id,
        updated_by=current_user.id
    )
    
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    
    # Log activity
    log_device_activity(
        db=db,
        user_id=current_user.id,
        device_id=str(device_id),
        action="ARTIFACT_ADDED",
        details={
            "artifact_id": str(artifact.id),
            "artifact_type": artifact_data.artefact_type.value if artifact_data.artefact_type else None,
            "source_tool": artifact_data.source_tool,
            "device_id": str(device_id)
        }
    )
    
    return artifact


@router.get("/devices/{device_id}/artifacts", response_model=List[ArtefactResponse])
async def list_device_artifacts(
    device_id: UUID,
    artifact_type: Optional[ArtefactType] = Query(None, description="Filter by artifact type"),
    source_tool: Optional[str] = Query(None, description="Filter by extraction tool"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all artifacts extracted from a device.
    """
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check case access
    seizure = db.query(Seizure).filter(Seizure.id == device.seizure_id).first()
    case = check_case_access(db, seizure.case_id, current_user)
    if not case:
        raise HTTPException(status_code=403, detail="Access denied to case")
    
    query = db.query(Artefact).filter(Artefact.device_id == device_id)
    
    if artifact_type:
        query = query.filter(Artefact.artefact_type == artifact_type)
    if source_tool:
        query = query.filter(Artefact.source_tool.ilike(f"%{source_tool}%"))
    
    artifacts = query.order_by(Artefact.created_at.desc()).all()
    
    return artifacts


# ==================== FORENSIC WORKFLOW SUMMARY APIs ====================

@router.get("/{case_id}/forensic-summary", response_model=ForensicWorkflowResponse)
async def get_case_forensic_summary(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive forensic workflow summary for a case.
    """
    # Verify case access
    case = check_case_access(db, case_id, current_user)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Get seizures and devices
    seizures = db.query(Seizure).filter(Seizure.case_id == case_id).all()
    total_seizures = len(seizures)
    
    devices = []
    for seizure in seizures:
        devices.extend(seizure.devices)
    
    total_devices = len(devices)
    imaged_devices = len([d for d in devices if d.imaged])
    pending_imaging = len([d for d in devices if d.imaging_status == ImagingStatus.NOT_STARTED])
    in_progress_imaging = len([d for d in devices if d.imaging_status == ImagingStatus.IN_PROGRESS])
    
    # Get artifact counts
    total_artifacts = 0
    artifact_types = {}
    for device in devices:
        total_artifacts += len(device.artefacts)
        for artifact in device.artefacts:
            artifact_type = artifact.artefact_type.value
            artifact_types[artifact_type] = artifact_types.get(artifact_type, 0) + 1
    
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get forensic workload statistics for performance monitoring.
    
    Available to FORENSIC, SUPERVISOR, and ADMIN roles.
    """
    require_roles(current_user, ["FORENSIC", "SUPERVISOR", "ADMIN"])
    
    # Build base queries
    seizure_query = db.query(Seizure)
    device_query = db.query(Device)
    
    if start_date:
        seizure_query = seizure_query.filter(Seizure.seized_at >= start_date)
        device_query = device_query.filter(Device.created_at >= start_date)
    if end_date:
        seizure_query = seizure_query.filter(Seizure.seized_at <= end_date)
        device_query = device_query.filter(Device.created_at <= end_date)
    if technician_id:
        device_query = device_query.filter(Device.imaging_technician_id == technician_id)
    
    seizures = seizure_query.all()
    devices = device_query.all()
    
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