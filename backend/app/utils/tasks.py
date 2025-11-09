import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import json
import logging

from app.models.task import Task
from app.models.case import Case
from app.models.user import User
from app.schemas.tasks import TaskType, TaskPriority, TaskStatus, SLAStatus

logger = logging.getLogger(__name__)

# SLA Configuration - Base SLA times in hours by task type and priority
SLA_MATRIX = {
    "investigation": {
        "critical": 4,    # 4 hours
        "urgent": 8,      # 8 hours
        "high": 24,       # 1 day
        "medium": 72,     # 3 days
        "low": 168        # 1 week
    },
    "forensic_analysis": {
        "critical": 8,    # 8 hours
        "urgent": 24,     # 1 day
        "high": 72,       # 3 days
        "medium": 168,    # 1 week
        "low": 336        # 2 weeks
    },
    "evidence_collection": {
        "critical": 2,    # 2 hours
        "urgent": 4,      # 4 hours
        "high": 12,       # 12 hours
        "medium": 48,     # 2 days
        "low": 120        # 5 days
    },
    "interview": {
        "critical": 6,    # 6 hours
        "urgent": 12,     # 12 hours
        "high": 48,       # 2 days
        "medium": 120,    # 5 days
        "low": 240        # 10 days
    },
    "documentation": {
        "critical": 4,    # 4 hours
        "urgent": 12,     # 12 hours
        "high": 24,       # 1 day
        "medium": 72,     # 3 days
        "low": 168        # 1 week
    },
    "legal_review": {
        "critical": 8,    # 8 hours
        "urgent": 24,     # 1 day
        "high": 72,       # 3 days
        "medium": 168,    # 1 week
        "low": 336        # 2 weeks
    },
    "court_preparation": {
        "critical": 12,   # 12 hours
        "urgent": 48,     # 2 days
        "high": 120,      # 5 days
        "medium": 240,    # 10 days
        "low": 480        # 20 days
    },
    "follow_up": {
        "critical": 2,    # 2 hours
        "urgent": 8,      # 8 hours
        "high": 24,       # 1 day
        "medium": 72,     # 3 days
        "low": 168        # 1 week
    },
    "administrative": {
        "critical": 1,    # 1 hour
        "urgent": 4,      # 4 hours
        "high": 12,       # 12 hours
        "medium": 48,     # 2 days
        "low": 120        # 5 days
    },
    "quality_assurance": {
        "critical": 6,    # 6 hours
        "urgent": 12,     # 12 hours
        "high": 24,       # 1 day
        "medium": 72,     # 3 days
        "low": 168        # 1 week
    }
}

# Role-based task assignment rules
ROLE_TASK_ASSIGNMENT = {
    "investigation": ["investigator", "supervisor"],
    "forensic_analysis": ["forensic", "supervisor"],
    "evidence_collection": ["investigator", "forensic"],
    "interview": ["investigator", "prosecutor"],
    "documentation": ["investigator", "forensic", "prosecutor"],
    "legal_review": ["prosecutor", "supervisor"],
    "court_preparation": ["prosecutor"],
    "follow_up": ["investigator", "liaison"],
    "administrative": ["intake", "admin"],
    "quality_assurance": ["supervisor", "admin"]
}

# Workflow templates configuration
WORKFLOW_TEMPLATES = {
    "standard_investigation": {
        "name": "Standard Case Investigation",
        "steps": [
            {"name": "Initial Assessment", "duration_hours": 4, "role": "investigator", "order": 1},
            {"name": "Evidence Planning", "duration_hours": 2, "role": "investigator", "order": 2},
            {"name": "Evidence Collection", "duration_hours": 8, "role": "investigator", "order": 3},
            {"name": "Digital Analysis", "duration_hours": 16, "role": "forensic", "order": 4},
            {"name": "Report Generation", "duration_hours": 4, "role": "investigator", "order": 5},
            {"name": "Quality Review", "duration_hours": 2, "role": "supervisor", "order": 6}
        ]
    },
    "forensic_processing": {
        "name": "Digital Evidence Processing",
        "steps": [
            {"name": "Evidence Intake", "duration_hours": 2, "role": "forensic", "order": 1},
            {"name": "Device Imaging", "duration_hours": 4, "role": "forensic", "order": 2},
            {"name": "Data Recovery", "duration_hours": 8, "role": "forensic", "order": 3},
            {"name": "Analysis", "duration_hours": 16, "role": "forensic", "order": 4},
            {"name": "Report Writing", "duration_hours": 6, "role": "forensic", "order": 5},
            {"name": "Peer Review", "duration_hours": 2, "role": "supervisor", "order": 6}
        ]
    }
}

