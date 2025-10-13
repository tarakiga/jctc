from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean, CheckConstraint, Enum as SQLEnum, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.user import User, LookupCaseType
import enum
import uuid


class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    SUSPENDED = "SUSPENDED"
    PROSECUTION = "PROSECUTION"
    CLOSED = "CLOSED"


class LocalInternational(str, enum.Enum):
    LOCAL = "LOCAL"
    INTERNATIONAL = "INTERNATIONAL"


class AssignmentRole(str, enum.Enum):
    LEAD = "LEAD"
    SUPPORT = "SUPPORT"
    PROSECUTOR = "PROSECUTOR"
    LIAISON = "LIAISON"


class Case(BaseModel):
    __tablename__ = "cases"
    
    case_number = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    case_type_id = Column(UUID(as_uuid=True), ForeignKey("lookup_case_type.id"))
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
    
    # Relationships
    case_type = relationship("LookupCaseType", back_populates="cases")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_cases")
    lead_investigator_user = relationship("User", foreign_keys=[lead_investigator], back_populates="assigned_cases")
    assignments = relationship("CaseAssignment", back_populates="case", cascade="all, delete-orphan")
    parties = relationship("Party", back_populates="case", cascade="all, delete-orphan")
    legal_instruments = relationship("LegalInstrument", back_populates="case", cascade="all, delete-orphan")
    seizures = relationship("Seizure", back_populates="case", cascade="all, delete-orphan")
    evidence_items = relationship("EvidenceItem", back_populates="case", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="case", cascade="all, delete-orphan")
    actions = relationship("ActionLog", back_populates="case", cascade="all, delete-orphan")
    charges = relationship("Charge", back_populates="case", cascade="all, delete-orphan")
    court_sessions = relationship("CourtSession", back_populates="case", cascade="all, delete-orphan")
    outcomes = relationship("Outcome", back_populates="case", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="case", cascade="all, delete-orphan")
    collaborations = relationship("CaseCollaboration", back_populates="case", cascade="all, delete-orphan")


class CaseAssignment(BaseModel):
    __tablename__ = "case_assignments"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(SQLEnum(AssignmentRole), nullable=False, primary_key=True)
    assigned_at = Column(DateTime(timezone=True), server_default="now()")
    
    # Relationships
    case = relationship("Case", back_populates="assignments")
    user = relationship("User", back_populates="case_assignments")