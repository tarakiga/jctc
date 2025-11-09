from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, Float, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
import enum

class WorkflowStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"
    PAUSED = "paused"

class EscalationLevel(str, enum.Enum):
    LEVEL_0 = "level_0"  # Initial
    LEVEL_1 = "level_1"  # Team Lead
    LEVEL_2 = "level_2"  # Supervisor
    LEVEL_3 = "level_3"  # Manager
    LEVEL_4 = "level_4"  # Director

class TaskTemplate(Base):
    """Model for task templates"""
    __tablename__ = "task_templates"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    task_type = Column(String(50), nullable=False, index=True)
    priority = Column(String(20), default="medium")
    
    # Template configuration
    estimated_hours = Column(Float)
    checklist_items = Column(JSON)  # List of checklist items
    required_fields = Column(JSON)  # List of required field names
    default_assignee_role = Column(String(50))
    
    # Workflow integration
    workflow_template_id = Column(String, ForeignKey("workflow_templates.id"))
    auto_assign = Column(Boolean, default=False)
    auto_start = Column(Boolean, default=False)
    
    # Dependencies and prerequisites
    prerequisite_tasks = Column(JSON)  # List of prerequisite task template IDs
    follow_up_tasks = Column(JSON)  # List of follow-up task template IDs
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    average_completion_hours = Column(Float)
    
    # Template properties
    is_active = Column(Boolean, default=True)
    is_system_template = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    tags = Column(JSON)  # List of tags for categorization
    
    # User and organization
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"))
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    workflow_template = relationship("WorkflowTemplate", back_populates="task_templates")
    created_by_user = relationship("User", foreign_keys=[created_by])
    task_instances = relationship("Task", back_populates="task_template")
    
    def __repr__(self):
        return f"<TaskTemplate(id='{self.id}', name='{self.name}', type='{self.task_type}')>"

class WorkflowTemplate(Base):
    """Model for workflow templates"""
    __tablename__ = "workflow_templates"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    task_type = Column(String(50), nullable=False, index=True)
    version = Column(String(20), default="1.0")
    
    # Workflow configuration
    steps = Column(JSON, nullable=False)  # List of workflow steps
    triggers = Column(JSON)  # List of workflow triggers
    conditions = Column(JSON)  # Conditional logic for workflow execution
    parallel_execution = Column(Boolean, default=False)
    
    # SLA configuration
    sla_hours = Column(Integer)  # Total SLA for workflow
    warning_hours = Column(Integer)  # Hours before SLA to warn
    escalation_rules = Column(JSON)  # Escalation rules
    
    # Workflow properties
    is_active = Column(Boolean, default=True)
    is_system_template = Column(Boolean, default=False)
    allows_skipping = Column(Boolean, default=False)
    requires_approval = Column(Boolean, default=False)
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    average_execution_hours = Column(Float)
    
    # User and organization
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"))
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by])
    task_templates = relationship("TaskTemplate", back_populates="workflow_template")
    workflow_instances = relationship("WorkflowInstance", back_populates="template")
    
    def __repr__(self):
        return f"<WorkflowTemplate(id='{self.id}', name='{self.name}', type='{self.task_type}')>"

class WorkflowInstance(Base):
    """Model for workflow execution instances"""
    __tablename__ = "workflow_instances"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    template_id = Column(String, ForeignKey("workflow_templates.id"), nullable=False)
    
    # Instance state
    current_step_index = Column(Integer, default=0)
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.ACTIVE)
    progress_percentage = Column(Float, default=0.0)
    
    # Execution tracking
    started_at = Column(DateTime, default=func.now(), nullable=False)
    completed_at = Column(DateTime)
    paused_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    
    # Execution data
    execution_context = Column(JSON)  # Runtime context and variables
    step_results = Column(JSON)  # Results from completed steps
    error_log = Column(JSON)  # Errors encountered during execution
    
    # Performance metrics
    total_execution_time_minutes = Column(Integer)
    steps_completed = Column(Integer, default=0)
    steps_skipped = Column(Integer, default=0)
    steps_failed = Column(Integer, default=0)
    
    # User tracking
    initiated_by = Column(String, ForeignKey("users.id"), nullable=False)
    current_assignee = Column(String, ForeignKey("users.id"))
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    task = relationship("Task", back_populates="workflow_instances")
    template = relationship("WorkflowTemplate", back_populates="workflow_instances")
    initiated_by_user = relationship("User", foreign_keys=[initiated_by])
    current_assignee_user = relationship("User", foreign_keys=[current_assignee])
    step_executions = relationship("WorkflowStepExecution", back_populates="workflow_instance")
    
    def __repr__(self):
        return f"<WorkflowInstance(id='{self.id}', task_id='{self.task_id}', status='{self.status}')>"

