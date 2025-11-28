"""
Audit and compliance API endpoints.

This module provides comprehensive REST API endpoints for:
- Audit log management and search
- Compliance reporting and violation tracking
- Data retention policy management
- Audit configuration and settings
- Integrity verification and monitoring
"""

import uuid
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from app.core.deps import get_db, get_current_user
from app.utils.audit import AuditService, audit_action
from app.utils.compliance_reporting import ComplianceReportGenerator
from app.models.user import User
from app.models.audit import (
    AuditLog, ComplianceViolation, ComplianceReport, 
    RetentionPolicy, AuditConfiguration, DataRetentionJob, AuditArchive
)
from app.schemas.audit import (
    # Audit log schemas
    AuditLogResponse, AuditSearchRequest, AuditSearchResponse, 
    AuditStatistics, AuditExportRequest, AuditExportResponse,
    
    # Compliance schemas
    ComplianceReportCreate, ComplianceReportResponse, ComplianceStatistics,
    ComplianceViolationResponse, ComplianceViolationUpdate, ComplianceDashboard,
    
    # Retention schemas  
    RetentionPolicyCreate, RetentionPolicyUpdate, RetentionPolicyResponse,
    RetentionStatistics,
    
    # Configuration schemas
    AuditConfigurationCreate, AuditConfigurationUpdate, AuditConfigurationResponse,
    
    # Enum types
    AuditAction, AuditEntity, AuditSeverity, ComplianceStatus, ViolationType,
    
    # Bulk operations
    BulkAuditOperation, BulkAuditResponse
)


router = APIRouter()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def require_permissions(user_role, allowed_roles: List[str]) -> bool:
    """
    Check if user's role is in the list of allowed roles.
    
    Args:
        user_role: The user's role (UserRole enum or string)
        allowed_roles: List of role names that are allowed
    
    Returns:
        bool: True if user has permission, False otherwise
    """
    # Handle both enum and string role values
    role_value = user_role.value if hasattr(user_role, 'value') else str(user_role)
    return role_value.upper() in [r.upper() for r in allowed_roles]


# =============================================================================
# AUDIT LOG ENDPOINTS
# =============================================================================

