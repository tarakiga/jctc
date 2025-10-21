from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class ChargeStatus(str, enum.Enum):
    FILED = "FILED"
    WITHDRAWN = "WITHDRAWN"
    AMENDED = "AMENDED"


class Disposition(str, enum.Enum):
    CONVICTED = "CONVICTED"
    ACQUITTED = "ACQUITTED"
    PLEA = "PLEA"
    DISMISSED = "DISMISSED"


class Charge(BaseModel):
    __tablename__ = "charges"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    statute = Column(String(255))  # e.g., Cybercrimes Act s.38, TIPPEA sections
    description = Column(Text)
    filed_at = Column(DateTime(timezone=True))
    status = Column(SQLEnum(ChargeStatus))  # FILED, WITHDRAWN, AMENDED
    
    # Relationships
    case = relationship("Case", back_populates="charges")


class CourtSession(BaseModel):
    __tablename__ = "court_sessions"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    session_date = Column(DateTime(timezone=True))
    court = Column(String(255))
    judge = Column(String(255))
    session_type = Column(String(100))  # hearing, trial, sentencing, etc.
    notes = Column(Text)
    
    # Relationships
    case = relationship("Case", back_populates="court_sessions")


class Outcome(BaseModel):
    __tablename__ = "outcomes"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    disposition = Column(SQLEnum(Disposition))  # CONVICTED, ACQUITTED, PLEA, DISMISSED
    sentence = Column(Text)
    restitution = Column(Numeric(14, 2))
    closed_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    
    # Relationships
    case = relationship("Case", back_populates="outcomes")