from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, Float, Index, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
import uuid

from ..models.base import BaseModel

class MobileDeviceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    REVOKED = "revoked"

class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"

class SyncStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class MobileDevice(BaseModel):
    """Model for mobile device registration and tracking"""
    __tablename__ = "mobile_devices"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    
    # Device identification
    device_id = Column(String(255), unique=True, nullable=False, index=True)
    device_name = Column(String(100))
    device_type = Column(String(20), nullable=False)  # ios, android, web, tablet
    device_model = Column(String(100))
    os_version = Column(String(50))
    app_version = Column(String(20))
    
    # Device capabilities
    screen_resolution = Column(String(20))
    supports_push = Column(Boolean, default=True)
    supports_offline = Column(Boolean, default=True)
    supports_biometrics = Column(Boolean, default=False)
    max_storage_mb = Column(Integer, default=100)
    
    # Network and location
    network_type = Column(String(20))  # wifi, cellular, unknown
    timezone = Column(String(50), default="UTC")
    locale = Column(String(10), default="en")
    last_known_location = Column(JSON)  # lat, lng, accuracy, timestamp
    
    # Registration and status
    status = Column(String(20), default=MobileDeviceStatus.ACTIVE)
    registered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_sync_at = Column(DateTime)
    
    # Security and permissions
    is_trusted = Column(Boolean, default=False)
    permissions = Column(JSON, default=list)  # List of granted permissions
    security_flags = Column(JSON, default=dict)  # Security-related flags
    
    # Performance and usage
    total_api_calls = Column(Integer, default=0)
    total_data_transferred = Column(Integer, default=0)  # Bytes
    average_response_time = Column(Float, default=0.0)  # Milliseconds
    
    # Metadata
    metadata = Column(JSON, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="mobile_devices")
    push_tokens = relationship("MobilePushToken", back_populates="device", cascade="all, delete-orphan")
    sync_sessions = relationship("MobileSyncSession", back_populates="device", cascade="all, delete-orphan")
    notifications = relationship("MobileNotification", back_populates="device", cascade="all, delete-orphan")
    performance_logs = relationship("MobilePerformanceLog", back_populates="device", cascade="all, delete-orphan")
    
    # Indexes for common queries
    __table_args__ = (
        Index('ix_mobile_devices_user_status', 'user_id', 'status'),
        Index('ix_mobile_devices_last_seen', 'last_seen_at'),
        Index('ix_mobile_devices_device_type', 'device_type'),
    )
    
    def update_last_seen(self):
        """Update last seen timestamp"""
        self.last_seen_at = datetime.utcnow()
    
    def increment_api_usage(self, data_size: int = 0, response_time: float = 0.0):
        """Update API usage statistics"""
        self.total_api_calls += 1
        self.total_data_transferred += data_size
        
        if response_time > 0:
            # Calculate rolling average
            total_time = self.average_response_time * (self.total_api_calls - 1) + response_time
            self.average_response_time = total_time / self.total_api_calls
    
    def is_active(self) -> bool:
        """Check if device is active"""
        return self.status == MobileDeviceStatus.ACTIVE
    
    def needs_sync(self) -> bool:
        """Check if device needs synchronization"""
        if not self.last_sync_at:
            return True
        
        # Sync if last sync was more than 1 hour ago
        time_diff = datetime.utcnow() - self.last_sync_at
        return time_diff.total_seconds() > 3600

class MobilePushToken(BaseModel):
    """Model for push notification tokens"""
    __tablename__ = "mobile_push_tokens"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String, ForeignKey('mobile_devices.id'), nullable=False)
    
    # Token information
    token = Column(Text, nullable=False, unique=True)
    token_type = Column(String(10), nullable=False)  # fcm, apns, web
    platform = Column(String(20), nullable=False)  # android, ios, web
    
    # Token status and validity
    is_active = Column(Boolean, default=True)
    is_valid = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime)
    last_used_at = Column(DateTime)
    
    # Usage statistics
    total_notifications_sent = Column(Integer, default=0)
    total_notifications_delivered = Column(Integer, default=0)
    total_notifications_failed = Column(Integer, default=0)
    
    # App and environment info
    app_version = Column(String(20))
    environment = Column(String(20), default="production")  # production, staging, development
    
    # Additional device info at token creation
    device_info = Column(JSON, default=dict)
    
    # Relationships
    device = relationship("MobileDevice", back_populates="push_tokens")
    
    # Indexes
    __table_args__ = (
        Index('ix_mobile_push_tokens_device_active', 'device_id', 'is_active'),
        Index('ix_mobile_push_tokens_platform', 'platform'),
        Index('ix_mobile_push_tokens_created', 'created_at'),
    )
    
    def mark_as_invalid(self):
        """Mark token as invalid (e.g., when push fails)"""
        self.is_valid = False
        self.is_active = False
    
    def increment_usage(self, delivered: bool = True):
        """Update usage statistics"""
        self.total_notifications_sent += 1
        if delivered:
            self.total_notifications_delivered += 1
        else:
            self.total_notifications_failed += 1
        
        self.last_used_at = datetime.utcnow()
    
    def get_success_rate(self) -> float:
        """Get delivery success rate"""
        if self.total_notifications_sent == 0:
            return 0.0
        return self.total_notifications_delivered / self.total_notifications_sent