class WorkflowStepExecution(Base):
    """Model for tracking individual workflow step execution"""
    __tablename__ = "workflow_step_executions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_instance_id = Column(String, ForeignKey("workflow_instances.id"), nullable=False)
    
    # Step information
    step_name = Column(String(255), nullable=False)
    step_index = Column(Integer, nullable=False)
    step_type = Column(String(50))  # manual, automated, approval, conditional
    required_role = Column(String(50))
    
    # Execution state
    status = Column(String(20), default="pending")  # pending, in_progress, completed, skipped, failed
    assigned_to = Column(String, ForeignKey("users.id"))
    
    # Timing
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    due_date = Column(DateTime)
    estimated_duration_minutes = Column(Integer)
    actual_duration_minutes = Column(Integer)
    
    # Execution data
    input_data = Column(JSON)  # Input parameters for the step
    output_data = Column(JSON)  # Results/output from the step
    notes = Column(Text)
    attachments = Column(JSON)  # List of attachment IDs
    
    # Approval workflow (if applicable)
    requires_approval = Column(Boolean, default=False)
    approved_by = Column(String, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    approval_notes = Column(Text)
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    workflow_instance = relationship("WorkflowInstance", back_populates="step_executions")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    
    def __repr__(self):
        return f"<WorkflowStepExecution(id='{self.id}', step='{self.step_name}', status='{self.status}')>"

class TaskSLA(Base):
    """Model for SLA configuration and tracking"""
    __tablename__ = "task_slas"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # SLA definition
    name = Column(String(255), nullable=False)
    description = Column(Text)
    task_type = Column(String(50), nullable=False, index=True)
    priority = Column(String(20), nullable=False, index=True)
    
    # SLA timing
    sla_hours = Column(Integer, nullable=False)
    warning_hours = Column(Integer, nullable=False)  # Hours before SLA breach to warn
    business_hours_only = Column(Boolean, default=False)
    exclude_weekends = Column(Boolean, default=False)
    exclude_holidays = Column(Boolean, default=False)
    
    # Escalation configuration
    auto_escalate = Column(Boolean, default=False)
    escalation_hours = Column(Integer)  # Hours after SLA breach to escalate
    escalation_target_role = Column(String(50))
    escalation_message = Column(Text)
    
    # Conditions
    conditions = Column(JSON)  # Additional conditions for SLA applicability
    exceptions = Column(JSON)  # Exception rules
    
    # Configuration
    is_active = Column(Boolean, default=True)
    is_system_sla = Column(Boolean, default=False)
    organization_id = Column(String, ForeignKey("organizations.id"))
    
    # Metadata
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by])
    sla_violations = relationship("SLAViolation", back_populates="sla_config")
    
    def __repr__(self):
        return f"<TaskSLA(id='{self.id}', task_type='{self.task_type}', priority='{self.priority}', hours={self.sla_hours})>"

