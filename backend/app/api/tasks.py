from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import json

from app.database import get_db
from app.models.task import Task
from app.models.case import Case
from app.models.user import User
from app.schemas.tasks import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskAssignment,
    TaskEscalation,
    WorkflowTemplate,
    WorkflowInstance,
    TaskSLA,
    TaskBulkAction,
    TaskFilter,
    TaskMetrics,
    WorkflowTrigger,
    TaskNotification
)
from app.utils.auth import get_current_user
from app.schemas.user import User as UserSchema
from app.utils.tasks import (
    create_workflow_instance,
    calculate_sla_deadline,
    check_sla_violations,
    escalate_overdue_tasks,
    assign_task_automatically,
    trigger_workflow,
    send_task_notification
)

router = APIRouter()

@router.post("/", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Create a new task with automatic workflow and SLA assignment"""
    
    # Verify case exists
    case = db.query(Case).filter(Case.id == task.case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Calculate SLA deadline based on task type and priority
    sla_deadline = calculate_sla_deadline(task.task_type, task.priority)
    
    # Create task in database
    db_task = Task(
        id=str(uuid.uuid4()),
        case_id=task.case_id,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        priority=task.priority,
        status="pending",
        assigned_to=task.assigned_to,
        created_by=current_user.id,
        due_date=task.due_date or sla_deadline,
        estimated_hours=task.estimated_hours,
        metadata=task.metadata or {},
        created_at=datetime.utcnow()
    )
    
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # Auto-assign if not manually assigned
    if not task.assigned_to:
        background_tasks.add_task(
            assign_task_automatically,
            db_task.id,
            task.task_type,
            case.priority,
            db
        )
    
    # Trigger workflow if configured
    if task.workflow_template_id:
        background_tasks.add_task(
            trigger_workflow,
            task.workflow_template_id,
            db_task.id,
            current_user.id,
            db
        )
    
    # Send notification
    background_tasks.add_task(
        send_task_notification,
        db_task.id,
        "task_created",
        current_user.id,
        db
    )
    
    return TaskResponse(
        id=db_task.id,
        case_id=db_task.case_id,
        title=db_task.title,
        description=db_task.description,
        task_type=db_task.task_type,
        priority=db_task.priority,
        status=db_task.status,
        assigned_to=db_task.assigned_to,
        created_by=db_task.created_by,
        due_date=db_task.due_date,
        estimated_hours=db_task.estimated_hours,
        actual_hours=db_task.actual_hours,
        completion_percentage=db_task.completion_percentage or 0,
        metadata=db_task.metadata or {},
        created_at=db_task.created_at,
        updated_at=db_task.updated_at,
        sla_status="within_sla" if db_task.due_date and db_task.due_date > datetime.utcnow() else "at_risk"
    )

@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    case_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    task_type: Optional[str] = None,
    sla_status: Optional[str] = None,
    overdue: Optional[bool] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """List tasks with filtering and SLA status"""
    
    query = db.query(Task)
    
    # Apply access control - users can only see their assigned tasks unless supervisor/admin
    if current_user.role not in ["supervisor", "admin"]:
        query = query.filter(
            (Task.assigned_to == current_user.id) | 
            (Task.created_by == current_user.id)
        )
    
    # Apply filters
    if case_id:
        query = query.filter(Task.case_id == case_id)
    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if task_type:
        query = query.filter(Task.task_type == task_type)
    if overdue is not None:
        if overdue:
            query = query.filter(Task.due_date < datetime.utcnow(), Task.status != "completed")
        else:
            query = query.filter(Task.due_date >= datetime.utcnow())
    
    tasks = query.offset(offset).limit(limit).all()
    
    # Calculate SLA status for each task
    task_responses = []
    for task in tasks:
        sla_status_value = "completed" if task.status == "completed" else (
            "overdue" if task.due_date and task.due_date < datetime.utcnow() else
            "at_risk" if task.due_date and task.due_date < datetime.utcnow() + timedelta(hours=24) else
            "within_sla"
        )
        
        # Apply SLA status filter
        if sla_status and sla_status != sla_status_value:
            continue
            
        task_responses.append(TaskResponse(
            id=task.id,
            case_id=task.case_id,
            title=task.title,
            description=task.description,
            task_type=task.task_type,
            priority=task.priority,
            status=task.status,
            assigned_to=task.assigned_to,
            created_by=task.created_by,
            due_date=task.due_date,
            estimated_hours=task.estimated_hours,
            actual_hours=task.actual_hours,
            completion_percentage=task.completion_percentage or 0,
            metadata=task.metadata or {},
            created_at=task.created_at,
            updated_at=task.updated_at,
            sla_status=sla_status_value
        ))
    
    return task_responses

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get specific task details"""
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check access permission
    if (current_user.role not in ["supervisor", "admin"] and 
        task.assigned_to != current_user.id and 
        task.created_by != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this task"
        )
    
    # Calculate SLA status
    sla_status_value = "completed" if task.status == "completed" else (
        "overdue" if task.due_date and task.due_date < datetime.utcnow() else
        "at_risk" if task.due_date and task.due_date < datetime.utcnow() + timedelta(hours=24) else
        "within_sla"
    )
    
    return TaskResponse(
        id=task.id,
        case_id=task.case_id,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        priority=task.priority,
        status=task.status,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        completion_percentage=task.completion_percentage or 0,
        metadata=task.metadata or {},
        created_at=task.created_at,
        updated_at=task.updated_at,
        sla_status=sla_status_value
    )

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Update task with automatic workflow progression"""
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permission - assigned user, creator, or supervisor/admin can update
    if (current_user.role not in ["supervisor", "admin"] and 
        task.assigned_to != current_user.id and 
        task.created_by != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this task"
        )
    
    # Track status change for workflow triggers
    old_status = task.status
    
    # Update task fields
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    task.updated_at = datetime.utcnow()
    
    # Auto-complete if completion percentage is 100%
    if task_update.completion_percentage == 100 and task.status != "completed":
        task.status = "completed"
        task.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(task)
    
    # Trigger workflow progression if status changed
    if old_status != task.status:
        background_tasks.add_task(
            trigger_workflow,
            None,  # No specific template, use status-based progression
            task.id,
            current_user.id,
            db
        )
    
    # Send notification for status changes
    if old_status != task.status:
        background_tasks.add_task(
            send_task_notification,
            task.id,
            "task_updated",
            current_user.id,
            db
        )
    
    # Calculate SLA status
    sla_status_value = "completed" if task.status == "completed" else (
        "overdue" if task.due_date and task.due_date < datetime.utcnow() else
        "at_risk" if task.due_date and task.due_date < datetime.utcnow() + timedelta(hours=24) else
        "within_sla"
    )
    
    return TaskResponse(
        id=task.id,
        case_id=task.case_id,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        priority=task.priority,
        status=task.status,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        completion_percentage=task.completion_percentage or 0,
        metadata=task.metadata or {},
        created_at=task.created_at,
        updated_at=task.updated_at,
        sla_status=sla_status_value
    )

@router.post("/{task_id}/assign", response_model=TaskResponse)
async def assign_task(
    task_id: str,
    assignment: TaskAssignment,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Assign task to a user with notification"""
    
    # Check permission - only supervisors, admins, or task creators can reassign
    if current_user.role not in ["supervisor", "admin"]:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task or task.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to assign this task"
            )
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Verify assignee exists
    assignee = db.query(User).filter(User.id == assignment.assigned_to).first()
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned user not found"
        )
    
    old_assignee = task.assigned_to
    task.assigned_to = assignment.assigned_to
    task.updated_at = datetime.utcnow()
    
    # Update status if specified
    if assignment.status:
        task.status = assignment.status
    
    # Add assignment reason to metadata
    if not task.metadata:
        task.metadata = {}
    task.metadata["assignment_history"] = task.metadata.get("assignment_history", [])
    task.metadata["assignment_history"].append({
        "assigned_by": current_user.id,
        "assigned_to": assignment.assigned_to,
        "assigned_at": datetime.utcnow().isoformat(),
        "reason": assignment.reason
    })
    
    db.commit()
    db.refresh(task)
    
    # Send notifications to old and new assignees
    if old_assignee:
        background_tasks.add_task(
            send_task_notification,
            task.id,
            "task_unassigned",
            old_assignee,
            db
        )
    
    background_tasks.add_task(
        send_task_notification,
        task.id,
        "task_assigned",
        assignment.assigned_to,
        db
    )
    
    # Calculate SLA status
    sla_status_value = "completed" if task.status == "completed" else (
        "overdue" if task.due_date and task.due_date < datetime.utcnow() else
        "at_risk" if task.due_date and task.due_date < datetime.utcnow() + timedelta(hours=24) else
        "within_sla"
    )
    
    return TaskResponse(
        id=task.id,
        case_id=task.case_id,
        title=task.title,
        description=task.description,
        task_type=task.task_type,
        priority=task.priority,
        status=task.status,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        completion_percentage=task.completion_percentage or 0,
        metadata=task.metadata or {},
        created_at=task.created_at,
        updated_at=task.updated_at,
        sla_status=sla_status_value
    )

