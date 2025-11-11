# Task Management Enhancement

## Overview

The JCTC Task Management Enhancement system provides advanced task assignment, workflow automation, SLA monitoring, and escalation capabilities. This system extends the basic task management with sophisticated workflow engines, automatic assignment algorithms, and comprehensive SLA tracking.

## Features

### Enhanced Task Management

1. **Intelligent Task Assignment**
   - Role-based automatic assignment
   - Workload balancing algorithms
   - Skills-based matching (future enhancement)
   - Dynamic reassignment based on availability

2. **Workflow Automation**
   - Pre-defined workflow templates
   - Conditional workflow execution
   - Parallel and sequential step processing
   - Automated progression between steps

3. **SLA Monitoring & Compliance**
   - Configurable SLA rules by task type and priority
   - Real-time SLA status tracking
   - Automated warnings and escalations
   - Comprehensive compliance reporting

4. **Escalation Management**
   - Multi-level escalation processes
   - Automated escalation based on SLA violations
   - Manual escalation capabilities
   - Escalation effectiveness tracking

5. **Advanced Analytics**
   - Task performance metrics
   - Team and individual productivity tracking
   - SLA compliance analytics
   - Workflow efficiency analysis

## API Endpoints

### Task Operations

#### Create Task with Workflow
```http
POST /api/v1/tasks/
Content-Type: application/json

{
  "title": "Digital Evidence Analysis",
  "description": "Analyze seized mobile device for case evidence",
  "task_type": "forensic_analysis",
  "priority": "high",
  "case_id": "case-123",
  "workflow_template_id": "forensic_processing",
  "estimated_hours": 16,
  "metadata": {
    "device_type": "smartphone",
    "evidence_id": "evidence-456"
  }
}
```

#### List Tasks with Advanced Filtering
```http
GET /api/v1/tasks/?sla_status=at_risk&assigned_to=user-123&task_type=investigation&overdue=false&limit=20
```

#### Get Task with SLA Status
```http
GET /api/v1/tasks/{task_id}
```

### Assignment & Escalation

#### Assign Task
```http
POST /api/v1/tasks/{task_id}/assign
Content-Type: application/json

{
  "assigned_to": "user-456",
  "reason": "Specialist expertise required",
  "status": "assigned",
  "estimated_hours": 8
}
```

#### Escalate Task
```http
POST /api/v1/tasks/{task_id}/escalate
Content-Type: application/json

{
  "reason": "sla_violation",
  "description": "Task is 6 hours overdue and blocking case progress",
  "new_assignee": "supervisor-789",
  "new_priority": "urgent",
  "escalate_to_supervisor": true,
  "notify_stakeholders": true
}
```

#### Bulk Task Actions
```http
POST /api/v1/tasks/bulk-action
Content-Type: application/json

{
  "task_ids": ["task-1", "task-2", "task-3"],
  "action": "update_priority",
  "priority": "high",
  "reason": "Case escalation required"
}
```

### Metrics & Analytics

#### Task Dashboard Metrics
```http
GET /api/v1/tasks/metrics/dashboard?user_id=user-123&period_days=30
```

#### SLA Violations
```http
GET /api/v1/tasks/sla/violations?days_back=7&include_resolved=false
```

#### Escalate Overdue Tasks
```http
POST /api/v1/tasks/sla/escalate-overdue?hours_overdue_threshold=24
```

### Workflow Management

#### List Workflow Templates
```http
GET /api/v1/tasks/workflow/templates?task_type=investigation
```

## SLA Configuration

### SLA Matrix

The system uses a predefined SLA matrix based on task type and priority:

| Task Type | Critical | Urgent | High | Medium | Low |
|-----------|----------|--------|------|--------|-----|
| **Investigation** | 4h | 8h | 24h | 72h | 168h |
| **Forensic Analysis** | 8h | 24h | 72h | 168h | 336h |
| **Evidence Collection** | 2h | 4h | 12h | 48h | 120h |
| **Interview** | 6h | 12h | 48h | 120h | 240h |
| **Documentation** | 4h | 12h | 24h | 72h | 168h |
| **Legal Review** | 8h | 24h | 72h | 168h | 336h |
| **Court Preparation** | 12h | 48h | 120h | 240h | 480h |

### SLA Status Categories

- **Within SLA**: Task is on track to meet deadline
- **At Risk**: Task is within 24 hours of SLA deadline
- **Overdue**: Task has exceeded SLA deadline
- **Completed**: Task completed (on time or late)

### Automatic Escalation Rules

1. **Level 0**: Initial assignment
2. **Level 1**: Team lead (4 hours overdue)
3. **Level 2**: Supervisor (8 hours overdue)
4. **Level 3**: Manager (24 hours overdue)
5. **Level 4**: Director (48 hours overdue)

## Workflow System

### Predefined Workflow Templates