class SLAViolation(Base):
    """Model for tracking SLA violations"""
    __tablename__ = "sla_violations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Violation details
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    sla_config_id = Column(String, ForeignKey("task_slas.id"))
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    
    # Timing
    sla_deadline = Column(DateTime, nullable=False)
    violation_detected_at = Column(DateTime, default=func.now(), nullable=False)
    hours_overdue = Column(Float, nullable=False)
    
    # Classification
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    violation_type = Column(String(50), default="sla_breach")  # sla_breach, warning_missed, escalation_needed
    
    # Status tracking
    status = Column(String(20), default="open")  # open, acknowledged, in_progress, resolved, closed
    acknowledged_by = Column(String, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime)
    resolved_by = Column(String, ForeignKey("users.id"))
    resolved_at = Column(DateTime)
    
    # Escalation tracking
    escalation_level = Column(SQLEnum(EscalationLevel), default=EscalationLevel.LEVEL_0)
    last_escalated_at = Column(DateTime)
    escalated_to = Column(String, ForeignKey("users.id"))
    escalation_count = Column(Integer, default=0)
    
    # Resolution
    resolution_notes = Column(Text)
    resolution_actions = Column(JSON)  # Actions taken to resolve
    prevention_measures = Column(Text)  # Measures to prevent recurrence
    
    # Impact assessment
    business_impact = Column(String(20))  # low, medium, high, critical
    cost_impact = Column(Float)  # Estimated cost of violation
    customer_impact = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    task = relationship("Task")
    sla_config = relationship("TaskSLA", back_populates="sla_violations")
    case = relationship("Case")
    acknowledged_by_user = relationship("User", foreign_keys=[acknowledged_by])
    resolved_by_user = relationship("User", foreign_keys=[resolved_by])
    escalated_to_user = relationship("User", foreign_keys=[escalated_to])
    
    def __repr__(self):
        return f"<SLAViolation(id='{self.id}', task_id='{self.task_id}', hours_overdue={self.hours_overdue})>"

