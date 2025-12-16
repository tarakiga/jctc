from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ForensicReport(BaseModel):
    __tablename__ = "forensic_reports"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"))  # Optional - which device the report is for
    report_type = Column(String(100))  # e.g., "EXTRACTION", "ANALYSIS", "TIMELINE"
    tool_name = Column(String(255))  # e.g., "Cellebrite UFED", "Magnet AXIOM"
    tool_version = Column(String(100))  # Tool version for chain of custody
    tool_binary_hash = Column(String(64))  # SHA-256 hash of the tool binary
    file_name = Column(String(500))  # Original file name
    file_size = Column(BigInteger)  # File size in bytes
    file_hash = Column(String(64))  # SHA-256 hash of the report file
    generated_at = Column(DateTime(timezone=True))  # When the report was generated
    generated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))  # Who generated it
    notes = Column(Text)  # Additional notes about the report
    
    # Relationships
    case = relationship("Case", back_populates="forensic_reports")
    generator = relationship("User", foreign_keys=[generated_by])
