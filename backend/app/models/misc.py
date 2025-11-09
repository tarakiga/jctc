from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Attachment(BaseModel):
    __tablename__ = "attachments"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255))
    file_path = Column(String(500))
    sha256 = Column(String(64))
    file_size = Column(String(20))  # Store file size
    mime_type = Column(String(100))
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    uploaded_at = Column(DateTime(timezone=True), server_default="now()")
    
    # Relationships
    case = relationship("Case", back_populates="attachments")
    uploader = relationship("User")


class CaseCollaboration(BaseModel):
    __tablename__ = "case_collaborations"
    
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True)
    partner_org = Column(String(255), primary_key=True)  # EFCC, INTERPOL, ISP name, etc.
    contact = Column(String(255))
    reference_no = Column(String(100))
    scope = Column(Text)  # Description of collaboration scope
    
    # Relationships
    case = relationship("Case", back_populates="collaborations")