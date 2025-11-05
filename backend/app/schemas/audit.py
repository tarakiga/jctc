"""
Pydantic schemas for audit and compliance system.

This module defines the data validation and serialization schemas for:
- Audit log entries and search
- Compliance reports and violations
- Data retention policies and lifecycle management
- Audit configuration and settings
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict


class AuditAction(str, Enum):
    """Enumeration of audit actions."""
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    ACCESS_DENIED = "ACCESS_DENIED"
    EXPORT = "EXPORT"
    IMPORT = "IMPORT"
    TRANSFER = "TRANSFER"
    ARCHIVE = "ARCHIVE"
    RESTORE = "RESTORE"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    ASSIGN = "ASSIGN"
    UNASSIGN = "UNASSIGN"
    SEARCH = "SEARCH"
    VIEW = "VIEW"
    DOWNLOAD = "DOWNLOAD"
    UPLOAD = "UPLOAD"
    EXECUTE = "EXECUTE"
    CONFIGURE = "CONFIGURE"


class AuditEntity(str, Enum):
    """Enumeration of auditable entities."""
    CASE = "CASE"
    EVIDENCE = "EVIDENCE"
    USER = "USER"
    PARTY = "PARTY"
    LEGAL_INSTRUMENT = "LEGAL_INSTRUMENT"
    CHAIN_OF_CUSTODY = "CHAIN_OF_CUSTODY"
    TASK = "TASK"
    INTEGRATION = "INTEGRATION"
    WEBHOOK = "WEBHOOK"
    API_KEY = "API_KEY"
    REPORT = "REPORT"
    ATTACHMENT = "ATTACHMENT"
    NOTIFICATION = "NOTIFICATION"
    SYSTEM = "SYSTEM"
    SESSION = "SESSION"


class AuditSeverity(str, Enum):
    """Audit log severity levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ComplianceStatus(str, Enum):
    """Compliance status values."""
    COMPLIANT = "COMPLIANT"
    WARNING = "WARNING"
    VIOLATION = "VIOLATION"
    CRITICAL = "CRITICAL"


class RetentionPeriod(str, Enum):
    """Data retention periods."""
    DAYS_30 = "30_DAYS"
    DAYS_90 = "90_DAYS"
    MONTHS_6 = "6_MONTHS"
    YEAR_1 = "1_YEAR"
    YEARS_3 = "3_YEARS"
    YEARS_5 = "5_YEARS"
    YEARS_7 = "7_YEARS"
    YEARS_10 = "10_YEARS"
    PERMANENT = "PERMANENT"
    LEGAL_HOLD = "LEGAL_HOLD"


class ReportFormat(str, Enum):
    """Report export formats."""
    PDF = "PDF"
    EXCEL = "EXCEL"
    CSV = "CSV"
    JSON = "JSON"
    HTML = "HTML"


class ViolationType(str, Enum):
    """Types of compliance violations."""
    DATA_RETENTION = "DATA_RETENTION"
    ACCESS_CONTROL = "ACCESS_CONTROL"
    AUDIT_TRAIL = "AUDIT_TRAIL"
    DATA_INTEGRITY = "DATA_INTEGRITY"
    ENCRYPTION = "ENCRYPTION"
    EXPORT_CONTROL = "EXPORT_CONTROL"
    PRIVACY = "PRIVACY"
    FORENSIC_STANDARDS = "FORENSIC_STANDARDS"
    INTERNATIONAL_LAW = "INTERNATIONAL_LAW"
    # NDPA-specific violation types
    NDPA_CONSENT = "NDPA_CONSENT"
    NDPA_DATA_LOCALIZATION = "NDPA_DATA_LOCALIZATION"
    NDPA_CROSS_BORDER_TRANSFER = "NDPA_CROSS_BORDER_TRANSFER"
    NDPA_DATA_SUBJECT_RIGHTS = "NDPA_DATA_SUBJECT_RIGHTS"
    NDPA_PROCESSING_LAWFULNESS = "NDPA_PROCESSING_LAWFULNESS"
    NDPA_BREACH_NOTIFICATION = "NDPA_BREACH_NOTIFICATION"
    NDPA_REGISTRATION = "NDPA_REGISTRATION"
    NDPA_IMPACT_ASSESSMENT = "NDPA_IMPACT_ASSESSMENT"


