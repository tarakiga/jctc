from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
from enum import Enum

class TaskType(str, Enum):
    INVESTIGATION = "investigation"
    FORENSIC_ANALYSIS = "forensic_analysis"
    EVIDENCE_COLLECTION = "evidence_collection"
    INTERVIEW = "interview"
    DOCUMENTATION = "documentation"
    LEGAL_REVIEW = "legal_review"
    COURT_PREPARATION = "court_preparation"
    FOLLOW_UP = "follow_up"
    ADMINISTRATIVE = "administrative"
    QUALITY_ASSURANCE = "quality_assurance"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"

class TaskStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ESCALATED = "escalated"

class SLAStatus(str, Enum):
    WITHIN_SLA = "within_sla"
    AT_RISK = "at_risk"
    OVERDUE = "overdue"
    COMPLETED = "completed"

class WorkflowStepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    FAILED = "failed"

class EscalationReason(str, Enum):
    SLA_VIOLATION = "sla_violation"
    COMPLEXITY = "complexity"
    RESOURCE_CONSTRAINT = "resource_constraint"
    QUALITY_ISSUE = "quality_issue"
    MANUAL_REQUEST = "manual_request"

# Base schemas
class TaskBase(BaseModel):
    """Base task schema with common fields"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    task_type: TaskType
    priority: TaskPriority = TaskPriority.MEDIUM
    estimated_hours: Optional[float] = Field(None, ge=0, le=1000)
    metadata: Optional[Dict[str, Any]] = {}

class TaskCreate(TaskBase):
    """Schema for creating a new task"""
    case_id: str = Field(..., min_length=1)
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    workflow_template_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    dependencies: Optional[List[str]] = []

    @field_validator('due_date')
    @classmethod
    def validate_due_date(cls, v):
        if v and v <= datetime.utcnow():
            raise ValueError('Due date must be in the future')
        return v

class TaskUpdate(BaseModel):
    """Schema for updating a task"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    estimated_hours: Optional[float] = Field(None, ge=0, le=1000)
    actual_hours: Optional[float] = Field(None, ge=0, le=1000)
    completion_percentage: Optional[int] = Field(None, ge=0, le=100)
    due_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=1000)
    metadata: Optional[Dict[str, Any]] = None

    @field_validator('due_date')
    @classmethod
    def validate_due_date(cls, v):
        if v and v <= datetime.utcnow():
            raise ValueError('Due date must be in the future')
        return v

class TaskResponse(TaskBase):
    """Schema for task response"""
    id: str
    case_id: str
    status: TaskStatus
    assigned_to: Optional[str] = None
    created_by: str
    due_date: Optional[datetime] = None
    actual_hours: Optional[float] = None
    completion_percentage: int = 0
    sla_status: SLAStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Workflow information
    workflow_instance_id: Optional[str] = None
    current_step: Optional[str] = None
    
    # Related information
    assignee_name: Optional[str] = None
    case_title: Optional[str] = None
    parent_task_id: Optional[str] = None
    subtask_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Assignment schemas
class TaskAssignment(BaseModel):
    """Schema for task assignment"""
    assigned_to: str = Field(..., min_length=1)
    reason: Optional[str] = Field(None, max_length=500)
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=1000)

class TaskEscalation(BaseModel):
    """Schema for task escalation"""
    reason: EscalationReason
    description: str = Field(..., min_length=1, max_length=1000)
    new_assignee: Optional[str] = None
    new_priority: Optional[TaskPriority] = None
    new_due_date: Optional[datetime] = None
    escalate_to_supervisor: bool = True
    notify_stakeholders: bool = True

