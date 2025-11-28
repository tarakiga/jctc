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
    
    # Warrant and legal information
    warrant_number = Column(String(100))
    warrant_type = Column(SQLEnum(WarrantType))
    issuing_authority = Column(String(255))
    
    # Seizure details
    description = Column(Text)
    items_count = Column(Integer)
    status = Column(SQLEnum(SeizureStatus), default=SeizureStatus.COMPLETED)
    
    # Documentation
    witnesses = Column(JSONB)  # Array of witness names/details
    photos = Column(JSONB)  # Array of photo metadata {id, url, filename}
    
    # Relationships
    case = relationship("Case", back_populates="seizures")
    officer = relationship("User")
    devices = relationship("Device", back_populates="seizure", cascade="all, delete-orphan")


class Device(BaseModel):
    __tablename__ = "devices"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"))  # Direct case reference
    seizure_id = Column(UUID(as_uuid=True), ForeignKey("seizures.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(255))
    device_type = Column(SQLEnum(DeviceType), default=DeviceType.OTHER)
    make = Column(String(100))
    model = Column(String(100))
    serial_no = Column(String(100))
    imei = Column(String(20))
    
    # Physical device characteristics
    storage_capacity = Column(String(100))  # e.g., "512GB SSD", "256GB"
    operating_system = Column(String(100))  # e.g., "Windows 11 Pro", "iOS 17.2"
    condition = Column(SQLEnum(DeviceCondition))
    description = Column(Text)  # General description of device and seizure context
    
    # Security and state at seizure
    powered_on = Column(Boolean, default=False)
    password_protected = Column(Boolean, default=False)
    encryption_status = Column(SQLEnum(EncryptionStatus), default=EncryptionStatus.UNKNOWN)
    
    # Imaging and forensic fields
    imaged = Column(Boolean, default=False)
    imaging_status = Column(SQLEnum(ImagingStatus), default=ImagingStatus.NOT_STARTED)
    imaging_started_at = Column(DateTime(timezone=True))
    imaging_completed_at = Column(DateTime(timezone=True))
    imaging_tool = Column(String(100))  # XRY, Cellebrite, FTK, etc.
    image_file_path = Column(String(500))
    image_hash = Column(String(64))  # SHA-256 hash of the image
    image_size_bytes = Column(String(50))
    imaging_technician_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Analysis
    status = Column(SQLEnum(AnalysisStatus), default=AnalysisStatus.PENDING)
    forensic_notes = Column(Text)  # Detailed forensic analysis notes
    
    # Device status and custody
    custody_status = Column(SQLEnum(CustodyStatus), default=CustodyStatus.IN_VAULT)
    current_location = Column(String(255))
    analysis_notes = Column(Text)  # Deprecated - use forensic_notes
    notes = Column(Text)  # General notes
    
    # Relationships
    case = relationship("Case", foreign_keys=[case_id])
    seizure = relationship("Seizure", back_populates="devices")
    imaging_technician = relationship("User", foreign_keys=[imaging_technician_id])
    artefacts = relationship("Artefact", back_populates="device", cascade="all, delete-orphan")


class Artefact(BaseModel):
    __tablename__ = "artefacts"
    
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    artefact_type = Column(SQLEnum(ArtefactType))
    source_tool = Column(String(100))  # XRY, XAMN, FTK, AUTOPSY, etc.
    description = Column(Text)
    file_path = Column(String(500))
    sha256 = Column(String(64))
    
    # Relationships
    device = relationship("Device", back_populates="artefacts")


class EvidenceItem(BaseModel):
    __tablename__ = "evidence_items"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(255))
    category = Column(SQLEnum(EvidenceCategory))
    storage_location = Column(String(500))  # Vault shelf, digital vault path
    sha256 = Column(String(64))
    retention_policy = Column(String(100))  # e.g., 7y after closure
    notes = Column(Text)
    
    # Relationships
    case = relationship("Case", back_populates="evidence_items")
    chain_entries = relationship("ChainOfCustody", back_populates="evidence", cascade="all, delete-orphan")


class ChainOfCustody(BaseModel):
    __tablename__ = "chain_of_custody"
    
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False)
    action = Column(SQLEnum(CustodyAction), nullable=False)
    from_user = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    to_user = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    timestamp = Column(DateTime(timezone=True), server_default="now()")
    location = Column(String(255))
    details = Column(Text)
    
    # Relationships
    evidence = relationship("EvidenceItem", back_populates="chain_entries")
    from_user_obj = relationship("User", foreign_keys=[from_user])
    to_user_obj = relationship("User", foreign_keys=[to_user])