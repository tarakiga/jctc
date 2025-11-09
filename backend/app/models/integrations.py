from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, Float, Index, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from enum import Enum
import uuid
import secrets
import hashlib

from ..models.base import BaseModel

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

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Integration(BaseModel):
    """Model for external system integrations"""
    __tablename__ = "integrations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Basic information
    name = Column(String(100), nullable=False)
    description = Column(Text)
    integration_type = Column(String(50), nullable=False)
    system_identifier = Column(String(50), nullable=False, unique=True)
    
    # Status and configuration
    status = Column(String(20), default=IntegrationStatus.ACTIVE)
    is_active = Column(Boolean, default=True)
    config = Column(JSON, nullable=False)  # Integration configuration
    
    # Synchronization settings
    auto_sync = Column(Boolean, default=False)
    sync_interval_minutes = Column(Integer)
    last_sync_at = Column(DateTime)
    next_sync_at = Column(DateTime)
    
    # Data management
    data_retention_days = Column(Integer, default=90)
    tags = Column(JSON, default=list)
    
    # Performance and monitoring
    total_requests = Column(Integer, default=0)
    successful_requests = Column(Integer, default=0)
    failed_requests = Column(Integer, default=0)
    average_response_time = Column(Float, default=0.0)
    last_error = Column(Text)
    last_health_check = Column(DateTime)
    
    # Metadata
    version = Column(String(20))
    metadata = Column(JSON, default=dict)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    updated_by = Column(String, ForeignKey('users.id'))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    webhooks = relationship("Webhook", back_populates="integration", cascade="all, delete-orphan")
    logs = relationship("IntegrationLog", back_populates="integration", cascade="all, delete-orphan")
    data_exports = relationship("DataExport", back_populates="integration")
    data_imports = relationship("DataImport", back_populates="integration")
    sync_jobs = relationship("SyncJob", back_populates="integration")
    
    # Indexes
    __table_args__ = (
        Index('ix_integrations_type_status', 'integration_type', 'status'),
        Index('ix_integrations_active', 'is_active'),
        Index('ix_integrations_sync', 'auto_sync', 'next_sync_at'),
        Index('ix_integrations_created', 'created_at'),
    )
    
    def update_stats(self, success: bool, response_time: float = None):
        """Update integration statistics"""
        self.total_requests += 1
        
        if success:
            self.successful_requests += 1
            if response_time:
                # Update rolling average
                total_time = self.average_response_time * (self.successful_requests - 1) + response_time
                self.average_response_time = total_time / self.successful_requests
        else:
            self.failed_requests += 1
        
        self.updated_at = datetime.utcnow()
    
    def get_success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.total_requests == 0:
            return 0.0
        return (self.successful_requests / self.total_requests) * 100
    
    def is_healthy(self) -> bool:
        """Check if integration is healthy"""
        if not self.is_active:
            return False
        
        # Check if error rate is acceptable (< 10%)
        error_rate = (self.failed_requests / max(self.total_requests, 1)) * 100
        if error_rate > 10:
            return False
        
        # Check if last health check was recent (within 1 hour)
        if self.last_health_check:
            time_since_check = datetime.utcnow() - self.last_health_check
            if time_since_check > timedelta(hours=1):
                return False
        
        return self.status == IntegrationStatus.ACTIVE
    
    def schedule_next_sync(self):
        """Schedule next sync based on interval"""
        if self.auto_sync and self.sync_interval_minutes:
            self.next_sync_at = datetime.utcnow() + timedelta(minutes=self.sync_interval_minutes)

