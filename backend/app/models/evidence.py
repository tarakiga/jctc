from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class EvidenceCategory(str, enum.Enum):
    DIGITAL = "DIGITAL"
    PHYSICAL = "PHYSICAL"


class CustodyStatus(str, enum.Enum):
    IN_VAULT = "IN_VAULT"
    RELEASED = "RELEASED"
    RETURNED = "RETURNED"
    DISPOSED = "DISPOSED"


class CustodyAction(str, enum.Enum):
    SEIZED = "SEIZED"
    TRANSFERRED = "TRANSFERRED"
    ANALYZED = "ANALYZED"
    PRESENTED_COURT = "PRESENTED_COURT"
    RETURNED = "RETURNED"
    DISPOSED = "DISPOSED"


class ArtefactType(str, enum.Enum):
    CHAT_LOG = "CHAT_LOG"
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    DOC = "DOC"
    BROWSER_HISTORY = "BROWSER_HISTORY"
    EMAIL = "EMAIL"
    CALL_LOG = "CALL_LOG"
    SMS = "SMS"
    OTHER = "OTHER"


class ImagingStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    VERIFIED = "VERIFIED"


class DeviceType(str, enum.Enum):
    LAPTOP = "LAPTOP"
    DESKTOP = "DESKTOP"
    MOBILE_PHONE = "MOBILE_PHONE"
    TABLET = "TABLET"
    EXTERNAL_STORAGE = "EXTERNAL_STORAGE"
    USB_DRIVE = "USB_DRIVE"
    MEMORY_CARD = "MEMORY_CARD"
    SERVER = "SERVER"
    NETWORK_DEVICE = "NETWORK_DEVICE"
    OTHER = "OTHER"


class WarrantType(str, enum.Enum):
    SEARCH_WARRANT = "SEARCH_WARRANT"
    PRODUCTION_ORDER = "PRODUCTION_ORDER"
    COURT_ORDER = "COURT_ORDER"
    SEIZURE_ORDER = "SEIZURE_ORDER"


class SeizureStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    DISPUTED = "DISPUTED"
    RETURNED = "RETURNED"


