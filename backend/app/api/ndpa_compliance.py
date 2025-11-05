"""
FastAPI endpoints for NDPA (Nigeria Data Protection Act) compliance management.

This module provides comprehensive API endpoints for:
- NDPA compliance assessments and monitoring
- NITDA registration and reporting
- Data subject rights management
- Breach notification workflows
- Data localization compliance
- Cross-border transfer validation
- DPIA (Data Protection Impact Assessment) management
"""

import uuid
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from app.core.deps import get_db, get_current_user
from app.core.permissions import require_admin, require_supervisor_or_admin
from app.models.users import User
from app.models.ndpa_compliance import (
    NDPAConsentRecord, NDPADataProcessingActivity, NDPADataSubjectRequest,
    NDPABreachNotification, NDPAImpactAssessment, NDPARegistrationRecord
)
from app.schemas.audit import (
    NDPAComplianceFramework, NDPADataCategory, NDPAProcessingPurpose,
    NDPAConsentType, NDPADataSubjectRights, NDPAConsentRecord as NDPAConsentSchema,
    NDPADataProcessingRecord, NDPADataSubjectRequest as NDPADSRSchema,
    NDPABreachNotification as NDPABreachSchema, NDPAComplianceAssessment,
    NDPARegistrationStatus, NDPAImpactAssessment as NDPADPIASchema
)
from app.utils.ndpa_compliance import NDPAComplianceEngine, NDPAComplianceStatus, NDPAViolationContext
from app.utils.compliance_reporting import ComplianceReportGenerator
from app.schemas.audit import ComplianceReportCreate, ComplianceReportResponse


router = APIRouter()


@router.post("/assess", response_model=Dict[str, Any])
async def assess_ndpa_compliance(
    assessment_scope: Optional[List[str]] = Query(None, description="Specific compliance areas to assess"),
    entity_type: Optional[str] = Query(None, description="Specific entity type to assess"),
    entity_id: Optional[str] = Query(None, description="Specific entity ID to assess"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor_or_admin)
):
    """
    Perform comprehensive NDPA compliance assessment.
    
    Assesses compliance with Nigeria Data Protection Act requirements
    including consent management, data localization, breach notification,
    data subject rights, and NITDA registration.
    """
    try:
        # Initialize NDPA compliance engine
        ndpa_engine = NDPAComplianceEngine(db)
        
        # Perform compliance assessment
        assessment_result = await ndpa_engine.assess_ndpa_compliance(
            entity_type=entity_type,
            entity_id=entity_id,
            assessment_scope=assessment_scope
        )
        
        # Log assessment
        from app.utils.audit import AuditService
        audit_service = AuditService(db)
        await audit_service.log_action(
            action="EXECUTE",
            entity_type="COMPLIANCE_ASSESSMENT",
            entity_id=assessment_result.get("assessment_id"),
            user_id=current_user.id,
            description=f"NDPA compliance assessment performed - Score: {assessment_result.get('compliance_score', 0):.2f}%",
            severity="HIGH" if assessment_result.get('compliance_score', 0) < 80 else "MEDIUM"
        )
        
        return assessment_result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"NDPA compliance assessment failed: {str(e)}"
        )