#### Standard Investigation Workflow
```json
{
  "name": "Standard Case Investigation",
  "task_type": "investigation",
  "steps": [
    {
      "name": "Initial Assessment",
      "duration_hours": 4,
      "role": "investigator",
      "order": 1
    },
    {
      "name": "Evidence Planning",
      "duration_hours": 2,
      "role": "investigator",
      "order": 2
    },
    {
      "name": "Evidence Collection",
      "duration_hours": 8,
      "role": "investigator",
      "order": 3
    },
    {
      "name": "Digital Analysis",
      "duration_hours": 16,
      "role": "forensic",
      "order": 4
    },
    {
      "name": "Report Generation",
      "duration_hours": 4,
      "role": "investigator",
      "order": 5
    },
    {
      "name": "Quality Review",
      "duration_hours": 2,
      "role": "supervisor",
      "order": 6
    }
  ]
}
```

#### Digital Evidence Processing Workflow
```json
{
  "name": "Digital Evidence Processing",
  "task_type": "forensic_analysis",
  "steps": [
    {
      "name": "Evidence Intake",
      "duration_hours": 2,
      "role": "forensic",
      "order": 1
    },
    {
      "name": "Device Imaging",
      "duration_hours": 4,
      "role": "forensic",
      "order": 2
    },
    {
      "name": "Data Recovery",
      "duration_hours": 8,
      "role": "forensic",
      "order": 3
    },
    {
      "name": "Analysis",
      "duration_hours": 16,
      "role": "forensic",
      "order": 4
    },
    {
      "name": "Report Writing",
      "duration_hours": 6,
      "role": "forensic",
      "order": 5
    },
    {
      "name": "Peer Review",
      "duration_hours": 2,
      "role": "supervisor",
      "order": 6
    }
  ]
}
```

### Workflow Execution

1. **Automatic Initiation**: Workflows can be triggered automatically when tasks are created
2. **Step Progression**: Steps advance automatically upon completion
3. **Role-Based Assignment**: Each step is assigned to users with appropriate roles
4. **Parallel Processing**: Some workflows support parallel execution of steps
5. **Conditional Logic**: Workflows can branch based on conditions

## Role-Based Task Assignment

### Assignment Rules by Task Type

| Task Type | Eligible Roles | Primary | Secondary |
|-----------|---------------|---------|-----------|
| **Investigation** | Investigator, Supervisor | Investigator | Supervisor |
| **Forensic Analysis** | Forensic, Supervisor | Forensic | Supervisor |
| **Evidence Collection** | Investigator, Forensic | Investigator | Forensic |
| **Interview** | Investigator, Prosecutor | Investigator | Prosecutor |
| **Documentation** | Investigator, Forensic, Prosecutor | Investigator | Others |
| **Legal Review** | Prosecutor, Supervisor | Prosecutor | Supervisor |
| **Court Preparation** | Prosecutor | Prosecutor | - |
| **Follow-up** | Investigator, Liaison | Investigator | Liaison |
| **Administrative** | Intake, Admin | Intake | Admin |
| **Quality Assurance** | Supervisor, Admin | Supervisor | Admin |

### Automatic Assignment Algorithm

1. **Role Filtering**: Filter users by eligible roles for task type
2. **Availability Check**: Check user availability and active status  
3. **Workload Balancing**: Calculate current workload for each eligible user
4. **Skills Matching**: Match user skills to task requirements (future)
5. **Assignment**: Assign to user with lowest workload score

### Workload Calculation

```python
workload_score = (active_task_count * 10) + (total_estimated_hours / 8)

# Priority multipliers applied to estimated hours:
# - Low: 0.8x
# - Medium: 1.0x  
# - High: 1.3x
# - Urgent: 1.6x
# - Critical: 2.0x
```

## Task Dependencies

### Dependency Types

1. **Finish-to-Start**: Dependent task starts when prerequisite finishes
2. **Start-to-Start**: Both tasks start simultaneously
3. **Finish-to-Finish**: Both tasks finish simultaneously  
4. **Start-to-Finish**: Dependent task finishes when prerequisite starts

### Dependency Management

- **Circular Dependency Prevention**: System validates against circular references
- **Automatic Progression**: Dependent tasks automatically become available
- **Override Capability**: Authorized users can override dependencies
- **Lag Time**: Configurable delay between dependency satisfaction and task activation

## Time Tracking

### Features

- **Automatic Time Tracking**: Integration with workflow steps
- **Manual Time Entry**: Users can log time manually
- **Break Tracking**: Track interruptions and breaks
- **Productivity Metrics**: Calculate productivity scores
- **Billing Integration**: Support for billable hours tracking

### Time Entry Types

- **Research**: Background research and investigation
- **Analysis**: Data analysis and forensic examination  
- **Documentation**: Report writing and documentation
- **Communication**: Meetings, calls, and correspondence
- **Administrative**: Administrative tasks and overhead

