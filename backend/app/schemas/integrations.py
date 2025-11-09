from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum
import json

class IntegrationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    TESTING = "testing"

class IntegrationType(str, Enum):
    FORENSIC_TOOL = "forensic_tool"
    DATABASE = "database"
    API = "api"
    WEBHOOK = "webhook"
    FILE_SYSTEM = "file_system"
    MESSAGING = "messaging"

class AuthenticationType(str, Enum):
    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    BASIC_AUTH = "basic_auth"
    CERTIFICATE = "certificate"
    TOKEN = "token"
    CUSTOM = "custom"

class ExportFormat(str, Enum):
    JSON = "json"
    XML = "xml"
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "excel"

class ImportFormat(str, Enum):
    JSON = "json"
    XML = "xml"
    CSV = "csv"

class WebhookEventType(str, Enum):
    CASE_CREATED = "case.created"
    CASE_UPDATED = "case.updated"
    CASE_ASSIGNED = "case.assigned"
    TASK_CREATED = "task.created"
    TASK_COMPLETED = "task.completed"
    EVIDENCE_ADDED = "evidence.added"
    EVIDENCE_ANALYZED = "evidence.analyzed"
    USER_LOGGED_IN = "user.logged_in"
    SYSTEM_ALERT = "system.alert"

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class LogLevel(str, Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

# Base Integration Schemas

class IntegrationConfig(BaseModel):
    """Configuration for external system integration"""
    base_url: Optional[str] = None
    authentication: Dict[str, Any] = {}
    headers: Dict[str, str] = {}
    timeout_seconds: int = 30
    retry_attempts: int = 3
    retry_delay: int = 5
    verify_ssl: bool = True
    custom_settings: Dict[str, Any] = {}

class IntegrationCreate(BaseModel):
    """Schema for creating a new integration"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    integration_type: IntegrationType
    system_identifier: str = Field(..., min_length=1, max_length=50)
    config: IntegrationConfig
    is_active: bool = True
    auto_sync: bool = False
    sync_interval_minutes: Optional[int] = Field(None, ge=1, le=1440)  # Max 24 hours
    data_retention_days: int = Field(90, ge=1, le=3650)  # Max 10 years
    tags: List[str] = []

    @field_validator('system_identifier')
    @classmethod
    def validate_system_identifier(cls, v):
        """Validate system identifier format"""
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('System identifier must contain only letters, numbers, hyphens, and underscores')
        return v

class IntegrationUpdate(BaseModel):
    """Schema for updating integration configuration"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    config: Optional[IntegrationConfig] = None
    is_active: Optional[bool] = None
    auto_sync: Optional[bool] = None
    sync_interval_minutes: Optional[int] = Field(None, ge=1, le=1440)
    data_retention_days: Optional[int] = Field(None, ge=1, le=3650)
    tags: Optional[List[str]] = None

class IntegrationResponse(BaseModel):
    """Response schema for integration data"""
    id: str
    name: str
    description: Optional[str] = None
    integration_type: IntegrationType
    system_identifier: str
    status: IntegrationStatus
    config: IntegrationConfig
    is_active: bool
    auto_sync: bool
    sync_interval_minutes: Optional[int] = None
    data_retention_days: int
    tags: List[str] = []
    last_sync_at: Optional[datetime] = None
    last_error: Optional[str] = None
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    average_response_time: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: str
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True

# Webhook Schemas

class WebhookCreate(BaseModel):
    """Schema for creating a webhook"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    url: str = Field(..., pattern=r'^https?://.+')
    method: str = Field("POST", pattern=r'^(GET|POST|PUT|DELETE)$')
    event_types: List[WebhookEventType] = Field(..., min_items=1)
    headers: Dict[str, str] = {}
    authentication: Dict[str, Any] = {}
    timeout_seconds: int = Field(30, ge=1, le=300)
    retry_attempts: int = Field(3, ge=0, le=10)
    retry_delay_seconds: int = Field(5, ge=1, le=300)
    is_active: bool = True
    verify_ssl: bool = True
    secret_token: Optional[str] = None  # For signature verification
    
    @field_validator('headers')
    @classmethod
    def validate_headers(cls, v):
        """Validate webhook headers"""
        if not isinstance(v, dict):
            raise ValueError('Headers must be a dictionary')
        
        for key, value in v.items():
            if not isinstance(key, str) or not isinstance(value, str):
                raise ValueError('Header keys and values must be strings')
        
        return v

class WebhookUpdate(BaseModel):
    """Schema for updating webhook configuration"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    url: Optional[str] = Field(None, pattern=r'^https?://.+')
    method: Optional[str] = Field(None, pattern=r'^(GET|POST|PUT|DELETE)$')
    event_types: Optional[List[WebhookEventType]] = Field(None, min_items=1)
    headers: Optional[Dict[str, str]] = None
    authentication: Optional[Dict[str, Any]] = None
    timeout_seconds: Optional[int] = Field(None, ge=1, le=300)
    retry_attempts: Optional[int] = Field(None, ge=0, le=10)
    retry_delay_seconds: Optional[int] = Field(None, ge=1, le=300)
    is_active: Optional[bool] = None
    verify_ssl: Optional[bool] = None
    secret_token: Optional[str] = None

class WebhookResponse(BaseModel):
    """Response schema for webhook data"""
    id: str
    name: str
    description: Optional[str] = None
    url: str
    method: str
    event_types: List[WebhookEventType]
    headers: Dict[str, str] = {}
    timeout_seconds: int
    retry_attempts: int
    retry_delay_seconds: int
    is_active: bool
    verify_ssl: bool
    has_secret_token: bool = False  # Don't expose actual token
    total_deliveries: int = 0
    successful_deliveries: int = 0
    failed_deliveries: int = 0
    last_delivery_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: str

    class Config:
        from_attributes = True

class WebhookPayload(BaseModel):
    """Schema for webhook payload data"""
    event_type: WebhookEventType
    timestamp: datetime
    event_id: str
    data: Dict[str, Any]
    metadata: Dict[str, Any] = {}

class WebhookDeliveryResponse(BaseModel):
    """Response schema for webhook delivery information"""
    id: str
    webhook_id: str
    event_type: WebhookEventType
    payload: Dict[str, Any]
    status: str  # success, failed, pending, retrying
    http_status: Optional[int] = None
    response_body: Optional[str] = None
    error_message: Optional[str] = None
    attempt_count: int = 0
    max_attempts: int = 3
    next_retry_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# API Key Schemas

class APIKeyCreate(BaseModel):
    """Schema for creating API key"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    permissions: List[str] = Field(..., min_items=1)  # List of allowed operations
    expires_at: Optional[datetime] = None
    rate_limit_per_hour: int = Field(1000, ge=1, le=100000)
    allowed_ips: List[str] = []  # IP whitelist
    metadata: Dict[str, Any] = {}

    @field_validator('permissions')
    @classmethod
    def validate_permissions(cls, v):
        """Validate API key permissions"""
        valid_permissions = [
            'read:cases', 'write:cases', 'delete:cases',
            'read:evidence', 'write:evidence', 'delete:evidence',
            'read:users', 'write:users', 'delete:users',
            'read:reports', 'write:reports',
            'admin:all'
        ]
        
        for permission in v:
            if permission not in valid_permissions:
                raise ValueError(f'Invalid permission: {permission}')
        
        return v

class APIKeyResponse(BaseModel):
    """Response schema for API key data"""
    id: str
    name: str
    description: Optional[str] = None
    key_preview: str  # Only show first 8 and last 4 characters
    permissions: List[str]
    is_active: bool
    expires_at: Optional[datetime] = None
    rate_limit_per_hour: int
    allowed_ips: List[str] = []
    total_requests: int = 0
    requests_today: int = 0
    last_used_at: Optional[datetime] = None
    last_used_ip: Optional[str] = None
    created_at: datetime
    created_by: str

    class Config:
        from_attributes = True

# Data Export/Import Schemas

class DataExportRequest(BaseModel):
    """Schema for data export request"""
    data_type: str = Field(..., pattern=r'^(cases|evidence|users|reports|tasks|all)$')
    format: ExportFormat
    filters: Dict[str, Any] = {}
    include_relations: bool = False
    date_range: Optional[Dict[str, datetime]] = None
    limit: Optional[int] = Field(None, ge=1, le=100000)
    background_processing: bool = True
    notification_email: Optional[str] = None
    encryption_password: Optional[str] = None

    @field_validator('date_range')
    @classmethod
    def validate_date_range(cls, v):
        """Validate date range"""
        if v and 'start' in v and 'end' in v:
            if v['start'] >= v['end']:
                raise ValueError('Start date must be before end date')
        return v

class DataExportResponse(BaseModel):
    """Response schema for export job"""
    job_id: str
    data_type: str
    format: ExportFormat
    status: JobStatus
    progress_percentage: int = 0
    total_records: Optional[int] = None
    processed_records: int = 0
    file_size: Optional[int] = None
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: str

    class Config:
        from_attributes = True

class DataImportRequest(BaseModel):
    """Schema for data import request"""
    data_type: str = Field(..., pattern=r'^(cases|evidence|users|parties)$')
    format: ImportFormat
    data: Union[str, Dict[str, Any]]  # Raw data or file reference
    mapping_config: Dict[str, str] = {}  # Field mapping
    validation_mode: str = Field("strict", pattern=r'^(strict|lenient|skip)$')
    duplicate_handling: str = Field("error", pattern=r'^(error|skip|update|merge)$')
    batch_size: int = Field(100, ge=1, le=1000)
    notification_email: Optional[str] = None

class DataImportResponse(BaseModel):
    """Response schema for import job"""
    job_id: str
    data_type: str
    format: ImportFormat
    status: JobStatus
    progress_percentage: int = 0
    total_records: Optional[int] = None
    processed_records: int = 0
    successful_imports: int = 0
    failed_imports: int = 0
    skipped_records: int = 0
    validation_errors: List[Dict[str, Any]] = []
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: str

    class Config:
        from_attributes = True

# External System Schemas

class ExternalSystemConnector(BaseModel):
    """Schema for external system connector information"""
    connector_id: str
    name: str
    description: str
    system_type: str
    supported_versions: List[str] = []
    required_credentials: List[str] = []
    optional_settings: List[str] = []
    capabilities: List[str] = []
    documentation_url: Optional[str] = None
    is_available: bool = True
    last_tested: Optional[datetime] = None

class ExternalAPIResponse(BaseModel):
    """Generic response schema for external API calls"""
    success: bool
    status_code: int
    response_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    response_time_ms: int
    timestamp: datetime

# Integration Monitoring Schemas

class IntegrationHealth(BaseModel):
    """Schema for overall integration health status"""
    overall_status: str  # healthy, warning, critical
    total_integrations: int
    active_integrations: int
    failed_integrations: int
    average_response_time: float
    error_rate_24h: float
    last_check: datetime
    issues: List[Dict[str, Any]] = []

class IntegrationMetrics(BaseModel):
    """Schema for integration metrics and statistics"""
    timeframe: str
    integration_id: Optional[str] = None
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time: float
    min_response_time: float
    max_response_time: float
    error_rate: float
    uptime_percentage: float
    data_points: List[Dict[str, Any]] = []  # Time series data
    top_errors: List[Dict[str, Any]] = []

class IntegrationLogResponse(BaseModel):
    """Response schema for integration logs"""
    id: str
    integration_id: Optional[str] = None
    level: LogLevel
    message: str
    details: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# Data Mapping and Transformation Schemas

class IntegrationMapping(BaseModel):
    """Schema for data mapping configuration"""
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    source_system: str
    target_system: str
    field_mappings: Dict[str, str]  # source_field -> target_field
    transformation_rules: Dict[str, Any] = {}
    validation_rules: Dict[str, Any] = {}
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    @field_validator('field_mappings')
    @classmethod
    def validate_field_mappings(cls, v):
        """Validate field mappings"""
        if not v:
            raise ValueError('At least one field mapping is required')
        
        for source, target in v.items():
            if not source or not target:
                raise ValueError('Source and target fields cannot be empty')
        
        return v

class TransformationRequest(BaseModel):
    """Schema for data transformation request"""
    mapping_id: str
    source_data: Dict[str, Any]
    apply_validation: bool = True
    ignore_missing_fields: bool = False

class TransformationResponse(BaseModel):
    """Schema for data transformation response"""
    success: bool
    transformed_data: Optional[Dict[str, Any]] = None
    validation_errors: List[str] = []
    warnings: List[str] = []
    transformation_time_ms: int
    timestamp: datetime

# Integration Templates Schemas

class IntegrationTemplate(BaseModel):
    """Schema for integration template"""
    template_id: str
    name: str
    description: str
    system_type: str
    vendor: Optional[str] = None
    version_compatibility: List[str] = []
    default_config: IntegrationConfig
    required_fields: List[str] = []
    optional_fields: List[str] = []
    setup_instructions: str
    documentation_url: Optional[str] = None
    is_verified: bool = False
    usage_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

class TemplateCustomization(BaseModel):
    """Schema for template customization options"""
    config_overrides: Dict[str, Any] = {}
    field_values: Dict[str, Any] = {}
    custom_name: Optional[str] = None
    custom_description: Optional[str] = None

# Validation Response Schemas

class ValidationResult(BaseModel):
    """Schema for data validation results"""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    field_errors: Dict[str, List[str]] = {}
    validated_at: datetime

class ConnectionTestResult(BaseModel):
    """Schema for integration connection test results"""
    success: bool
    response_time_ms: int
    status_code: Optional[int] = None
    error_message: Optional[str] = None
    capabilities_detected: List[str] = []
    version_info: Optional[Dict[str, Any]] = None
    tested_at: datetime

# Sync Job Schemas

class SyncJobCreate(BaseModel):
    """Schema for creating sync job"""
    connector_type: str
    sync_direction: str = Field(..., pattern=r'^(import|export|bidirectional)$')
    entity_types: List[str] = []
    filters: Dict[str, Any] = {}
    schedule_type: str = Field("manual", pattern=r'^(manual|scheduled|triggered)$')
    schedule_config: Dict[str, Any] = {}

class SyncJobResponse(BaseModel):
    """Response schema for sync job"""
    job_id: str
    connector_type: str
    sync_direction: str
    entity_types: List[str]
    status: JobStatus
    progress_percentage: int = 0
    records_processed: int = 0
    records_created: int = 0
    records_updated: int = 0
    records_failed: int = 0
    error_summary: List[str] = []
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    created_by: str

    class Config:
        from_attributes = True

# Error Handling Schemas

class IntegrationError(BaseModel):
    """Schema for integration error information"""
    error_code: str
    error_message: str
    error_details: Optional[Dict[str, Any]] = None
    integration_id: Optional[str] = None
    request_id: Optional[str] = None
    timestamp: datetime
    resolution_suggestions: List[str] = []