@router.get("/status", response_model=Dict[str, Any])
async def get_ndpa_compliance_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current NDPA compliance status overview.
    
    Returns high-level compliance status including overall score,
    recent violations, and key compliance indicators.
    """
    try:
        # Get recent compliance violations
        recent_violations = db.query(ComplianceViolation).filter(
            ComplianceViolation.violation_type.like("NDPA_%")
        ).order_by(desc(ComplianceViolation.detected_at)).limit(10).all()
        
        # Get NITDA registration status
        registration = db.query(NDPARegistrationRecord).first()
        
        # Get recent breach notifications
        recent_breaches = db.query(NDPABreachNotification).filter(
            NDPABreachNotification.breach_discovered_at >= datetime.utcnow() - timedelta(days=30)
        ).count()
        
        # Get pending data subject requests
        pending_dsrs = db.query(NDPADataSubjectRequest).filter(
            NDPADataSubjectRequest.status == "PENDING"
        ).count()
        
        # Calculate quick compliance indicators
        compliance_status = {
            "overall_status": "COMPLIANT" if registration and registration.compliance_score >= 80 else "NON_COMPLIANT",
            "compliance_score": registration.compliance_score if registration else 0.0,
            "nitda_registration": {
                "status": registration.registration_status if registration else "NOT_REGISTERED",
                "registration_number": registration.registration_number if registration else None,
                "renewal_due": registration.is_renewal_due if registration else False
            },
            "recent_activity": {
                "violations_last_30_days": len([v for v in recent_violations if v.detected_at >= datetime.utcnow() - timedelta(days=30)]),
                "breaches_last_30_days": recent_breaches,
                "pending_dsr_requests": pending_dsrs
            },
            "key_indicators": {
                "dpo_appointed": registration.dpo_appointed if registration else False,
                "high_risk_processing": registration.high_risk_processing if registration else False,
                "cross_border_transfers": registration.cross_border_transfers if registration else False
            },
            "recent_violations": [
                {
                    "id": str(v.id),
                    "type": v.violation_type,
                    "severity": v.severity,
                    "detected_at": v.detected_at.isoformat(),
                    "status": v.status
                }
                for v in recent_violations[:5]
            ],
            "last_assessment": registration.last_assessment_date if registration else None
        }
        
        return compliance_status
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get NDPA compliance status: {str(e)}"
        )


@router.post("/consent", response_model=Dict[str, Any])
async def create_consent_record(
    consent_data: NDPAConsentSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new NDPA consent record."""
    try:
        consent_record = NDPAConsentRecord(
            data_subject_id=consent_data.data_subject_id,
            consent_type=consent_data.consent_type.value,
            processing_purpose=consent_data.processing_purpose.value,
            data_categories=[cat.value for cat in consent_data.data_categories],
            consent_given_at=consent_data.consent_given_at,
            consent_text=consent_data.consent_text,
            withdrawal_method=consent_data.withdrawal_method,
            retention_period=consent_data.retention_period,
            third_party_sharing=consent_data.third_party_sharing,
            cross_border_transfer=consent_data.cross_border_transfer,
            created_by=current_user.id
        )
        
        db.add(consent_record)
        db.commit()
        db.refresh(consent_record)
        
        return {
            "id": str(consent_record.id),
            "status": "CREATED",
            "message": "Consent record created successfully",
            "consent_valid": consent_record.is_valid
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create consent record: {str(e)}"
        )


@router.post("/consent/{consent_id}/withdraw")
async def withdraw_consent(
    consent_id: uuid.UUID,
    withdrawal_reason: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Withdraw a consent record."""
    try:
        consent_record = db.query(NDPAConsentRecord).filter(
            NDPAConsentRecord.id == consent_id
        ).first()
        
        if not consent_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consent record not found"
            )
        
        consent_record.withdraw_consent(withdrawal_reason)
        db.commit()
        
        return {
            "status": "WITHDRAWN",
            "message": "Consent withdrawn successfully",
            "withdrawn_at": consent_record.withdrawn_at.isoformat()
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to withdraw consent: {str(e)}"
        )


@router.post("/data-subject-requests", response_model=Dict[str, Any])
async def create_data_subject_request(
    dsr_data: NDPADSRSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new data subject rights request."""
    try:
        # Calculate response due date (30 days from submission)
        response_due_date = dsr_data.submitted_at + timedelta(days=30)
        
        dsr_request = NDPADataSubjectRequest(
            request_id=f"DSR-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}",
            request_type=dsr_data.request_type.value,
            data_subject_id=dsr_data.data_subject_id,
            data_subject_name=dsr_data.data_subject_name if hasattr(dsr_data, 'data_subject_name') else "",
            description=dsr_data.description,
            submitted_at=dsr_data.submitted_at,
            response_due_date=response_due_date,
            verification_method=dsr_data.verification_method,
            assigned_to=current_user.id
        )
        
        db.add(dsr_request)
        db.commit()
        db.refresh(dsr_request)
        
        return {
            "request_id": dsr_request.request_id,
            "status": "CREATED",
            "response_due_date": response_due_date.isoformat(),
            "message": "Data subject request created successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create data subject request: {str(e)}"
        )


@router.post("/breach-notifications", response_model=Dict[str, Any])
async def create_breach_notification(
    breach_data: NDPABreachSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor_or_admin)
):
    """Create a new NDPA breach notification."""
    try:
        breach_notification = NDPABreachNotification(
            breach_id=f"BREACH-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}",
            breach_type=breach_data.breach_type,
            severity_level=breach_data.severity_level if hasattr(breach_data, 'severity_level') else "MEDIUM",
            breach_occurred_at=breach_data.breach_occurred_at,
            breach_discovered_at=breach_data.breach_discovered_at,
            data_categories_affected=[cat.value for cat in breach_data.data_categories_affected],
            number_of_data_subjects=breach_data.number_of_data_subjects,
            description=breach_data.description if hasattr(breach_data, 'description') else "",
            likely_consequences=breach_data.likely_consequences,
            measures_taken=breach_data.measures_taken,
            remedial_actions=breach_data.remedial_actions,
            reported_by=current_user.id
        )
        
        db.add(breach_notification)
        db.commit()
        db.refresh(breach_notification)
        
        # Check if NITDA notification deadline will be missed
        hours_since_discovery = (datetime.utcnow() - breach_data.breach_discovered_at).total_seconds() / 3600
        deadline_warning = hours_since_discovery > 48  # Warning at 48 hours
        
        return {
            "breach_id": breach_notification.breach_id,
            "status": "CREATED",
            "nitda_notification_required": True,
            "nitda_deadline": (breach_data.breach_discovered_at + timedelta(hours=72)).isoformat(),
            "deadline_warning": deadline_warning,
            "message": "Breach notification created successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create breach notification: {str(e)}"
        )