def calculate_sla_deadline(task_type: str, priority: str, created_at: Optional[datetime] = None) -> datetime:
    """Calculate SLA deadline for a task based on type and priority"""
    
    if not created_at:
        created_at = datetime.utcnow()
    
    # Get base SLA hours from matrix
    sla_hours = SLA_MATRIX.get(task_type, {}).get(priority.lower(), 72)  # Default to 3 days
    
    # Calculate deadline
    deadline = created_at + timedelta(hours=sla_hours)
    
    logger.info(f"Calculated SLA deadline for {task_type}/{priority}: {deadline}")
    return deadline

def get_sla_status(task: Task) -> SLAStatus:
    """Get current SLA status for a task"""
    
    if task.status == "completed":
        if task.completed_at and task.due_date:
            return SLAStatus.COMPLETED if task.completed_at <= task.due_date else SLAStatus.OVERDUE
        return SLAStatus.COMPLETED
    
    if not task.due_date:
        return SLAStatus.WITHIN_SLA
    
    now = datetime.utcnow()
    time_to_deadline = task.due_date - now
    
    if time_to_deadline.total_seconds() <= 0:
        return SLAStatus.OVERDUE
    elif time_to_deadline.total_seconds() <= 24 * 3600:  # 24 hours
        return SLAStatus.AT_RISK
    else:
        return SLAStatus.WITHIN_SLA

def check_sla_violations(db: Session, days_back: int = 1) -> List[Dict[str, Any]]:
    """Check for SLA violations in the past N days"""
    
    cutoff_date = datetime.utcnow() - timedelta(days=days_back)
    
    # Query overdue tasks
    overdue_tasks = db.query(Task).filter(
        Task.due_date < datetime.utcnow(),
        Task.status != "completed",
        Task.created_at >= cutoff_date
    ).all()
    
    violations = []
    for task in overdue_tasks:
        hours_overdue = (datetime.utcnow() - task.due_date).total_seconds() / 3600
        violations.append({
            "task_id": task.id,
            "case_id": task.case_id,
            "title": task.title,
            "assigned_to": task.assigned_to,
            "hours_overdue": round(hours_overdue, 1),
            "priority": task.priority,
            "task_type": task.task_type,
            "due_date": task.due_date
        })
    
    logger.info(f"Found {len(violations)} SLA violations in the past {days_back} days")
    return violations

def assign_task_automatically(task_id: str, task_type: str, case_priority: str, db: Session) -> Optional[str]:
    """Automatically assign a task to the most suitable user"""
    
    try:
        # Get eligible roles for this task type
        eligible_roles = ROLE_TASK_ASSIGNMENT.get(task_type, [])
        if not eligible_roles:
            logger.warning(f"No eligible roles found for task type: {task_type}")
            return None
        
        # Query users with eligible roles, prioritizing by availability and workload
        users = db.query(User).filter(
            User.role.in_(eligible_roles),
            User.is_active == True
        ).all()
        
        if not users:
            logger.warning(f"No active users found for roles: {eligible_roles}")
            return None
        
        # Simple assignment logic - find user with least active tasks
        user_workloads = {}
        for user in users:
            active_tasks = db.query(Task).filter(
                Task.assigned_to == user.id,
                Task.status.in_(["pending", "assigned", "in_progress"])
            ).count()
            user_workloads[user.id] = active_tasks
        
        # Assign to user with lowest workload
        assigned_user_id = min(user_workloads, key=user_workloads.get)
        
        # Update task assignment
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.assigned_to = assigned_user_id
            task.status = "assigned"
            db.commit()
            
            logger.info(f"Auto-assigned task {task_id} to user {assigned_user_id}")
            return assigned_user_id
        
    except Exception as e:
        logger.error(f"Error auto-assigning task {task_id}: {str(e)}")
        db.rollback()
    
    return None