class Webhook(BaseModel):
    """Model for webhook configurations"""
    __tablename__ = "webhooks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    integration_id = Column(String, ForeignKey('integrations.id'), nullable=False)
    
    # Basic information
    name = Column(String(100), nullable=False)
    description = Column(Text)
    url = Column(Text, nullable=False)
    method = Column(String(10), default="POST")
    
    # Configuration
    event_types = Column(JSON, nullable=False)  # List of event types
    headers = Column(JSON, default=dict)
    authentication = Column(JSON, default=dict)  # Authentication config (encrypted)
    
    # Security
    secret_token = Column(String(255))  # For signature verification
    verify_ssl = Column(Boolean, default=True)
    
    # Retry and timeout settings
    timeout_seconds = Column(Integer, default=30)
    retry_attempts = Column(Integer, default=3)
    retry_delay_seconds = Column(Integer, default=5)
    
    # Status and monitoring
    is_active = Column(Boolean, default=True)
    total_deliveries = Column(Integer, default=0)
    successful_deliveries = Column(Integer, default=0)
    failed_deliveries = Column(Integer, default=0)
    last_delivery_at = Column(DateTime)
    last_success_at = Column(DateTime)
    last_error = Column(Text)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    integration = relationship("Integration", back_populates="webhooks")
    creator = relationship("User")
    deliveries = relationship("WebhookDelivery", back_populates="webhook", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('ix_webhooks_integration_active', 'integration_id', 'is_active'),
        Index('ix_webhooks_event_types', 'event_types'),  # GIN index for JSON
        Index('ix_webhooks_created', 'created_at'),
    )
    
    def increment_delivery_stats(self, success: bool):
        """Update delivery statistics"""
        self.total_deliveries += 1
        self.last_delivery_at = datetime.utcnow()
        
        if success:
            self.successful_deliveries += 1
            self.last_success_at = datetime.utcnow()
            self.last_error = None
        else:
            self.failed_deliveries += 1
    
    def get_success_rate(self) -> float:
        """Calculate delivery success rate"""
        if self.total_deliveries == 0:
            return 0.0
        return (self.successful_deliveries / self.total_deliveries) * 100
    
    def supports_event(self, event_type: str) -> bool:
        """Check if webhook supports specific event type"""
        return event_type in (self.event_types or [])

class WebhookDelivery(BaseModel):
    """Model for webhook delivery tracking"""
    __tablename__ = "webhook_deliveries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    webhook_id = Column(String, ForeignKey('webhooks.id'), nullable=False)
    
    # Delivery information
    event_type = Column(String(50), nullable=False)
    event_id = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)
    
    # Delivery status
    status = Column(String(20), default="pending")  # pending, success, failed, retrying
    http_status = Column(Integer)
    response_body = Column(Text)
    error_message = Column(Text)
    
    # Retry information
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    next_retry_at = Column(DateTime)
    
    # Timing
    scheduled_for = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    webhook = relationship("Webhook", back_populates="deliveries")
    
    # Indexes
    __table_args__ = (
        Index('ix_webhook_deliveries_webhook_status', 'webhook_id', 'status'),
        Index('ix_webhook_deliveries_event', 'event_type', 'event_id'),
        Index('ix_webhook_deliveries_retry', 'status', 'next_retry_at'),
        Index('ix_webhook_deliveries_created', 'created_at'),
    )
    
    def mark_success(self, http_status: int, response_body: str = None):
        """Mark delivery as successful"""
        self.status = "success"
        self.http_status = http_status
        self.response_body = response_body
        self.delivered_at = datetime.utcnow()
        self.error_message = None
    
    def mark_failed(self, error_message: str, http_status: int = None):
        """Mark delivery as failed"""
        self.status = "failed"
        self.error_message = error_message
        if http_status:
            self.http_status = http_status
        
        # Schedule retry if attempts remaining
        if self.attempt_count < self.max_attempts:
            self.status = "retrying"
            retry_delay = (2 ** self.attempt_count) * 60  # Exponential backoff
            self.next_retry_at = datetime.utcnow() + timedelta(seconds=retry_delay)
    
    def can_retry(self) -> bool:
        """Check if delivery can be retried"""
        return self.attempt_count < self.max_attempts and self.status in ["failed", "retrying"]