@router.post("/validate-transfer", response_model=Dict[str, Any])
async def validate_cross_border_transfer(
    data_categories: List[NDPADataCategory],
    destination_country: str,
    safeguards: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate NDPA compliance for cross-border data transfers."""
    try:
        # Initialize NDPA compliance engine
        ndpa_engine = NDPAComplianceEngine(db)
        
        # Validate transfer
        validation_result = await ndpa_engine.validate_cross_border_transfer(
            data_categories=[cat.value for cat in data_categories],
            destination_country=destination_country,
            safeguards=safeguards
        )
        
        # Log validation
        from app.utils.audit import AuditService
        audit_service = AuditService(db)
        await audit_service.log_action(
            action="VALIDATE",
            entity_type="CROSS_BORDER_TRANSFER",
            entity_id=f"{destination_country}-{len(data_categories)}",
            user_id=current_user.id,
            description=f"Cross-border transfer validation: {destination_country} - {'ALLOWED' if validation_result['allowed'] else 'BLOCKED'}",
            severity="HIGH" if not validation_result['allowed'] else "LOW"
        )
        
        return validation_result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transfer validation failed: {str(e)}"
        )


@router.post("/reports/{report_type}", response_model=ComplianceReportResponse)
async def generate_ndpa_report(
    report_type: str,
    report_request: ComplianceReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor_or_admin)
):
    """Generate NDPA-specific compliance reports."""
    try:
        # Validate NDPA report type
        valid_ndpa_reports = [
            "NDPA_COMPLIANCE",
            "NITDA_SUBMISSION", 
            "NDPA_BREACH_NOTIFICATION",
            "NDPA_DATA_SUBJECT_RIGHTS",
            "NDPA_PROCESSING_ACTIVITIES",
            "NDPA_DPIA_REPORT"
        ]
        
        if report_type not in valid_ndpa_reports:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid NDPA report type. Valid types: {valid_ndpa_reports}"
            )
        
        # Initialize compliance report generator
        report_generator = ComplianceReportGenerator(db)
        
        # Update report request with NDPA-specific type
        ndpa_report_request = ComplianceReportCreate(
            name=report_request.name,
            description=report_request.description,
            report_type=report_type,
            start_date=report_request.start_date,
            end_date=report_request.end_date,
            parameters=report_request.parameters,
            format=report_request.format
        )
        
        # Generate report
        report = report_generator.generate_report(ndpa_report_request, current_user.id)
        
        return ComplianceReportResponse(
            id=report.id,
            name=report.name,
            description=report.description,
            report_type=report.report_type,
            start_date=report.start_date,
            end_date=report.end_date,
            status=report.status,
            created_by=report.created_by,
            created_at=report.created_at,
            completed_at=report.completed_at,
            file_path=report.file_path,
            file_size=report.file_size,
            findings=report.findings
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"NDPA report generation failed: {str(e)}"
        )


@router.get("/violations", response_model=List[Dict[str, Any]])
async def get_ndpa_violations(
    severity: Optional[str] = Query(None, description="Filter by severity"),
    violation_type: Optional[str] = Query(None, description="Filter by violation type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, le=1000, description="Maximum number of violations to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get NDPA compliance violations."""
    try:
        # Build query for NDPA violations
        query = db.query(ComplianceViolation).filter(
            ComplianceViolation.violation_type.like("NDPA_%")
        )
        
        # Apply filters
        if severity:
            query = query.filter(ComplianceViolation.severity == severity)
        if violation_type:
            query = query.filter(ComplianceViolation.violation_type == violation_type)
        if status:
            query = query.filter(ComplianceViolation.status == status)
        
        # Execute query
        violations = query.order_by(
            desc(ComplianceViolation.detected_at)
        ).limit(limit).all()
        
        return [
            {
                "id": str(violation.id),
                "violation_type": violation.violation_type,
                "severity": violation.severity,
                "title": violation.title,
                "description": violation.description,
                "entity_type": violation.entity_type,
                "entity_id": violation.entity_id,
                "status": violation.status,
                "detected_at": violation.detected_at.isoformat(),
                "resolved_at": violation.resolved_at.isoformat() if violation.resolved_at else None,
                "compliance_rule": violation.compliance_rule,
                "remediation_steps": violation.remediation_steps
            }
            for violation in violations
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get NDPA violations: {str(e)}"
        )


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_ndpa_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get NDPA compliance dashboard data."""
    try:
        # Get key metrics
        registration = db.query(NDPARegistrationRecord).first()
        
        # Get violations in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_violations = db.query(ComplianceViolation).filter(
            and_(
                ComplianceViolation.violation_type.like("NDPA_%"),
                ComplianceViolation.detected_at >= thirty_days_ago
            )
        ).all()
        
        # Get pending data subject requests
        pending_dsrs = db.query(NDPADataSubjectRequest).filter(
            NDPADataSubjectRequest.status == "PENDING"
        ).all()
        
        # Get recent breaches
        recent_breaches = db.query(NDPABreachNotification).filter(
            NDPABreachNotification.breach_discovered_at >= thirty_days_ago
        ).all()
        
        # Get processing activities
        processing_activities = db.query(NDPADataProcessingActivity).all()
        
        dashboard_data = {
            "compliance_overview": {
                "overall_score": registration.compliance_score if registration else 0.0,
                "status": registration.registration_status if registration else "NOT_REGISTERED",
                "last_assessment": registration.last_assessment_date.isoformat() if registration and registration.last_assessment_date else None
            },
            "recent_activity": {
                "violations_30_days": len(recent_violations),
                "critical_violations": len([v for v in recent_violations if v.severity == "CRITICAL"]),
                "pending_dsr_requests": len(pending_dsrs),
                "overdue_dsr_requests": len([r for r in pending_dsrs if r.is_overdue]),
                "breaches_30_days": len(recent_breaches),
                "breaches_not_notified": len([b for b in recent_breaches if not b.notified_to_nitda])
            },
            "processing_activities": {
                "total_activities": len(processing_activities),
                "high_risk_activities": len([a for a in processing_activities if a.is_high_risk]),
                "activities_with_dpia": len([a for a in processing_activities if a.dpia_completed]),
                "cross_border_transfers": len([a for a in processing_activities if a.third_country_transfers])
            },
            "nitda_registration": {
                "status": registration.registration_status if registration else "NOT_REGISTERED",
                "registration_number": registration.registration_number if registration else None,
                "dpo_appointed": registration.dpo_appointed if registration else False,
                "renewal_due": registration.is_renewal_due if registration else False
            },
            "alerts": []
        }
        
        # Add alerts for critical issues
        if registration and registration.is_renewal_due:
            dashboard_data["alerts"].append({
                "type": "RENEWAL_DUE",
                "severity": "HIGH", 
                "message": "NITDA registration renewal is due"
            })
        
        if any(r.is_overdue for r in pending_dsrs):
            dashboard_data["alerts"].append({
                "type": "OVERDUE_DSR",
                "severity": "HIGH",
                "message": f"{len([r for r in pending_dsrs if r.is_overdue])} data subject requests are overdue"
            })
        
        if any(not b.notified_to_nitda for b in recent_breaches):
            dashboard_data["alerts"].append({
                "type": "BREACH_NOT_NOTIFIED",
                "severity": "CRITICAL",
                "message": "Breach notifications to NITDA are pending"
            })
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get NDPA dashboard: {str(e)}"
        )