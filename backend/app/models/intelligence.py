import enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.models.base import BaseModel

# --- Enums ---

class IntelCategory(str, enum.Enum):
    HUMINT = "HUMINT"       # Human Intelligence
    SIGINT = "SIGINT"       # Signals Intelligence
    OSINT = "OSINT"         # Open Source Intelligence
    CYBINT = "CYBINT"       # Cyber Intelligence
    FININT = "FININT"       # Financial Intelligence
    OTHER = "OTHER"

class IntelPriority(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class IntelStatus(str, enum.Enum):
    RAW = "RAW"             # Unverified
    EVALUATED = "EVALUATED" # Under evaluation
    CONFIRMED = "CONFIRMED" # Verified
    ACTIONABLE = "ACTIONABLE"
    ARCHIVED = "ARCHIVED"

# --- Models ---

class IntelligenceRecord(BaseModel):
    __tablename__ = "intelligence_records"

    # Base model provides: id, created_at, updated_at

    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    
    category = Column(Enum(IntelCategory), default=IntelCategory.OTHER, nullable=False)
    priority = Column(Enum(IntelPriority), default=IntelPriority.MEDIUM, nullable=False)
    status = Column(Enum(IntelStatus), default=IntelStatus.RAW, nullable=False)
    
    is_confidential = Column(Boolean, default=False)
    
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    author = relationship("User", backref="intel_records")
    attachments = relationship("IntelligenceAttachment", back_populates="record", cascade="all, delete-orphan")
    tags = relationship("IntelligenceTag", back_populates="record", cascade="all, delete-orphan")
    case_links = relationship("IntelligenceCaseLink", back_populates="record", cascade="all, delete-orphan")


class IntelligenceAttachment(BaseModel):
    __tablename__ = "intelligence_attachments"

    # Base model provides: id, created_at, updated_at

    record_id = Column(UUID(as_uuid=True), ForeignKey("intelligence_records.id", ondelete="CASCADE"), nullable=False)
    
    file_name = Column(String, nullable=False)
    file_size = Column(String, nullable=True) # e.g. "2.4 MB"
    file_type = Column(String, nullable=True) # MIME type
    s3_key = Column(String, nullable=True)
    
    # Uploaded At is essentially created_at, but we can keep explicit if needed. 
    # BaseModel created_at covers it.
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    record = relationship("IntelligenceRecord", back_populates="attachments")


class IntelligenceTag(BaseModel):
    __tablename__ = "intelligence_tags"

    # Base model provides: id, created_at, updated_at

    record_id = Column(UUID(as_uuid=True), ForeignKey("intelligence_records.id", ondelete="CASCADE"), nullable=False)
    tag = Column(String, index=True, nullable=False)
    
    # Relationships
    record = relationship("IntelligenceRecord", back_populates="tags")


class IntelligenceCaseLink(BaseModel):
    __tablename__ = "intelligence_case_links"

    # Base model provides: id, created_at, updated_at

    record_id = Column(UUID(as_uuid=True), ForeignKey("intelligence_records.id", ondelete="CASCADE"), nullable=False)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    
    # created_at covered by BaseModel
    
    # Relationships
    record = relationship("IntelligenceRecord", back_populates="case_links")
    case = relationship("Case", backref="linked_intelligence")