def escalate_overdue_tasks(hours_threshold: int, escalated_by: str, db: Session) -> Dict[str, Any]:
    """Escalate tasks that are overdue by specified hours"""
    
    try:
        threshold_time = datetime.utcnow() - timedelta(hours=hours_threshold)
        
        # Find overdue tasks that haven't been escalated recently
        overdue_tasks = db.query(Task).filter(
            Task.due_date < threshold_time,
            Task.status.in_(["assigned", "in_progress", "pending"]),
            # Add condition to avoid re-escalating recently escalated tasks
        ).all()
        
        escalated_count = 0
        escalation_errors = []
        
        for task in overdue_tasks:
            try:
                # Check if already escalated recently
                metadata = task.metadata or {}
                escalations = metadata.get("escalations", [])
                
                # Skip if escalated in last 24 hours
                recent_escalation = False
                for escalation in escalations:
                    escalated_at = datetime.fromisoformat(escalation.get("escalated_at", ""))
                    if (datetime.utcnow() - escalated_at).total_seconds() < 24 * 3600:
                        recent_escalation = True
                        break
                
                if recent_escalation:
                    continue
                
                # Find supervisor for escalation
                case = db.query(Case).filter(Case.id == task.case_id).first()
                supervisor = db.query(User).filter(User.role == "supervisor").first()
                
                if not supervisor:
                    escalation_errors.append(f"No supervisor found for task {task.id}")
                    continue
                
                # Escalate task
                old_assignee = task.assigned_to
                task.assigned_to = supervisor.id
                task.priority = escalate_priority(task.priority)
                task.status = "escalated"
                
                # Update metadata
                if not task.metadata:
                    task.metadata = {}
                if "escalations" not in task.metadata:
                    task.metadata["escalations"] = []
                
                task.metadata["escalations"].append({
                    "escalated_by": escalated_by,
                    "escalated_to": supervisor.id,
                    "escalated_at": datetime.utcnow().isoformat(),
                    "reason": "sla_violation",
                    "old_assignee": old_assignee,
                    "hours_overdue": (datetime.utcnow() - task.due_date).total_seconds() / 3600
                })
                
                task.updated_at = datetime.utcnow()
                escalated_count += 1
                
                logger.info(f"Escalated overdue task {task.id} to supervisor {supervisor.id}")
                
            except Exception as e:
                error_msg = f"Error escalating task {task.id}: {str(e)}"
                escalation_errors.append(error_msg)
                logger.error(error_msg)
        
        db.commit()
        
        return {
            "escalated_count": escalated_count,
            "total_overdue": len(overdue_tasks),
            "errors": escalation_errors,
            "threshold_hours": hours_threshold
        }
        
    except Exception as e:
        logger.error(f"Error in bulk escalation process: {str(e)}")
        db.rollback()
        return {
            "escalated_count": 0,
            "total_overdue": 0,
            "errors": [f"Bulk escalation failed: {str(e)}"],
            "threshold_hours": hours_threshold
        }

def escalate_priority(current_priority: str) -> str:
    """Escalate task priority to next level"""
    priority_escalation = {
        "low": "medium",
        "medium": "high",
        "high": "urgent",
        "urgent": "critical",
        "critical": "critical"  # Can't escalate beyond critical
    }
    return priority_escalation.get(current_priority.lower(), "high")

