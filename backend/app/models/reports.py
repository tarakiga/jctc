from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Report(Base):
    """Model for generated reports"""
    __tablename__ = "reports"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_type = Column(String(50), nullable=False, index=True)
    title = Column(String(255))
    description = Column(Text)
    format = Column(String(20), nullable=False, default="pdf")  # pdf, word, excel, html, json
    status = Column(String(20), nullable=False, default="PENDING", index=True)  # PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    
    # Report configuration and data
    parameters = Column(JSON)  # Report-specific parameters
    template_id = Column(String, ForeignKey("report_templates.id"))
    
    # File information
    file_path = Column(String(500))  # Path to generated file
    file_size = Column(Integer)  # Size in bytes
    file_hash = Column(String(64))  # SHA-256 hash for integrity
    download_url = Column(String(500))
    
    # Progress and timing
    progress_percentage = Column(Integer, default=0)
    estimated_completion = Column(DateTime)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    expires_at = Column(DateTime)  # When the report file expires
    
    # Error handling
    error_message = Column(Text)
    error_details = Column(JSON)
    retry_count = Column(Integer, default=0)
    
    # User and audit information
    requested_by = Column(String, ForeignKey("users.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"))
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    template = relationship("ReportTemplate", back_populates="reports")
    requested_by_user = relationship("User", foreign_keys=[requested_by])
    executions = relationship("ReportExecution", back_populates="report")
    
    def __repr__(self):
        return f"<Report(id='{self.id}', type='{self.report_type}', status='{self.status}')>"

class ReportTemplate(Base):
    """Model for report templates"""
    __tablename__ = "report_templates"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100), nullable=False, index=True)  # case_reports, evidence_reports, compliance_reports
    report_type = Column(String(50), nullable=False, index=True)
    
    # Template configuration
    template_config = Column(JSON)  # Template-specific configuration
    template_fields = Column(JSON)  # List of fields included in template
    default_parameters = Column(JSON)  # Default parameters for this template
    
    # Template properties
    is_system = Column(Boolean, default=False)  # System-provided vs user-created
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)  # Available to all users
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime)
    
    # User and audit information
    created_by = Column(String, ForeignKey("users.id"))
    organization_id = Column(String, ForeignKey("organizations.id"))
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    reports = relationship("Report", back_populates="template")
    created_by_user = relationship("User", foreign_keys=[created_by])
    
    def __repr__(self):
        return f"<ReportTemplate(id='{self.id}', name='{self.name}', type='{self.report_type}')>"

class ScheduledReport(Base):
    """Model for scheduled recurring reports"""
    __tablename__ = "scheduled_reports"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Report configuration
    report_type = Column(String(50), nullable=False)
    format = Column(String(20), nullable=False, default="pdf")
    parameters = Column(JSON)  # Report parameters
    template_id = Column(String, ForeignKey("report_templates.id"))
    
    # Scheduling
    schedule_cron = Column(String(100), nullable=False)  # Cron expression
    timezone = Column(String(50), default="UTC")
    is_active = Column(Boolean, default=True)
    
    # Execution tracking
    last_run = Column(DateTime)
    next_run = Column(DateTime, index=True)
    run_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    last_failure = Column(DateTime)
    last_error = Column(Text)
    
    # Recipients
    recipients = Column(JSON)  # List of email addresses or user IDs
    notification_settings = Column(JSON)  # Notification preferences
    
    # User and audit information
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"))
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    template = relationship("ReportTemplate")
    created_by_user = relationship("User", foreign_keys=[created_by])
    executions = relationship("ReportExecution", back_populates="scheduled_report")
    
    def __repr__(self):
        return f"<ScheduledReport(id='{self.id}', name='{self.name}', active='{self.is_active}')>"

class ReportExecution(Base):
    """Model for tracking report execution history"""
    __tablename__ = "report_executions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Report information
    report_id = Column(String, ForeignKey("reports.id"))
    scheduled_report_id = Column(String, ForeignKey("scheduled_reports.id"))
    report_type = Column(String(50), nullable=False)
    
    # Execution details
    parameters = Column(JSON)
    status = Column(String(20), nullable=False, index=True)  # PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
    
    # Timing
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)
    execution_time_seconds = Column(Float)
    
    # Results
    file_path = Column(String(500))
    file_size = Column(Integer)
    download_url = Column(String(500))
    
    # Error handling
    error_message = Column(Text)
    error_details = Column(JSON)
    
    # User and audit information
    executed_by = Column(String, ForeignKey("users.id"), nullable=False)
    execution_context = Column(String(50))  # manual, scheduled, api
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    report = relationship("Report", back_populates="executions")
    scheduled_report = relationship("ScheduledReport", back_populates="executions")
    executed_by_user = relationship("User", foreign_keys=[executed_by])
    
    def __repr__(self):
        return f"<ReportExecution(id='{self.id}', type='{self.report_type}', status='{self.status}')>"