class TaskEscalation(Base):
    """Model for tracking task escalations"""
    __tablename__ = "task_escalations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Escalation details
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    
    # Escalation trigger
    reason = Column(String(50), nullable=False)  # sla_violation, complexity, resource_constraint, manual_request
    trigger_event = Column(String(100))  # What triggered the escalation
    description = Column(Text, nullable=False)
    
    # Escalation path
    escalated_from = Column(String, ForeignKey("users.id"))  # Original assignee
    escalated_to = Column(String, ForeignKey("users.id"), nullable=False)  # New assignee
    escalated_by = Column(String, ForeignKey("users.id"), nullable=False)  # Who triggered escalation
    escalation_level = Column(SQLEnum(EscalationLevel), nullable=False)
    
    # Changes made
    old_priority = Column(String(20))
    new_priority = Column(String(20))
    old_due_date = Column(DateTime)
    new_due_date = Column(DateTime)
    additional_resources = Column(JSON)  # Additional resources assigned
    
    # Status and resolution
    status = Column(String(20), default="active")  # active, resolved, cancelled
    escalation_resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    
    # Effectiveness tracking
    was_effective = Column(Boolean)  # Was the escalation effective?
    impact_on_resolution = Column(Text)  # How did escalation impact resolution
    lessons_learned = Column(Text)
    
    # Approval (if required)
    requires_approval = Column(Boolean, default=False)
    approved_by = Column(String, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    approval_notes = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    task = relationship("Task", back_populates="escalations")
    case = relationship("Case")
    escalated_from_user = relationship("User", foreign_keys=[escalated_from])
    escalated_to_user = relationship("User", foreign_keys=[escalated_to])
    escalated_by_user = relationship("User", foreign_keys=[escalated_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    
    def __repr__(self):
        return f"<TaskEscalation(id='{self.id}', task_id='{self.task_id}', reason='{self.reason}')>"

class TaskDependency(Base):
    """Model for task dependencies"""
    __tablename__ = "task_dependencies"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Dependency relationship
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)  # Dependent task
    depends_on_task_id = Column(String, ForeignKey("tasks.id"), nullable=False)  # Prerequisite task
    
    # Dependency configuration
    dependency_type = Column(String(20), default="finish_to_start")  # finish_to_start, start_to_start, finish_to_finish, start_to_finish
    lag_hours = Column(Integer, default=0)  # Delay between tasks
    is_optional = Column(Boolean, default=False)  # Can be skipped if needed
    
    # Status tracking
    is_satisfied = Column(Boolean, default=False)  # Is the dependency satisfied?
    satisfied_at = Column(DateTime)  # When was the dependency satisfied?
    
    # Override capability
    can_override = Column(Boolean, default=False)
    overridden_by = Column(String, ForeignKey("users.id"))
    overridden_at = Column(DateTime)
    override_reason = Column(Text)
    
    # Metadata
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    task = relationship("Task", foreign_keys=[task_id], back_populates="dependencies")
    depends_on_task = relationship("Task", foreign_keys=[depends_on_task_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    overridden_by_user = relationship("User", foreign_keys=[overridden_by])
    
    def __repr__(self):
        return f"<TaskDependency(id='{self.id}', task='{self.task_id}', depends_on='{self.depends_on_task_id}')>"

class TaskComment(Base):
    """Model for task comments and updates"""
    __tablename__ = "task_comments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Comment details
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    comment = Column(Text, nullable=False)
    
    # Comment classification
    comment_type = Column(String(20), default="note")  # note, status_update, escalation, resolution, question, answer
    is_internal = Column(Boolean, default=True)  # Internal vs external comment
    is_system_comment = Column(Boolean, default=False)  # System-generated comment
    
    # Visibility and permissions
    visibility = Column(String(20), default="team")  # public, team, assignee_only, private
    mentioned_users = Column(JSON)  # List of user IDs mentioned in comment
    
    # Attachments
    attachments = Column(JSON)  # List of attachment file IDs
    
    # Threading
    parent_comment_id = Column(String, ForeignKey("task_comments.id"))
    thread_id = Column(String)  # For grouping related comments
    
    # Status tracking
    is_resolved = Column(Boolean, default=False)  # For questions/issues
    resolved_by = Column(String, ForeignKey("users.id"))
    resolved_at = Column(DateTime)
    
    # Reactions and feedback
    reactions = Column(JSON)  # Emoji reactions
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    
    # Editing history
    is_edited = Column(Boolean, default=False)
    edit_history = Column(JSON)  # History of edits
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    task = relationship("Task", back_populates="comments")
    user = relationship("User", foreign_keys=[user_id])
    resolved_by_user = relationship("User", foreign_keys=[resolved_by])
    parent_comment = relationship("TaskComment", remote_side=[id])
    
    def __repr__(self):
        return f"<TaskComment(id='{self.id}', task_id='{self.task_id}', type='{self.comment_type}')>"

class TaskTimeEntry(Base):
    """Model for time tracking on tasks"""
    __tablename__ = "task_time_entries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Time entry details
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Time tracking
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    duration_minutes = Column(Integer)  # Calculated duration
    is_running = Column(Boolean, default=False)  # Is timer currently running?
    
    # Work details
    work_description = Column(Text)
    activity_type = Column(String(50))  # research, analysis, documentation, communication, etc.
    work_category = Column(String(50))  # billable, non_billable, overhead, training
    
    # Billing information
    is_billable = Column(Boolean, default=False)
    hourly_rate = Column(Float)
    billing_amount = Column(Float)
    billing_notes = Column(Text)
    
    # Break tracking
    break_duration_minutes = Column(Integer, default=0)
    break_reasons = Column(JSON)  # List of break reasons
    
    # Productivity metrics
    productivity_score = Column(Float)  # Self-assessed or calculated productivity
    focus_interruptions = Column(Integer, default=0)  # Number of interruptions
    
    # Approval workflow
    requires_approval = Column(Boolean, default=False)
    approved_by = Column(String, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    approval_status = Column(String(20), default="pending")  # pending, approved, rejected
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    task = relationship("Task", back_populates="time_entries")
    user = relationship("User", foreign_keys=[user_id])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    
    def __repr__(self):
        return f"<TaskTimeEntry(id='{self.id}', task_id='{self.task_id}', duration={self.duration_minutes}min)>"

# Update the existing Task model to include new relationships
# This would be added to the existing Task model in app/models/task.py

"""
Additional relationships to add to the Task model:

# Workflow and template relationships
task_template_id = Column(String, ForeignKey("task_templates.id"))
task_template = relationship("TaskTemplate", back_populates="task_instances")
workflow_instances = relationship("WorkflowInstance", back_populates="task")

# Management relationships  
escalations = relationship("TaskEscalation", back_populates="task")
dependencies = relationship("TaskDependency", foreign_keys=[TaskDependency.task_id], back_populates="task")
comments = relationship("TaskComment", back_populates="task")
time_entries = relationship("TaskTimeEntry", back_populates="task")
"""