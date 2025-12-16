"""Email system models"""
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.models.base import Base
import uuid


class EmailSettings(Base):
    """Email/SMTP configuration settings"""
    __tablename__ = "email_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String(50), nullable=False, comment="microsoft, gmail, zoho, smtp")
    
    # SMTP Configuration
    smtp_host = Column(String(255), nullable=False)
    smtp_port = Column(Integer, nullable=False, default=587)
    smtp_use_tls = Column(Boolean, nullable=False, default=True)
    smtp_use_ssl = Column(Boolean, nullable=False, default=False)
    
    # Authentication
    smtp_username = Column(String(255), nullable=False)
    smtp_password_encrypted = Column(Text, nullable=False, comment="Encrypted SMTP password")
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255), nullable=False, default="JCTC System")
    reply_to_email = Column(String(255), nullable=True)
    
    # Testing & Status
    is_active = Column(Boolean, nullable=False, default=False)
    test_email = Column(String(255), nullable=True)
    last_test_sent_at = Column(DateTime(timezone=True), nullable=True)
    last_test_status = Column(String(50), nullable=True, comment="success, failed")
    last_test_error = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)


class EmailTemplate(Base):
    """Email templates for system notifications"""
    __tablename__ = "email_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_key = Column(String(100), unique=True, nullable=False, comment="user_invite, password_reset, etc.")
    subject = Column(String(255), nullable=False)
    body_html = Column(Text, nullable=False)
    body_plain = Column(Text, nullable=True)
    variables = Column(JSONB, nullable=True, comment="List of allowed template variables")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
