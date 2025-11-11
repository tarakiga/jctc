from sqlalchemy import Column, String, Boolean, Integer, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class UserRole(str, enum.Enum):
    INTAKE = "INTAKE"
    INVESTIGATOR = "INVESTIGATOR"
    FORENSIC = "FORENSIC"
    PROSECUTOR = "PROSECUTOR"
    LIAISON = "LIAISON"
    SUPERVISOR = "SUPERVISOR"
    ADMIN = "ADMIN"


class User(BaseModel):
    __tablename__ = "users"
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    org_unit = Column(String(255))  # e.g., JCTC HQ, Zonal Command
    is_active = Column(Boolean, default=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Relationships
    created_cases = relationship("Case", foreign_keys="Case.created_by", back_populates="creator")
    assigned_cases = relationship("Case", foreign_keys="Case.lead_investigator", back_populates="lead_investigator_user")
    case_assignments = relationship("CaseAssignment", back_populates="user")
    tasks = relationship("Task", back_populates="assignee")
    actions = relationship("ActionLog", back_populates="user")

    # Audit and compliance relationships (reverse mappings)
    # These align with back_populates defined in audit models
    audit_logs = relationship("AuditLog", back_populates="user")
    compliance_reports = relationship("ComplianceReport", back_populates="creator")
    retention_policies = relationship("RetentionPolicy", back_populates="creator")
    resolved_violations = relationship("ComplianceViolation", back_populates="resolver")
    audit_configurations = relationship("AuditConfiguration", back_populates="creator")
    retention_jobs = relationship("DataRetentionJob", back_populates="creator")
    audit_archives = relationship("AuditArchive", back_populates="creator")


class LookupCaseType(BaseModel):
    __tablename__ = "lookup_case_type"
    
    code = Column(String(100), unique=True, nullable=False)
    label = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Relationships
    cases = relationship("Case", back_populates="case_type")