from sqlalchemy import Column, String, Date, Text, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
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
    contact = Column(JSONB)  # Store contact info as JSON {phone, email, address}
    notes = Column(Text)
    
    # Reporter flag - indicates this party is the case reporter
    is_reporter = Column(Boolean, default=False, nullable=False)
    
    # Seizure link - for witnesses to a specific seizure event
    seizure_id = Column(UUID(as_uuid=True), ForeignKey("seizures.id", ondelete="SET NULL"), nullable=True)
    
    # Guardian contact for minors (victims under 18)
    guardian_contact = Column(JSONB)  # {name, phone, email, relationship}
    
    # Safeguarding flags for victims
    safeguarding_flags = Column(ARRAY(String))  # ['medical', 'shelter', 'counselling', 'legal-aid']
    
    # Relationships
    case = relationship("Case", back_populates="parties")
    seizure = relationship("Seizure", backref="witness_parties")