def create_workflow_instance(template_id: str, task_id: str, user_id: str, db: Session) -> Optional[str]:
    """Create a new workflow instance from a template"""
    
    try:
        template = WORKFLOW_TEMPLATES.get(template_id)
        if not template:
            logger.warning(f"Workflow template {template_id} not found")
            return None
        
        workflow_instance = {
            "id": str(uuid.uuid4()),
            "task_id": task_id,
            "template_id": template_id,
            "template_name": template["name"],
            "current_step_index": 0,
            "status": "active",
            "started_at": datetime.utcnow().isoformat(),
            "steps": [],
            "context": {}
        }
        
        # Initialize steps
        for i, step in enumerate(template["steps"]):
            workflow_step = {
                "index": i,
                "name": step["name"],
                "role": step["role"],
                "duration_hours": step["duration_hours"],
                "status": "pending" if i == 0 else "waiting",
                "assigned_to": None,
                "started_at": None,
                "completed_at": None,
                "result": {}
            }
            workflow_instance["steps"].append(workflow_step)
        
        # Auto-assign first step if possible
        first_step = workflow_instance["steps"][0]
        assigned_user = assign_step_to_role(first_step["role"], db)
        if assigned_user:
            first_step["assigned_to"] = assigned_user
            first_step["status"] = "assigned"
        
        # Store workflow instance (in real implementation, this would be stored in database)
        # For now, we'll add it to the task metadata
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            if not task.metadata:
                task.metadata = {}
            task.metadata["workflow_instance"] = workflow_instance
            db.commit()
            
            logger.info(f"Created workflow instance {workflow_instance['id']} for task {task_id}")
            return workflow_instance["id"]
        
    except Exception as e:
        logger.error(f"Error creating workflow instance: {str(e)}")
        db.rollback()
    
    return None

def trigger_workflow(template_id: Optional[str], task_id: str, user_id: str, db: Session) -> bool:
    """Trigger workflow progression or automation"""
    
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return False
        
        # If no template specified, handle status-based progression
        if not template_id:
            return handle_status_progression(task, user_id, db)
        
        # Handle template-based workflow
        workflow_instance = task.metadata.get("workflow_instance") if task.metadata else None
        if not workflow_instance:
            # Create new workflow instance
            return create_workflow_instance(template_id, task_id, user_id, db) is not None
        
        # Progress existing workflow
        return progress_workflow_instance(workflow_instance, task, user_id, db)
        
    except Exception as e:
        logger.error(f"Error triggering workflow for task {task_id}: {str(e)}")
        return False

def handle_status_progression(task: Task, user_id: str, db: Session) -> bool:
    """Handle automatic progression based on task status changes"""
    
    try:
        # Auto-progression rules based on status
        if task.status == "completed":
            # Check if this completes any dependent tasks
            dependent_tasks = db.query(Task).filter(
                Task.metadata.op('->>')('depends_on') == task.id,
                Task.status == "pending"
            ).all()
            
            for dep_task in dependent_tasks:
                dep_task.status = "assigned"
                send_task_notification(dep_task.id, "dependency_completed", dep_task.assigned_to, db)
        
        elif task.status == "in_progress" and task.assigned_to:
            # Send notification to assignee
            send_task_notification(task.id, "task_started", task.assigned_to, db)
        
        db.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error in status progression for task {task.id}: {str(e)}")
        db.rollback()
        return False

def progress_workflow_instance(workflow_instance: Dict[str, Any], task: Task, user_id: str, db: Session) -> bool:
    """Progress a workflow instance to the next step"""
    
    try:
        current_step_index = workflow_instance["current_step_index"]
        steps = workflow_instance["steps"]
        
        if current_step_index >= len(steps):
            # Workflow completed
            workflow_instance["status"] = "completed"
            workflow_instance["completed_at"] = datetime.utcnow().isoformat()
            task.status = "completed"
            task.completed_at = datetime.utcnow()
        else:
            # Progress to next step
            current_step = steps[current_step_index]
            
            if current_step["status"] == "completed":
                # Move to next step
                workflow_instance["current_step_index"] += 1
                
                if workflow_instance["current_step_index"] < len(steps):
                    next_step = steps[workflow_instance["current_step_index"]]
                    next_step["status"] = "assigned"
                    next_step["started_at"] = datetime.utcnow().isoformat()
                    
                    # Auto-assign next step
                    assigned_user = assign_step_to_role(next_step["role"], db)
                    if assigned_user:
                        next_step["assigned_to"] = assigned_user
                        send_task_notification(task.id, "workflow_step_assigned", assigned_user, db)
        
        # Update task metadata
        if not task.metadata:
            task.metadata = {}
        task.metadata["workflow_instance"] = workflow_instance
        task.updated_at = datetime.utcnow()
        
        db.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error progressing workflow instance: {str(e)}")
        db.rollback()
        return False