## Notification System

### Notification Types

1. **Task Assignment**: New task assigned to user
2. **Due Soon**: Task approaching SLA deadline
3. **Overdue**: Task has exceeded SLA deadline
4. **Status Change**: Task status updated
5. **Escalation**: Task escalated to higher level
6. **Workflow Progression**: Workflow step completed/assigned
7. **Dependency Satisfied**: Prerequisite task completed

### Notification Channels

- **Email**: Standard email notifications
- **In-App**: Dashboard notifications
- **SMS**: Critical notifications (configurable)
- **Push**: Mobile push notifications
- **Slack/Teams**: Integration with collaboration tools

## Performance Metrics

### Individual Metrics

- **Task Completion Rate**: Percentage of tasks completed on time
- **Average Completion Time**: Mean time to complete tasks
- **SLA Compliance Rate**: Percentage of tasks meeting SLA
- **Workload Score**: Current workload based on active tasks
- **Efficiency Rating**: Productivity assessment
- **Escalation Rate**: Percentage of tasks escalated

### Team Metrics

- **Team Completion Rate**: Overall team performance
- **Average Cycle Time**: Mean time from assignment to completion
- **Bottleneck Identification**: Workflow bottlenecks and delays
- **Resource Utilization**: Team member utilization rates
- **Quality Metrics**: Error rates and rework frequency

### System Metrics

- **Overall SLA Compliance**: System-wide SLA performance
- **Escalation Frequency**: Rate of task escalations
- **Workflow Efficiency**: Workflow completion rates
- **Resource Allocation**: Distribution of tasks across roles
- **Performance Trends**: Historical performance analysis

## Integration Examples

### Create Task with Workflow

```python
import requests

# Login and get token
login_response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={
        "email": "investigator@jctc.gov.ng",
        "password": "investigator123"
    }
)
token = login_response.json()["access_token"]

# Create task with automatic workflow
response = requests.post(
    "http://localhost:8000/api/v1/tasks/",
    json={
        "title": "Analyze seized smartphone",
        "description": "Extract and analyze data from iPhone 12",
        "task_type": "forensic_analysis",
        "priority": "high",
        "case_id": "case-123",
        "workflow_template_id": "forensic_processing",
        "estimated_hours": 20,
        "metadata": {
            "device_type": "iPhone 12",
            "evidence_id": "evidence-456",
            "seizure_date": "2024-01-15"
        }
    },
    headers={"Authorization": f"Bearer {token}"}
)

task = response.json()
print(f"Created task: {task['id']}")
print(f"SLA deadline: {task['due_date']}")
print(f"Workflow initiated: {task.get('workflow_instance_id')}")
```

### Monitor SLA Violations

```python
# Get current SLA violations
violations_response = requests.get(
    "http://localhost:8000/api/v1/tasks/sla/violations?days_back=3",
    headers={"Authorization": f"Bearer {token}"}
)

violations = violations_response.json()
print(f"Found {violations['total_violations']} SLA violations")

for violation in violations['violations']:
    print(f"Task: {violation['title']}")
    print(f"Hours overdue: {violation['hours_overdue']}")
    print(f"Assigned to: {violation['assigned_to']}")
    print("---")
```

### Bulk Task Operations

```python
# Escalate multiple overdue tasks
bulk_response = requests.post(
    "http://localhost:8000/api/v1/tasks/bulk-action",
    json={
        "task_ids": ["task-1", "task-2", "task-3"],
        "action": "update_priority",
        "priority": "urgent",
        "reason": "Critical case requires immediate attention"
    },
    headers={"Authorization": f"Bearer {token}"}
)

result = bulk_response.json()
print(f"Updated {result['updated_count']} tasks")
```

### Get Task Metrics

```python
# Get dashboard metrics for current user
metrics_response = requests.get(
    "http://localhost:8000/api/v1/tasks/metrics/dashboard?period_days=30",
    headers={"Authorization": f"Bearer {token}"}
)

metrics = metrics_response.json()
print(f"Total tasks: {metrics['total_tasks']}")
print(f"Completion rate: {metrics['completion_rate']}%")
print(f"SLA compliance: {metrics['sla_compliance_rate']}%")
print(f"Average completion time: {metrics['average_completion_hours']} hours")
```

## Error Handling

### Common Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `400` | Invalid task parameters | Verify required fields and data types |
| `403` | Insufficient permissions | Check user role and task access rights |
| `404` | Task not found | Verify task ID exists and user has access |
| `409` | Dependency conflict | Resolve circular dependencies |
| `422` | SLA violation | Address overdue task before proceeding |
| `429` | Rate limit exceeded | Implement request throttling |

### Error Response Format

