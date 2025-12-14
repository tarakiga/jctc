from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean, CheckConstraint, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.user import User
import enum
import uuid


class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    PENDING_PROSECUTION = "PENDING_PROSECUTION"
    IN_COURT = "IN_COURT"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class LocalInternational(str, enum.Enum):
    LOCAL = "LOCAL"
    INTERNATIONAL = "INTERNATIONAL"


class AssignmentRole(str, enum.Enum):
    LEAD = "LEAD"
    SUPPORT = "SUPPORT"
    PROSECUTOR = "PROSECUTOR"
    LIAISON = "LIAISON"


class IntakeChannel(str, enum.Enum):
    """Channel through which the case was reported"""
    WALK_IN = "WALK_IN"
    HOTLINE = "HOTLINE"
    EMAIL = "EMAIL"
    REFERRAL = "REFERRAL"
    API = "API"
    ONLINE_FORM = "ONLINE_FORM"
    PARTNER_AGENCY = "PARTNER_AGENCY"


class ReporterType(str, enum.Enum):
    """Type of person reporting the case"""
    ANONYMOUS = "ANONYMOUS"
    VICTIM = "VICTIM"
    PARENT = "PARENT"  # Parent/Guardian
    LEA = "LEA"  # Law Enforcement Agency
    NGO = "NGO"
    CORPORATE = "CORPORATE"
    WHISTLEBLOWER = "WHISTLEBLOWER"


class RiskFlag(str, enum.Enum):
    """Risk flags for case prioritization"""
    CHILD_SAFETY = "CHILD_SAFETY"
    IMMINENT_HARM = "IMMINENT_HARM"
    TRAFFICKING = "TRAFFICKING"
    SEXTORTION = "SEXTORTION"
    FINANCIAL_CRITICAL = "FINANCIAL_CRITICAL"
    HIGH_PROFILE = "HIGH_PROFILE"
    CROSS_BORDER = "CROSS_BORDER"


class SensitivityLevel(str, enum.Enum):
    """Sensitivity classification for ABAC (Attribute-Based Access Control)"""
    NORMAL = "NORMAL"           # Standard role-based access
    RESTRICTED = "RESTRICTED"   # Assignment-only access
    CONFIDENTIAL = "CONFIDENTIAL"  # Named-person access list
    TOP_SECRET = "TOP_SECRET"   # Supervisor approval + named access


class Case(BaseModel):
    __tablename__ = "cases"
    
    case_number = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    case_type = Column(String(100))  # References lookup_values category='case_type'
    description = Column(Text)
    severity = Column(Integer, CheckConstraint("severity >= 1 AND severity <= 5"))
    status = Column(SQLEnum(CaseStatus), default=CaseStatus.OPEN)
    local_or_international = Column(SQLEnum(LocalInternational), nullable=False)
    originating_country = Column(String(2), default="NG")  # ISO country code
    cooperating_countries = Column(ARRAY(String))  # Array of ISO country codes
    mlat_reference = Column(String(100))
    date_reported = Column(DateTime(timezone=True), server_default="now()")
    date_assigned = Column(DateTime(timezone=True))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    lead_investigator = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Intake and Risk Assessment fields
    intake_channel = Column(SQLEnum(IntakeChannel), default=IntakeChannel.WALK_IN)
    risk_flags = Column(ARRAY(String))  # Array of RiskFlag values
    platforms_implicated = Column(ARRAY(String))  # Social media/tech platforms involved
    lga_state_location = Column(String(255))  # LGA / State location in Nigeria
    incident_datetime = Column(DateTime(timezone=True))  # When the incident occurred
    
    # Reporter information
    reporter_type = Column(SQLEnum(ReporterType), default=ReporterType.ANONYMOUS)
    reporter_name = Column(String(255))  # Name of reporter (if not anonymous)
    reporter_contact = Column(JSONB)  # {"phone": "...", "email": "..."}
    
    # Sensitivity Classification (ABAC - Attribute-Based Access Control)
    is_sensitive = Column(Boolean, default=False, index=True)
    sensitivity_level = Column(SQLEnum(SensitivityLevel), default=SensitivityLevel.NORMAL)
    access_restrictions = Column(JSONB, default={})  # {"allowed_users": [...], "allowed_roles": [...], "reason": "..."}
    sensitivity_reason = Column(Text)  # Reason for sensitivity classification
    marked_sensitive_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    marked_sensitive_at = Column(DateTime(timezone=True))
    
    # Relationships
    # case_type is now a simple string field, no relationship needed
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_cases")
    lead_investigator_user = relationship("User", foreign_keys=[lead_investigator], back_populates="assigned_cases")
    assignments = relationship("CaseAssignment", back_populates="case", cascade="all, delete-orphan")
    parties = relationship("Party", back_populates="case", cascade="all, delete-orphan")
    legal_instruments = relationship("LegalInstrument", back_populates="case", cascade="all, delete-orphan")
    seizures = relationship("Seizure", back_populates="case", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="case", cascade="all, delete-orphan")
    actions = relationship("ActionLog", back_populates="case", cascade="all, delete-orphan")
    charges = relationship("Charge", back_populates="case", cascade="all, delete-orphan")
    court_sessions = relationship("CourtSession", back_populates="case", cascade="all, delete-orphan")
    outcomes = relationship("Outcome", back_populates="case", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="case", cascade="all, delete-orphan")
    collaborations = relationship("CaseCollaboration", back_populates="case", cascade="all, delete-orphan")
    forensic_reports = relationship("ForensicReport", back_populates="case", cascade="all, delete-orphan")


class CaseAssignment(BaseModel):
    __tablename__ = "case_assignments"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(SQLEnum(AssignmentRole), nullable=False, primary_key=True)
    assigned_at = Column(DateTime(timezone=True), server_default="now()")
    
    # Relationships
    case = relationship("Case", back_populates="assignments")
    user = relationship("User", back_populates="case_assignments")