@router.get("/logs/", response_model=AuditSearchResponse)
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "Search audit logs", AuditSeverity.LOW)
async def search_audit_logs(
    filters: AuditSearchRequest = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search audit logs with comprehensive filtering and pagination.
    
    Supports filtering by user, entity type, action, severity, date range,
    and full-text search across descriptions and details.
    """
    # Check permissions
    if not require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"]):
        # Non-privileged users can only see their own audit logs
        filters.filters.user_id = current_user.id
    
    audit_service = AuditService(db)
    results = audit_service.search_audit_logs(
        filters.filters,
        filters.page,
        filters.size,
        filters.sort_by,
        filters.sort_order
    )
    
    return AuditSearchResponse(**results)


@router.get("/logs/{log_id}", response_model=AuditLogResponse)
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "Get audit log details", AuditSeverity.LOW)
async def get_audit_log(
    log_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific audit log entry."""
    audit_log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not audit_log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    
    # Check permissions
    if not require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"]):
        if audit_log.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return AuditLogResponse.from_orm(audit_log)


@router.post("/logs/verify", response_model=Dict[str, Any])
@audit_action(AuditAction.EXECUTE, AuditEntity.SYSTEM, "Verify audit integrity", AuditSeverity.HIGH)
async def verify_audit_integrity(
    start_date: Optional[datetime] = Query(None, description="Start date for verification"),
    end_date: Optional[datetime] = Query(None, description="End date for verification"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify the integrity of audit logs within a date range.
    
    Performs cryptographic verification of audit log chains and
    identifies any tampering or integrity violations.
    """
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"])
    
    audit_service = AuditService(db)
    results = audit_service.verify_audit_integrity(start_date, end_date)
    
    return {
        "verification_results": results,
        "verification_date": datetime.utcnow().isoformat(),
        "verified_by": str(current_user.id)
    }


@router.get("/logs/statistics", response_model=AuditStatistics)
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "Get audit statistics", AuditSeverity.LOW)
async def get_audit_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive audit statistics for dashboards and monitoring."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"])
    
    audit_service = AuditService(db)
    stats = audit_service.get_audit_statistics()
    
    return AuditStatistics(**stats)


@router.post("/logs/export", response_model=AuditExportResponse)
@audit_action(AuditAction.EXPORT, AuditEntity.SYSTEM, "Export audit logs", AuditSeverity.HIGH)
async def export_audit_logs(
    export_request: AuditExportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export audit logs to various formats (CSV, JSON, Excel).
    
    Creates a background job to generate the export file and
    returns a job ID for tracking progress.
    """
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"])
    
    # Create export job record
    export_job = AuditExportResponse(
        export_id=uuid.uuid4(),
        status="PROCESSING",
        created_at=datetime.utcnow()
    )
    
    # Add background task for export processing
    background_tasks.add_task(
        _process_audit_export,
        db, export_job.export_id, export_request, current_user.id
    )
    
    return export_job


@router.get("/logs/export/{export_id}/download")
@audit_action(AuditAction.DOWNLOAD, AuditEntity.SYSTEM, "Download audit export", AuditSeverity.MEDIUM)
async def download_audit_export(
    export_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download completed audit log export file."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"])
    
    # Implementation would check export status and return file
    # This is a placeholder for the actual file download logic
    raise HTTPException(status_code=501, detail="Export download not yet implemented")


# =============================================================================
# COMPLIANCE REPORTING ENDPOINTS
# =============================================================================

@router.post("/reports/", response_model=ComplianceReportResponse)
@audit_action(AuditAction.CREATE, AuditEntity.REPORT, "Create compliance report", AuditSeverity.MEDIUM)
async def create_compliance_report(
    report_request: ComplianceReportCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new compliance report.
    
    Supports various report types including audit trails, compliance summaries,
    violation reports, and executive dashboards with multiple export formats.
    """
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "PROSECUTOR", "FORENSIC"])
    
    # Generate report in background
    report_generator = ComplianceReportGenerator(db)
    
    try:
        report = report_generator.generate_report(report_request, current_user.id)
        return ComplianceReportResponse.from_orm(report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.get("/reports/", response_model=List[ComplianceReportResponse])
@audit_action(AuditAction.READ, AuditEntity.REPORT, "List compliance reports", AuditSeverity.LOW)
async def list_compliance_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    report_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List compliance reports with filtering options."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "PROSECUTOR", "FORENSIC"])
    
    query = db.query(ComplianceReport)
    
    if report_type:
        query = query.filter(ComplianceReport.report_type == report_type)
    if status:
        query = query.filter(ComplianceReport.status == status)
    
    # Non-admin users can only see their own reports
    if not require_permissions(current_user.role, ["ADMIN", "SUPERVISOR"]):
        query = query.filter(ComplianceReport.created_by == current_user.id)
    
    reports = query.order_by(desc(ComplianceReport.created_at)).offset(skip).limit(limit).all()
    
    return [ComplianceReportResponse.from_orm(report) for report in reports]


@router.get("/reports/{report_id}", response_model=ComplianceReportResponse)
@audit_action(AuditAction.READ, AuditEntity.REPORT, "Get compliance report", AuditSeverity.LOW)
async def get_compliance_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific compliance report."""
    report = db.query(ComplianceReport).filter(ComplianceReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if not require_permissions(current_user.role, ["ADMIN", "SUPERVISOR"]):
        if report.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return ComplianceReportResponse.from_orm(report)


@router.get("/reports/{report_id}/download")
@audit_action(AuditAction.DOWNLOAD, AuditEntity.REPORT, "Download compliance report", AuditSeverity.MEDIUM)
async def download_compliance_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a completed compliance report file."""
    report = db.query(ComplianceReport).filter(ComplianceReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if not require_permissions(current_user.role, ["ADMIN", "SUPERVISOR"]):
        if report.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if not report.file_path or report.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Report not ready for download")
    
    return FileResponse(
        report.file_path,
        media_type='application/octet-stream',
        filename=f"{report.name}_{report.id}.{report.format.lower()}"
    )


@router.delete("/reports/{report_id}")
@audit_action(AuditAction.DELETE, AuditEntity.REPORT, "Delete compliance report", AuditSeverity.MEDIUM)
async def delete_compliance_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a compliance report and its associated file."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR"])
    
    report = db.query(ComplianceReport).filter(ComplianceReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Delete associated file if it exists
    if report.file_path:
        try:
            import os
            os.remove(report.file_path)
        except Exception:
            pass  # Continue even if file deletion fails
    
    db.delete(report)
    db.commit()
    
    return {"message": "Report deleted successfully"}


# =============================================================================
# COMPLIANCE VIOLATIONS ENDPOINTS
# =============================================================================

@router.get("/violations/", response_model=List[ComplianceViolationResponse])
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "List compliance violations", AuditSeverity.LOW)
async def list_compliance_violations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    violation_type: Optional[ViolationType] = Query(None),
    severity: Optional[AuditSeverity] = Query(None),
    status: Optional[ComplianceStatus] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List compliance violations with filtering options."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"])
    
    query = db.query(ComplianceViolation)
    
    if violation_type:
        query = query.filter(ComplianceViolation.violation_type == violation_type)
    if severity:
        query = query.filter(ComplianceViolation.severity == severity)
    if status:
        query = query.filter(ComplianceViolation.status == status)
    
    violations = query.order_by(desc(ComplianceViolation.detected_at)).offset(skip).limit(limit).all()
    
    return [ComplianceViolationResponse.from_orm(v) for v in violations]


@router.get("/violations/{violation_id}", response_model=ComplianceViolationResponse)
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "Get compliance violation", AuditSeverity.LOW)
async def get_compliance_violation(
    violation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific compliance violation."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"])
    
    violation = db.query(ComplianceViolation).filter(ComplianceViolation.id == violation_id).first()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    
    return ComplianceViolationResponse.from_orm(violation)


@router.put("/violations/{violation_id}", response_model=ComplianceViolationResponse)
@audit_action(AuditAction.UPDATE, AuditEntity.SYSTEM, "Update compliance violation", AuditSeverity.MEDIUM)
async def update_compliance_violation(
    violation_id: uuid.UUID,
    violation_update: ComplianceViolationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update compliance violation status and resolution information."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"])
    
    violation = db.query(ComplianceViolation).filter(ComplianceViolation.id == violation_id).first()
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")
    
    # Update fields
    update_data = violation_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(violation, field, value)
    
    # Mark as resolved if status is being updated
    if violation_update.status == ComplianceStatus.COMPLIANT:
        violation.mark_resolved(current_user.id, violation_update.resolution_notes)
    
    db.commit()
    db.refresh(violation)
    
    return ComplianceViolationResponse.from_orm(violation)


@router.get("/violations/statistics", response_model=ComplianceStatistics)
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "Get compliance statistics", AuditSeverity.LOW)
async def get_compliance_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive compliance statistics and metrics."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"])
    
    # Calculate compliance statistics
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    total_violations = db.query(ComplianceViolation).count()
    open_violations = db.query(ComplianceViolation).filter(
        ComplianceViolation.status != ComplianceStatus.COMPLIANT
    ).count()
    
    critical_violations = db.query(ComplianceViolation).filter(
        and_(
            ComplianceViolation.severity == AuditSeverity.CRITICAL,
            ComplianceViolation.detected_at >= month_start
        )
    ).count()
    
    # Get violations by type
    violations_by_type = dict(
        db.query(ComplianceViolation.violation_type, func.count(ComplianceViolation.id))
        .filter(ComplianceViolation.detected_at >= month_start)
        .group_by(ComplianceViolation.violation_type)
        .all()
    )
    
    # Calculate compliance score (simplified algorithm)
    max_score = 100
    score_deduction = (critical_violations * 20) + (open_violations * 5)
    compliance_score = max(0, max_score - score_deduction)
    
    # Get recent violations
    recent_violations = db.query(ComplianceViolation).order_by(
        desc(ComplianceViolation.detected_at)
    ).limit(10).all()
    
    return ComplianceStatistics(
        total_violations=total_violations,
        open_violations=open_violations,
        critical_violations=critical_violations,
        violations_by_type=violations_by_type,
        compliance_score=compliance_score,
        recent_violations=[ComplianceViolationResponse.from_orm(v) for v in recent_violations]
    )


# =============================================================================
# DATA RETENTION POLICY ENDPOINTS
# =============================================================================

@router.post("/retention-policies/", response_model=RetentionPolicyResponse)
@audit_action(AuditAction.CREATE, AuditEntity.SYSTEM, "Create retention policy", AuditSeverity.MEDIUM)
async def create_retention_policy(
    policy_data: RetentionPolicyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new data retention policy."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR"])
    
    # Check for duplicate policy names
    existing_policy = db.query(RetentionPolicy).filter(
        RetentionPolicy.name == policy_data.name
    ).first()
    if existing_policy:
        raise HTTPException(status_code=400, detail="Policy name already exists")
    
    policy = RetentionPolicy(
        **policy_data.dict(),
        created_by=current_user.id
    )
    
    db.add(policy)
    db.commit()
    db.refresh(policy)
    
    return RetentionPolicyResponse.from_orm(policy)


@router.get("/retention-policies/", response_model=List[RetentionPolicyResponse])
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "List retention policies", AuditSeverity.LOW)
async def list_retention_policies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    entity_type: Optional[AuditEntity] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List data retention policies with filtering options."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"])
    
    query = db.query(RetentionPolicy)
    
    if entity_type:
        query = query.filter(RetentionPolicy.entity_type == entity_type)
    if is_active is not None:
        query = query.filter(RetentionPolicy.is_active == is_active)
    
    policies = query.order_by(RetentionPolicy.name).offset(skip).limit(limit).all()
    
    return [RetentionPolicyResponse.from_orm(policy) for policy in policies]


@router.get("/retention-policies/{policy_id}", response_model=RetentionPolicyResponse)
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "Get retention policy", AuditSeverity.LOW)
async def get_retention_policy(
    policy_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific retention policy."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR", "FORENSIC"])
    
    policy = db.query(RetentionPolicy).filter(RetentionPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Retention policy not found")
    
    return RetentionPolicyResponse.from_orm(policy)


@router.put("/retention-policies/{policy_id}", response_model=RetentionPolicyResponse)
@audit_action(AuditAction.UPDATE, AuditEntity.SYSTEM, "Update retention policy", AuditSeverity.MEDIUM)
async def update_retention_policy(
    policy_id: uuid.UUID,
    policy_update: RetentionPolicyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a data retention policy."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR"])
    
    policy = db.query(RetentionPolicy).filter(RetentionPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Retention policy not found")
    
    # Update fields
    update_data = policy_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(policy, field, value)
    
    policy.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(policy)
    
    return RetentionPolicyResponse.from_orm(policy)


@router.delete("/retention-policies/{policy_id}")
@audit_action(AuditAction.DELETE, AuditEntity.SYSTEM, "Delete retention policy", AuditSeverity.HIGH)
async def delete_retention_policy(
    policy_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a data retention policy."""
    require_permissions(current_user.role, ["ADMIN"])
    
    policy = db.query(RetentionPolicy).filter(RetentionPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Retention policy not found")
    
    db.delete(policy)
    db.commit()
    
    return {"message": "Retention policy deleted successfully"}


@router.get("/retention-policies/statistics", response_model=RetentionStatistics)
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "Get retention statistics", AuditSeverity.LOW)
async def get_retention_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get data retention statistics and compliance metrics."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR"])
    
    total_policies = db.query(RetentionPolicy).count()
    active_policies = db.query(RetentionPolicy).filter(RetentionPolicy.is_active == True).count()
    
    # Simplified statistics - in a real implementation, you'd calculate actual items due for archival/deletion
    items_due_for_archive = 0  # Would be calculated based on retention policies
    items_due_for_deletion = 0  # Would be calculated based on retention policies
    
    # Storage by retention period (placeholder)
    storage_by_retention = {
        "1_YEAR": 1024 * 1024 * 100,  # 100MB
        "3_YEARS": 1024 * 1024 * 500,  # 500MB
        "PERMANENT": 1024 * 1024 * 1000  # 1GB
    }
    
    return RetentionStatistics(
        total_policies=total_policies,
        active_policies=active_policies,
        items_due_for_archive=items_due_for_archive,
        items_due_for_deletion=items_due_for_deletion,
        storage_by_retention=storage_by_retention
    )


# =============================================================================
# AUDIT CONFIGURATION ENDPOINTS
# =============================================================================

@router.post("/configurations/", response_model=AuditConfigurationResponse)
@audit_action(AuditAction.CONFIGURE, AuditEntity.SYSTEM, "Create audit configuration", AuditSeverity.HIGH)
async def create_audit_configuration(
    config_data: AuditConfigurationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create audit configuration for an entity type."""
    require_permissions(current_user.role, ["ADMIN"])
    
    # Check for existing configuration
    existing_config = db.query(AuditConfiguration).filter(
        AuditConfiguration.entity_type == config_data.entity_type
    ).first()
    if existing_config:
        raise HTTPException(status_code=400, detail="Configuration already exists for this entity type")
    
    config = AuditConfiguration(
        **config_data.dict(),
        created_by=current_user.id
    )
    
    db.add(config)
    db.commit()
    db.refresh(config)
    
    return AuditConfigurationResponse.from_orm(config)


@router.get("/configurations/", response_model=List[AuditConfigurationResponse])
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "List audit configurations", AuditSeverity.LOW)
async def list_audit_configurations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    entity_type: Optional[AuditEntity] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List audit configurations with filtering options."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR"])
    
    query = db.query(AuditConfiguration)
    
    if entity_type:
        query = query.filter(AuditConfiguration.entity_type == entity_type)
    if is_active is not None:
        query = query.filter(AuditConfiguration.is_active == is_active)
    
    configs = query.order_by(AuditConfiguration.entity_type).offset(skip).limit(limit).all()
    
    return [AuditConfigurationResponse.from_orm(config) for config in configs]


@router.get("/configurations/{config_id}", response_model=AuditConfigurationResponse)
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "Get audit configuration", AuditSeverity.LOW)
async def get_audit_configuration(
    config_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed audit configuration information."""
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR"])
    
    config = db.query(AuditConfiguration).filter(AuditConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Audit configuration not found")
    
    return AuditConfigurationResponse.from_orm(config)


@router.put("/configurations/{config_id}", response_model=AuditConfigurationResponse)
@audit_action(AuditAction.UPDATE, AuditEntity.SYSTEM, "Update audit configuration", AuditSeverity.HIGH)
async def update_audit_configuration(
    config_id: uuid.UUID,
    config_update: AuditConfigurationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update audit configuration settings."""
    require_permissions(current_user.role, ["ADMIN"])
    
    config = db.query(AuditConfiguration).filter(AuditConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Audit configuration not found")
    
    # Update fields
    update_data = config_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    config.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(config)
    
    return AuditConfigurationResponse.from_orm(config)


@router.delete("/configurations/{config_id}")
@audit_action(AuditAction.DELETE, AuditEntity.SYSTEM, "Delete audit configuration", AuditSeverity.HIGH)
async def delete_audit_configuration(
    config_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an audit configuration."""
    require_permissions(current_user.role, ["ADMIN"])
    
    config = db.query(AuditConfiguration).filter(AuditConfiguration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Audit configuration not found")
    
    db.delete(config)
    db.commit()
    
    return {"message": "Audit configuration deleted successfully"}


# =============================================================================
# DASHBOARD AND MONITORING ENDPOINTS
# =============================================================================

@router.get("/dashboard", response_model=ComplianceDashboard)
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "Get compliance dashboard", AuditSeverity.LOW)
async def get_compliance_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive compliance dashboard with all key metrics.
    
    Provides a unified view of audit statistics, compliance status,
    and retention metrics for executive and supervisory oversight.
    """
    require_permissions(current_user.role, ["ADMIN", "SUPERVISOR"])
    
    # Get audit statistics
    audit_service = AuditService(db)
    audit_stats = audit_service.get_audit_statistics()
    
    # Get compliance statistics (reuse from violations endpoint logic)
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    total_violations = db.query(ComplianceViolation).count()
    open_violations = db.query(ComplianceViolation).filter(
        ComplianceViolation.status != ComplianceStatus.COMPLIANT
    ).count()
    critical_violations = db.query(ComplianceViolation).filter(
        and_(
            ComplianceViolation.severity == AuditSeverity.CRITICAL,
            ComplianceViolation.detected_at >= month_start
        )
    ).count()
    
    violations_by_type = dict(
        db.query(ComplianceViolation.violation_type, func.count(ComplianceViolation.id))
        .filter(ComplianceViolation.detected_at >= month_start)
        .group_by(ComplianceViolation.violation_type)
        .all()
    )
    
    compliance_score = max(0, 100 - (critical_violations * 20) - (open_violations * 5))
    
    recent_violations = db.query(ComplianceViolation).order_by(
        desc(ComplianceViolation.detected_at)
    ).limit(5).all()
    
    # Get retention statistics
    total_policies = db.query(RetentionPolicy).count()
    active_policies = db.query(RetentionPolicy).filter(RetentionPolicy.is_active == True).count()
    
    return ComplianceDashboard(
        audit_stats=AuditStatistics(**audit_stats),
        compliance_stats=ComplianceStatistics(
            total_violations=total_violations,
            open_violations=open_violations,
            critical_violations=critical_violations,
            violations_by_type=violations_by_type,
            compliance_score=compliance_score,
            recent_violations=[ComplianceViolationResponse.from_orm(v) for v in recent_violations]
        ),
        retention_stats=RetentionStatistics(
            total_policies=total_policies,
            active_policies=active_policies,
            items_due_for_archive=0,  # Placeholder
            items_due_for_deletion=0,  # Placeholder
            storage_by_retention={}  # Placeholder
        ),
        last_updated=datetime.utcnow()
    )


# =============================================================================
# BULK OPERATIONS ENDPOINTS
# =============================================================================

@router.post("/bulk-operations", response_model=BulkAuditResponse)
@audit_action(AuditAction.EXECUTE, AuditEntity.SYSTEM, "Execute bulk audit operation", AuditSeverity.HIGH)
async def execute_bulk_audit_operation(
    operation: BulkAuditOperation,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute bulk operations on audit data.
    
    Supports operations like bulk archiving, cleanup, verification,
    and batch processing of audit logs and compliance data.
    """
    require_permissions(current_user.role, ["ADMIN"])
    
    job_id = uuid.uuid4()
    
    # Create bulk operation response
    response = BulkAuditResponse(
        job_id=job_id,
        status="PROCESSING",
        created_at=datetime.utcnow()
    )
    
    # Add background task for bulk processing
    background_tasks.add_task(
        _process_bulk_operation,
        db, job_id, operation, current_user.id
    )
    
    return response


@router.get("/bulk-operations/{job_id}", response_model=BulkAuditResponse)
@audit_action(AuditAction.READ, AuditEntity.SYSTEM, "Get bulk operation status", AuditSeverity.LOW)
async def get_bulk_operation_status(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the status of a bulk audit operation."""
    require_permissions(current_user.role, ["ADMIN"])
    
    # Implementation would track bulk operation jobs
    # This is a placeholder for the actual job tracking logic
    return BulkAuditResponse(
        job_id=job_id,
        status="COMPLETED",
        total_items=100,
        processed_items=100,
        failed_items=0,
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )


# =============================================================================
# HELPER FUNCTIONS FOR BACKGROUND TASKS
# =============================================================================

async def _process_audit_export(
    db: Session,
    export_id: uuid.UUID,
    export_request: AuditExportRequest,
    user_id: uuid.UUID
):
    """Process audit log export in the background."""
    # Implementation would handle the actual export processing
    pass


async def _process_bulk_operation(
    db: Session,
    job_id: uuid.UUID,
    operation: BulkAuditOperation,
    user_id: uuid.UUID
):
    """Process bulk audit operations in the background."""
    # Implementation would handle the actual bulk operations
    pass