class APIKey(BaseModel):
    """Model for API key management"""
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Key information
    name = Column(String(100), nullable=False)
    description = Column(Text)
    key_hash = Column(String(255), unique=True, nullable=False)  # Hashed API key
    key_preview = Column(String(50))  # First 8 + last 4 characters for display
    
    # Permissions and access control
    permissions = Column(JSON, nullable=False)  # List of permissions
    allowed_ips = Column(JSON, default=list)  # IP whitelist
    
    # Rate limiting
    rate_limit_per_hour = Column(Integer, default=1000)
    current_hour_requests = Column(Integer, default=0)
    current_hour_start = Column(DateTime, default=datetime.utcnow)
    
    # Status and expiration
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime)
    
    # Usage tracking
    total_requests = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    last_used_ip = Column(String(45))  # Supports IPv6
    
    # Metadata
    metadata = Column(JSON, default=dict)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    revoked_at = Column(DateTime)
    revoked_by = Column(String, ForeignKey('users.id'))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    revoker = relationship("User", foreign_keys=[revoked_by])
    
    # Indexes
    __table_args__ = (
        Index('ix_api_keys_hash', 'key_hash'),
        Index('ix_api_keys_active', 'is_active'),
        Index('ix_api_keys_expires', 'expires_at'),
        Index('ix_api_keys_created', 'created_at'),
    )
    
    @classmethod
    def generate_key(cls, name: str, permissions: list, created_by: str, **kwargs):
        """Generate a new API key"""
        # Generate secure random key
        api_key = secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        key_preview = f"{api_key[:8]}...{api_key[-4:]}"
        
        instance = cls(
            name=name,
            key_hash=key_hash,
            key_preview=key_preview,
            permissions=permissions,
            created_by=created_by,
            **kwargs
        )
        
        # Return both the instance and the plain key (only time it's available)
        return instance, api_key
    
    def verify_key(self, provided_key: str) -> bool:
        """Verify provided key against stored hash"""
        provided_hash = hashlib.sha256(provided_key.encode()).hexdigest()
        return provided_hash == self.key_hash
    
    def is_valid(self) -> bool:
        """Check if API key is valid and not expired"""
        if not self.is_active or self.revoked_at:
            return False
        
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        
        return True
    
    def can_make_request(self) -> bool:
        """Check if API key can make another request (rate limiting)"""
        if not self.is_valid():
            return False
        
        # Reset rate limit if new hour
        current_time = datetime.utcnow()
        if (current_time - self.current_hour_start).total_seconds() >= 3600:
            self.current_hour_requests = 0
            self.current_hour_start = current_time.replace(minute=0, second=0, microsecond=0)
        
        return self.current_hour_requests < self.rate_limit_per_hour
    
    def record_request(self, ip_address: str = None):
        """Record API request usage"""
        self.total_requests += 1
        self.current_hour_requests += 1
        self.last_used_at = datetime.utcnow()
        if ip_address:
            self.last_used_ip = ip_address
    
    def has_permission(self, required_permission: str) -> bool:
        """Check if API key has required permission"""
        if "admin:all" in self.permissions:
            return True
        return required_permission in self.permissions
    
    def revoke(self, revoked_by: str):
        """Revoke the API key"""
        self.is_active = False
        self.revoked_at = datetime.utcnow()
        self.revoked_by = revoked_by

class DataExport(BaseModel):
    """Model for data export jobs"""
    __tablename__ = "data_exports"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    integration_id = Column(String, ForeignKey('integrations.id'))
    
    # Export configuration
    data_type = Column(String(50), nullable=False)  # cases, evidence, users, etc.
    format = Column(String(20), nullable=False)  # json, xml, csv, pdf, excel
    filters = Column(JSON, default=dict)
    include_relations = Column(Boolean, default=False)
    
    # Job status
    status = Column(String(20), default=JobStatus.PENDING)
    progress_percentage = Column(Integer, default=0)
    
    # Statistics
    total_records = Column(Integer)
    processed_records = Column(Integer, default=0)
    
    # File information
    file_path = Column(String(500))
    file_size = Column(Integer)  # Size in bytes
    download_url = Column(String(500))
    expires_at = Column(DateTime)
    
    # Error handling
    error_message = Column(Text)
    error_details = Column(JSON)
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # User information
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    notification_email = Column(String(255))
    
    # Security
    is_encrypted = Column(Boolean, default=False)
    encryption_key_hash = Column(String(255))
    
    # Relationships
    integration = relationship("Integration", back_populates="data_exports")
    creator = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('ix_data_exports_status', 'status'),
        Index('ix_data_exports_user_created', 'created_by', 'created_at'),
        Index('ix_data_exports_expires', 'expires_at'),
        Index('ix_data_exports_type', 'data_type'),
    )
    
    def start_processing(self):
        """Mark export as started"""
        self.status = JobStatus.RUNNING
        self.started_at = datetime.utcnow()
    
    def complete_processing(self, file_path: str, file_size: int):
        """Mark export as completed"""
        self.status = JobStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.file_path = file_path
        self.file_size = file_size
        self.progress_percentage = 100
        
        # Set expiration (30 days from completion)
        self.expires_at = datetime.utcnow() + timedelta(days=30)
    
    def mark_failed(self, error_message: str, error_details: dict = None):
        """Mark export as failed"""
        self.status = JobStatus.FAILED
        self.error_message = error_message
        if error_details:
            self.error_details = error_details
        self.completed_at = datetime.utcnow()
    
    def update_progress(self, processed_records: int, total_records: int = None):
        """Update export progress"""
        self.processed_records = processed_records
        if total_records:
            self.total_records = total_records
        
        if self.total_records and self.total_records > 0:
            self.progress_percentage = min(
                int((self.processed_records / self.total_records) * 100), 
                100
            )
    
    def is_expired(self) -> bool:
        """Check if export has expired"""
        return self.expires_at and datetime.utcnow() > self.expires_at