class TaskBulkAction(BaseModel):
    """Schema for bulk task operations"""
    task_ids: List[str] = Field(..., min_items=1, max_items=100)
    action: str = Field(..., pattern="^(assign|update_status|update_priority|extend_deadline|delete)$")
    
    # Optional fields based on action
    assigned_to: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    extension_hours: Optional[int] = Field(None, ge=1, le=168)  # Max 1 week extension
    reason: Optional[str] = Field(None, max_length=500)

    @field_validator('action')
    @classmethod
    def validate_action_fields(cls, v, info):
        """Validate required fields based on action type"""
        if v == 'assign' and not info.data.get('assigned_to'):
            raise ValueError('assigned_to is required for assign action')
        elif v == 'update_status' and not info.data.get('status'):
            raise ValueError('status is required for update_status action')
        elif v == 'update_priority' and not info.data.get('priority'):
            raise ValueError('priority is required for update_priority action')
        elif v == 'extend_deadline' and not info.data.get('extension_hours'):
            raise ValueError('extension_hours is required for extend_deadline action')
        return v

# Workflow schemas
class WorkflowStep(BaseModel):
    """Schema for workflow step definition"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    duration_hours: int = Field(..., ge=1, le=168)
    role: str = Field(..., min_length=1, max_length=50)
    order: int = Field(..., ge=1)
    is_optional: bool = False
    prerequisites: List[str] = []
    success_criteria: Optional[str] = Field(None, max_length=500)

class WorkflowTrigger(BaseModel):
    """Schema for workflow trigger definition"""
    event: str = Field(..., min_length=1, max_length=100)
    action: str = Field(..., min_length=1, max_length=100)
    params: Dict[str, Any] = {}
    condition: Optional[str] = Field(None, max_length=500)

class WorkflowTemplate(BaseModel):
    """Schema for workflow template"""
    id: str
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    task_type: TaskType
    steps: List[Dict[str, Any]] = []
    triggers: List[Dict[str, Any]] = []
    sla_hours: Optional[int] = Field(None, ge=1, le=8760)  # Max 1 year
    is_active: bool = True
    version: str = "1.0"
    created_by: Optional[str] = None
    created_at: datetime

class WorkflowInstance(BaseModel):
    """Schema for workflow instance"""
    id: str
    task_id: str
    template_id: str
    template_name: str
    current_step_index: int = 0
    status: str = "active"  # active, completed, cancelled, failed
    started_at: datetime
    completed_at: Optional[datetime] = None
    steps: List[Dict[str, Any]] = []
    context: Dict[str, Any] = {}

class WorkflowStepExecution(BaseModel):
    """Schema for workflow step execution"""
    step_name: str
    status: WorkflowStepStatus
    assigned_to: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=1000)
    result: Optional[Dict[str, Any]] = {}

# SLA schemas
class TaskSLA(BaseModel):
    """Schema for task SLA configuration"""
    task_type: TaskType
    priority: TaskPriority
    sla_hours: int = Field(..., ge=1, le=8760)
    warning_hours: int = Field(..., ge=1, le=720)  # Warning before SLA breach
    escalation_rules: List[Dict[str, Any]] = []
    business_hours_only: bool = False
    exclude_weekends: bool = False
    exclude_holidays: bool = False

class SLAViolation(BaseModel):
    """Schema for SLA violation tracking"""
    id: str
    task_id: str
    case_id: str
    task_title: str
    assigned_to: Optional[str] = None
    sla_deadline: datetime
    violation_detected_at: datetime
    hours_overdue: float
    severity: str = "medium"  # low, medium, high, critical
    status: str = "open"  # open, acknowledged, resolved
    escalation_level: int = 0
    resolution_notes: Optional[str] = None

# Metrics and analytics schemas
class TaskMetrics(BaseModel):
    """Schema for task performance metrics"""
    total_tasks: int = 0
    completed_tasks: int = 0
    in_progress_tasks: int = 0
    overdue_tasks: int = 0
    completion_rate: float = 0.0
    sla_compliance_rate: float = 0.0
    average_completion_hours: float = 0.0
    
    # SLA breakdown
    tasks_within_sla: int = 0
    tasks_at_risk: int = 0
    tasks_sla_violated: int = 0
    
    # Distribution metrics
    task_type_distribution: Dict[str, int] = {}
    priority_distribution: Dict[str, int] = {}
    status_distribution: Dict[str, int] = {}
    
    # Time period
    period_start: datetime
    period_end: datetime

class UserTaskMetrics(BaseModel):
    """Schema for individual user task metrics"""
    user_id: str
    user_name: str
    role: str
    active_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    average_completion_time_hours: float = 0.0
    sla_compliance_rate: float = 0.0
    workload_score: float = 0.0  # Based on task count and complexity
    efficiency_rating: str = "average"  # low, average, high

class TeamTaskMetrics(BaseModel):
    """Schema for team task metrics"""
    team_name: str
    total_members: int
    team_completion_rate: float = 0.0
    team_sla_compliance: float = 0.0
    average_task_cycle_time: float = 0.0
    bottlenecks: List[str] = []
    top_performers: List[UserTaskMetrics] = []
    improvement_areas: List[str] = []

# Filter and search schemas
class TaskFilter(BaseModel):
    """Schema for task filtering"""
    case_ids: Optional[List[str]] = None
    assigned_to: Optional[List[str]] = None
    created_by: Optional[List[str]] = None
    task_types: Optional[List[TaskType]] = None
    statuses: Optional[List[TaskStatus]] = None
    priorities: Optional[List[TaskPriority]] = None
    sla_statuses: Optional[List[SLAStatus]] = None
    
    # Date filters
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    due_after: Optional[datetime] = None
    due_before: Optional[datetime] = None
    completed_after: Optional[datetime] = None
    completed_before: Optional[datetime] = None
    
    # Advanced filters
    overdue_only: bool = False
    has_subtasks: Optional[bool] = None
    workflow_enabled: Optional[bool] = None
    escalated_only: bool = False
    
    # Full text search
    search_text: Optional[str] = Field(None, min_length=1, max_length=100)

class TaskSortOption(str, Enum):
    CREATED_DESC = "created_desc"
    CREATED_ASC = "created_asc"
    DUE_DATE_DESC = "due_date_desc"
    DUE_DATE_ASC = "due_date_asc"
    PRIORITY_DESC = "priority_desc"
    PRIORITY_ASC = "priority_asc"
    STATUS_ASC = "status_asc"
    TITLE_ASC = "title_asc"
    COMPLETION_DESC = "completion_desc"

class TaskListRequest(BaseModel):
    """Schema for task list requests with filtering and sorting"""
    filters: Optional[TaskFilter] = None
    sort_by: TaskSortOption = TaskSortOption.CREATED_DESC
    limit: int = Field(50, ge=1, le=100)
    offset: int = Field(0, ge=0)
    include_metadata: bool = False
    include_subtasks: bool = False
    include_workflow: bool = False

# Notification schemas
class TaskNotification(BaseModel):
    """Schema for task-related notifications"""
    id: str
    task_id: str
    user_id: str
    notification_type: str  # assigned, due_soon, overdue, completed, escalated
    title: str
    message: str
    priority: str = "normal"  # low, normal, high, urgent
    is_read: bool = False
    created_at: datetime
    read_at: Optional[datetime] = None
    
    # Notification channels
    email_sent: bool = False
    sms_sent: bool = False
    push_sent: bool = False
    
    # Related information
    case_id: Optional[str] = None
    case_title: Optional[str] = None

class TaskNotificationSettings(BaseModel):
    """Schema for user notification preferences"""
    user_id: str
    
    # Event notifications
    notify_on_assignment: bool = True
    notify_on_due_soon: bool = True
    notify_on_overdue: bool = True
    notify_on_status_change: bool = True
    notify_on_escalation: bool = True
    
    # Timing settings
    due_soon_hours: int = Field(24, ge=1, le=168)  # Hours before due date
    digest_frequency: str = "daily"  # never, daily, weekly
    quiet_hours_start: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    
    # Channel preferences
    email_notifications: bool = True
    sms_notifications: bool = False
    push_notifications: bool = True
    slack_notifications: bool = False

# Template management schemas
class TaskTemplate(BaseModel):
    """Schema for task template definition"""
    id: str
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    task_type: TaskType
    priority: TaskPriority = TaskPriority.MEDIUM
    estimated_hours: Optional[float] = Field(None, ge=0, le=1000)
    
    # Template checklist
    checklist_items: List[str] = []
    required_fields: List[str] = []
    default_assignee_role: Optional[str] = None
    
    # Workflow integration
    workflow_template_id: Optional[str] = None
    auto_assign: bool = False
    
    # Usage tracking
    usage_count: int = 0
    is_active: bool = True
    is_system_template: bool = False
    
    # Metadata
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class TaskDependency(BaseModel):
    """Schema for task dependency management"""
    id: str
    task_id: str
    depends_on_task_id: str
    dependency_type: str = "finish_to_start"  # finish_to_start, start_to_start, finish_to_finish, start_to_finish
    lag_hours: int = 0  # Delay between tasks
    is_optional: bool = False
    created_at: datetime

class TaskComment(BaseModel):
    """Schema for task comments"""
    id: str
    task_id: str
    user_id: str
    comment: str = Field(..., min_length=1, max_length=2000)
    comment_type: str = "note"  # note, status_update, escalation, resolution
    is_internal: bool = True
    mentions: List[str] = []  # User IDs mentioned in comment
    attachments: List[str] = []  # File attachment IDs
    created_at: datetime
    updated_at: Optional[datetime] = None

class TaskTimeEntry(BaseModel):
    """Schema for task time tracking"""
    id: str
    task_id: str
    user_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = Field(None, max_length=500)
    is_billable: bool = False
    hourly_rate: Optional[float] = Field(None, ge=0)
    created_at: datetime

# Dashboard and reporting schemas
class TaskDashboard(BaseModel):
    """Schema for task dashboard data"""
    user_metrics: UserTaskMetrics
    recent_tasks: List[TaskResponse] = []
    upcoming_deadlines: List[TaskResponse] = []
    overdue_tasks: List[TaskResponse] = []
    team_summary: Optional[TeamTaskMetrics] = None
    sla_alerts: List[SLAViolation] = []
    productivity_trend: List[Dict[str, Any]] = []
    recommendations: List[str] = []

class TaskReport(BaseModel):
    """Schema for task reporting"""
    report_id: str
    title: str
    description: Optional[str] = None
    report_type: str  # summary, detailed, sla_analysis, productivity
    
    # Report data
    total_tasks_analyzed: int
    time_period: Dict[str, datetime]
    metrics_summary: TaskMetrics
    detailed_breakdown: Dict[str, Any] = {}
    charts_data: Dict[str, Any] = {}
    recommendations: List[str] = []
    
    # Generation info
    generated_by: str
    generated_at: datetime
    parameters: Dict[str, Any] = {}

# Advanced workflow schemas
class ConditionalWorkflow(BaseModel):
    """Schema for conditional workflow execution"""
    id: str
    name: str
    conditions: List[Dict[str, Any]]  # List of conditions to evaluate
    workflow_branches: Dict[str, str]  # Condition result -> workflow template ID
    default_workflow: str  # Default workflow template ID
    is_active: bool = True

class WorkflowAutomation(BaseModel):
    """Schema for workflow automation rules"""
    id: str
    name: str = Field(..., min_length=1, max_length=255)
    trigger_event: str  # task_created, status_changed, sla_warning, etc.
    conditions: List[Dict[str, Any]] = []
    actions: List[Dict[str, Any]] = []  # assign, notify, escalate, create_subtask, etc.
    is_active: bool = True
    execution_count: int = 0
    last_executed: Optional[datetime] = None
    created_by: str
    created_at: datetime