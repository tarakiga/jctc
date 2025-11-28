from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class AttachmentClassification(str, enum.Enum):
    PUBLIC = "PUBLIC"
    LE_SENSITIVE = "LE_SENSITIVE"  # Law Enforcement Sensitive
    PRIVILEGED = "PRIVILEGED"  # Attorney-client privileged


class VirusScanStatus(str, enum.Enum):
    PENDING = "PENDING"
    CLEAN = "CLEAN"
    INFECTED = "INFECTED"
    FAILED = "FAILED"


class CollaborationStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"


class PartnerType(str, enum.Enum):
    LAW_ENFORCEMENT = "LAW_ENFORCEMENT"
    INTERNATIONAL = "INTERNATIONAL"
    REGULATOR = "REGULATOR"
    ISP = "ISP"
    BANK = "BANK"
    OTHER = "OTHER"


class Attachment(BaseModel):
    """Case attachments with security classification and virus scanning."""
    __tablename__ = "attachments"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)  # Descriptive title
    filename = Column(String(255), nullable=False)  # Original filename
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_type = Column(String(100), nullable=False)  # MIME type (e.g., application/pdf)
    file_path = Column(String(500))  # Storage path (S3, local, etc.)
    download_url = Column(String(1000))  # Pre-signed URL or download endpoint
    
    # Security and integrity
    classification = Column(Enum(AttachmentClassification), nullable=False, default=AttachmentClassification.LE_SENSITIVE)
    sha256_hash = Column(String(64), nullable=False, unique=True)  # SHA-256 hash for integrity
    virus_scan_status = Column(Enum(VirusScanStatus), nullable=False, default=VirusScanStatus.PENDING)
    virus_scan_details = Column(Text)  # Details if infected or scan failed
    
    # Metadata
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)
    notes = Column(Text)  # Additional context about the attachment
    
    # Relationships
    case = relationship("Case", back_populates="attachments")
    uploader = relationship("User")


class CaseCollaboration(BaseModel):
    """Inter-agency collaboration tracking (LEAs, regulators, ISPs, banks, etc.)."""
    __tablename__ = "case_collaborations"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Partner organization details
    partner_org = Column(String(255), nullable=False)  # Organization code/name (FBI, EFCC, MTN, etc.)
    partner_type = Column(Enum(PartnerType), nullable=False)  # Type of partner
    
    # Contact information
    contact_person = Column(String(255), nullable=False)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    
    # Collaboration details
    reference_no = Column(String(100))  # Partner's reference/case number
    scope = Column(Text, nullable=False)  # What assistance is being requested/provided
    mou_reference = Column(String(255))  # Reference to governing MoU or framework agreement
    
    # Status tracking
    status = Column(Enum(CollaborationStatus), nullable=False, default=CollaborationStatus.INITIATED)
    initiated_at = Column(DateTime(timezone=True), server_default="now()", nullable=False)
    completed_at = Column(DateTime(timezone=True))  # When collaboration was completed
    
    # Additional notes
    notes = Column(Text)  # Coordination notes, meeting schedules, etc.
    
    # Relationships
    case = relationship("Case", back_populates="collaborations")