def assign_step_to_role(role: str, db: Session) -> Optional[str]:
    """Assign a workflow step to a user with the specified role"""
    
    try:
        # Find users with the required role
        users = db.query(User).filter(
            User.role == role,
            User.is_active == True
        ).all()
        
        if not users:
            return None
        
        # Simple assignment - find user with least active tasks
        user_workloads = {}
        for user in users:
            active_tasks = db.query(Task).filter(
                Task.assigned_to == user.id,
                Task.status.in_(["assigned", "in_progress"])
            ).count()
            user_workloads[user.id] = active_tasks
        
        return min(user_workloads, key=user_workloads.get)
        
    except Exception as e:
        logger.error(f"Error assigning step to role {role}: {str(e)}")
        return None

def send_task_notification(task_id: str, notification_type: str, user_id: str, db: Session) -> bool:
    """Send task-related notification to user"""
    
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return False
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Notification content based on type
        notification_content = get_notification_content(notification_type, task, user)
        
        # In a real implementation, this would integrate with the notification system
        # For now, we'll just log the notification
        logger.info(f"Task notification: {notification_type} for task {task_id} to user {user_id}")
        logger.info(f"Content: {notification_content['title']} - {notification_content['message']}")
        
        # Could integrate with existing notification system here
        # from app.utils.notifications import send_notification
        # send_notification(user_id, notification_content)
        
        return True
        
    except Exception as e:
        logger.error(f"Error sending task notification: {str(e)}")
        return False

def get_notification_content(notification_type: str, task: Task, user: User) -> Dict[str, str]:
    """Get notification content based on type and context"""
    
    case_info = f"Case: {task.case_id}" if task.case_id else ""
    
    content_map = {
        "task_created": {
            "title": "New Task Created",
            "message": f"A new task '{task.title}' has been created. {case_info}"
        },
        "task_assigned": {
            "title": "Task Assigned to You",
            "message": f"You have been assigned task '{task.title}'. Due: {task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else 'No deadline'}"
        },
        "task_unassigned": {
            "title": "Task Unassigned",
            "message": f"Task '{task.title}' has been reassigned to another user."
        },
        "task_updated": {
            "title": "Task Updated",
            "message": f"Task '{task.title}' has been updated. Current status: {task.status}"
        },
        "task_escalated": {
            "title": "Task Escalated",
            "message": f"Task '{task.title}' has been escalated to you due to priority or SLA concerns."
        },
        "task_completed": {
            "title": "Task Completed",
            "message": f"Task '{task.title}' has been marked as completed."
        },
        "sla_warning": {
            "title": "SLA Warning",
            "message": f"Task '{task.title}' is approaching its SLA deadline. Due: {task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else 'Unknown'}"
        },
        "sla_violation": {
            "title": "SLA Violation",
            "message": f"Task '{task.title}' has exceeded its SLA deadline and requires immediate attention."
        },
        "dependency_completed": {
            "title": "Task Dependency Completed",
            "message": f"A dependency for task '{task.title}' has been completed. The task is now ready to start."
        },
        "workflow_step_assigned": {
            "title": "Workflow Step Assigned",
            "message": f"You have been assigned the next step in the workflow for task '{task.title}'."
        }
    }
    
    return content_map.get(notification_type, {
        "title": "Task Notification",
        "message": f"Update for task '{task.title}'"
    })

