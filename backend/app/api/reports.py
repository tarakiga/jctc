from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date, timedelta
import json
import io
import base64

from app.core.deps import get_db, get_current_user
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.party import Party
from app.models.legal import LegalInstrument
from app.models.user import User
from app.schemas.reports import (
    ReportRequest,
    ReportResponse,
    ReportTemplate,
    ScheduledReport,
    ReportExecution,
    CaseReport,
    EvidenceReport,
    ComplianceReport,
    ExecutiveSummary,
    CustomReportRequest
)

from app.schemas.user import UserResponse as UserSchema
from app.utils.reports import (
    generate_pdf_report,
    generate_excel_report,
    generate_word_report,
    create_case_summary_report,
    create_evidence_chain_report,
    create_compliance_report,
    create_executive_summary,
    apply_report_template
)

router = APIRouter()

@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    report_request: ReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Generate a report based on the request parameters"""
    
    # Generate report ID
    report_id = str(uuid.uuid4())
    
    # Validate report type and parameters
    if report_request.report_type not in ["case_summary", "evidence_chain", "compliance", 
                                        "executive_summary", "custom", "investigation_log"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type"
        )
    
    # Create report execution record
    report_execution = {
        "id": report_id,
        "report_type": report_request.report_type,
        "parameters": report_request.parameters,
        "format": report_request.format,
        "status": "PENDING",
        "requested_by": current_user.id,
        "created_at": datetime.utcnow()
    }
    
    try:
        # Queue report generation as background task
        background_tasks.add_task(
            process_report_generation,
            report_id,
            report_request,
            current_user.id,
            db
        )
        
        return ReportResponse(
            id=report_id,
            report_type=report_request.report_type,
            format=report_request.format,
            status="PENDING",
            message="Report generation has been queued",
            estimated_completion=datetime.utcnow() + timedelta(minutes=5),
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue report generation: {str(e)}"
        )

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report_status(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get the status of a report generation"""
    
    # In a real implementation, this would query a reports table
    # For now, we'll simulate the response
    
    return ReportResponse(
        id=report_id,
        report_type="case_summary",
        format="pdf",
        status="COMPLETED",
        message="Report generated successfully",
        download_url=f"/api/v1/reports/{report_id}/download",
        file_size=1024000,  # 1MB
        generated_at=datetime.utcnow(),
        created_at=datetime.utcnow() - timedelta(minutes=3)
    )

@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Download a generated report file"""
    
    # In a real implementation, this would:
    # 1. Verify report exists and user has access
    # 2. Return the actual file
    
    # For demo purposes, return a placeholder response
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Report file not found or expired"
    )

@router.post("/case-summary", response_model=ReportResponse)
async def generate_case_summary_report(
    case_id: str,
    background_tasks: BackgroundTasks,
    format: str = Query("pdf", description="Report format: pdf, word, excel"),
    include_evidence: bool = True,
    include_parties: bool = True,
    include_timeline: bool = True,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Generate a comprehensive case summary report"""
    
    # Verify case exists and user has access
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    report_id = str(uuid.uuid4())
    
    # Create report request
    report_request = ReportRequest(
        report_type="case_summary",
        format=format,
        parameters={
            "case_id": case_id,
            "include_evidence": include_evidence,
            "include_parties": include_parties,
            "include_timeline": include_timeline,
            "case_number": case.case_number,
            "case_title": case.title
        }
    )
    
    # Queue report generation
    background_tasks.add_task(
        process_case_summary_generation,
        report_id,
        case_id,
        report_request.parameters,
        format,
        current_user.id
    )
    
    return ReportResponse(
        id=report_id,
        report_type="case_summary",
        format=format,
        status="PENDING",
        message=f"Case summary report for {case.case_number} is being generated",
        estimated_completion=datetime.utcnow() + timedelta(minutes=3),
        created_at=datetime.utcnow()
    )

