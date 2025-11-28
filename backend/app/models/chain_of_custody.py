from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.models.base import BaseModel
from app.models.evidence import CustodyAction


class ChainOfCustodyEntry(BaseModel):
    __tablename__ = "chain_of_custody_entries"
    
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False)
    action = Column(SQLEnum(CustodyAction), nullable=False)
    custodian_from = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    custodian_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    location_from = Column(String(255))
    location_to = Column(String(255))
    purpose = Column(String(500), nullable=False)
    notes = Column(Text)
    signature_path = Column(String(500))
    signature_verified = Column(Boolean, default=False)
    requires_approval = Column(Boolean, default=False)
    approval_status = Column(String(20), default="PENDING")  # PENDING, APPROVED, REJECTED
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    approval_timestamp = Column(DateTime(timezone=True))
    timestamp = Column(DateTime(timezone=True), server_default="now()")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default="now()")
    
    # Relationships
    evidence = relationship("EvidenceItem", backref="custody_entries")
    from_custodian = relationship("User", foreign_keys=[custodian_from])
    to_custodian = relationship("User", foreign_keys=[custodian_to])
    approver = relationship("User", foreign_keys=[approved_by])
    creator = relationship("User", foreign_keys=[created_by])