def calculate_task_metrics(user_id: Optional[str], case_id: Optional[str], period_days: int, db: Session) -> Dict[str, Any]:
    """Calculate comprehensive task metrics"""
    
    try:
        start_date = datetime.utcnow() - timedelta(days=period_days)
        
        # Base query
        query = db.query(Task).filter(Task.created_at >= start_date)
        
        # Apply filters
        if user_id:
            query = query.filter(Task.assigned_to == user_id)
        if case_id:
            query = query.filter(Task.case_id == case_id)
        
        tasks = query.all()
        
        # Calculate metrics
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.status == "completed"])
        in_progress_tasks = len([t for t in tasks if t.status == "in_progress"])
        overdue_tasks = len([t for t in tasks if t.due_date and t.due_date < datetime.utcnow() and t.status != "completed"])
        
        # SLA metrics
        sla_metrics = calculate_sla_metrics(tasks)
        
        # Completion rate
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Average completion time
        completed_with_times = [t for t in tasks if t.status == "completed" and t.completed_at and t.created_at]
        avg_completion_hours = 0
        if completed_with_times:
            total_hours = sum([(t.completed_at - t.created_at).total_seconds() / 3600 for t in completed_with_times])
            avg_completion_hours = total_hours / len(completed_with_times)
        
        # Distribution metrics
        task_type_dist = {}
        priority_dist = {}
        status_dist = {}
        
        for task in tasks:
            task_type_dist[task.task_type] = task_type_dist.get(task.task_type, 0) + 1
            priority_dist[task.priority] = priority_dist.get(task.priority, 0) + 1
            status_dist[task.status] = status_dist.get(task.status, 0) + 1
        
        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "in_progress_tasks": in_progress_tasks,
            "overdue_tasks": overdue_tasks,
            "completion_rate": round(completion_rate, 2),
            "sla_compliance_rate": round(sla_metrics["compliance_rate"], 2),
            "average_completion_hours": round(avg_completion_hours, 2),
            "tasks_within_sla": sla_metrics["within_sla"],
            "tasks_at_risk": sla_metrics["at_risk"],
            "tasks_sla_violated": sla_metrics["violated"],
            "task_type_distribution": task_type_dist,
            "priority_distribution": priority_dist,
            "status_distribution": status_dist,
            "period_start": start_date,
            "period_end": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Error calculating task metrics: {str(e)}")
        return {
            "total_tasks": 0,
            "completed_tasks": 0,
            "in_progress_tasks": 0,
            "overdue_tasks": 0,
            "completion_rate": 0,
            "sla_compliance_rate": 0,
            "average_completion_hours": 0,
            "tasks_within_sla": 0,
            "tasks_at_risk": 0,
            "tasks_sla_violated": 0,
            "task_type_distribution": {},
            "priority_distribution": {},
            "status_distribution": {},
            "period_start": start_date,
            "period_end": datetime.utcnow()
        }

def calculate_sla_metrics(tasks: List[Task]) -> Dict[str, Any]:
    """Calculate SLA compliance metrics for a list of tasks"""
    
    within_sla = 0
    at_risk = 0
    violated = 0
    
    for task in tasks:
        sla_status = get_sla_status(task)
        
        if sla_status == SLAStatus.WITHIN_SLA:
            within_sla += 1
        elif sla_status == SLAStatus.AT_RISK:
            at_risk += 1
        elif sla_status == SLAStatus.OVERDUE:
            violated += 1
        elif sla_status == SLAStatus.COMPLETED:
            # Check if it was completed on time
            if task.completed_at and task.due_date and task.completed_at <= task.due_date:
                within_sla += 1
            else:
                violated += 1
    
    total = len(tasks)
    compliance_rate = (within_sla / total * 100) if total > 0 else 100
    
    return {
        "within_sla": within_sla,
        "at_risk": at_risk,
        "violated": violated,
        "compliance_rate": compliance_rate
    }

