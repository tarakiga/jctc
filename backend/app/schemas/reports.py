from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date
from enum import Enum

class ReportType(str, Enum):
    # Original values - keep for backward compatibility
    CASE_SUMMARY = "case_summary"
    EVIDENCE_CHAIN = "evidence_chain"
    COMPLIANCE = "compliance"
    EXECUTIVE_SUMMARY = "executive_summary"
    CUSTOM = "custom"
    INVESTIGATION_LOG = "investigation_log"
    # Frontend values - add support for these
    MONTHLY_OPERATIONS = "MONTHLY_OPERATIONS"
    QUARTERLY_PROSECUTION = "QUARTERLY_PROSECUTION"
    VICTIM_SUPPORT = "VICTIM_SUPPORT"
    EXECUTIVE = "EXECUTIVE"

class ReportFormat(str, Enum):
    PDF = "pdf"
    WORD = "word"
    EXCEL = "excel"
    HTML = "html"
    JSON = "json"
    CSV = "csv"

class ReportStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class ReportPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class ReportRequest(BaseModel):
    """Request model for report generation"""
    report_type: ReportType
    format: ReportFormat = ReportFormat.PDF
    parameters: Dict[str, Any] = {}
    template_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: ReportPriority = ReportPriority.NORMAL
    notify_on_completion: bool = True
    
    @field_validator('parameters')
    @classmethod
    def validate_parameters(cls, v, info):
        """Validate parameters based on report type"""
        report_type = info.data.get('report_type')
        
        if report_type == ReportType.CASE_SUMMARY:
            if 'case_id' not in v:
                raise ValueError("case_id is required for case summary reports")
        elif report_type == ReportType.EVIDENCE_CHAIN:
            if 'evidence_id' not in v:
                raise ValueError("evidence_id is required for evidence chain reports")
        
        return v

class ReportResponse(BaseModel):
    """Response model for report operations"""
    id: str
    report_type: ReportType
    format: ReportFormat
    status: ReportStatus
    message: Optional[str] = None
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    progress_percentage: Optional[int] = 0
    estimated_completion: Optional[datetime] = None
    generated_at: Optional[datetime] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    error_details: Optional[Dict[str, Any]] = None

class ReportTemplate(BaseModel):
    """Template for standardized reports"""
    id: str
    name: str
    description: str
    category: str
    report_type: ReportType
    template_fields: List[str]
    template_config: Dict[str, Any] = {}
    is_system: bool = False
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class ScheduledReport(BaseModel):
    """Model for scheduled recurring reports"""
    id: str
    name: str
    description: Optional[str] = None
    report_type: ReportType
    format: ReportFormat
    parameters: Dict[str, Any]
    schedule_cron: str  # Cron expression for scheduling
    is_active: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_by: str
    created_at: datetime
    recipients: List[str] = []  # List of email addresses or user IDs

class ReportExecution(BaseModel):
    """Model for tracking report execution history"""
    id: str
    scheduled_report_id: Optional[str] = None
    report_type: ReportType
    parameters: Dict[str, Any]
    status: ReportStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    execution_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    executed_by: str

class CustomReportRequest(BaseModel):
    """Request for custom report generation"""
    title: str
    description: Optional[str] = None
    format: ReportFormat
    data_sources: List[str]  # List of data source identifiers
    filters: Dict[str, Any] = {}
    grouping: List[str] = []
    sorting: List[Dict[str, str]] = []  # [{"field": "date", "order": "desc"}]
    columns: Optional[List[str]] = None
    chart_configs: List[Dict[str, Any]] = []
    include_summary: bool = True
    include_charts: bool = True
    page_orientation: str = "portrait"  # portrait or landscape
    
    @field_validator('data_sources')
    @classmethod
    def validate_data_sources(cls, v):
        """Validate data sources are supported"""
        supported_sources = [
            "cases", "evidence", "parties", "legal_instruments",
            "users", "court_documents", "audit_logs", "notifications"
        ]
        for source in v:
            if source not in supported_sources:
                raise ValueError(f"Unsupported data source: {source}")
        return v

# Specific report type schemas

class CaseReportData(BaseModel):
    """Data structure for case reports"""
    case_id: str
    case_number: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    created_date: datetime
    last_updated: datetime
    assigned_officers: List[Dict[str, str]] = []
    evidence_count: int = 0
    parties_count: int = 0
    documents_count: int = 0
    timeline_events: List[Dict[str, Any]] = []

