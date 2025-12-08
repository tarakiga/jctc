"""LookupValue model for dynamic enum/reference value management."""

from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class LookupValue(BaseModel):
    """Dynamic lookup values for managing enum/reference data through admin UI."""
    __tablename__ = "lookup_values"
    
    # Category groups values (e.g., "case_status", "device_type")
    category = Column(String(100), nullable=False, index=True)
    
    # The actual enum value (e.g., "OPEN", "LAPTOP")
    value = Column(String(100), nullable=False)
    
    # Human-readable display label (e.g., "Open", "Laptop Computer")
    label = Column(String(255), nullable=False)
    
    # Optional description for admin clarity
    description = Column(Text)
    
    # Soft delete - inactive values won't appear in dropdowns
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Display order within category
    sort_order = Column(Integer, default=0)
    
    # System values cannot be deleted (only deactivated)
    is_system = Column(Boolean, default=False, nullable=False)
    
    # Color for UI badges (optional, hex code)
    color = Column(String(7))  # e.g., "#FF5733"
    
    # Icon name (optional, for UI)
    icon = Column(String(50))
    
    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    
    # Unique constraint on category + value
    __table_args__ = (
        UniqueConstraint('category', 'value', name='uq_lookup_category_value'),
    )
    
    def __repr__(self):
        return f"<LookupValue {self.category}:{self.value}>"


# Predefined categories with their descriptions
LOOKUP_CATEGORIES = {
    "case_status": {
        "name": "Case Status",
        "description": "Status values for cases in the system"
    },
    "case_scope": {
        "name": "Case Scope",
        "description": "Whether a case is local or international"
    },
    "intake_channel": {
        "name": "Intake Channel",
        "description": "How cases are reported to the system"
    },
    "reporter_type": {
        "name": "Reporter Type",
        "description": "Classification of who reported the case"
    },
    "risk_flag": {
        "name": "Risk Flags",
        "description": "Risk indicators for case prioritization"
    },
    "party_type": {
        "name": "Party Type",
        "description": "Types of parties involved in cases"
    },
    "evidence_category": {
        "name": "Evidence Category",
        "description": "Classification of evidence items"
    },
    "custody_status": {
        "name": "Custody Status",
        "description": "Status of evidence in chain of custody"
    },
    "custody_action": {
        "name": "Custody Action",
        "description": "Actions in chain of custody workflow"
    },
    "task_status": {
        "name": "Task Status",
        "description": "Status values for case tasks"
    },
    "assignment_role": {
        "name": "Assignment Role",
        "description": "Roles for team member assignments"
    },
    "device_type": {
        "name": "Device Type",
        "description": "Types of seized devices"
    },
    "device_condition": {
        "name": "Device Condition",
        "description": "Physical condition of seized devices"
    },
    "encryption_status": {
        "name": "Encryption Status",
        "description": "Encryption state of devices"
    },
    "imaging_status": {
        "name": "Imaging Status",
        "description": "Status of device forensic imaging"
    },
    "analysis_status": {
        "name": "Analysis Status",
        "description": "Status of forensic analysis"
    },
    "seizure_status": {
        "name": "Seizure Status",
        "description": "Status of asset seizures"
    },
    "warrant_type": {
        "name": "Warrant Type",
        "description": "Types of legal warrants"
    },
    "artefact_type": {
        "name": "Artefact Type",
        "description": "Types of forensic artefacts"
    },
    "legal_instrument_type": {
        "name": "Legal Instrument Type",
        "description": "Types of legal instruments"
    },
    "legal_instrument_status": {
        "name": "Legal Instrument Status",
        "description": "Status of legal instruments"
    },
    "charge_status": {
        "name": "Charge Status",
        "description": "Status of criminal charges"
    },
    "disposition": {
        "name": "Case Disposition",
        "description": "Final outcome of cases"
    },
    "attachment_classification": {
        "name": "Attachment Classification",
        "description": "Security classification of attachments"
    },
    "virus_scan_status": {
        "name": "Virus Scan Status",
        "description": "Status of file virus scanning"
    },
    "collaboration_status": {
        "name": "Collaboration Status",
        "description": "Status of inter-agency collaborations"
    },
    "partner_type": {
        "name": "Partner Type",
        "description": "Types of collaboration partners"
    },
    "case_type": {
        "name": "Case Type",
        "description": "Types of cases (e.g., Fraud, Cybercrime)"
    },
    "case_severity": {
        "name": "Case Severity",
        "description": "Severity levels for cases"
    },
    "platform": {
        "name": "Social Platform",
        "description": "Social media and other platforms implicated"
    },
    "retention_policy": {
        "name": "Retention Policy",
        "description": "Evidence retention policies"
    },
    "storage_location": {
        "name": "Storage Location",
        "description": "Physical or digital locations where evidence is stored"
    },
    "task_priority": {
        "name": "Task Priority",
        "description": "Priority levels for case tasks"
    },
    "issuing_authority": {
        "name": "Issuing Authority",
        "description": "Courts and agencies that issue legal instruments"
    },
    "legal_issuing_authority": {
        "name": "Legal Issuing Authority",
        "description": "Authorities that can issue legal instruments and warrants"
    },
    "source_tool": {
        "name": "Source Tool",
        "description": "Forensic tools used for evidence extraction"
    },
    "prosecution_section": {
        "name": "Prosecution Section",
        "description": "Legal sections and statutes for prosecution"
    },
    "prosecution_status": {
        "name": "Prosecution Status",
        "description": "Status of prosecution proceedings"
    },
    "partner_organization": {
        "name": "Partner Organization",
        "description": "Organizations for inter-agency collaboration"
    }
}
