from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

from app.database import Base

class Notification(Base):
    """Notification model for system alerts and messages"""
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, index=True)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    
    # Notification content
    type = Column(String(50), nullable=False)  # SYSTEM, USER, ALERT, REMINDER
    category = Column(String(50), nullable=False)  # case_updates, evidence_alerts, deadlines, assignments
    priority = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, default=dict)  # Additional data payload
    
    # Delivery configuration
    channels = Column(JSON, default=list)  # ["email", "push", "sms"]
    scheduled_for = Column(DateTime, nullable=True)  # For scheduled notifications
    expires_at = Column(DateTime, nullable=True)  # Notification expiration
    
    # Status tracking
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    delivery_status = Column(JSON, default=dict)  # Status per channel
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_notifications")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_notifications")

class NotificationPreference(Base):
    """User notification preferences"""
    __tablename__ = "notification_preferences"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Global channel preferences
    email_enabled = Column(Boolean, default=True)
    push_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    
    # Category-specific preferences
    categories = Column(JSON, default=dict)  # {"category": {"email": True, "push": False, ...}}
    
    # Quiet hours
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5), default="22:00")  # HH:MM format
    quiet_hours_end = Column(String(5), default="08:00")    # HH:MM format
    timezone = Column(String(50), default="UTC")
    
    # Frequency settings
    digest_enabled = Column(Boolean, default=False)
    digest_frequency = Column(String(20), default="daily")  # daily, weekly
    digest_time = Column(String(5), default="09:00")
    
    # Contact information
    email_address = Column(String(255), nullable=True)
    phone_number = Column(String(20), nullable=True)
    push_token = Column(String(255), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")

class NotificationTemplate(Base):
    """Notification template for consistent messaging"""
    __tablename__ = "notification_templates"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True)
    
    # Template content
    title_template = Column(String(255), nullable=False)
    message_template = Column(Text, nullable=False)
    variables = Column(JSON, default=dict)  # Template variables and their descriptions
    
    # Default settings
    default_channels = Column(JSON, default=list)
    default_priority = Column(String(20), default="MEDIUM")
    
    # Configuration
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)  # System templates can't be deleted
    
    # Metadata
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])

class NotificationRule(Base):
    """Automated notification rules"""
    __tablename__ = "notification_rules"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Rule configuration
    event_type = Column(String(50), nullable=False)  # case_created, deadline_approaching, etc.
    conditions = Column(JSON, default=dict)  # Rule conditions
    template_id = Column(String, ForeignKey("notification_templates.id"), nullable=True)
    
    # Target configuration
    target_roles = Column(JSON, default=list)  # Roles to notify
    target_users = Column(JSON, default=list)  # Specific users to notify
    
    # Timing
    trigger_delay = Column(Integer, default=0)  # Minutes to delay notification
    recurring = Column(Boolean, default=False)
    recurring_interval = Column(String(20), nullable=True)  # daily, weekly, monthly
    
    # Status
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime, nullable=True)
    trigger_count = Column(Integer, default=0)
    
    # Metadata
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    template = relationship("NotificationTemplate", foreign_keys=[template_id])
    creator = relationship("User", foreign_keys=[created_by])

class NotificationLog(Base):
    """Log of notification delivery attempts"""
    __tablename__ = "notification_logs"
    
    id = Column(String, primary_key=True, index=True)
    notification_id = Column(String, ForeignKey("notifications.id"), nullable=False, index=True)
    
    # Delivery details
    channel = Column(String(20), nullable=False)  # email, push, sms
    recipient_address = Column(String(255), nullable=False)  # email address, phone, device token
    
    # Status
    status = Column(String(20), nullable=False)  # PENDING, SENT, DELIVERED, FAILED, BOUNCED
    error_message = Column(Text, nullable=True)
    external_id = Column(String(255), nullable=True)  # External service message ID
    
    # Timing
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)  # For emails/push notifications
    clicked_at = Column(DateTime, nullable=True)  # If notification has links
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    notification = relationship("Notification", back_populates="delivery_logs")

class NotificationDigest(Base):
    """Notification digest tracking"""
    __tablename__ = "notification_digests"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Digest configuration
    frequency = Column(String(20), nullable=False)  # daily, weekly
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Content
    notification_count = Column(Integer, default=0)
    notification_ids = Column(JSON, default=list)
    digest_content = Column(Text, nullable=True)
    
    # Status
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])

# Add relationship back references to User model
# This would typically be added to the User model in app/models/user.py
"""
# Add these to User model:

# Notification relationships
received_notifications = relationship("Notification", foreign_keys="Notification.recipient_id", back_populates="recipient")
sent_notifications = relationship("Notification", foreign_keys="Notification.sender_id", back_populates="sender")
notification_preferences = relationship("NotificationPreference", uselist=False, back_populates="user")
"""