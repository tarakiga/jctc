from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class LegalInstrumentType(str, enum.Enum):
    WARRANT = "WARRANT"
    PRESERVATION = "PRESERVATION"
    MLAT = "MLAT"
    COURT_ORDER = "COURT_ORDER"


class LegalInstrumentStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    ISSUED = "ISSUED"
    DENIED = "DENIED"
    EXPIRED = "EXPIRED"
    EXECUTED = "EXECUTED"


class LegalInstrument(BaseModel):
    __tablename__ = "legal_instruments"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    type = Column(SQLEnum(LegalInstrumentType), nullable=False)
    reference_no = Column(String(100))
    issuing_authority = Column(String(255))
    issued_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    status = Column(SQLEnum(LegalInstrumentStatus))
    document_hash = Column(String(64))  # SHA-256 hash
    file_path = Column(String(500))
    notes = Column(Text)
    
    # Relationships
    case = relationship("Case", back_populates="legal_instruments")