class DeviceCondition(str, enum.Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"
    DAMAGED = "DAMAGED"


class EncryptionStatus(str, enum.Enum):
    NONE = "NONE"
    ENCRYPTED = "ENCRYPTED"
    BITLOCKER = "BITLOCKER"
    FILEVAULT = "FILEVAULT"
    PARTIAL = "PARTIAL"
    UNKNOWN = "UNKNOWN"


class AnalysisStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    ANALYZED = "ANALYZED"
    BLOCKED = "BLOCKED"


class Seizure(BaseModel):
    __tablename__ = "seizures"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    seized_at = Column(DateTime(timezone=True))
    location = Column(Text)
    officer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    notes = Column(Text)
    
    # NEW: Link to authorizing legal instrument (e.g., warrant)
    legal_instrument_id = Column(UUID(as_uuid=True), ForeignKey("legal_instruments.id"), nullable=True)
    
    # DEPRECATED: Warrant fields (kept for backward compatibility, use legal_instrument_id instead)
    warrant_number = Column(String(100))  # Deprecated: Use legal_instrument.reference_no
    warrant_type = Column(SQLEnum(WarrantType))  # Deprecated: Use legal_instrument.type
    issuing_authority = Column(String(255))  # Deprecated: Use legal_instrument.issuing_authority
    
    # Seizure details
    description = Column(Text)
    items_count = Column(Integer)  # Note: This should be computed from Evidence count
    status = Column(SQLEnum(SeizureStatus), default=SeizureStatus.COMPLETED)
    
    # Documentation
    witnesses = Column(JSONB)  # Array of witness names/details
    photos = Column(JSONB)  # Array of photo metadata {id, url, filename}
    
    # Relationships
    case = relationship("Case", back_populates="seizures")
    officer = relationship("User")
    devices = relationship("Evidence", back_populates="seizure", cascade="all, delete-orphan")
    legal_instrument = relationship("LegalInstrument", backref="seizures")



# Consolidated Evidence Model (Replacing Device and EvidenceItem)
class Evidence(BaseModel):
    __tablename__ = "devices"  # Keep original table name - migration would be needed to rename
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"))
    seizure_id = Column(UUID(as_uuid=True), ForeignKey("seizures.id", ondelete="CASCADE"), nullable=True) # Made nullable as not all evidence comes from seizure immediately
    
    # Core Fields
    label = Column(String(255))
    category = Column(String(50), default='PHYSICAL') # Changed from SQLEnum to String for compatibility
    evidence_type = Column(String(50)) # Changed from SQLEnum to String for compatibility - maps to Lookup
    # Note: For now keeping DB Enum, frontend will use Lookup to populate.
    
    # Identifiers
    make = Column(String(100))
    model = Column(String(100))
    serial_no = Column(String(100))
    imei = Column(String(20))
    
    # Physical characteristics
    storage_capacity = Column(String(100))
    operating_system = Column(String(100))
    condition = Column(String(50))  # Changed from SQLEnum for frontend compatibility
    description = Column(Text)
    
    # State
    powered_on = Column(Boolean, default=False)
    password_protected = Column(Boolean, default=False)
    encryption_status = Column(String(50), default='UNKNOWN')  # Changed from SQLEnum for frontend compatibility
    
    # Imaging/Forensics
    imaged = Column(Boolean, default=False)
    imaging_status = Column(String(50), default='NOT_STARTED')  # Changed from SQLEnum for frontend compatibility
    imaging_started_at = Column(DateTime(timezone=True))
    imaging_completed_at = Column(DateTime(timezone=True))
    imaging_tool = Column(String(100))
    image_file_path = Column(String(500))
    image_hash = Column(String(64))
    image_size_bytes = Column(String(50))
    imaging_technician_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Storage & Chain of Custody
    custody_status = Column(String(50), default='IN_VAULT')  # Changed from SQLEnum for frontend compatibility
    storage_location = Column(String(500)) # Merged from EvidenceItem (was current_location in Device)
    retention_policy = Column(String(100)) # From EvidenceItem
    
    notes = Column(Text)
    forensic_notes = Column(Text)
    
    # File Collection (From EvidenceItem)
    collected_at = Column(DateTime(timezone=True))
    collected_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    # file_path is replaced by Artefacts or we keep it for simple uploads?
    # User said "maintain all fields". EvidenceItem had file_path.
    file_path = Column(String(500)) 
    file_size = Column(Integer)
    sha256 = Column(String(64)) # From EvidenceItem
    
    # Relationships
    case = relationship("Case", foreign_keys=[case_id])
    seizure = relationship("Seizure", back_populates="devices") # Keeping relationship name for compatibility or rename? Seizure.devices points here.
    imaging_technician = relationship("User", foreign_keys=[imaging_technician_id])
    collector = relationship("User", foreign_keys=[collected_by])
    artefacts = relationship("Artefact", back_populates="evidence", cascade="all, delete-orphan")
    chain_entries = relationship("ChainOfCustody", back_populates="evidence", cascade="all, delete-orphan")


# Alias for backward compatibility if needed, but we are deleting the old EvidenceItem
# Device class is now Evidence
Device = Evidence

# Update related models to point to 'evidence'
class Artefact(BaseModel):
    __tablename__ = "artefacts"
    
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False) # FK points to 'devices' table
    artefact_type = Column(SQLEnum(ArtefactType))
    source_tool = Column(String(100))
    description = Column(Text)
    file_path = Column(String(500))
    sha256 = Column(String(64))
    
    # Relationships
    evidence = relationship("Evidence", back_populates="artefacts")
    # Removed duplicate relationship - 'evidence' already provides access


class ChainOfCustody(BaseModel):
    __tablename__ = "chain_of_custody"
    
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    action = Column(SQLEnum(CustodyAction), nullable=False)
    from_user = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    to_user = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    timestamp = Column(DateTime(timezone=True), server_default="now()")
    location = Column(String(255))
    details = Column(Text)
    
    # Relationships
    evidence = relationship("Evidence", back_populates="chain_entries")
    from_user_obj = relationship("User", foreign_keys=[from_user])
    to_user_obj = relationship("User", foreign_keys=[to_user])
