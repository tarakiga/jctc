from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

class MobileDeviceType(str, Enum):
    IOS = "ios"
    ANDROID = "android"
    WEB = "web"
    TABLET = "tablet"

class SyncEntityType(str, Enum):
    CASES = "cases"
    TASKS = "tasks"
    EVIDENCE = "evidence"
    NOTIFICATIONS = "notifications"
    PROFILE = "profile"

class OfflineActionType(str, Enum):
    CREATE_TASK = "create_task"
    UPDATE_TASK = "update_task"
    ADD_COMMENT = "add_comment"
    UPLOAD_EVIDENCE = "upload_evidence"
    MARK_COMPLETE = "mark_complete"
    VOICE_NOTE = "voice_note"

# Core mobile-optimized schemas
class MobileCaseSummary(BaseModel):
    """Lightweight case summary for mobile consumption"""
    id: str
    case_number: str
    title: str = Field(..., max_length=100)  # Truncated for mobile
    priority: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    assigned_officers_count: int = 0
    description: Optional[str] = Field(None, max_length=200)  # Truncated description
    
    class Config:
        from_attributes = True

class MobileTaskSummary(BaseModel):
    """Lightweight task summary for mobile consumption"""
    id: str
    title: str = Field(..., max_length=100)
    task_type: str
    priority: str
    status: str
    due_date: Optional[datetime] = None
    case_id: str
    completion_percentage: int = 0
    is_overdue: bool = False
    estimated_hours: Optional[float] = None
    
    class Config:
        from_attributes = True

class MobileEvidenceSummary(BaseModel):
    """Lightweight evidence summary for mobile consumption"""
    id: str
    label: str = Field(..., max_length=100)
    type: str
    case_id: str
    collected_at: Optional[datetime] = None
    file_size: Optional[int] = None
    has_thumbnail: bool = False
    status: str = "active"
    
    class Config:
        from_attributes = True

class MobileUserProfile(BaseModel):
    """Mobile-optimized user profile"""
    user_id: str
    name: str
    email: str
    role: str
    organization: Optional[str] = None
    avatar_url: Optional[str] = None
    statistics: Dict[str, Union[int, float]] = {}
    preferences: Dict[str, Union[bool, str, int]] = {}
    permissions: List[str] = []
    last_login: Optional[datetime] = None
    account_status: str = "active"

class MobileDashboard(BaseModel):
    """Mobile dashboard with essential information"""
    user_id: str
    summary: Dict[str, int]  # active_cases, active_tasks, overdue_tasks, etc.
    recent_cases: List[MobileCaseSummary] = []
    active_tasks: List[MobileTaskSummary] = []
    recent_evidence: List[MobileEvidenceSummary] = []
    quick_actions: List[Dict[str, str]] = []
    charts_data: Dict[str, Any] = {}
    sync_timestamp: datetime
    cache_expires_at: Optional[datetime] = None

# Device and sync related schemas
class MobileDeviceInfo(BaseModel):
    """Mobile device information for registration"""
    device_type: MobileDeviceType
    device_model: str = Field(..., max_length=100)
    os_version: str = Field(..., max_length=50)
    app_version: str = Field(..., max_length=20)
    device_name: Optional[str] = Field(None, max_length=100)
    screen_resolution: Optional[str] = None
    network_type: Optional[str] = None  # wifi, cellular, unknown
    timezone: str = "UTC"
    locale: str = "en"
    
    @field_validator('device_type')
    @classmethod
    def validate_device_type(cls, v):
        if v not in ['ios', 'android', 'web', 'tablet']:
            raise ValueError('Invalid device type')
        return v

class MobileNotificationToken(BaseModel):
    """Push notification token update"""
    token: str = Field(..., min_length=10)
    token_type: str = Field("fcm", pattern="^(fcm|apns|web)$")
    app_version: Optional[str] = None
    device_info: Optional[Dict[str, str]] = {}

class OfflineAction(BaseModel):
    """Action performed while offline that needs to be synced"""
    action_id: str = Field(..., description="Unique ID for this offline action")
    action_type: OfflineActionType
    entity_type: str  # case, task, evidence, etc.
    entity_id: Optional[str] = None  # For updates, null for creates
    data: Dict[str, Any]
    timestamp: datetime
    device_id: str
    retry_count: int = 0
    
    @field_validator('data')
    @classmethod
    def validate_action_data(cls, v, info):
        """Validate action data based on action type"""
        action_type = info.data.get('action_type')
        
        if action_type == OfflineActionType.CREATE_TASK:
            required_fields = ['title', 'task_type', 'case_id']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f'{field} is required for create_task action')
        
        return v