@router.post("/{task_id}/escalate")
async def escalate_task(
    task_id: str,
    escalation: TaskEscalation,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Escalate task to supervisor or higher priority"""
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permission
    if (current_user.role not in ["supervisor", "admin"] and 
        task.assigned_to != current_user.id and 
        task.created_by != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to escalate this task"
        )
    
    # Update task priority and add escalation metadata
    if escalation.new_priority:
        task.priority = escalation.new_priority
    
    if escalation.new_assignee:
        task.assigned_to = escalation.new_assignee
    
    # Add escalation to metadata
    if not task.metadata:
        task.metadata = {}
    task.metadata["escalations"] = task.metadata.get("escalations", [])
    task.metadata["escalations"].append({
        "escalated_by": current_user.id,
        "escalated_to": escalation.new_assignee,
        "escalated_at": datetime.utcnow().isoformat(),
        "reason": escalation.reason,
        "old_priority": task.priority,
        "new_priority": escalation.new_priority
    })
    
    task.updated_at = datetime.utcnow()
    db.commit()
    
    # Send escalation notifications
    background_tasks.add_task(
        send_task_notification,
        task.id,
        "task_escalated",
        escalation.new_assignee or task.assigned_to,
        db
    )
    
    return {"message": "Task escalated successfully"}

@router.post("/bulk-action")
async def bulk_task_action(
    bulk_action: TaskBulkAction,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Perform bulk actions on multiple tasks"""
    
    # Check permissions
    if current_user.role not in ["supervisor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supervisors and administrators can perform bulk actions"
        )
    
    # Get tasks
    tasks = db.query(Task).filter(Task.id.in_(bulk_action.task_ids)).all()
    if len(tasks) != len(bulk_action.task_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some tasks not found"
        )
    
    updated_count = 0
    
    for task in tasks:
        if bulk_action.action == "assign" and bulk_action.assigned_to:
            task.assigned_to = bulk_action.assigned_to
            updated_count += 1
        elif bulk_action.action == "update_status" and bulk_action.status:
            task.status = bulk_action.status
            if bulk_action.status == "completed":
                task.completed_at = datetime.utcnow()
                task.completion_percentage = 100
            updated_count += 1
        elif bulk_action.action == "update_priority" and bulk_action.priority:
            task.priority = bulk_action.priority
            updated_count += 1
        elif bulk_action.action == "extend_deadline" and bulk_action.extension_hours:
            if task.due_date:
                task.due_date += timedelta(hours=bulk_action.extension_hours)
                updated_count += 1
        
        task.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Send notifications for bulk actions
    for task in tasks:
        background_tasks.add_task(
            send_task_notification,
            task.id,
            f"task_{bulk_action.action}",
            task.assigned_to,
            db
        )
    
    return {
        "message": f"Bulk action '{bulk_action.action}' applied to {updated_count} tasks",
        "updated_count": updated_count
    }

@router.get("/metrics/dashboard", response_model=TaskMetrics)
async def get_task_metrics(
    case_id: Optional[str] = None,
    user_id: Optional[str] = None,
    period_days: int = 30,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get task metrics and dashboard data"""
    
    # Check permissions for user-specific metrics
    if user_id and user_id != current_user.id and current_user.role not in ["supervisor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view other users' metrics"
        )
    
    # Calculate date range
    start_date = datetime.utcnow() - timedelta(days=period_days)
    
    # Base query
    query = db.query(Task).filter(Task.created_at >= start_date)
    
    # Apply filters
    if case_id:
        query = query.filter(Task.case_id == case_id)
    if user_id:
        query = query.filter(Task.assigned_to == user_id)
    elif current_user.role not in ["supervisor", "admin"]:
        query = query.filter(Task.assigned_to == current_user.id)
    
    tasks = query.all()
    
    # Calculate metrics
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == "completed"])
    overdue_tasks = len([t for t in tasks if t.due_date and t.due_date < datetime.utcnow() and t.status != "completed"])
    in_progress_tasks = len([t for t in tasks if t.status == "in_progress"])
    
    # SLA metrics
    within_sla = 0
    at_risk = 0
    sla_violated = 0
    
    for task in tasks:
        if task.status == "completed":
            if task.completed_at and task.due_date and task.completed_at <= task.due_date:
                within_sla += 1
            else:
                sla_violated += 1
        elif task.due_date:
            if task.due_date < datetime.utcnow():
                sla_violated += 1
            elif task.due_date < datetime.utcnow() + timedelta(hours=24):
                at_risk += 1
            else:
                within_sla += 1
    
    # Average completion time
    completed_with_times = [
        t for t in tasks 
        if t.status == "completed" and t.completed_at and t.created_at
    ]
    avg_completion_hours = 0
    if completed_with_times:
        total_hours = sum([
            (t.completed_at - t.created_at).total_seconds() / 3600 
            for t in completed_with_times
        ])
        avg_completion_hours = total_hours / len(completed_with_times)
    
    # Task type distribution
    task_type_counts = {}
    for task in tasks:
        task_type_counts[task.task_type] = task_type_counts.get(task.task_type, 0) + 1
    
    # Priority distribution
    priority_counts = {}
    for task in tasks:
        priority_counts[task.priority] = priority_counts.get(task.priority, 0) + 1
    
    return TaskMetrics(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        in_progress_tasks=in_progress_tasks,
        overdue_tasks=overdue_tasks,
        completion_rate=completed_tasks / total_tasks * 100 if total_tasks > 0 else 0,
        sla_compliance_rate=within_sla / total_tasks * 100 if total_tasks > 0 else 0,
        average_completion_hours=round(avg_completion_hours, 2),
        tasks_within_sla=within_sla,
        tasks_at_risk=at_risk,
        tasks_sla_violated=sla_violated,
        task_type_distribution=task_type_counts,
        priority_distribution=priority_counts,
        period_start=start_date,
        period_end=datetime.utcnow()
    )

@router.get("/sla/violations")
async def get_sla_violations(
    days_back: int = 7,
    include_resolved: bool = False,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get SLA violations for monitoring"""
    
    if current_user.role not in ["supervisor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supervisors and administrators can view SLA violations"
        )
    
    start_date = datetime.utcnow() - timedelta(days=days_back)
    
    query = db.query(Task).filter(
        Task.created_at >= start_date,
        Task.due_date < datetime.utcnow()
    )
    
    if not include_resolved:
        query = query.filter(Task.status != "completed")
    
    violations = query.all()
    
    violation_data = []
    for task in violations:
        hours_overdue = (datetime.utcnow() - task.due_date).total_seconds() / 3600
        violation_data.append({
            "task_id": task.id,
            "case_id": task.case_id,
            "title": task.title,
            "assigned_to": task.assigned_to,
            "priority": task.priority,
            "task_type": task.task_type,
            "due_date": task.due_date,
            "hours_overdue": round(hours_overdue, 1),
            "status": task.status
        })
    
    return {
        "violations": violation_data,
        "total_violations": len(violation_data),
        "period_start": start_date,
        "period_end": datetime.utcnow()
    }

@router.post("/sla/escalate-overdue")
async def escalate_overdue_tasks_endpoint(
    hours_overdue_threshold: int = 24,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Automatically escalate overdue tasks"""
    
    if current_user.role not in ["supervisor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supervisors and administrators can escalate overdue tasks"
        )
    
    # Queue escalation background task
    background_tasks.add_task(
        escalate_overdue_tasks,
        hours_overdue_threshold,
        current_user.id,
        db
    )
    
    return {"message": f"Escalation process started for tasks overdue by {hours_overdue_threshold} hours"}

@router.get("/workflow/templates", response_model=List[WorkflowTemplate])
async def list_workflow_templates(
    task_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """List available workflow templates"""
    
    # Return sample workflow templates (in real implementation, these would be stored in database)
    templates = [
        WorkflowTemplate(
            id=str(uuid.uuid4()),
            name="Standard Case Investigation",
            description="Standard workflow for case investigation tasks",
            task_type="investigation",
            steps=[
                {"name": "Initial Assessment", "duration_hours": 4, "role": "investigator"},
                {"name": "Evidence Collection", "duration_hours": 8, "role": "investigator"},
                {"name": "Analysis", "duration_hours": 16, "role": "forensic"},
                {"name": "Report Generation", "duration_hours": 4, "role": "investigator"},
                {"name": "Review", "duration_hours": 2, "role": "supervisor"}
            ],
            triggers=[
                {"event": "task_created", "action": "assign_to_role", "params": {"role": "investigator"}},
                {"event": "step_completed", "action": "notify_next_assignee", "params": {}}
            ],
            is_active=True,
            created_at=datetime.utcnow()
        ),
        WorkflowTemplate(
            id=str(uuid.uuid4()),
            name="Evidence Processing",
            description="Workflow for digital evidence processing",
            task_type="forensic_analysis",
            steps=[
                {"name": "Evidence Intake", "duration_hours": 2, "role": "forensic"},
                {"name": "Imaging", "duration_hours": 4, "role": "forensic"},
                {"name": "Analysis", "duration_hours": 12, "role": "forensic"},
                {"name": "Report Writing", "duration_hours": 6, "role": "forensic"},
                {"name": "Quality Review", "duration_hours": 2, "role": "supervisor"}
            ],
            triggers=[
                {"event": "task_created", "action": "assign_to_role", "params": {"role": "forensic"}},
                {"event": "sla_warning", "action": "escalate", "params": {"hours_before": 24}}
            ],
            is_active=True,
            created_at=datetime.utcnow()
        )
    ]
    
    if task_type:
        templates = [t for t in templates if t.task_type == task_type]
    
    return templates

@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Delete a task (soft delete)"""
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permission - only creator, supervisor, or admin can delete
    if (current_user.role not in ["supervisor", "admin"] and 
        task.created_by != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this task"
        )
    
    # Soft delete by updating status
    task.status = "cancelled"
    task.updated_at = datetime.utcnow()
    
    # Add deletion info to metadata
    if not task.metadata:
        task.metadata = {}
    task.metadata["deleted_by"] = current_user.id
    task.metadata["deleted_at"] = datetime.utcnow().isoformat()
    
    db.commit()
    
    return {"message": "Task deleted successfully"}