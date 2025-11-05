"""
SQLAlchemy models for audit and compliance system.

This module defines the database models for:
- Audit log entries with tamper-proof integrity
- Compliance reports and violations
- Data retention policies and lifecycle management
- Audit configuration and settings
"""

import uuid
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, Float, JSON, Index, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql import func

from app.database.base_class import Base


class AuditLog(Base):
    """
    Audit log entries with tamper-proof integrity verification.
    
    This model stores comprehensive audit trails for all system activities
    with cryptographic integrity protection and forensic compliance.
    """
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Core audit fields
    action = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(255), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String(255), nullable=True, index=True)
    
    # Request context
    ip_address = Column(String(45), nullable=True, index=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    correlation_id = Column(String(255), nullable=True, index=True)
    
    # Audit content
    description = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)
    severity = Column(String(20), nullable=False, default="LOW", index=True)
    
    # Timestamps
    timestamp = Column(DateTime(timezone=True), nullable=False, default=func.now(), index=True)
    
    # Integrity protection
    checksum = Column(String(64), nullable=True)  # SHA-256 checksum
    previous_checksum = Column(String(64), nullable=True)  # Chain integrity
    
    # Metadata
    version = Column(Integer, nullable=False, default=1)
    is_archived = Column(Boolean, nullable=False, default=False, index=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    # Indexes for performance
    __table_args__ = (
        Index('ix_audit_logs_timestamp_desc', timestamp.desc()),
        Index('ix_audit_logs_user_timestamp', user_id, timestamp.desc()),
        Index('ix_audit_logs_entity_timestamp', entity_type, entity_id, timestamp.desc()),
        Index('ix_audit_logs_action_timestamp', action, timestamp.desc()),
        Index('ix_audit_logs_correlation_id', correlation_id),
        Index('ix_audit_logs_session_timestamp', session_id, timestamp.desc()),
    )
    
    def __init__(self, **kwargs):
        """Initialize audit log with automatic checksum generation."""
        super().__init__(**kwargs)
        self.generate_checksum()
    
    def generate_checksum(self) -> None:
        """Generate SHA-256 checksum for integrity verification."""
        # Create consistent string representation for hashing
        data_to_hash = {
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'user_id': str(self.user_id) if self.user_id else None,
            'description': self.description,
            'details': self.details,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'severity': self.severity
        }
        
        # Sort keys for consistent hashing
        json_str = json.dumps(data_to_hash, sort_keys=True, default=str)
        self.checksum = hashlib.sha256(json_str.encode()).hexdigest()
    
    def verify_integrity(self) -> bool:
        """Verify audit log integrity using stored checksum."""
        original_checksum = self.checksum
        self.generate_checksum()
        is_valid = self.checksum == original_checksum
        self.checksum = original_checksum  # Restore original
        return is_valid
    
    @validates('details')
    def validate_details(self, key, details):
        """Validate and sanitize audit details."""
        if details is None:
            return details
            
        # Remove sensitive information
        sensitive_fields = ['password', 'token', 'secret', 'key', 'credential']
        if isinstance(details, dict):
            sanitized = {}
            for k, v in details.items():
                if any(sens in k.lower() for sens in sensitive_fields):
                    sanitized[k] = '[REDACTED]'
                else:
                    sanitized[k] = v
            return sanitized
        return details
    
    @hybrid_property
    def age_days(self):
        """Calculate age of audit entry in days."""
        if self.timestamp:
            return (datetime.utcnow() - self.timestamp).days
        return 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert audit log to dictionary for export."""
        return {
            'id': str(self.id),
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'user_id': str(self.user_id) if self.user_id else None,
            'description': self.description,
            'details': self.details,
            'severity': self.severity,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ip_address': self.ip_address,
            'session_id': self.session_id,
            'correlation_id': self.correlation_id
        }


class ComplianceReport(Base):
    """
    Compliance reports for regulatory and legal requirements.
    
    Stores generated compliance reports with metadata and findings.
    """
    __tablename__ = "compliance_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Report metadata
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    report_type = Column(String(100), nullable=False, index=True)
    
    # Report period
    start_date = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Generation details
    status = Column(String(50), nullable=False, default="PENDING", index=True)
    parameters = Column(JSON, nullable=True)
    findings = Column(JSON, nullable=True)
    
    # File information
    file_path = Column(String(500), nullable=True)
    file_size = Column(Integer, nullable=True)
    format = Column(String(20), nullable=True)
    
    # Audit trail
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    creator = relationship("User", back_populates="compliance_reports")
    
    # Indexes
    __table_args__ = (
        Index('ix_compliance_reports_type_date', report_type, start_date, end_date),
        Index('ix_compliance_reports_status', status),
        Index('ix_compliance_reports_created_by', created_by),
    )
    
    @hybrid_property
    def duration_hours(self):
        """Calculate report generation duration in hours."""
        if self.completed_at and self.created_at:
            return (self.completed_at - self.created_at).total_seconds() / 3600
        return None
    
    def mark_completed(self, file_path: str = None, file_size: int = None):
        """Mark report as completed with optional file information."""
        self.status = "COMPLETED"
        self.completed_at = datetime.utcnow()
        if file_path:
            self.file_path = file_path
        if file_size:
            self.file_size = file_size


class RetentionPolicy(Base):
    """
    Data retention policies for automated lifecycle management.
    
    Defines how long different types of data should be retained and
    what actions to take when retention periods expire.
    """
    __tablename__ = "retention_policies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Policy identification
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    entity_type = Column(String(50), nullable=False, index=True)
    
    # Retention settings
    retention_period = Column(String(50), nullable=False)
    auto_archive = Column(Boolean, nullable=False, default=True)
    auto_delete = Column(Boolean, nullable=False, default=False)
    conditions = Column(JSON, nullable=True)
    
    # Policy status
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    
    # Audit trail
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="retention_policies")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('entity_type', 'name', name='uq_retention_policy_entity_name'),
        Index('ix_retention_policies_entity_active', entity_type, is_active),
    )
    
    def get_retention_days(self) -> int:
        """Convert retention period to days."""
        period_map = {
            "30_DAYS": 30,
            "90_DAYS": 90,
            "6_MONTHS": 180,
            "1_YEAR": 365,
            "3_YEARS": 1095,
            "5_YEARS": 1825,
            "7_YEARS": 2555,
            "10_YEARS": 3650,
            "PERMANENT": -1,  # Never expires
            "LEGAL_HOLD": -1  # Never expires
        }
        return period_map.get(self.retention_period, 365)
    
    def is_expired(self, item_date: datetime) -> bool:
        """Check if an item with given date has expired according to this policy."""
        retention_days = self.get_retention_days()
        if retention_days == -1:  # Permanent or legal hold
            return False
        
        expiry_date = item_date + timedelta(days=retention_days)
        return datetime.utcnow() > expiry_date


class ComplianceViolation(Base):
    """
    Compliance violations and their resolution status.
    
    Tracks detected compliance violations with remediation steps
    and resolution tracking.
    """
    __tablename__ = "compliance_violations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Violation details
    violation_type = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(255), nullable=True, index=True)
    severity = Column(String(20), nullable=False, index=True)
    
    # Violation description
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    compliance_rule = Column(String(200), nullable=True)
    remediation_steps = Column(Text, nullable=True)
    
    # Status tracking
    status = Column(String(50), nullable=False, default="VIOLATION", index=True)
    detected_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Related audit logs (stored as JSON array of UUIDs)
    related_audit_logs = Column(ARRAY(UUID(as_uuid=True)), nullable=True)
    
    # Relationships
    resolver = relationship("User", back_populates="resolved_violations")
    
    # Indexes
    __table_args__ = (
        Index('ix_compliance_violations_type_status', violation_type, status),
        Index('ix_compliance_violations_severity_detected', severity, detected_at.desc()),
        Index('ix_compliance_violations_entity_type', entity_type, entity_id),
    )
    
    @hybrid_property
    def resolution_time_hours(self):
        """Calculate resolution time in hours."""
        if self.resolved_at and self.detected_at:
            return (self.resolved_at - self.detected_at).total_seconds() / 3600
        return None
    
    def mark_resolved(self, user_id: uuid.UUID, resolution_notes: str = None):
        """Mark violation as resolved."""
        self.status = "RESOLVED"
        self.resolved_at = datetime.utcnow()
        self.resolved_by = user_id
        if resolution_notes:
            self.resolution_notes = resolution_notes


class AuditConfiguration(Base):
    """
    Configuration for audit logging behavior per entity type.
    
    Controls what actions are audited, detail levels, and retention
    for different entity types.
    """
    __tablename__ = "audit_configurations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Configuration target
    entity_type = Column(String(50), nullable=False, unique=True, index=True)
    
    # Audit settings
    actions_to_audit = Column(ARRAY(String(50)), nullable=False)
    include_details = Column(Boolean, nullable=False, default=True)
    retention_days = Column(Integer, nullable=False, default=365)
    alert_on_failure = Column(Boolean, nullable=False, default=True)
    minimum_severity = Column(String(20), nullable=False, default="LOW")
    
    # Configuration status
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    
    # Audit trail
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="audit_configurations")
    
    def should_audit_action(self, action: str) -> bool:
        """Check if given action should be audited for this entity type."""
        return action in self.actions_to_audit if self.actions_to_audit else False
    
    def get_severity_level(self, severity: str) -> int:
        """Get numeric severity level for comparison."""
        levels = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
        return levels.get(severity, 1)
    
    def should_log_severity(self, severity: str) -> bool:
        """Check if given severity meets minimum logging threshold."""
        return self.get_severity_level(severity) >= self.get_severity_level(self.minimum_severity)


class DataRetentionJob(Base):
    """
    Background jobs for data retention and archival processes.
    
    Tracks execution of retention policies and cleanup operations.
    """
    __tablename__ = "data_retention_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Job details
    job_type = Column(String(50), nullable=False, index=True)  # ARCHIVE, DELETE, CLEANUP
    entity_type = Column(String(50), nullable=False, index=True)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("retention_policies.id"), nullable=True)
    
    # Job status
    status = Column(String(50), nullable=False, default="PENDING", index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Job results
    items_processed = Column(Integer, nullable=False, default=0)
    items_succeeded = Column(Integer, nullable=False, default=0)
    items_failed = Column(Integer, nullable=False, default=0)
    error_details = Column(JSON, nullable=True)
    
    # Scheduling
    scheduled_at = Column(DateTime(timezone=True), nullable=False, default=func.now(), index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    policy = relationship("RetentionPolicy", back_populates="retention_jobs")
    creator = relationship("User", back_populates="retention_jobs")
    
    # Indexes
    __table_args__ = (
        Index('ix_retention_jobs_type_status', job_type, status),
        Index('ix_retention_jobs_scheduled', scheduled_at),
    )
    
    def mark_started(self):
        """Mark job as started."""
        self.status = "RUNNING"
        self.started_at = datetime.utcnow()
    
    def mark_completed(self, succeeded: int = 0, failed: int = 0, errors: List[Dict] = None):
        """Mark job as completed with results."""
        self.status = "COMPLETED" if failed == 0 else "COMPLETED_WITH_ERRORS"
        self.completed_at = datetime.utcnow()
        self.items_succeeded = succeeded
        self.items_failed = failed
        self.items_processed = succeeded + failed
        if errors:
            self.error_details = {"errors": errors}
    
    def mark_failed(self, error: str):
        """Mark job as failed with error details."""
        self.status = "FAILED"
        self.completed_at = datetime.utcnow()
        self.error_details = {"error": error}


class AuditArchive(Base):
    """
    Archived audit logs for long-term storage and compliance.
    
    Stores compressed and encrypted audit data for extended retention
    while maintaining forensic integrity.
    """
    __tablename__ = "audit_archives"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Archive metadata
    archive_name = Column(String(200), nullable=False, unique=True)
    start_date = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Archive content
    record_count = Column(Integer, nullable=False)
    entity_types = Column(ARRAY(String(50)), nullable=False)
    compressed_size = Column(Integer, nullable=False)  # Size in bytes
    original_size = Column(Integer, nullable=False)    # Original size in bytes
    
    # File information
    file_path = Column(String(500), nullable=False)
    checksum = Column(String(64), nullable=False)  # SHA-256 of archive file
    encryption_key_id = Column(String(100), nullable=True)  # Key management reference
    
    # Archive status
    status = Column(String(50), nullable=False, default="ACTIVE", index=True)
    
    # Audit trail
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    last_verified = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    creator = relationship("User", back_populates="audit_archives")
    
    # Indexes
    __table_args__ = (
        Index('ix_audit_archives_date_range', start_date, end_date),
        Index('ix_audit_archives_status', status),
    )
    
    @hybrid_property
    def compression_ratio(self):
        """Calculate compression ratio."""
        if self.original_size and self.compressed_size:
            return round((1 - self.compressed_size / self.original_size) * 100, 2)
        return 0
    
    def verify_integrity(self, file_checksum: str) -> bool:
        """Verify archive file integrity."""
        is_valid = self.checksum == file_checksum
        if is_valid:
            self.last_verified = datetime.utcnow()
        return is_valid


# Add relationships to existing User model (this would typically be added to the User model)
# These are the reverse relationships that would be added to the User model:

"""
# Add to User model:
audit_logs = relationship("AuditLog", back_populates="user")
compliance_reports = relationship("ComplianceReport", back_populates="creator")
retention_policies = relationship("RetentionPolicy", back_populates="creator")
resolved_violations = relationship("ComplianceViolation", back_populates="resolver")
audit_configurations = relationship("AuditConfiguration", back_populates="creator")
retention_jobs = relationship("DataRetentionJob", back_populates="creator")
audit_archives = relationship("AuditArchive", back_populates="creator")
"""