class MobileSyncRequest(BaseModel):
    """Request for data synchronization"""
    device_id: str
    last_sync_timestamp: Optional[datetime] = None
    sync_entities: List[SyncEntityType] = []
    offline_actions: List[OfflineAction] = []
    full_sync: bool = False
    max_items_per_entity: int = Field(50, le=100)
    include_deleted: bool = False

class MobileSyncResponse(BaseModel):
    """Response for data synchronization"""
    sync_timestamp: datetime
    changes: Dict[str, List[Dict[str, Any]]]  # entity_type -> list of changes
    conflicts: List[Dict[str, Any]] = []  # Sync conflicts that need resolution
    offline_action_results: List[Dict[str, Any]] = []
    next_sync_recommended: datetime
    server_time: datetime
    sync_statistics: Dict[str, int] = {}

# Batch and search schemas
class MobileBatchRequestItem(BaseModel):
    """Individual request item in a batch"""
    request_id: str
    method: str = Field(..., pattern="^(GET|POST|PUT|DELETE)$")
    endpoint: str
    params: Optional[Dict[str, Any]] = {}
    headers: Optional[Dict[str, str]] = {}
    body: Optional[Dict[str, Any]] = {}

class MobileBatchRequest(BaseModel):
    """Batch request for multiple API calls"""
    batch_id: str
    requests: List[MobileBatchRequestItem] = Field(..., min_items=1, max_items=10)
    sequential: bool = False  # Execute requests sequentially vs parallel
    stop_on_error: bool = False

class MobileBatchResponse(BaseModel):
    """Response for batch requests"""
    batch_id: str
    responses: List[Dict[str, Any]]
    processed_at: datetime
    success_count: int = 0
    error_count: int = 0
    total_processing_time_ms: Optional[int] = None

class MobileSearchRequest(BaseModel):
    """Mobile-optimized search request"""
    query: str = Field(..., min_length=2, max_length=100)
    search_types: List[str] = Field(default=["cases", "tasks", "evidence"])
    limit: Optional[int] = Field(10, le=20)  # Lower limit for mobile
    filters: Optional[Dict[str, Any]] = {}
    include_highlights: bool = False
    
    @field_validator('search_types')
    @classmethod
    def validate_search_types(cls, v):
        valid_types = ["cases", "tasks", "evidence", "parties", "documents"]
        for search_type in v:
            if search_type not in valid_types:
                raise ValueError(f'Invalid search type: {search_type}')
        return v

class MobileSearchResponse(BaseModel):
    """Mobile search results"""
    query: str
    results: Dict[str, List[Union[MobileCaseSummary, MobileTaskSummary, MobileEvidenceSummary]]]
    total_results: int
    search_timestamp: datetime
    suggestions: List[str] = []
    facets: Optional[Dict[str, Dict[str, int]]] = None

# Compression and optimization schemas
class CompressedResponse(BaseModel):
    """Compressed response wrapper"""
    compressed: bool = True
    encoding: str = "gzip"
    data: str  # Base64 encoded compressed data
    original_size: int
    compressed_size: int
    compression_ratio: float

class MobileOptimizationSettings(BaseModel):
    """Settings for mobile optimization"""
    max_image_size: int = Field(1024000, description="Max image size in bytes")
    image_quality: int = Field(80, ge=1, le=100)
    enable_compression: bool = True
    compression_threshold: int = Field(1024, description="Compress responses larger than this")
    cache_duration: int = Field(300, description="Default cache duration in seconds")
    max_offline_storage: int = Field(104857600, description="Max offline storage in bytes (100MB)")

# Notification schemas
class MobilePushNotification(BaseModel):
    """Push notification for mobile devices"""
    title: str = Field(..., max_length=100)
    body: str = Field(..., max_length=200)
    data: Optional[Dict[str, Any]] = {}
    badge: Optional[int] = None
    sound: str = "default"
    category: Optional[str] = None
    thread_id: Optional[str] = None
    
    @field_validator('data')
    @classmethod
    def validate_notification_data(cls, v):
        """Ensure notification data is serializable and reasonable size"""
        if v and len(str(v)) > 4000:  # Reasonable limit for notification data
            raise ValueError('Notification data too large')
        return v

class MobileNotificationPreferences(BaseModel):
    """User notification preferences for mobile"""
    push_enabled: bool = True
    task_notifications: bool = True
    case_updates: bool = True
    evidence_alerts: bool = True
    system_notifications: bool = False
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    notification_sound: str = "default"