class CaseReport(BaseModel):
    """Case summary report schema"""
    report_id: str
    generated_at: datetime
    case_data: CaseReportData
    evidence_summary: Optional[List[Dict[str, Any]]] = None
    parties_summary: Optional[List[Dict[str, Any]]] = None
    recent_activities: List[Dict[str, Any]] = []
    statistics: Dict[str, Any] = {}

class EvidenceReportData(BaseModel):
    """Data structure for evidence reports"""
    evidence_id: str
    label: str
    type: str
    description: Optional[str] = None
    collected_date: datetime
    collected_by: str
    current_location: str
    chain_of_custody: List[Dict[str, Any]] = []
    integrity_checks: List[Dict[str, Any]] = []
    file_hashes: Dict[str, str] = {}
    
class EvidenceReport(BaseModel):
    """Evidence chain of custody report schema"""
    report_id: str
    generated_at: datetime
    evidence_data: EvidenceReportData
    custody_log: List[Dict[str, Any]] = []
    integrity_verification: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}

class ComplianceMetrics(BaseModel):
    """Compliance metrics for reports"""
    total_cases: int = 0
    cases_within_sla: int = 0
    cases_overdue: int = 0
    evidence_integrity_rate: float = 0.0
    document_completeness_rate: float = 0.0
    audit_violations: int = 0
    resolved_violations: int = 0
    compliance_score: float = 0.0

class ComplianceReport(BaseModel):
    """Compliance report schema"""
    report_id: str
    generated_at: datetime
    report_period: str
    start_date: date
    end_date: date
    metrics: ComplianceMetrics
    violations: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []
    trend_analysis: Dict[str, Any] = {}

class ExecutiveSummaryKPIs(BaseModel):
    """Key Performance Indicators for executive summary"""
    total_active_cases: int = 0
    cases_resolved_period: int = 0
    average_case_resolution_days: float = 0.0
    evidence_processed: int = 0
    compliance_rate: float = 0.0
    user_activity_rate: float = 0.0
    system_uptime: float = 0.0

class ExecutiveSummary(BaseModel):
    """Executive summary report schema"""
    report_id: str
    generated_at: datetime
    report_period: str
    start_date: date
    end_date: date
    kpis: ExecutiveSummaryKPIs
    highlights: List[str] = []
    concerns: List[str] = []
    trends: Dict[str, Any] = {}
    recommendations: List[str] = []
    charts_data: Dict[str, Any] = {}

class ReportFilter(BaseModel):
    """Filter criteria for reports"""
    field: str
    operator: str  # equals, contains, greater_than, less_than, in, not_in
    value: Any
    
class ReportGrouping(BaseModel):
    """Grouping configuration for reports"""
    field: str
    aggregation: str  # count, sum, average, min, max
    
class ReportSorting(BaseModel):
    """Sorting configuration for reports"""
    field: str
    order: str = "asc"  # asc or desc

class ReportChart(BaseModel):
    """Chart configuration for reports"""
    type: str  # bar, line, pie, scatter, area
    title: str
    data_source: str
    x_axis: str
    y_axis: str
    grouping: Optional[str] = None
    filters: List[ReportFilter] = []

class ReportExportOptions(BaseModel):
    """Export options for reports"""
    format: ReportFormat
    include_charts: bool = True
    include_raw_data: bool = False
    compress: bool = False
    password_protect: bool = False
    page_size: str = "A4"  # A4, Letter, Legal, A3
    orientation: str = "portrait"  # portrait or landscape
    margins: Dict[str, float] = {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0}

class BulkReportRequest(BaseModel):
    """Request for generating multiple reports in bulk"""
    reports: List[ReportRequest]
    batch_name: Optional[str] = None
    priority: ReportPriority = ReportPriority.NORMAL
    notify_on_completion: bool = True
    export_as_zip: bool = True

class ReportAnalytics(BaseModel):
    """Analytics data for report usage"""
    report_id: str
    report_type: ReportType
    generated_count: int = 0
    total_downloads: int = 0
    average_generation_time: float = 0.0
    most_common_format: ReportFormat
    user_ratings: List[int] = []
    last_generated: Optional[datetime] = None

class ReportPermission(BaseModel):
    """Permission settings for reports"""
    report_type: ReportType
    role: str
    can_generate: bool = False
    can_download: bool = False
    can_delete: bool = False
    can_share: bool = False
    data_scope: str = "own"  # own, team, department, all

class ReportNotificationSettings(BaseModel):
    """Notification settings for report completion"""
    user_id: str
    email_on_completion: bool = True
    email_on_failure: bool = True
    push_notifications: bool = False
    slack_webhook: Optional[str] = None
    webhook_url: Optional[str] = None