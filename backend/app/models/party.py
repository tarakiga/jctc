from sqlalchemy import Column, String, Date, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class PartyType(str, enum.Enum):
    SUSPECT = "SUSPECT"
    VICTIM = "VICTIM"
    WITNESS = "WITNESS"
    COMPLAINANT = "COMPLAINANT"


class Party(BaseModel):
    __tablename__ = "parties"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    party_type = Column(SQLEnum(PartyType), nullable=False)
    full_name = Column(String(255))
    alias = Column(String(255))
    national_id = Column(String(50))
    dob = Column(Date)
    nationality = Column(String(2))  # ISO country code
    gender = Column(String(20))
    contact = Column(JSONB)  # Store contact info as JSON
    notes = Column(Text)
    
    # Relationships
    case = relationship("Case", back_populates="parties")