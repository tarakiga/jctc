from sqlalchemy import Column, String, Boolean, Integer, Text, Enum as SQLEnum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
from app.models.base import BaseModel
import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"  # Backend-only, bypasses all restrictions
    INTAKE = "INTAKE"
    INVESTIGATOR = "INVESTIGATOR"
    FORENSIC = "FORENSIC"
    PROSECUTOR = "PROSECUTOR"
    LIAISON = "LIAISON"
    SUPERVISOR = "SUPERVISOR"
    ADMIN = "ADMIN"


class WorkActivity(str, enum.Enum):
    MEETING = "MEETING"
    TRAVEL = "TRAVEL"
    TRAINING = "TRAINING"
    LEAVE = "LEAVE"


class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    org_unit = Column(String(255))  # e.g., JCTC HQ, Zonal Command
    is_active = Column(Boolean, default=True)
    hashed_password = Column(String(255), nullable=False)
    work_activity = Column(SQLEnum(WorkActivity), nullable=True)
    
    # Relationships
    created_cases = relationship("Case", foreign_keys="Case.created_by", back_populates="creator")
    assigned_cases = relationship("Case", foreign_keys="Case.lead_investigator", back_populates="lead_investigator_user")
    case_assignments = relationship("CaseAssignment", back_populates="user")
    tasks = relationship("Task", back_populates="assignee")
    actions = relationship("ActionLog", back_populates="user")
    team_activities = relationship("TeamActivity", back_populates="user")

    # Audit and compliance relationships (reverse mappings)
    # These align with back_populates defined in audit models
    audit_logs = relationship("AuditLog", back_populates="user")
    compliance_reports = relationship("ComplianceReport", back_populates="creator")
    retention_policies = relationship("RetentionPolicy", back_populates="creator")
    resolved_violations = relationship("ComplianceViolation", back_populates="resolver")
    audit_configurations = relationship("AuditConfiguration", back_populates="creator")
    retention_jobs = relationship("DataRetentionJob", back_populates="creator")
    audit_archives = relationship("AuditArchive", back_populates="creator")
    
    # NDPA Compliance relationships
    ndpa_consent_records = relationship("NDPAConsentRecord", back_populates="creator")
    ndpa_processing_activities = relationship("NDPADataProcessingActivity", back_populates="creator")
    ndpa_data_subject_requests = relationship("NDPADataSubjectRequest", back_populates="assignee")
    ndpa_breach_notifications = relationship("NDPABreachNotification", back_populates="reporter")
    ndpa_impact_assessments = relationship("NDPAImpactAssessment", back_populates="creator")
    ndpa_registrations = relationship("NDPARegistrationRecord", back_populates="creator")


# LookupCaseType deprecated - case types now use lookup_values table
# Table kept for migration compatibility, will be dropped after migration


class UserSession(BaseModel):
    """
    User session tracking for security and session management.
    
    Enables:
    - Session timeout enforcement
    - Concurrent session limits
    - IP/user-agent tracking for security audit
    - Session invalidation on password change
    """
    __tablename__ = "user_sessions"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)  # SHA-256 of JWT
    created_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_activity = Column(DateTime(timezone=True), server_default="now()")
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(String(500))
    is_active = Column(Boolean, default=True, index=True)
    invalidated_at = Column(DateTime(timezone=True))
    invalidation_reason = Column(String(100))  # logout, timeout, password_change, admin_revoke
    
    # SSO-specific fields
    sso_session_id = Column(String(255))  # External SSO session ID
    sso_provider = Column(String(50))     # keycloak, azure_ad, etc.
    
    # Relationships
    user = relationship("User", backref="sessions")
    
    def is_expired(self) -> bool:
        """Check if session has expired."""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc) > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if session is currently valid."""
        return self.is_active and not self.is_expired()


class TeamActivity(BaseModel):
    __tablename__ = "team_activities"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)  # Creator
    activity_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="team_activities")
    attendees = relationship(
        "User",
        secondary="team_activity_attendees",
        backref="attended_activities"
    )


class PasswordResetToken(BaseModel):
    """
    Secure password reset token storage.
    
    Tokens are stored as SHA-256 hashes to prevent token theft via DB access.
    """
    __tablename__ = "password_reset_tokens"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)  # SHA-256 hash of token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)  # Set when token is used
    
    # Relationship - passive_deletes=True lets DB handle CASCADE
    user = relationship("User", backref=backref("password_reset_tokens", passive_deletes=True))
    
    def is_expired(self) -> bool:
        """Check if token has expired."""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc) > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if token is valid (not expired and not used)."""
        return not self.is_expired() and self.used_at is None


# Association table for TeamActivity <-> User (attendees)
from sqlalchemy import Table
team_activity_attendees = Table(
    'team_activity_attendees',
    BaseModel.metadata,
    Column('activity_id', UUID(as_uuid=True), ForeignKey('team_activities.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default='now()')
)