def validate_task_dependencies(task_id: str, dependency_ids: List[str], db: Session) -> Tuple[bool, List[str]]:
    """Validate task dependencies to prevent circular dependencies"""
    
    errors = []
    
    try:
        # Check if any dependency is the task itself
        if task_id in dependency_ids:
            errors.append("Task cannot depend on itself")
        
        # Check if dependencies exist
        existing_tasks = db.query(Task).filter(Task.id.in_(dependency_ids)).all()
        existing_ids = [t.id for t in existing_tasks]
        
        for dep_id in dependency_ids:
            if dep_id not in existing_ids:
                errors.append(f"Dependency task {dep_id} not found")
        
        # Check for circular dependencies (simplified check)
        for existing_task in existing_tasks:
            task_deps = existing_task.metadata.get("dependencies", []) if existing_task.metadata else []
            if task_id in task_deps:
                errors.append(f"Circular dependency detected with task {existing_task.id}")
        
        return len(errors) == 0, errors
        
    except Exception as e:
        logger.error(f"Error validating dependencies: {str(e)}")
        return False, [f"Error validating dependencies: {str(e)}"]

def estimate_task_duration(task_type: str, complexity: str = "medium") -> int:
    """Estimate task duration in hours based on type and complexity"""
    
    base_durations = {
        "investigation": 24,
        "forensic_analysis": 48,
        "evidence_collection": 8,
        "interview": 4,
        "documentation": 6,
        "legal_review": 12,
        "court_preparation": 16,
        "follow_up": 2,
        "administrative": 3,
        "quality_assurance": 4
    }
    
    complexity_multipliers = {
        "simple": 0.5,
        "medium": 1.0,
        "complex": 2.0,
        "very_complex": 3.0
    }
    
    base_hours = base_durations.get(task_type, 8)  # Default to 8 hours
    multiplier = complexity_multipliers.get(complexity, 1.0)
    
    return int(base_hours * multiplier)

def get_user_workload_score(user_id: str, db: Session) -> float:
    """Calculate workload score for a user based on active tasks"""
    
    try:
        active_tasks = db.query(Task).filter(
            Task.assigned_to == user_id,
            Task.status.in_(["assigned", "in_progress"])
        ).all()
        
        if not active_tasks:
            return 0.0
        
        # Calculate workload based on task count and estimated hours
        total_hours = 0
        task_count = len(active_tasks)
        
        for task in active_tasks:
            estimated_hours = task.estimated_hours or estimate_task_duration(task.task_type)
            # Apply priority multiplier
            priority_multipliers = {"low": 0.8, "medium": 1.0, "high": 1.3, "urgent": 1.6, "critical": 2.0}
            multiplier = priority_multipliers.get(task.priority, 1.0)
            total_hours += estimated_hours * multiplier
        
        # Workload score combines task count and total estimated hours
        workload_score = (task_count * 10) + (total_hours / 8)  # Normalize hours to days
        
        return round(workload_score, 2)
        
    except Exception as e:
        logger.error(f"Error calculating workload score for user {user_id}: {str(e)}")
        return 0.0

def suggest_task_optimization(tasks: List[Task]) -> List[str]:
    """Suggest optimizations for task management"""
    
    suggestions = []
    
    if not tasks:
        return suggestions
    
    # Analyze task patterns
    overdue_count = len([t for t in tasks if t.due_date and t.due_date < datetime.utcnow() and t.status != "completed"])
    high_priority_count = len([t for t in tasks if t.priority in ["high", "urgent", "critical"]])
    unassigned_count = len([t for t in tasks if not t.assigned_to])
    
    # Generate suggestions
    if overdue_count > len(tasks) * 0.2:  # More than 20% overdue
        suggestions.append("Consider extending SLA deadlines or adding more resources to reduce overdue tasks")
    
    if high_priority_count > len(tasks) * 0.3:  # More than 30% high priority
        suggestions.append("Review task prioritization criteria - too many high-priority tasks may indicate poor planning")
    
    if unassigned_count > 0:
        suggestions.append(f"Assign {unassigned_count} unassigned tasks to improve processing efficiency")
    
    # Check for workflow optimization opportunities
    task_types = [t.task_type for t in tasks]
    if task_types.count("forensic_analysis") > 2 and task_types.count("investigation") > 2:
        suggestions.append("Consider implementing parallel processing for investigation and forensic analysis tasks")
    
    return suggestions