class ReportPermission(Base):
    """Model for report permissions by role/user"""
    __tablename__ = "report_permissions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Permission target
    report_type = Column(String(50), nullable=False, index=True)
    role = Column(String(50), index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    organization_id = Column(String, ForeignKey("organizations.id"))
    
    # Permissions
    can_generate = Column(Boolean, default=False)
    can_view = Column(Boolean, default=False)
    can_download = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_share = Column(Boolean, default=False)
    can_schedule = Column(Boolean, default=False)
    
    # Data scope
    data_scope = Column(String(50), default="own")  # own, team, department, all
    
    # Conditions
    conditions = Column(JSON)  # Additional permission conditions
    
    # User and audit information
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    
    def __repr__(self):
        return f"<ReportPermission(type='{self.report_type}', role='{self.role}', generate='{self.can_generate}')>"

class ReportAnalytics(Base):
    """Model for tracking report usage analytics"""
    __tablename__ = "report_analytics"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Report information
    report_type = Column(String(50), nullable=False, index=True)
    template_id = Column(String, ForeignKey("report_templates.id"))
    format = Column(String(20), nullable=False)
    
    # Usage metrics
    generated_count = Column(Integer, default=0)
    downloaded_count = Column(Integer, default=0)
    shared_count = Column(Integer, default=0)
    
    # Performance metrics
    total_generation_time = Column(Float, default=0.0)  # Total time in seconds
    average_generation_time = Column(Float, default=0.0)
    min_generation_time = Column(Float)
    max_generation_time = Column(Float)
    
    # Size metrics
    total_file_size = Column(Integer, default=0)
    average_file_size = Column(Integer, default=0)
    
    # Quality metrics
    success_rate = Column(Float, default=100.0)  # Percentage
    error_rate = Column(Float, default=0.0)
    user_ratings = Column(JSON)  # List of user ratings
    average_rating = Column(Float)
    
    # Time tracking
    last_generated = Column(DateTime)
    last_downloaded = Column(DateTime)
    
    # Period tracking (for aggregated analytics)
    analytics_period = Column(String(20))  # daily, weekly, monthly, yearly
    period_start = Column(DateTime)
    period_end = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    template = relationship("ReportTemplate")
    
    def __repr__(self):
        return f"<ReportAnalytics(type='{self.report_type}', generated='{self.generated_count}')>"

class ReportShare(Base):
    """Model for tracking report sharing"""
    __tablename__ = "report_shares"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Report information
    report_id = Column(String, ForeignKey("reports.id"), nullable=False)
    
    # Sharing details
    shared_with_user_id = Column(String, ForeignKey("users.id"))
    shared_with_email = Column(String(255))
    share_token = Column(String(64), unique=True)  # Unique token for public sharing
    
    # Sharing configuration
    is_public = Column(Boolean, default=False)
    requires_authentication = Column(Boolean, default=True)
    download_enabled = Column(Boolean, default=True)
    expires_at = Column(DateTime)
    
    # Access tracking
    access_count = Column(Integer, default=0)
    last_accessed = Column(DateTime)
    
    # User and audit information
    shared_by = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    report = relationship("Report")
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id])
    shared_by_user = relationship("User", foreign_keys=[shared_by])
    
    def __repr__(self):
        return f"<ReportShare(report_id='{self.report_id}', public='{self.is_public}')>"

class ReportComment(Base):
    """Model for comments on reports"""
    __tablename__ = "report_comments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Report information
    report_id = Column(String, ForeignKey("reports.id"), nullable=False)
    
    # Comment details
    comment = Column(Text, nullable=False)
    rating = Column(Integer)  # 1-5 star rating
    tags = Column(JSON)  # List of tags
    
    # User and audit information
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    report = relationship("Report")
    created_by_user = relationship("User", foreign_keys=[created_by])
    
    def __repr__(self):
        return f"<ReportComment(report_id='{self.report_id}', rating='{self.rating}')>"