@router.post("/evidence-chain", response_model=ReportResponse)
async def generate_evidence_chain_report(
    evidence_id: str,
    background_tasks: BackgroundTasks,
    format: str = Query("pdf", description="Report format: pdf, word"),
    include_custody_log: bool = True,
    include_integrity_checks: bool = True,
    include_file_hashes: bool = True,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Generate a chain of custody report for evidence"""
    
    # Verify evidence exists
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )
    
    report_id = str(uuid.uuid4())
    
    # Queue report generation
    background_tasks.add_task(
        process_evidence_chain_generation,
        report_id,
        evidence_id,
        {
            "include_custody_log": include_custody_log,
            "include_integrity_checks": include_integrity_checks,
            "include_file_hashes": include_file_hashes,
            "evidence_label": evidence.label
        },
        format,
        current_user.id
    )
    
    return ReportResponse(
        id=report_id,
        report_type="evidence_chain",
        format=format,
        status="PENDING",
        message=f"Chain of custody report for {evidence.label} is being generated",
        estimated_completion=datetime.utcnow() + timedelta(minutes=2),
        created_at=datetime.utcnow()
    )

@router.post("/compliance", response_model=ReportResponse)
async def generate_compliance_report(
    background_tasks: BackgroundTasks,
    report_period: str = Query("monthly", description="Report period: weekly, monthly, quarterly, yearly"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    format: str = Query("pdf", description="Report format: pdf, excel"),
    include_metrics: bool = True,
    include_violations: bool = True,
    include_recommendations: bool = True,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Generate a compliance report"""
    
    # Check permissions - only supervisors and admins can generate compliance reports
    if current_user.role not in ["supervisor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to generate compliance reports"
        )
    
    # Calculate date range if not provided
    if not start_date or not end_date:
        end_date = date.today()
        if report_period == "weekly":
            start_date = end_date - timedelta(days=7)
        elif report_period == "monthly":
            start_date = end_date - timedelta(days=30)
        elif report_period == "quarterly":
            start_date = end_date - timedelta(days=90)
        elif report_period == "yearly":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
    
    report_id = str(uuid.uuid4())
    
    # Queue report generation
    background_tasks.add_task(
        process_compliance_report_generation,
        report_id,
        {
            "report_period": report_period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "include_metrics": include_metrics,
            "include_violations": include_violations,
            "include_recommendations": include_recommendations
        },
        format,
        current_user.id
    )
    
    return ReportResponse(
        id=report_id,
        report_type="compliance",
        format=format,
        status="PENDING",
        message=f"Compliance report for {report_period} period is being generated",
        estimated_completion=datetime.utcnow() + timedelta(minutes=5),
        created_at=datetime.utcnow()
    )

@router.post("/executive-summary", response_model=ReportResponse)
async def generate_executive_summary(
    background_tasks: BackgroundTasks,
    report_period: str = Query("monthly", description="Report period: weekly, monthly, quarterly, yearly"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    include_kpis: bool = True,
    include_trends: bool = True,
    include_highlights: bool = True,
    format: str = Query("pdf", description="Report format: pdf, word"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Generate an executive summary report"""
    
    # Check permissions - only supervisors and admins
    if current_user.role not in ["supervisor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to generate executive summaries"
        )
    
    # Calculate date range if not provided
    if not start_date or not end_date:
        end_date = date.today()
        if report_period == "weekly":
            start_date = end_date - timedelta(days=7)
        elif report_period == "monthly":
            start_date = end_date - timedelta(days=30)
        elif report_period == "quarterly":
            start_date = end_date - timedelta(days=90)
        elif report_period == "yearly":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
    
    report_id = str(uuid.uuid4())
    
    # Queue report generation
    background_tasks.add_task(
        process_executive_summary_generation,
        report_id,
        {
            "report_period": report_period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "include_kpis": include_kpis,
            "include_trends": include_trends,
            "include_highlights": include_highlights
        },
        format,
        current_user.id
    )
    
    return ReportResponse(
        id=report_id,
        report_type="executive_summary",
        format=format,
        status="PENDING",
        message=f"Executive summary for {report_period} period is being generated",
        estimated_completion=datetime.utcnow() + timedelta(minutes=4),
        created_at=datetime.utcnow()
    )

@router.post("/custom", response_model=ReportResponse)
async def generate_custom_report(
    custom_request: CustomReportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Generate a custom report based on user specifications"""
    
    report_id = str(uuid.uuid4())
    
    # Validate custom report request
    if not custom_request.data_sources:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one data source must be specified"
        )
    
    # Queue report generation
    background_tasks.add_task(
        process_custom_report_generation,
        report_id,
        custom_request,
        current_user.id
    )
    
    return ReportResponse(
        id=report_id,
        report_type="custom",
        format=custom_request.format,
        status="PENDING",
        message=f"Custom report '{custom_request.title}' is being generated",
        estimated_completion=datetime.utcnow() + timedelta(minutes=6),
        created_at=datetime.utcnow()
    )

@router.get("/", response_model=List[ReportResponse])
async def list_user_reports(
    report_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """List reports generated by or accessible to the current user"""
    
    # In a real implementation, this would query a reports table
    # For demo purposes, return sample data
    
    sample_reports = [
        ReportResponse(
            id=str(uuid.uuid4()),
            report_type="case_summary",
            format="pdf",
            status="COMPLETED",
            message="Case summary report completed",
            download_url=f"/api/v1/reports/{uuid.uuid4()}/download",
            file_size=2048000,
            generated_at=datetime.utcnow() - timedelta(hours=2),
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=5)
        ),
        ReportResponse(
            id=str(uuid.uuid4()),
            report_type="compliance",
            format="excel",
            status="COMPLETED",
            message="Monthly compliance report completed",
            download_url=f"/api/v1/reports/{uuid.uuid4()}/download",
            file_size=512000,
            generated_at=datetime.utcnow() - timedelta(days=1),
            created_at=datetime.utcnow() - timedelta(days=1, minutes=10)
        )
    ]
    
    # Apply filters
    if report_type:
        sample_reports = [r for r in sample_reports if r.report_type == report_type]
    if status:
        sample_reports = [r for r in sample_reports if r.status == status]
    
    return sample_reports[offset:offset + limit]

@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Delete a report and its associated files"""
    
    # In a real implementation, this would:
    # 1. Verify report exists and user has permission
    # 2. Delete the report record and files
    
    return {"message": "Report deleted successfully"}

@router.get("/templates/", response_model=List[ReportTemplate])
async def list_report_templates(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """List available report templates"""
    
    templates = [
        ReportTemplate(
            id=str(uuid.uuid4()),
            name="Standard Case Summary",
            description="Comprehensive case summary with evidence and parties",
            category="case_reports",
            report_type="case_summary",
            template_fields=["case_overview", "evidence_summary", "party_information", "timeline"],
            is_system=True,
            created_at=datetime.utcnow()
        ),
        ReportTemplate(
            id=str(uuid.uuid4()),
            name="Chain of Custody Report",
            description="Detailed chain of custody documentation",
            category="evidence_reports",
            report_type="evidence_chain",
            template_fields=["evidence_details", "custody_log", "integrity_verification"],
            is_system=True,
            created_at=datetime.utcnow()
        ),
        ReportTemplate(
            id=str(uuid.uuid4()),
            name="Monthly Compliance Report",
            description="Monthly compliance and audit report",
            category="compliance_reports",
            report_type="compliance",
            template_fields=["metrics_summary", "violations", "recommendations", "trends"],
            is_system=True,
            created_at=datetime.utcnow()
        )
    ]
    
    if category:
        templates = [t for t in templates if t.category == category]
    
    return templates

@router.get("/exports/formats")
async def get_supported_export_formats():
    """Get list of supported export formats and their capabilities"""
    
    return {
        "pdf": {
            "name": "PDF Document",
            "description": "Portable Document Format - suitable for formal reports and documentation",
            "supports_charts": True,
            "supports_images": True,
            "supports_tables": True,
            "max_pages": 1000,
            "mime_type": "application/pdf"
        },
        "word": {
            "name": "Microsoft Word Document",
            "description": "Word document format - editable and suitable for collaborative review",
            "supports_charts": True,
            "supports_images": True,
            "supports_tables": True,
            "max_pages": 500,
            "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        },
        "excel": {
            "name": "Microsoft Excel Spreadsheet",
            "description": "Excel format - suitable for data analysis and tabular reports",
            "supports_charts": True,
            "supports_images": False,
            "supports_tables": True,
            "max_rows": 1000000,
            "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        },
        "html": {
            "name": "HTML Document",
            "description": "Web format - suitable for online viewing and sharing",
            "supports_charts": True,
            "supports_images": True,
            "supports_tables": True,
            "max_size_mb": 50,
            "mime_type": "text/html"
        }
    }

# Background task functions

async def process_report_generation(
    report_id: str,
    report_request: ReportRequest,
    user_id: str,
    db: Session
):
    """Process report generation in background"""
    # This would contain the actual report generation logic
    pass

async def process_case_summary_generation(
    report_id: str,
    case_id: str,
    parameters: Dict[str, Any],
    format: str,
    user_id: str
):
    """Generate case summary report"""
    # Implementation would generate actual case summary
    pass

async def process_evidence_chain_generation(
    report_id: str,
    evidence_id: str,
    parameters: Dict[str, Any],
    format: str,
    user_id: str
):
    """Generate evidence chain of custody report"""
    # Implementation would generate actual chain of custody report
    pass

async def process_compliance_report_generation(
    report_id: str,
    parameters: Dict[str, Any],
    format: str,
    user_id: str
):
    """Generate compliance report"""
    # Implementation would generate actual compliance report
    pass

async def process_executive_summary_generation(
    report_id: str,
    parameters: Dict[str, Any],
    format: str,
    user_id: str
):
    """Generate executive summary report"""
    # Implementation would generate actual executive summary
    pass

async def process_custom_report_generation(
    report_id: str,
    custom_request: CustomReportRequest,
    user_id: str
):
    """Generate custom report"""
    # Implementation would generate custom report based on specifications
    pass