class NDPAComplianceFramework(str, Enum):
    """NDPA compliance framework categories."""
    NDPA_2019 = "NDPA_2019"  # Nigeria Data Protection Act 2019
    NITDA_GUIDELINES = "NITDA_GUIDELINES"  # NITDA Implementation Guidelines
    NDPR_REGULATIONS = "NDPR_REGULATIONS"  # Nigeria Data Protection Regulation
    NITDA_CODES = "NITDA_CODES"  # NITDA Code of Practice


class NDPADataCategory(str, Enum):
    """NDPA data categories for processing lawfulness."""
    PERSONAL_DATA = "PERSONAL_DATA"
    SENSITIVE_PERSONAL_DATA = "SENSITIVE_PERSONAL_DATA"
    CRIMINAL_DATA = "CRIMINAL_DATA"
    BIOMETRIC_DATA = "BIOMETRIC_DATA"
    FINANCIAL_DATA = "FINANCIAL_DATA"
    HEALTH_DATA = "HEALTH_DATA"
    LOCATION_DATA = "LOCATION_DATA"


class NDPAProcessingPurpose(str, Enum):
    """NDPA lawful purposes for data processing."""
    CONSENT = "CONSENT"
    CONTRACT_PERFORMANCE = "CONTRACT_PERFORMANCE"
    LEGAL_OBLIGATION = "LEGAL_OBLIGATION"
    VITAL_INTERESTS = "VITAL_INTERESTS"
    PUBLIC_TASK = "PUBLIC_TASK"
    LEGITIMATE_INTERESTS = "LEGITIMATE_INTERESTS"
    # Law enforcement specific purposes
    CRIMINAL_INVESTIGATION = "CRIMINAL_INVESTIGATION"
    NATIONAL_SECURITY = "NATIONAL_SECURITY"
    PUBLIC_SAFETY = "PUBLIC_SAFETY"


class NDPAConsentType(str, Enum):
    """Types of consent under NDPA."""
    EXPRESS_CONSENT = "EXPRESS_CONSENT"
    IMPLIED_CONSENT = "IMPLIED_CONSENT"
    INFORMED_CONSENT = "INFORMED_CONSENT"
    FREELY_GIVEN = "FREELY_GIVEN"
    SPECIFIC_CONSENT = "SPECIFIC_CONSENT"
    UNAMBIGUOUS_CONSENT = "UNAMBIGUOUS_CONSENT"


class NDPADataSubjectRights(str, Enum):
    """Data subject rights under NDPA."""
    ACCESS = "ACCESS"  # Right to access personal data
    RECTIFICATION = "RECTIFICATION"  # Right to correction
    ERASURE = "ERASURE"  # Right to deletion
    PORTABILITY = "PORTABILITY"  # Right to data portability
    OBJECTION = "OBJECTION"  # Right to object to processing
    RESTRICTION = "RESTRICTION"  # Right to restrict processing
    COMPLAINT = "COMPLAINT"  # Right to lodge a complaint


# Base schemas
class AuditLogBase(BaseModel):
    """Base schema for audit log entries."""
    action: AuditAction = Field(..., description="Action performed")
    entity_type: AuditEntity = Field(..., description="Type of entity affected")
    entity_id: Optional[str] = Field(None, description="ID of entity affected")
    user_id: Optional[UUID] = Field(None, description="User who performed the action")
    session_id: Optional[str] = Field(None, description="Session identifier")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    user_agent: Optional[str] = Field(None, description="Client user agent")
    description: str = Field(..., description="Human-readable description")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
    severity: AuditSeverity = Field(AuditSeverity.LOW, description="Severity level")
    correlation_id: Optional[str] = Field(None, description="Correlation ID for request tracking")
    
    @field_validator('details')
    @classmethod
    def validate_details(cls, v):
        """Ensure details don't contain sensitive information."""
        if v is None:
            return v
        
        # Remove sensitive fields
        sensitive_fields = ['password', 'token', 'secret', 'key', 'credential']
        if isinstance(v, dict):
            return {k: '[REDACTED]' if any(sens in k.lower() for sens in sensitive_fields) else val 
                   for k, val in v.items()}
        return v


class AuditLogCreate(AuditLogBase):
    """Schema for creating audit log entries."""
    pass


class AuditLogResponse(AuditLogBase):
    """Schema for audit log responses."""
    id: UUID = Field(..., description="Audit log entry ID")
    timestamp: datetime = Field(..., description="When the action occurred")
    checksum: Optional[str] = Field(None, description="Integrity checksum")
    
    class Config:
        from_attributes = True


