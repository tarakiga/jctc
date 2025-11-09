from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Any, Union
from datetime import datetime

class NotificationCreate(BaseModel):
    """Create notification request"""
    recipient_id: str
    type: str = Field(..., description="Notification type: SYSTEM, USER, ALERT, REMINDER")
    category: str = Field(..., description="Category: case_updates, evidence_alerts, deadlines, assignments")
    priority: str = Field(default="MEDIUM", description="Priority: LOW, MEDIUM, HIGH, CRITICAL")
    title: str = Field(..., max_length=255)
    message: str = Field(..., max_length=2000)
    data: Optional[Dict[str, Any]] = {}
    channels: List[str] = Field(default=["push"], description="Delivery channels: email, push, sms")
    scheduled_for: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        valid_priorities = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        if v not in valid_priorities:
            raise ValueError("Invalid priority level")
        return v

    @field_validator('channels')
    @classmethod
    def validate_channels(cls, v):
        valid_channels = {"email", "push", "sms"}
        if not all(channel in valid_channels for channel in v):
            raise ValueError("Invalid delivery channel")
        return v

class NotificationUpdate(BaseModel):
    """Update notification request"""
    is_read: Optional[bool] = None
    priority: Optional[str] = None
    expires_at: Optional[datetime] = None

class NotificationResponse(BaseModel):
    """Notification response"""
    id: str
    recipient_id: str
    sender_id: Optional[str]
    type: str
    category: str
    priority: str
    title: str
    message: str
    data: Dict[str, Any] = {}
    channels: List[str]
    scheduled_for: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_read: bool
    read_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    delivery_status: Dict[str, Any] = {}
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BulkNotificationRequest(BaseModel):
    """Bulk notification request"""
    recipient_ids: List[str] = Field(..., min_items=1, max_items=1000)
    type: str
    category: str
    priority: str = "MEDIUM"
    title: str = Field(..., max_length=255)
    message: str = Field(..., max_length=2000)
    data: Optional[Dict[str, Any]] = {}
    channels: List[str] = ["push"]
    scheduled_for: Optional[datetime] = None
    expires_at: Optional[datetime] = None

class NotificationPreferenceCreate(BaseModel):
    """Create/update notification preferences"""
    email_enabled: bool = True
    push_enabled: bool = True
    sms_enabled: bool = False
    categories: Dict[str, Dict[str, bool]] = {}
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = Field(default="22:00", pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    quiet_hours_end: str = Field(default="08:00", pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    timezone: str = "UTC"
    digest_enabled: bool = False
    digest_frequency: str = Field(default="daily", description="Frequency: daily, weekly")
    digest_time: str = Field(default="09:00", pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    email_address: Optional[str] = None
    phone_number: Optional[str] = None
    push_token: Optional[str] = None

class NotificationPreferenceResponse(BaseModel):
    """Notification preferences response"""
    id: str
    user_id: str
    email_enabled: bool
    push_enabled: bool
    sms_enabled: bool
    categories: Dict[str, Dict[str, bool]]
    quiet_hours_enabled: bool
    quiet_hours_start: str
    quiet_hours_end: str
    timezone: str
    digest_enabled: bool
    digest_frequency: str
    digest_time: str
    email_address: Optional[str] = None
    phone_number: Optional[str] = None
    push_token: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationTemplateCreate(BaseModel):
    """Create notification template"""
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    category: str = Field(..., max_length=50)
    title_template: str = Field(..., max_length=255)
    message_template: str = Field(..., max_length=2000)
    variables: Dict[str, str] = {}  # Variable names and descriptions
    default_channels: List[str] = ["push"]
    default_priority: str = "MEDIUM"
    is_active: bool = True

class NotificationTemplateResponse(BaseModel):
    """Notification template response"""
    id: str
    name: str
    description: Optional[str]
    category: str
    title_template: str
    message_template: str
    variables: Dict[str, str]
    default_channels: List[str]
    default_priority: str
    is_active: bool
    is_system: bool
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationStats(BaseModel):
    """Notification statistics"""
    total_notifications: int
    unread_count: int
    read_count: int
    category_breakdown: Dict[str, int]
    priority_breakdown: Dict[str, int]
    period_days: int

    class Config:
        from_attributes = True

class AlertRule(BaseModel):
    """Alert rule configuration"""
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    event_type: str = Field(..., description="Event type: case_created, deadline_approaching, etc.")
    conditions: Dict[str, Any] = {}
    template_id: Optional[str] = None
    target_roles: List[str] = []
    target_users: List[str] = []
    trigger_delay: int = Field(default=0, description="Delay in minutes")
    recurring: bool = False
    recurring_interval: Optional[str] = None
    is_active: bool = True

class AlertRuleResponse(BaseModel):
    """Alert rule response"""
    id: str
    name: str
    description: Optional[str]
    event_type: str
    conditions: Dict[str, Any]
    template_id: Optional[str]
    target_roles: List[str]
    target_users: List[str]
    trigger_delay: int
    recurring: bool
    recurring_interval: Optional[str]
    is_active: bool
    last_triggered: Optional[datetime]
    trigger_count: int
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationDeliveryStatus(BaseModel):
    """Notification delivery status"""
    notification_id: str
    channel: str
    status: str  # PENDING, SENT, DELIVERED, FAILED, BOUNCED
    recipient_address: str
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationDigestConfig(BaseModel):
    """Notification digest configuration"""
    frequency: str = Field(description="Frequency: daily, weekly")
    time: str = Field(pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    timezone: str = "UTC"
    categories: List[str] = []  # Categories to include in digest
    min_priority: str = "LOW"  # Minimum priority to include

class NotificationDigestResponse(BaseModel):
    """Notification digest response"""
    id: str
    user_id: str
    frequency: str
    period_start: datetime
    period_end: datetime
    notification_count: int
    notification_ids: List[str]
    digest_content: Optional[str]
    is_sent: bool
    sent_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class SystemAlert(BaseModel):
    """System-wide alert"""
    title: str
    message: str
    priority: str = "HIGH"
    category: str = "system"
    target_roles: List[str] = []
    target_all_users: bool = False
    expires_in_hours: Optional[int] = 24
    channels: List[str] = ["push", "email"]

class NotificationChannelConfig(BaseModel):
    """Notification channel configuration"""
    channel: str  # email, sms, push
    enabled: bool = True
    config: Dict[str, Any] = {}  # Channel-specific configuration
    rate_limit: Optional[int] = None  # Max notifications per hour
    retry_attempts: int = 3
    retry_delay_minutes: int = 5

class NotificationMetrics(BaseModel):
    """Notification system metrics"""
    total_notifications_sent: int
    delivery_rate: float  # Percentage of successfully delivered notifications
    open_rate: float  # Percentage of opened notifications (for email/push)
    bounce_rate: float  # Percentage of bounced notifications
    unsubscribe_rate: float  # Percentage of unsubscribed users
    channel_performance: Dict[str, Dict[str, float]]  # Performance by channel
    category_metrics: Dict[str, Dict[str, Any]]  # Metrics by category
    period: str
    last_updated: datetime

    class Config:
        from_attributes = True

class NotificationQueue(BaseModel):
    """Notification queue status"""
    queue_name: str
    pending_notifications: int
    processing_notifications: int
    failed_notifications: int
    last_processed: Optional[datetime]
    average_processing_time_ms: float

    class Config:
        from_attributes = True