class DataImport(BaseModel):
    """Model for data import jobs"""
    __tablename__ = "data_imports"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    integration_id = Column(String, ForeignKey('integrations.id'))
    
    # Import configuration
    data_type = Column(String(50), nullable=False)  # cases, evidence, users, parties
    format = Column(String(20), nullable=False)  # json, xml, csv
    source_file_path = Column(String(500))
    mapping_config = Column(JSON, default=dict)  # Field mapping configuration
    
    # Import options
    validation_mode = Column(String(20), default="strict")  # strict, lenient, skip
    duplicate_handling = Column(String(20), default="error")  # error, skip, update, merge
    batch_size = Column(Integer, default=100)
    
    # Job status
    status = Column(String(20), default=JobStatus.PENDING)
    progress_percentage = Column(Integer, default=0)
    
    # Statistics
    total_records = Column(Integer)
    processed_records = Column(Integer, default=0)
    successful_imports = Column(Integer, default=0)
    failed_imports = Column(Integer, default=0)
    skipped_records = Column(Integer, default=0)
    
    # Validation and errors
    validation_errors = Column(JSON, default=list)
    error_message = Column(Text)
    error_details = Column(JSON)
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # User information
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    notification_email = Column(String(255))
    
    # Relationships
    integration = relationship("Integration", back_populates="data_imports")
    creator = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('ix_data_imports_status', 'status'),
        Index('ix_data_imports_user_created', 'created_by', 'created_at'),
        Index('ix_data_imports_type', 'data_type'),
    )
    
    def start_processing(self):
        """Mark import as started"""
        self.status = JobStatus.RUNNING
        self.started_at = datetime.utcnow()
    
    def complete_processing(self):
        """Mark import as completed"""
        self.status = JobStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.progress_percentage = 100
    
    def mark_failed(self, error_message: str, error_details: dict = None):
        """Mark import as failed"""
        self.status = JobStatus.FAILED
        self.error_message = error_message
        if error_details:
            self.error_details = error_details
        self.completed_at = datetime.utcnow()
    
    def update_progress(self, processed: int, successful: int, failed: int, skipped: int = 0):
        """Update import progress and statistics"""
        self.processed_records = processed
        self.successful_imports = successful
        self.failed_imports = failed
        self.skipped_records = skipped
        
        if self.total_records and self.total_records > 0:
            self.progress_percentage = min(
                int((self.processed_records / self.total_records) * 100),
                100
            )
    
    def add_validation_error(self, record_index: int, field: str, error: str):
        """Add validation error for specific record and field"""
        error_entry = {
            "record_index": record_index,
            "field": field,
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if not self.validation_errors:
            self.validation_errors = []
        
        self.validation_errors.append(error_entry)
    
    def get_success_rate(self) -> float:
        """Calculate import success rate"""
        if self.processed_records == 0:
            return 0.0
        return (self.successful_imports / self.processed_records) * 100

class SyncJob(BaseModel):
    """Model for external system synchronization jobs"""
    __tablename__ = "sync_jobs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    integration_id = Column(String, ForeignKey('integrations.id'), nullable=False)
    
    # Job configuration
    connector_type = Column(String(50), nullable=False)
    sync_direction = Column(String(20), nullable=False)  # import, export, bidirectional
    entity_types = Column(JSON, default=list)  # Types of entities to sync
    sync_filters = Column(JSON, default=dict)
    
    # Scheduling
    schedule_type = Column(String(20), default="manual")  # manual, scheduled, triggered
    schedule_config = Column(JSON, default=dict)
    next_run_at = Column(DateTime)
    
    # Job status
    status = Column(String(20), default=JobStatus.PENDING)
    progress_percentage = Column(Integer, default=0)
    
    # Statistics
    records_processed = Column(Integer, default=0)
    records_created = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    
    # Error tracking
    error_summary = Column(JSON, default=list)
    last_error = Column(Text)
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    estimated_duration = Column(Integer)  # Seconds
    
    # User information
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    integration = relationship("Integration", back_populates="sync_jobs")
    creator = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('ix_sync_jobs_integration_status', 'integration_id', 'status'),
        Index('ix_sync_jobs_schedule', 'schedule_type', 'next_run_at'),
        Index('ix_sync_jobs_created', 'created_at'),
        Index('ix_sync_jobs_connector', 'connector_type'),
    )
    
    def start_processing(self):
        """Start sync job processing"""
        self.status = JobStatus.RUNNING
        self.started_at = datetime.utcnow()
        self.progress_percentage = 0
    
    def complete_processing(self):
        """Complete sync job processing"""
        self.status = JobStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.progress_percentage = 100
        
        # Schedule next run if recurring
        if self.schedule_type == "scheduled" and self.schedule_config.get('interval_minutes'):
            interval = self.schedule_config['interval_minutes']
            self.next_run_at = datetime.utcnow() + timedelta(minutes=interval)
    
    def mark_failed(self, error_message: str):
        """Mark sync job as failed"""
        self.status = JobStatus.FAILED
        self.last_error = error_message
        self.completed_at = datetime.utcnow()
        
        # Add to error summary
        if not self.error_summary:
            self.error_summary = []
        
        self.error_summary.append({
            "error": error_message,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def update_progress(self, processed: int, created: int, updated: int, failed: int):
        """Update sync job progress"""
        self.records_processed = processed
        self.records_created = created
        self.records_updated = updated
        self.records_failed = failed
        
        # Calculate progress based on estimated total (if available)
        if hasattr(self, '_estimated_total') and self._estimated_total > 0:
            self.progress_percentage = min(
                int((processed / self._estimated_total) * 100),
                100
            )
    
    def should_run_now(self) -> bool:
        """Check if job should run now based on schedule"""
        if self.schedule_type == "manual" or not self.next_run_at:
            return False
        
        return datetime.utcnow() >= self.next_run_at and self.status == JobStatus.PENDING

class IntegrationLog(BaseModel):
    """Model for integration audit logs and monitoring"""
    __tablename__ = "integration_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    integration_id = Column(String, ForeignKey('integrations.id'))
    
    # Log information
    level = Column(String(20), nullable=False)  # debug, info, warning, error, critical
    message = Column(Text, nullable=False)
    details = Column(JSON)  # Additional structured data
    
    # Context information
    request_id = Column(String)  # For tracing requests
    user_id = Column(String, ForeignKey('users.id'))
    ip_address = Column(String(45))  # Supports IPv6
    user_agent = Column(Text)
    
    # API-specific information
    endpoint = Column(String(200))
    method = Column(String(10))
    status_code = Column(Integer)
    response_time_ms = Column(Integer)
    
    # Error information
    error_code = Column(String(50))
    stack_trace = Column(Text)
    
    # Timing
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    integration = relationship("Integration", back_populates="logs")
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('ix_integration_logs_integration_level', 'integration_id', 'level'),
        Index('ix_integration_logs_level_timestamp', 'level', 'timestamp'),
        Index('ix_integration_logs_user_timestamp', 'user_id', 'timestamp'),
        Index('ix_integration_logs_request', 'request_id'),
    )
    
    @classmethod
    def create_log(
        cls, 
        level: str, 
        message: str, 
        integration_id: str = None,
        details: dict = None,
        request_id: str = None,
        user_id: str = None,
        **kwargs
    ):
        """Create a new integration log entry"""
        return cls(
            level=level,
            message=message,
            integration_id=integration_id,
            details=details or {},
            request_id=request_id,
            user_id=user_id,
            **kwargs
        )
    
    def is_error(self) -> bool:
        """Check if log entry represents an error"""
        return self.level in ["error", "critical"]
    
    def is_recent(self, hours: int = 1) -> bool:
        """Check if log entry is recent"""
        time_diff = datetime.utcnow() - self.timestamp
        return time_diff.total_seconds() < (hours * 3600)

class DataMapping(BaseModel):
    """Model for data transformation mappings between systems"""
    __tablename__ = "data_mappings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Mapping information
    name = Column(String(100), nullable=False)
    description = Column(Text)
    source_system = Column(String(100), nullable=False)
    target_system = Column(String(100), nullable=False)
    
    # Mapping configuration
    field_mappings = Column(JSON, nullable=False)  # source_field -> target_field
    transformation_rules = Column(JSON, default=dict)  # Transformation logic
    validation_rules = Column(JSON, default=dict)  # Validation rules
    
    # Status
    is_active = Column(Boolean, default=True)
    version = Column(String(20), default="1.0")
    
    # Usage tracking
    total_transformations = Column(Integer, default=0)
    successful_transformations = Column(Integer, default=0)
    failed_transformations = Column(Integer, default=0)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    updated_by = Column(String, ForeignKey('users.id'))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    
    # Indexes
    __table_args__ = (
        Index('ix_data_mappings_systems', 'source_system', 'target_system'),
        Index('ix_data_mappings_active', 'is_active'),
        Index('ix_data_mappings_created', 'created_at'),
    )
    
    def record_transformation(self, success: bool):
        """Record transformation usage statistics"""
        self.total_transformations += 1
        if success:
            self.successful_transformations += 1
        else:
            self.failed_transformations += 1
    
    def get_success_rate(self) -> float:
        """Calculate transformation success rate"""
        if self.total_transformations == 0:
            return 0.0
        return (self.successful_transformations / self.total_transformations) * 100