```json
{
  "detail": "Task cannot be assigned to user",
  "error_code": "ASSIGNMENT_FAILED",
  "error_details": {
    "task_id": "task-123",
    "assigned_to": "user-456",
    "reason": "User does not have required role for this task type",
    "required_roles": ["forensic", "supervisor"],
    "user_role": "investigator"
  }
}
```

## Database Schema

### Core Tables

- **tasks**: Enhanced with workflow and template references
- **task_templates**: Reusable task templates
- **workflow_templates**: Workflow definitions
- **workflow_instances**: Active workflow executions
- **workflow_step_executions**: Individual step tracking
- **task_slas**: SLA configuration rules
- **sla_violations**: SLA violation tracking
- **task_escalations**: Escalation history
- **task_dependencies**: Task dependency relationships
- **task_comments**: Task communication
- **task_time_entries**: Time tracking data

### Key Indexes

```sql
-- Performance indexes for common queries
CREATE INDEX idx_tasks_assigned_to_status ON tasks(assigned_to, status);
CREATE INDEX idx_tasks_due_date_status ON tasks(due_date, status);
CREATE INDEX idx_tasks_case_id_status ON tasks(case_id, status);
CREATE INDEX idx_sla_violations_status ON sla_violations(status, violation_detected_at);
CREATE INDEX idx_workflow_instances_task_status ON workflow_instances(task_id, status);
```

## Configuration

### Environment Variables

```bash
# Task Management Settings
TASK_AUTO_ASSIGN_ENABLED=true
TASK_SLA_MONITORING_ENABLED=true
TASK_ESCALATION_ENABLED=true
WORKFLOW_ENGINE_ENABLED=true

# SLA Configuration
SLA_WARNING_HOURS_DEFAULT=4
SLA_ESCALATION_HOURS_DEFAULT=8
SLA_BUSINESS_HOURS_ONLY=false

# Notification Settings
TASK_NOTIFICATIONS_ENABLED=true
SLA_VIOLATION_NOTIFICATIONS=true
ESCALATION_NOTIFICATIONS=true
```

### Performance Tuning

1. **Database Connection Pool**: Configure appropriate pool size
2. **Background Tasks**: Use Celery for heavy processing
3. **Caching**: Redis for frequently accessed data
4. **Indexes**: Ensure proper indexing for queries
5. **Monitoring**: Application performance monitoring

## Best Practices

### Task Creation

1. **Clear Descriptions**: Provide detailed task descriptions
2. **Accurate Estimates**: Set realistic time estimates
3. **Proper Prioritization**: Use priority levels consistently
4. **Metadata Usage**: Include relevant context in metadata
5. **Workflow Selection**: Choose appropriate workflow templates

### SLA Management

1. **Regular Review**: Periodically review SLA configurations
2. **Exception Handling**: Define clear exception processes
3. **Escalation Paths**: Establish clear escalation hierarchies
4. **Performance Monitoring**: Track SLA compliance metrics
5. **Continuous Improvement**: Adjust SLAs based on performance data

### Workflow Design

1. **Modular Steps**: Break workflows into manageable steps
2. **Clear Dependencies**: Define step dependencies clearly
3. **Error Handling**: Include error handling and retry logic
4. **Approval Gates**: Add approval steps where necessary
5. **Documentation**: Document workflow purposes and procedures

## Future Enhancements

### Phase 3 Features

1. **AI-Powered Assignment**: Machine learning for optimal task assignment
2. **Predictive Analytics**: Predict task completion times and bottlenecks
3. **Resource Planning**: Advanced resource allocation and planning
4. **Skills Management**: Track and match user skills to tasks
5. **Mobile Optimization**: Enhanced mobile task management
6. **Integration APIs**: Third-party system integrations
7. **Advanced Reporting**: Custom report builder and analytics
8. **Collaboration Tools**: Enhanced team collaboration features

### Roadmap

- **Q1 2024**: AI-powered assignment and predictive analytics
- **Q2 2024**: Skills management and resource planning
- **Q3 2024**: Mobile optimization and integration APIs
- **Q4 2024**: Advanced reporting and collaboration tools

## Troubleshooting

### Common Issues

1. **Tasks Not Auto-Assigning**
   - Check role eligibility rules
   - Verify user availability status
   - Review workload calculation logic

2. **SLA Violations Not Detected**
   - Verify SLA configuration for task type/priority
   - Check background task processing
   - Review system time synchronization

3. **Workflow Steps Not Progressing**
   - Check step completion criteria
   - Verify role assignments
   - Review workflow template configuration

4. **Performance Issues**
   - Monitor database query performance
   - Check background task queue
   - Review system resource utilization

### Debug Mode

Enable debug logging for detailed troubleshooting:

```python
import logging

logging.getLogger('app.utils.tasks').setLevel(logging.DEBUG)
logging.getLogger('app.api.tasks').setLevel(logging.DEBUG)
```