# Audit search schemas
class AuditSearchFilters(BaseModel):
    """Filters for audit log searches."""
    user_id: Optional[UUID] = None
    entity_type: Optional[AuditEntity] = None
    entity_id: Optional[str] = None
    action: Optional[AuditAction] = None
    severity: Optional[AuditSeverity] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    ip_address: Optional[str] = None
    session_id: Optional[str] = None
    correlation_id: Optional[str] = None
    search_text: Optional[str] = Field(None, description="Text search in description and details")
    
    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v, info):
        if v and info.data.get('start_date') and v < info.data['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class AuditSearchRequest(BaseModel):
    """Request schema for audit searches."""
    filters: AuditSearchFilters = Field(default_factory=AuditSearchFilters)
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(50, ge=1, le=1000, description="Page size")
    sort_by: str = Field("timestamp", description="Sort field")
    sort_order: str = Field("desc", pattern="^(asc|desc)$", description="Sort order")


class AuditSearchResponse(BaseModel):
    """Response schema for audit searches."""
    items: List[AuditLogResponse] = Field(..., description="Audit log entries")
    total: int = Field(..., description="Total number of matching entries")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")


# Compliance report schemas
class ComplianceReportBase(BaseModel):
    """Base schema for compliance reports."""
    name: str = Field(..., description="Report name", max_length=200)
    description: Optional[str] = Field(None, description="Report description")
    report_type: str = Field(..., description="Type of compliance report")
    start_date: date = Field(..., description="Report period start date")
    end_date: date = Field(..., description="Report period end date")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Report parameters")
    
    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v, info):
        if v and info.data.get('start_date') and v < info.data['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class ComplianceReportCreate(ComplianceReportBase):
    """Schema for creating compliance reports."""
    format: ReportFormat = Field(ReportFormat.PDF, description="Export format")


class ComplianceReportResponse(ComplianceReportBase):
    """Schema for compliance report responses."""
    id: UUID = Field(..., description="Report ID")
    status: str = Field(..., description="Report generation status")
    created_by: UUID = Field(..., description="User who created the report")
    created_at: datetime = Field(..., description="Report creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Report completion timestamp")
    file_path: Optional[str] = Field(None, description="Generated report file path")
    file_size: Optional[int] = Field(None, description="Report file size in bytes")
    findings: Optional[Dict[str, Any]] = Field(None, description="Report findings summary")
    
    class Config:
        from_attributes = True


# Data retention schemas
class RetentionPolicyBase(BaseModel):
    """Base schema for data retention policies."""
    name: str = Field(..., description="Policy name", max_length=200)
    description: Optional[str] = Field(None, description="Policy description")
    entity_type: AuditEntity = Field(..., description="Entity type this policy applies to")
    retention_period: RetentionPeriod = Field(..., description="Data retention period")
    auto_archive: bool = Field(True, description="Automatically archive expired data")
    auto_delete: bool = Field(False, description="Automatically delete expired data")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Additional retention conditions")


class RetentionPolicyCreate(RetentionPolicyBase):
    """Schema for creating retention policies."""
    pass


class RetentionPolicyUpdate(BaseModel):
    """Schema for updating retention policies."""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    retention_period: Optional[RetentionPeriod] = None
    auto_archive: Optional[bool] = None
    auto_delete: Optional[bool] = None
    conditions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class RetentionPolicyResponse(RetentionPolicyBase):
    """Schema for retention policy responses."""
    id: UUID = Field(..., description="Policy ID")
    is_active: bool = Field(..., description="Policy status")
    created_by: UUID = Field(..., description="User who created the policy")
    created_at: datetime = Field(..., description="Policy creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Policy last update timestamp")
    
    class Config:
        from_attributes = True


# Compliance violation schemas
class ComplianceViolationBase(BaseModel):
    """Base schema for compliance violations."""
    violation_type: ViolationType = Field(..., description="Type of violation")
    entity_type: AuditEntity = Field(..., description="Entity type involved")
    entity_id: Optional[str] = Field(None, description="Entity ID involved")
    severity: AuditSeverity = Field(..., description="Violation severity")
    title: str = Field(..., description="Violation title", max_length=200)
    description: str = Field(..., description="Detailed violation description")
    remediation_steps: Optional[str] = Field(None, description="Steps to remediate violation")
    compliance_rule: Optional[str] = Field(None, description="Compliance rule violated")
    related_audit_logs: Optional[List[UUID]] = Field(None, description="Related audit log IDs")


class ComplianceViolationCreate(ComplianceViolationBase):
    """Schema for creating compliance violations."""
    pass


class ComplianceViolationUpdate(BaseModel):
    """Schema for updating compliance violations."""
    status: Optional[ComplianceStatus] = None
    remediation_steps: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_by: Optional[UUID] = None


class ComplianceViolationResponse(ComplianceViolationBase):
    """Schema for compliance violation responses."""
    id: UUID = Field(..., description="Violation ID")
    status: ComplianceStatus = Field(..., description="Violation status")
    detected_at: datetime = Field(..., description="When violation was detected")
    resolved_at: Optional[datetime] = Field(None, description="When violation was resolved")
    resolved_by: Optional[UUID] = Field(None, description="User who resolved violation")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")
    
    class Config:
        from_attributes = True


# Audit configuration schemas
class AuditConfigurationBase(BaseModel):
    """Base schema for audit configuration."""
    entity_type: AuditEntity = Field(..., description="Entity type to configure")
    actions_to_audit: List[AuditAction] = Field(..., description="Actions to audit for this entity")
    include_details: bool = Field(True, description="Include detailed information in audit logs")
    retention_days: int = Field(365, ge=1, description="Audit log retention period in days")
    alert_on_failure: bool = Field(True, description="Alert when audit logging fails")
    minimum_severity: AuditSeverity = Field(AuditSeverity.LOW, description="Minimum severity to log")


class AuditConfigurationCreate(AuditConfigurationBase):
    """Schema for creating audit configurations."""
    pass


class AuditConfigurationUpdate(BaseModel):
    """Schema for updating audit configurations."""
    actions_to_audit: Optional[List[AuditAction]] = None
    include_details: Optional[bool] = None
    retention_days: Optional[int] = Field(None, ge=1)
    alert_on_failure: Optional[bool] = None
    minimum_severity: Optional[AuditSeverity] = None
    is_active: Optional[bool] = None


class AuditConfigurationResponse(AuditConfigurationBase):
    """Schema for audit configuration responses."""
    id: UUID = Field(..., description="Configuration ID")
    is_active: bool = Field(..., description="Configuration status")
    created_by: UUID = Field(..., description="User who created the configuration")
    created_at: datetime = Field(..., description="Configuration creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Configuration last update timestamp")
    
    class Config:
        from_attributes = True


# Statistics and dashboard schemas
class AuditStatistics(BaseModel):
    """Audit statistics for dashboards."""
    total_entries: int = Field(..., description="Total audit log entries")
    entries_today: int = Field(..., description="Audit entries created today")
    entries_this_week: int = Field(..., description="Audit entries created this week")
    entries_this_month: int = Field(..., description="Audit entries created this month")
    top_actions: List[Dict[str, Union[str, int]]] = Field(..., description="Most common audit actions")
    top_entities: List[Dict[str, Union[str, int]]] = Field(..., description="Most audited entities")
    top_users: List[Dict[str, Union[str, int]]] = Field(..., description="Most active users")
    severity_breakdown: Dict[str, int] = Field(..., description="Breakdown by severity")


class ComplianceStatistics(BaseModel):
    """Compliance statistics for dashboards."""
    total_violations: int = Field(..., description="Total compliance violations")
    open_violations: int = Field(..., description="Open compliance violations")
    critical_violations: int = Field(..., description="Critical compliance violations")
    violations_by_type: Dict[str, int] = Field(..., description="Violations by type")
    compliance_score: float = Field(..., ge=0, le=100, description="Overall compliance score")
    recent_violations: List[ComplianceViolationResponse] = Field(..., description="Recent violations")


class RetentionStatistics(BaseModel):
    """Data retention statistics."""
    total_policies: int = Field(..., description="Total retention policies")
    active_policies: int = Field(..., description="Active retention policies")
    items_due_for_archive: int = Field(..., description="Items due for archival")
    items_due_for_deletion: int = Field(..., description="Items due for deletion")
    storage_by_retention: Dict[str, int] = Field(..., description="Storage usage by retention period")


class ComplianceDashboard(BaseModel):
    """Complete compliance dashboard data."""
    audit_stats: AuditStatistics = Field(..., description="Audit statistics")
    compliance_stats: ComplianceStatistics = Field(..., description="Compliance statistics")
    retention_stats: RetentionStatistics = Field(..., description="Retention statistics")
    last_updated: datetime = Field(..., description="Dashboard last updated timestamp")


# Export schemas
class AuditExportRequest(BaseModel):
    """Request schema for audit log exports."""
    filters: AuditSearchFilters = Field(default_factory=AuditSearchFilters)
    format: ReportFormat = Field(ReportFormat.CSV, description="Export format")
    include_sensitive: bool = Field(False, description="Include sensitive information (admin only)")
    encryption_required: bool = Field(True, description="Encrypt exported file")


class AuditExportResponse(BaseModel):
    """Response schema for audit exports."""
    export_id: UUID = Field(..., description="Export job ID")
    status: str = Field(..., description="Export status")
    file_path: Optional[str] = Field(None, description="Export file path when complete")
    total_records: Optional[int] = Field(None, description="Total records exported")
    created_at: datetime = Field(..., description="Export creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Export completion timestamp")


# Bulk operations schemas
class BulkAuditOperation(BaseModel):
    """Schema for bulk audit operations."""
    operation: str = Field(..., description="Operation type")
    filters: AuditSearchFilters = Field(..., description="Filters for bulk operation")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Operation parameters")


class BulkAuditResponse(BaseModel):
    """Response for bulk audit operations."""
    job_id: UUID = Field(..., description="Bulk operation job ID")
    status: str = Field(..., description="Operation status")
    total_items: Optional[int] = Field(None, description="Total items to process")
    processed_items: Optional[int] = Field(None, description="Items processed so far")
    failed_items: Optional[int] = Field(None, description="Items that failed processing")
    created_at: datetime = Field(..., description="Operation creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Operation completion timestamp")


# NDPA-specific compliance schemas
class NDPAConsentRecord(BaseModel):
    """NDPA consent record schema."""
    data_subject_id: str = Field(..., description="Data subject identifier")
    consent_type: NDPAConsentType = Field(..., description="Type of consent")
    processing_purpose: NDPAProcessingPurpose = Field(..., description="Purpose of processing")
    data_categories: List[NDPADataCategory] = Field(..., description="Categories of data")
    consent_given_at: datetime = Field(..., description="When consent was given")
    consent_text: str = Field(..., description="Consent text presented to data subject")
    withdrawal_method: Optional[str] = Field(None, description="How consent can be withdrawn")
    is_withdrawn: bool = Field(False, description="Whether consent has been withdrawn")
    withdrawn_at: Optional[datetime] = Field(None, description="When consent was withdrawn")
    retention_period: str = Field(..., description="Data retention period")
    third_party_sharing: bool = Field(False, description="Whether data is shared with third parties")
    cross_border_transfer: bool = Field(False, description="Whether data is transferred across borders")


class NDPADataProcessingRecord(BaseModel):
    """NDPA data processing activity record."""
    processing_id: str = Field(..., description="Unique processing activity ID")
    data_controller: str = Field(..., description="Data controller identification")
    processing_purpose: NDPAProcessingPurpose = Field(..., description="Purpose of processing")
    lawful_basis: str = Field(..., description="Lawful basis for processing")
    data_categories: List[NDPADataCategory] = Field(..., description="Categories of personal data")
    data_subjects_categories: List[str] = Field(..., description="Categories of data subjects")
    recipients: Optional[List[str]] = Field(None, description="Recipients of personal data")
    third_country_transfers: Optional[List[str]] = Field(None, description="Third country transfers")
    retention_period: str = Field(..., description="Retention period")
    security_measures: List[str] = Field(..., description="Security measures implemented")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class NDPADataSubjectRequest(BaseModel):
    """NDPA data subject rights request schema."""
    request_id: str = Field(..., description="Unique request identifier")
    data_subject_id: str = Field(..., description="Data subject identifier")
    request_type: NDPADataSubjectRights = Field(..., description="Type of request")
    description: str = Field(..., description="Request description")
    submitted_at: datetime = Field(..., description="When request was submitted")
    status: str = Field("PENDING", description="Request status")
    response_due_date: datetime = Field(..., description="Response due date (30 days from submission)")
    response_provided_at: Optional[datetime] = Field(None, description="When response was provided")
    response_details: Optional[str] = Field(None, description="Response details")
    verification_method: str = Field(..., description="How data subject identity was verified")
    additional_info_required: bool = Field(False, description="Whether additional information is needed")


class NDPABreachNotification(BaseModel):
    """NDPA data breach notification schema."""
    breach_id: str = Field(..., description="Unique breach identifier")
    breach_discovered_at: datetime = Field(..., description="When breach was discovered")
    breach_occurred_at: datetime = Field(..., description="When breach occurred")
    breach_type: str = Field(..., description="Type of breach")
    data_categories_affected: List[NDPADataCategory] = Field(..., description="Affected data categories")
    number_of_data_subjects: int = Field(..., description="Number of affected data subjects")
    likely_consequences: str = Field(..., description="Likely consequences of the breach")
    measures_taken: str = Field(..., description="Measures taken to address the breach")
    notified_to_nitda: bool = Field(False, description="Whether NITDA was notified")
    nitda_notification_date: Optional[datetime] = Field(None, description="NITDA notification date")
    data_subjects_notified: bool = Field(False, description="Whether data subjects were notified")
    notification_delay_justification: Optional[str] = Field(None, description="Justification for notification delay")
    remedial_actions: List[str] = Field(..., description="Remedial actions taken")
    breach_resolved: bool = Field(False, description="Whether breach has been resolved")


class NDPAComplianceAssessment(BaseModel):
    """NDPA compliance assessment schema."""
    assessment_id: str = Field(..., description="Unique assessment identifier")
    assessment_date: date = Field(..., description="Assessment date")
    framework: NDPAComplianceFramework = Field(..., description="Compliance framework")
    scope: str = Field(..., description="Assessment scope")
    compliance_score: float = Field(..., ge=0, le=100, description="Overall compliance score")
    areas_assessed: List[str] = Field(..., description="Areas included in assessment")
    compliant_areas: List[str] = Field(..., description="Areas in compliance")
    non_compliant_areas: List[str] = Field(..., description="Areas not in compliance")
    recommendations: List[str] = Field(..., description="Compliance recommendations")
    priority_actions: List[str] = Field(..., description="Priority remediation actions")
    next_assessment_date: date = Field(..., description="Next scheduled assessment")
    assessor: str = Field(..., description="Person who conducted assessment")
    approved_by: Optional[str] = Field(None, description="Person who approved assessment")


class NDPARegistrationStatus(BaseModel):
    """NDPA data controller registration status."""
    organization_name: str = Field(..., description="Organization name")
    registration_number: Optional[str] = Field(None, description="NITDA registration number")
    registration_status: str = Field(..., description="Registration status")
    registration_date: Optional[date] = Field(None, description="Registration date")
    renewal_due_date: Optional[date] = Field(None, description="Registration renewal due date")
    contact_person: str = Field(..., description="Designated contact person")
    data_protection_officer: Optional[str] = Field(None, description="Data Protection Officer")
    processing_activities_count: int = Field(0, description="Number of registered processing activities")
    cross_border_transfers: bool = Field(False, description="Whether organization conducts cross-border transfers")
    high_risk_processing: bool = Field(False, description="Whether organization conducts high-risk processing")
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class NDPAImpactAssessment(BaseModel):
    """NDPA Data Protection Impact Assessment schema."""
    assessment_id: str = Field(..., description="Unique DPIA identifier")
    processing_activity: str = Field(..., description="Processing activity being assessed")
    assessment_date: date = Field(..., description="Assessment date")
    high_risk_processing: bool = Field(..., description="Whether processing is high-risk")
    systematic_monitoring: bool = Field(False, description="Involves systematic monitoring")
    large_scale_processing: bool = Field(False, description="Large scale processing")
    sensitive_data_processing: bool = Field(False, description="Processing sensitive data")
    automated_decision_making: bool = Field(False, description="Automated decision making")
    necessity_assessment: str = Field(..., description="Necessity and proportionality assessment")
    risks_identified: List[str] = Field(..., description="Identified risks")
    risk_mitigation_measures: List[str] = Field(..., description="Risk mitigation measures")
    residual_risks: List[str] = Field(..., description="Residual risks after mitigation")
    consultation_required: bool = Field(False, description="Whether NITDA consultation is required")
    consultation_date: Optional[date] = Field(None, description="NITDA consultation date")
    approval_status: str = Field("PENDING", description="DPIA approval status")
    approved_by: Optional[str] = Field(None, description="Person who approved DPIA")
    review_date: date = Field(..., description="Next review date")