class MobileNotification(BaseModel):
    """Model for mobile push notifications"""
    __tablename__ = "mobile_notifications"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String, ForeignKey('mobile_devices.id'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    
    # Notification content
    title = Column(String(100), nullable=False)
    body = Column(String(200), nullable=False)
    category = Column(String(50))  # task, case, evidence, system
    priority = Column(String(10), default="normal")  # low, normal, high, critical
    
    # Notification data and metadata
    data = Column(JSON, default=dict)  # Custom payload data
    badge_count = Column(Integer)
    sound = Column(String(50), default="default")
    thread_id = Column(String(100))  # For notification grouping
    
    # Delivery information
    status = Column(String(20), default=NotificationStatus.PENDING)
    scheduled_for = Column(DateTime)
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    opened_at = Column(DateTime)
    
    # Delivery attempts and results
    delivery_attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    last_error = Column(Text)
    provider_response = Column(JSON)  # Response from FCM/APNS
    
    # Context and targeting
    entity_type = Column(String(50))  # case, task, evidence, etc.
    entity_id = Column(String)
    action_required = Column(Boolean, default=False)
    expires_at = Column(DateTime)
    
    # User interaction tracking
    is_read = Column(Boolean, default=False)
    is_actionable = Column(Boolean, default=False)
    action_taken = Column(String(50))  # viewed, dismissed, completed, etc.
    action_taken_at = Column(DateTime)
    
    # Relationships
    device = relationship("MobileDevice", back_populates="notifications")
    user = relationship("User", back_populates="mobile_notifications")
    
    # Indexes
    __table_args__ = (
        Index('ix_mobile_notifications_user_status', 'user_id', 'status'),
        Index('ix_mobile_notifications_device_sent', 'device_id', 'sent_at'),
        Index('ix_mobile_notifications_category_priority', 'category', 'priority'),
        Index('ix_mobile_notifications_entity', 'entity_type', 'entity_id'),
        Index('ix_mobile_notifications_scheduled', 'scheduled_for'),
    )
    
    def mark_as_sent(self):
        """Mark notification as sent"""
        self.status = NotificationStatus.SENT
        self.sent_at = datetime.utcnow()
        self.delivery_attempts += 1
    
    def mark_as_delivered(self):
        """Mark notification as delivered"""
        self.status = NotificationStatus.DELIVERED
        self.delivered_at = datetime.utcnow()
    
    def mark_as_failed(self, error_message: str):
        """Mark notification as failed"""
        self.status = NotificationStatus.FAILED
        self.last_error = error_message
        self.delivery_attempts += 1
    
    def mark_as_opened(self, action: str = None):
        """Mark notification as opened by user"""
        self.is_read = True
        self.opened_at = datetime.utcnow()
        if action:
            self.action_taken = action
            self.action_taken_at = datetime.utcnow()
    
    def can_retry(self) -> bool:
        """Check if notification can be retried"""
        return (self.delivery_attempts < self.max_attempts and 
                self.status in [NotificationStatus.PENDING, NotificationStatus.FAILED])
    
    def is_expired(self) -> bool:
        """Check if notification has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at

class MobileSyncSession(BaseModel):
    """Model for mobile synchronization sessions"""
    __tablename__ = "mobile_sync_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String, ForeignKey('mobile_devices.id'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    
    # Session information
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    sync_type = Column(String(20), default="incremental")  # full, incremental, conflict_resolution
    
    # Sync parameters
    entities_requested = Column(JSON, default=list)  # List of entity types to sync
    last_sync_timestamp = Column(DateTime)
    max_items_per_entity = Column(Integer, default=50)
    include_deleted = Column(Boolean, default=False)
    compression_enabled = Column(Boolean, default=True)
    
    # Session status and timing
    status = Column(String(20), default=SyncStatus.PENDING)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime)
    duration_ms = Column(Integer)  # Duration in milliseconds
    
    # Sync results and statistics
    total_changes_sent = Column(Integer, default=0)
    total_changes_received = Column(Integer, default=0)
    conflicts_detected = Column(Integer, default=0)
    conflicts_resolved = Column(Integer, default=0)
    offline_actions_processed = Column(Integer, default=0)
    
    # Data transfer statistics
    data_sent_bytes = Column(Integer, default=0)
    data_received_bytes = Column(Integer, default=0)
    compression_ratio = Column(Float)
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Performance metrics
    network_type = Column(String(20))
    connection_quality = Column(String(20))  # excellent, good, fair, poor
    battery_level = Column(Integer)  # Battery level at sync start
    
    # Next sync recommendation
    next_sync_recommended_at = Column(DateTime)
    sync_frequency_minutes = Column(Integer, default=15)
    
    # Relationships
    device = relationship("MobileDevice", back_populates="sync_sessions")
    user = relationship("User", back_populates="mobile_sync_sessions")
    sync_conflicts = relationship("MobileSyncConflict", back_populates="sync_session", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('ix_mobile_sync_sessions_device_started', 'device_id', 'started_at'),
        Index('ix_mobile_sync_sessions_user_status', 'user_id', 'status'),
        Index('ix_mobile_sync_sessions_status_started', 'status', 'started_at'),
    )
    
    def start_sync(self):
        """Start the sync session"""
        self.status = SyncStatus.IN_PROGRESS
        self.started_at = datetime.utcnow()
    
    def complete_sync(self):
        """Complete the sync session"""
        self.status = SyncStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        if self.started_at:
            duration = self.completed_at - self.started_at
            self.duration_ms = int(duration.total_seconds() * 1000)
    
    def fail_sync(self, error_message: str):
        """Mark sync as failed"""
        self.status = SyncStatus.FAILED
        self.error_message = error_message
        self.completed_at = datetime.utcnow()
        self.retry_count += 1
    
    def can_retry(self) -> bool:
        """Check if sync can be retried"""
        return self.retry_count < self.max_retries
    
    def calculate_efficiency_score(self) -> float:
        """Calculate sync efficiency score (0-100)"""
        if not self.duration_ms or self.total_changes_sent == 0:
            return 0.0
        
        # Base score on changes per second
        changes_per_second = (self.total_changes_sent + self.total_changes_received) / (self.duration_ms / 1000)
        
        # Adjust for conflicts and errors
        conflict_penalty = min(self.conflicts_detected * 5, 50)  # Max 50 point penalty
        error_penalty = 10 if self.error_message else 0
        
        base_score = min(changes_per_second * 10, 100)  # Scale to 0-100
        final_score = max(base_score - conflict_penalty - error_penalty, 0)
        
        return round(final_score, 1)

class MobileSyncConflict(BaseModel):
    """Model for sync conflicts"""
    __tablename__ = "mobile_sync_conflicts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sync_session_id = Column(String, ForeignKey('mobile_sync_sessions.id'), nullable=False)
    
    # Conflict details
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String, nullable=False)
    conflict_type = Column(String(50), nullable=False)  # concurrent_modification, version_mismatch, etc.
    
    # Conflict data
    client_version = Column(Integer)
    server_version = Column(Integer)
    client_data = Column(JSON)
    server_data = Column(JSON)
    conflict_fields = Column(JSON, default=list)  # List of conflicting field names
    
    # Resolution
    resolution_strategy = Column(String(50))  # manual, auto_client, auto_server, merge
    resolution_data = Column(JSON)  # Resolved data
    resolved_at = Column(DateTime)
    resolved_by = Column(String)  # user_id or "system"
    
    # Timestamps
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    client_timestamp = Column(DateTime)
    server_timestamp = Column(DateTime)
    
    # Status
    is_resolved = Column(Boolean, default=False)
    requires_user_input = Column(Boolean, default=True)
    
    # Relationships
    sync_session = relationship("MobileSyncSession", back_populates="sync_conflicts")
    
    # Indexes
    __table_args__ = (
        Index('ix_mobile_sync_conflicts_session_resolved', 'sync_session_id', 'is_resolved'),
        Index('ix_mobile_sync_conflicts_entity', 'entity_type', 'entity_id'),
        Index('ix_mobile_sync_conflicts_detected', 'detected_at'),
    )
    
    def resolve_conflict(self, strategy: str, resolved_data: dict = None, resolved_by: str = "system"):
        """Resolve the conflict"""
        self.resolution_strategy = strategy
        self.resolution_data = resolved_data
        self.resolved_at = datetime.utcnow()
        self.resolved_by = resolved_by
        self.is_resolved = True

class MobilePerformanceLog(BaseModel):
    """Model for mobile performance logging"""
    __tablename__ = "mobile_performance_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String, ForeignKey('mobile_devices.id'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    
    # Performance metrics
    app_launch_time_ms = Column(Integer)
    memory_usage_mb = Column(Float)
    cpu_usage_percent = Column(Float)
    battery_usage_percent = Column(Float)
    
    # Network and API performance
    network_type = Column(String(20))
    connection_quality = Column(String(20))
    api_response_times = Column(JSON, default=dict)  # endpoint -> response_time_ms
    total_api_calls = Column(Integer, default=0)
    failed_api_calls = Column(Integer, default=0)
    
    # Sync performance
    last_sync_duration_ms = Column(Integer)
    sync_success_rate = Column(Float)
    offline_actions_count = Column(Integer, default=0)
    
    # Cache performance
    cache_hit_rate = Column(Float)
    cache_size_mb = Column(Float)
    cache_evictions = Column(Integer, default=0)
    
    # Storage information
    app_storage_mb = Column(Float)
    available_storage_mb = Column(Float)
    offline_data_mb = Column(Float)
    
    # User interaction metrics
    session_duration_seconds = Column(Integer)
    screens_viewed = Column(JSON, default=list)
    actions_performed = Column(JSON, default=list)
    errors_encountered = Column(JSON, default=list)
    crashes = Column(Integer, default=0)
    
    # Context information
    app_version = Column(String(20))
    os_version = Column(String(50))
    device_model = Column(String(100))
    screen_resolution = Column(String(20))
    timezone = Column(String(50))
    locale = Column(String(10))
    
    # Timing
    logged_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    session_start = Column(DateTime)
    session_end = Column(DateTime)
    
    # Relationships
    device = relationship("MobileDevice", back_populates="performance_logs")
    user = relationship("User", back_populates="mobile_performance_logs")
    
    # Indexes
    __table_args__ = (
        Index('ix_mobile_performance_logs_device_logged', 'device_id', 'logged_at'),
        Index('ix_mobile_performance_logs_user_logged', 'user_id', 'logged_at'),
        Index('ix_mobile_performance_logs_app_version', 'app_version'),
    )
    
    def calculate_performance_score(self) -> float:
        """Calculate overall performance score (0-100)"""
        score = 100.0
        
        # Deduct for high memory usage (>100MB)
        if self.memory_usage_mb and self.memory_usage_mb > 100:
            score -= min((self.memory_usage_mb - 100) / 10, 30)
        
        # Deduct for high CPU usage (>80%)
        if self.cpu_usage_percent and self.cpu_usage_percent > 80:
            score -= min((self.cpu_usage_percent - 80) / 2, 20)
        
        # Deduct for slow app launch (>3 seconds)
        if self.app_launch_time_ms and self.app_launch_time_ms > 3000:
            score -= min((self.app_launch_time_ms - 3000) / 100, 25)
        
        # Deduct for low cache hit rate (<70%)
        if self.cache_hit_rate and self.cache_hit_rate < 0.7:
            score -= (0.7 - self.cache_hit_rate) * 50
        
        # Deduct for API failures
        if self.total_api_calls > 0 and self.failed_api_calls > 0:
            failure_rate = self.failed_api_calls / self.total_api_calls
            score -= failure_rate * 30
        
        # Deduct for crashes
        if self.crashes > 0:
            score -= min(self.crashes * 10, 40)
        
        return max(round(score, 1), 0.0)

class MobileOfflineAction(BaseModel):
    """Model for tracking offline actions that need to be synced"""
    __tablename__ = "mobile_offline_actions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String, ForeignKey('mobile_devices.id'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    
    # Action details
    action_id = Column(String(255), unique=True, nullable=False, index=True)  # Client-generated ID
    action_type = Column(String(50), nullable=False)  # create_task, update_case, etc.
    entity_type = Column(String(50), nullable=False)  # case, task, evidence, etc.
    entity_id = Column(String)  # Null for create actions
    
    # Action data and metadata
    action_data = Column(JSON, nullable=False)  # The actual action data
    original_timestamp = Column(DateTime, nullable=False)  # When action was performed offline
    
    # Processing status
    status = Column(String(20), default="pending")  # pending, processing, completed, failed, conflict
    processed_at = Column(DateTime)
    processing_result = Column(JSON)  # Result of processing
    error_message = Column(Text)
    
    # Retry and conflict handling
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    conflict_detected = Column(Boolean, default=False)
    conflict_data = Column(JSON)
    
    # Dependency tracking
    depends_on = Column(JSON, default=list)  # List of action_ids this depends on
    dependent_actions = Column(JSON, default=list)  # List of action_ids that depend on this
    
    # Sync session tracking
    sync_session_id = Column(String, ForeignKey('mobile_sync_sessions.id'))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    device = relationship("MobileDevice")
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('ix_mobile_offline_actions_device_status', 'device_id', 'status'),
        Index('ix_mobile_offline_actions_user_created', 'user_id', 'created_at'),
        Index('ix_mobile_offline_actions_entity', 'entity_type', 'entity_id'),
        Index('ix_mobile_offline_actions_sync_session', 'sync_session_id'),
    )
    
    def mark_as_processing(self, sync_session_id: str):
        """Mark action as being processed"""
        self.status = "processing"
        self.sync_session_id = sync_session_id
        self.processed_at = datetime.utcnow()
    
    def mark_as_completed(self, result: dict):
        """Mark action as completed"""
        self.status = "completed"
        self.processing_result = result
        self.processed_at = datetime.utcnow()
    
    def mark_as_failed(self, error_message: str):
        """Mark action as failed"""
        self.status = "failed"
        self.error_message = error_message
        self.retry_count += 1
        self.processed_at = datetime.utcnow()
    
    def mark_conflict(self, conflict_data: dict):
        """Mark action as having a conflict"""
        self.status = "conflict"
        self.conflict_detected = True
        self.conflict_data = conflict_data
    
    def can_retry(self) -> bool:
        """Check if action can be retried"""
        return (self.retry_count < self.max_retries and 
                self.status in ["pending", "failed"])
    
    def can_process(self, completed_actions: set) -> bool:
        """Check if action can be processed (all dependencies completed)"""
        if not self.depends_on:
            return True
        
        return all(dep_id in completed_actions for dep_id in self.depends_on)

# Additional utility models for mobile optimization

class MobileUserPreferences(BaseModel):
    """Model for user mobile preferences"""
    __tablename__ = "mobile_user_preferences"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), unique=True, nullable=False)
    
    # Notification preferences
    push_notifications_enabled = Column(Boolean, default=True)
    task_notifications = Column(Boolean, default=True)
    case_notifications = Column(Boolean, default=True)
    evidence_notifications = Column(Boolean, default=True)
    system_notifications = Column(Boolean, default=False)
    
    # Quiet hours
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5))  # HH:MM format
    quiet_hours_end = Column(String(5))    # HH:MM format
    
    # Data usage preferences
    sync_on_cellular = Column(Boolean, default=True)
    compress_data = Column(Boolean, default=True)
    auto_download_attachments = Column(Boolean, default=False)
    max_attachment_size_mb = Column(Integer, default=10)
    
    # Display preferences
    theme = Column(String(20), default="system")  # light, dark, system
    font_size = Column(String(20), default="medium")  # small, medium, large
    show_thumbnails = Column(Boolean, default=True)
    items_per_page = Column(Integer, default=20)
    
    # Security preferences
    require_biometric = Column(Boolean, default=False)
    auto_lock_minutes = Column(Integer, default=5)
    allow_screenshots = Column(Boolean, default=True)
    
    # Sync preferences
    sync_frequency_minutes = Column(Integer, default=15)
    sync_on_wifi_only = Column(Boolean, default=False)
    keep_offline_days = Column(Integer, default=7)
    
    # Performance preferences
    enable_caching = Column(Boolean, default=True)
    cache_duration_hours = Column(Integer, default=24)
    preload_data = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="mobile_preferences")
    
    def is_in_quiet_hours(self) -> bool:
        """Check if current time is within quiet hours"""
        if not self.quiet_hours_enabled or not self.quiet_hours_start or not self.quiet_hours_end:
            return False
        
        from datetime import time
        
        current_time = datetime.now().time()
        start_time = time.fromisoformat(self.quiet_hours_start)
        end_time = time.fromisoformat(self.quiet_hours_end)
        
        if start_time <= end_time:
            return start_time <= current_time <= end_time
        else:
            # Quiet hours span midnight
            return current_time >= start_time or current_time <= end_time