# Cache and storage schemas
class MobileCacheEntry(BaseModel):
    """Cache entry for mobile data"""
    key: str
    data: Dict[str, Any]
    expires_at: datetime
    size_bytes: int
    last_accessed: datetime
    access_count: int = 0
    cache_level: str = "memory"  # memory, disk, secure

class MobileStorageInfo(BaseModel):
    """Mobile storage information"""
    total_storage: int  # Total available storage in bytes
    used_storage: int   # Used storage in bytes
    cache_storage: int  # Cache storage in bytes
    offline_storage: int  # Offline data storage in bytes
    free_storage: int   # Free storage in bytes
    storage_limit: int  # App storage limit in bytes
    cleanup_recommended: bool = False

# Analytics and metrics
class MobileUsageMetrics(BaseModel):
    """Mobile app usage metrics"""
    user_id: str
    device_id: str
    session_duration: int  # Duration in seconds
    screens_viewed: List[str] = []
    actions_performed: List[str] = []
    offline_time: int = 0  # Time spent offline in seconds
    sync_count: int = 0
    error_count: int = 0
    crash_count: int = 0
    network_requests: int = 0
    data_transferred: int = 0  # Bytes transferred
    battery_usage: Optional[float] = None
    timestamp: datetime

class MobilePerformanceMetrics(BaseModel):
    """Mobile performance metrics"""
    device_id: str
    app_launch_time: int  # Milliseconds
    api_response_times: Dict[str, int] = {}  # endpoint -> avg response time
    sync_duration: int = 0  # Last sync duration in ms
    offline_actions_count: int = 0
    cache_hit_rate: float = 0.0
    memory_usage: Optional[int] = None  # MB
    cpu_usage: Optional[float] = None  # Percentage
    network_type: Optional[str] = None
    connection_quality: Optional[str] = None  # excellent, good, poor
    timestamp: datetime

# Quick actions and shortcuts
class MobileQuickAction(BaseModel):
    """Quick action configuration for mobile"""
    id: str
    label: str = Field(..., max_length=50)
    icon: str
    endpoint: str
    method: str = "GET"
    requires_confirmation: bool = False
    requires_permission: Optional[str] = None
    badge_count: Optional[int] = None
    is_enabled: bool = True
    sort_order: int = 0

class MobileShortcut(BaseModel):
    """App shortcut for mobile"""
    id: str
    title: str = Field(..., max_length=50)
    subtitle: Optional[str] = Field(None, max_length=100)
    icon: str
    deep_link: str
    requires_auth: bool = True
    context: Optional[Dict[str, Any]] = {}

# Location and context
class MobileLocation(BaseModel):
    """Location information from mobile device"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = None  # Accuracy in meters
    altitude: Optional[float] = None
    timestamp: datetime
    address: Optional[str] = Field(None, max_length=200)
    is_mock: bool = False

class MobileContext(BaseModel):
    """Context information from mobile device"""
    location: Optional[MobileLocation] = None
    network_type: Optional[str] = None
    battery_level: Optional[int] = Field(None, ge=0, le=100)
    is_charging: Optional[bool] = None
    screen_brightness: Optional[float] = Field(None, ge=0, le=1)
    device_orientation: Optional[str] = None
    app_state: str = "active"  # active, background, inactive
    timestamp: datetime

# File and media schemas for mobile
class MobileFileUpload(BaseModel):
    """File upload optimized for mobile"""
    filename: str = Field(..., max_length=255)
    content_type: str
    file_size: int
    file_hash: Optional[str] = None
    thumbnail_data: Optional[str] = None  # Base64 encoded thumbnail
    metadata: Optional[Dict[str, Any]] = {}
    upload_progress: float = 0.0
    is_compressed: bool = False
    original_size: Optional[int] = None

class MobileVoiceNote(BaseModel):
    """Voice note recording for mobile"""
    duration: int  # Duration in seconds
    file_size: int
    audio_format: str = "m4a"
    sample_rate: Optional[int] = None
    transcription: Optional[str] = None
    confidence_score: Optional[float] = None
    language: str = "en"
    timestamp: datetime

# Error handling for mobile
class MobileError(BaseModel):
    """Mobile-specific error response"""
    error_code: str
    error_message: str
    error_details: Optional[Dict[str, Any]] = {}
    user_message: Optional[str] = None  # User-friendly message
    retry_after: Optional[int] = None  # Seconds to wait before retrying
    support_reference: Optional[str] = None
    timestamp: datetime

class MobileApiResponse(BaseModel):
    """Generic mobile API response wrapper"""
    success: bool = True
    data: Optional[Any] = None
    error: Optional[MobileError] = None
    metadata: Optional[Dict[str, Any]] = {}
    server_timestamp: datetime
    request_id: Optional[str] = None