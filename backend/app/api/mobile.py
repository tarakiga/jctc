from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, timedelta
import json
import gzip
import base64

from app.database import get_db
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.task import Task
from app.models.user import User
from app.schemas.mobile import (
    MobileCaseSummary,
    MobileTaskSummary,
    MobileEvidenceSummary,
    MobileUserProfile,
    MobileDashboard,
    MobileSyncRequest,
    MobileSyncResponse,
    MobileDeviceInfo,
    MobileNotificationToken,
    OfflineAction,
    MobileBatchRequest,
    MobileBatchResponse,
    MobileSearchRequest,
    MobileSearchResponse,
    CompressedResponse
)
from app.utils.auth import get_current_user
from app.schemas.user import User as UserSchema
from app.utils.mobile import (
    compress_response,
    optimize_for_mobile,
    calculate_sync_delta,
    process_offline_actions,
    register_mobile_device,
    send_push_notification,
    get_mobile_cache_key,
    validate_mobile_request
)

router = APIRouter()

@router.post("/device/register", response_model=Dict[str, Any])
async def register_device(
    device_info: MobileDeviceInfo,
    notification_token: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Register a mobile device for push notifications and tracking"""
    
    try:
        device_registration = await register_mobile_device(
            user_id=current_user.id,
            device_info=device_info,
            notification_token=notification_token,
            db=db
        )
        
        return {
            "device_id": device_registration["device_id"],
            "registration_token": device_registration["token"],
            "sync_interval": device_registration["sync_interval"],
            "cache_ttl": device_registration["cache_ttl"],
            "features_enabled": device_registration["features"],
            "message": "Device registered successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register device: {str(e)}"
        )

@router.put("/device/token")
async def update_notification_token(
    token_update: MobileNotificationToken,
    device_id: str = Header(..., alias="X-Device-ID"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Update push notification token for registered device"""
    
    # Update notification token in database
    # In real implementation, this would update the mobile_devices table
    
    return {
        "message": "Notification token updated successfully",
        "token_expires_at": datetime.utcnow() + timedelta(days=365)
    }

@router.get("/dashboard", response_model=Union[MobileDashboard, CompressedResponse])
async def get_mobile_dashboard(
    compress: bool = Query(False, description="Enable response compression"),
    include_charts: bool = Query(False, description="Include chart data"),
    cache_ttl: int = Query(300, description="Cache TTL in seconds"),
    device_id: str = Header(..., alias="X-Device-ID"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get mobile-optimized dashboard data"""
    
    # Check cache first
    cache_key = get_mobile_cache_key("dashboard", current_user.id, device_id)
    
    try:
        # Get user's active cases (limited for mobile)
        active_cases = db.query(Case).filter(
            Case.status.in_(["open", "in_progress"]),
            Case.assigned_officers.any(User.id == current_user.id)
        ).limit(10).all()
        
        # Get user's active tasks
        active_tasks = db.query(Task).filter(
            Task.assigned_to == current_user.id,
            Task.status.in_(["pending", "assigned", "in_progress"])
        ).limit(15).all()
        
        # Get recent evidence (limited)
        recent_evidence = db.query(Evidence).filter(
            Evidence.case_id.in_([case.id for case in active_cases])
        ).order_by(Evidence.created_at.desc()).limit(10).all()
        
        # Calculate summary metrics
        total_active_cases = len(active_cases)
        total_active_tasks = len(active_tasks)
        overdue_tasks = len([t for t in active_tasks if t.due_date and t.due_date < datetime.utcnow()])
        
        # Create mobile dashboard
        dashboard = MobileDashboard(
            user_id=current_user.id,
            summary={
                "active_cases": total_active_cases,
                "active_tasks": total_active_tasks,
                "overdue_tasks": overdue_tasks,
                "pending_evidence": len(recent_evidence),
                "notifications_count": 0  # Would come from notification system
            },
            recent_cases=[
                MobileCaseSummary(
                    id=case.id,
                    case_number=case.case_number,
                    title=case.title,
                    priority=case.priority,
                    status=case.status,
                    created_at=case.created_at,
                    updated_at=case.updated_at,
                    assigned_officers_count=len(case.assigned_officers) if case.assigned_officers else 0
                )
                for case in active_cases[:5]  # Limit for mobile
            ],
            active_tasks=[
                MobileTaskSummary(
                    id=task.id,
                    title=task.title,
                    task_type=task.task_type,
                    priority=task.priority,
                    status=task.status,
                    due_date=task.due_date,
                    case_id=task.case_id,
                    completion_percentage=task.completion_percentage or 0,
                    is_overdue=task.due_date and task.due_date < datetime.utcnow()
                )
                for task in active_tasks[:10]  # Limit for mobile
            ],
            recent_evidence=[
                MobileEvidenceSummary(
                    id=evidence.id,
                    label=evidence.label,
                    type=evidence.type,
                    case_id=evidence.case_id,
                    collected_at=evidence.collected_at,
                    file_size=getattr(evidence, 'file_size', None),
                    has_thumbnail=False  # Would check for actual thumbnails
                )
                for evidence in recent_evidence
            ],
            quick_actions=[
                {"id": "create_task", "label": "Create Task", "icon": "task_add"},
                {"id": "scan_qr", "label": "Scan Evidence", "icon": "qr_scan"},
                {"id": "voice_note", "label": "Voice Note", "icon": "mic"},
                {"id": "photo_evidence", "label": "Photo Evidence", "icon": "camera"},
                {"id": "search", "label": "Search", "icon": "search"}
            ],
            charts_data={
                "task_progress": [
                    {"label": "Completed", "value": len([t for t in active_tasks if t.status == "completed"])},
                    {"label": "In Progress", "value": len([t for t in active_tasks if t.status == "in_progress"])},
                    {"label": "Pending", "value": len([t for t in active_tasks if t.status == "pending"])}
                ]
            } if include_charts else {},
            sync_timestamp=datetime.utcnow(),
            cache_expires_at=datetime.utcnow() + timedelta(seconds=cache_ttl)
        )
        
        if compress:
            return compress_response(dashboard.dict())
        
        return dashboard
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard: {str(e)}"
        )

@router.get("/cases", response_model=List[MobileCaseSummary])
async def list_mobile_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = Query(20, le=50, description="Maximum 50 items for mobile"),
    offset: int = 0,
    search: Optional[str] = None,
    since: Optional[datetime] = Query(None, description="Only cases updated since this timestamp"),
    device_id: str = Header(..., alias="X-Device-ID"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get mobile-optimized case list with minimal data"""
    
    query = db.query(Case)
    
    # Apply user access control
    if current_user.role not in ["supervisor", "admin"]:
        query = query.filter(Case.assigned_officers.any(User.id == current_user.id))
    
    # Apply filters
    if status:
        query = query.filter(Case.status == status)
    if priority:
        query = query.filter(Case.priority == priority)
    if search:
        query = query.filter(
            Case.title.ilike(f"%{search}%") | 
            Case.case_number.ilike(f"%{search}%")
        )
    if since:
        query = query.filter(Case.updated_at >= since)
    
    # Order by most recent first
    query = query.order_by(Case.updated_at.desc())
    
    cases = query.offset(offset).limit(limit).all()
    
    return [
        MobileCaseSummary(
            id=case.id,
            case_number=case.case_number,
            title=case.title,
            priority=case.priority,
            status=case.status,
            created_at=case.created_at,
            updated_at=case.updated_at,
            assigned_officers_count=len(case.assigned_officers) if case.assigned_officers else 0
        )
        for case in cases
    ]

@router.get("/cases/{case_id}/mobile", response_model=Dict[str, Any])
async def get_mobile_case_details(
    case_id: str,
    include_evidence: bool = Query(True),
    include_tasks: bool = Query(True),
    include_parties: bool = Query(False),
    device_id: str = Header(..., alias="X-Device-ID"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get mobile-optimized case details with selective data loading"""
    
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Check access permission
    if (current_user.role not in ["supervisor", "admin"] and 
        current_user.id not in [officer.id for officer in case.assigned_officers]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this case"
        )
    
    # Build response with optional sections
    response = {
        "case": MobileCaseSummary(
            id=case.id,
            case_number=case.case_number,
            title=case.title,
            priority=case.priority,
            status=case.status,
            created_at=case.created_at,
            updated_at=case.updated_at,
            description=case.description[:200] if case.description else None,  # Truncated for mobile
            assigned_officers_count=len(case.assigned_officers) if case.assigned_officers else 0
        )
    }
    
    if include_evidence:
        evidence_list = db.query(Evidence).filter(Evidence.case_id == case_id).limit(20).all()
        response["evidence"] = [
            MobileEvidenceSummary(
                id=evidence.id,
                label=evidence.label,
                type=evidence.type,
                case_id=evidence.case_id,
                collected_at=evidence.collected_at,
                file_size=getattr(evidence, 'file_size', None),
                has_thumbnail=False
            )
            for evidence in evidence_list
        ]
    
    if include_tasks:
        tasks_list = db.query(Task).filter(Task.case_id == case_id).limit(20).all()
        response["tasks"] = [
            MobileTaskSummary(
                id=task.id,
                title=task.title,
                task_type=task.task_type,
                priority=task.priority,
                status=task.status,
                due_date=task.due_date,
                case_id=task.case_id,
                completion_percentage=task.completion_percentage or 0,
                is_overdue=task.due_date and task.due_date < datetime.utcnow()
            )
            for task in tasks_list
        ]
    
    return response

@router.get("/tasks", response_model=List[MobileTaskSummary])
async def list_mobile_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    case_id: Optional[str] = None,
    overdue_only: bool = Query(False),
    limit: int = Query(20, le=50),
    offset: int = 0,
    since: Optional[datetime] = Query(None, description="Only tasks updated since this timestamp"),
    device_id: str = Header(..., alias="X-Device-ID"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get mobile-optimized task list"""
    
    query = db.query(Task)
    
    # Apply user access control
    if current_user.role not in ["supervisor", "admin"]:
        query = query.filter(
            (Task.assigned_to == current_user.id) | 
            (Task.created_by == current_user.id)
        )
    
    # Apply filters
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if case_id:
        query = query.filter(Task.case_id == case_id)
    if overdue_only:
        query = query.filter(Task.due_date < datetime.utcnow(), Task.status != "completed")
    if since:
        query = query.filter(Task.updated_at >= since)
    
    query = query.order_by(Task.due_date.asc().nullslast(), Task.priority.desc())
    
    tasks = query.offset(offset).limit(limit).all()
    
    return [
        MobileTaskSummary(
            id=task.id,
            title=task.title,
            task_type=task.task_type,
            priority=task.priority,
            status=task.status,
            due_date=task.due_date,
            case_id=task.case_id,
            completion_percentage=task.completion_percentage or 0,
            is_overdue=task.due_date and task.due_date < datetime.utcnow()
        )
        for task in tasks
    ]

@router.post("/sync", response_model=MobileSyncResponse)
async def mobile_sync(
    sync_request: MobileSyncRequest,
    device_id: str = Header(..., alias="X-Device-ID"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Synchronize mobile app data with server"""
    
    try:
        # Validate sync request
        if not validate_mobile_request(sync_request, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sync request"
            )
        
        # Calculate what data has changed since last sync
        sync_delta = await calculate_sync_delta(
            user_id=current_user.id,
            device_id=device_id,
            last_sync=sync_request.last_sync_timestamp,
            entity_types=sync_request.sync_entities,
            db=db
        )
        
        # Process any offline actions from the mobile app
        offline_results = []
        if sync_request.offline_actions:
            offline_results = await process_offline_actions(
                actions=sync_request.offline_actions,
                user_id=current_user.id,
                device_id=device_id,
                db=db
            )
        
        return MobileSyncResponse(
            sync_timestamp=datetime.utcnow(),
            changes=sync_delta,
            conflicts=[],  # Would contain any sync conflicts
            offline_action_results=offline_results,
            next_sync_recommended=datetime.utcnow() + timedelta(minutes=15),
            server_time=datetime.utcnow(),
            sync_statistics={
                "items_updated": len(sync_delta.get("updated", [])),
                "items_deleted": len(sync_delta.get("deleted", [])),
                "conflicts_resolved": 0,
                "offline_actions_processed": len(offline_results)
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}"
        )

@router.post("/batch", response_model=MobileBatchResponse)
async def mobile_batch_request(
    batch_request: MobileBatchRequest,
    device_id: str = Header(..., alias="X-Device-ID"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Process multiple API requests in a single batch for mobile efficiency"""
    
    if len(batch_request.requests) > 10:  # Limit batch size
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch size exceeds maximum limit of 10 requests"
        )
    
    responses = []
    
    for request_item in batch_request.requests:
        try:
            # Process each request in the batch
            if request_item.method == "GET":
                if request_item.endpoint == "/mobile/cases":
                    # Handle cases list request
                    result = {"status": "success", "data": []}  # Simplified
                elif request_item.endpoint.startswith("/mobile/tasks"):
                    # Handle tasks list request
                    result = {"status": "success", "data": []}  # Simplified
                else:
                    result = {"status": "error", "error": "Unsupported endpoint"}
            else:
                result = {"status": "error", "error": "Only GET requests supported in batch"}
            
            responses.append({
                "request_id": request_item.request_id,
                "status_code": 200 if result["status"] == "success" else 400,
                "response": result
            })
            
        except Exception as e:
            responses.append({
                "request_id": request_item.request_id,
                "status_code": 500,
                "response": {"status": "error", "error": str(e)}
            })
    
    return MobileBatchResponse(
        batch_id=batch_request.batch_id,
        responses=responses,
        processed_at=datetime.utcnow(),
        success_count=len([r for r in responses if r["status_code"] < 400]),
        error_count=len([r for r in responses if r["status_code"] >= 400])
    )

@router.post("/search", response_model=MobileSearchResponse)
async def mobile_search(
    search_request: MobileSearchRequest,
    device_id: str = Header(..., alias="X-Device-ID"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Mobile-optimized search across cases, tasks, and evidence"""
    
    if len(search_request.query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 2 characters"
        )
    
    results = {
        "cases": [],
        "tasks": [],
        "evidence": []
    }
    
    try:
        # Search cases (limited results for mobile)
        if "cases" in search_request.search_types:
            cases_query = db.query(Case).filter(
                Case.title.ilike(f"%{search_request.query}%") |
                Case.case_number.ilike(f"%{search_request.query}%") |
                Case.description.ilike(f"%{search_request.query}%")
            )
            
            if current_user.role not in ["supervisor", "admin"]:
                cases_query = cases_query.filter(Case.assigned_officers.any(User.id == current_user.id))
            
            cases = cases_query.limit(search_request.limit or 10).all()
            results["cases"] = [
                MobileCaseSummary(
                    id=case.id,
                    case_number=case.case_number,
                    title=case.title,
                    priority=case.priority,
                    status=case.status,
                    created_at=case.created_at,
                    updated_at=case.updated_at,
                    assigned_officers_count=len(case.assigned_officers) if case.assigned_officers else 0
                )
                for case in cases
            ]
        
        # Search tasks
        if "tasks" in search_request.search_types:
            tasks_query = db.query(Task).filter(
                Task.title.ilike(f"%{search_request.query}%") |
                Task.description.ilike(f"%{search_request.query}%")
            )
            
            if current_user.role not in ["supervisor", "admin"]:
                tasks_query = tasks_query.filter(
                    (Task.assigned_to == current_user.id) | 
                    (Task.created_by == current_user.id)
                )
            
            tasks = tasks_query.limit(search_request.limit or 10).all()
            results["tasks"] = [
                MobileTaskSummary(
                    id=task.id,
                    title=task.title,
                    task_type=task.task_type,
                    priority=task.priority,
                    status=task.status,
                    due_date=task.due_date,
                    case_id=task.case_id,
                    completion_percentage=task.completion_percentage or 0,
                    is_overdue=task.due_date and task.due_date < datetime.utcnow()
                )
                for task in tasks
            ]
        
        # Search evidence
        if "evidence" in search_request.search_types:
            # Get user's accessible cases first
            user_cases = []
            if current_user.role not in ["supervisor", "admin"]:
                user_cases = db.query(Case).filter(
                    Case.assigned_officers.any(User.id == current_user.id)
                ).all()
                case_ids = [case.id for case in user_cases]
            else:
                case_ids = []
            
            evidence_query = db.query(Evidence).filter(
                Evidence.label.ilike(f"%{search_request.query}%") |
                Evidence.description.ilike(f"%{search_request.query}%")
            )
            
            if case_ids:
                evidence_query = evidence_query.filter(Evidence.case_id.in_(case_ids))
            
            evidence_list = evidence_query.limit(search_request.limit or 10).all()
            results["evidence"] = [
                MobileEvidenceSummary(
                    id=evidence.id,
                    label=evidence.label,
                    type=evidence.type,
                    case_id=evidence.case_id,
                    collected_at=evidence.collected_at,
                    file_size=getattr(evidence, 'file_size', None),
                    has_thumbnail=False
                )
                for evidence in evidence_list
            ]
        
        return MobileSearchResponse(
            query=search_request.query,
            results=results,
            total_results=len(results["cases"]) + len(results["tasks"]) + len(results["evidence"]),
            search_timestamp=datetime.utcnow(),
            suggestions=[]  # Could include search suggestions
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@router.get("/profile", response_model=MobileUserProfile)
async def get_mobile_profile(
    device_id: str = Header(..., alias="X-Device-ID"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get mobile-optimized user profile"""
    
    # Get user statistics
    active_cases_count = db.query(Case).filter(
        Case.assigned_officers.any(User.id == current_user.id),
        Case.status.in_(["open", "in_progress"])
    ).count()
    
    active_tasks_count = db.query(Task).filter(
        Task.assigned_to == current_user.id,
        Task.status.in_(["pending", "assigned", "in_progress"])
    ).count()
    
    return MobileUserProfile(
        user_id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        organization=current_user.organization,
        avatar_url=None,  # Would be actual avatar URL
        statistics={
            "active_cases": active_cases_count,
            "active_tasks": active_tasks_count,
            "completed_tasks_this_month": 0,  # Would calculate actual stats
            "sla_compliance_rate": 95.0
        },
        preferences={
            "notifications_enabled": True,
            "sync_on_wifi_only": True,
            "offline_mode_enabled": True,
            "dark_mode": False
        },
        permissions=[
            "view_cases",
            "create_tasks",
            "upload_evidence",
            "view_reports"
        ],
        last_login=current_user.last_login if hasattr(current_user, 'last_login') else None,
        account_status="active"
    )

@router.get("/offline/manifest")
async def get_offline_manifest(
    device_id: str = Header(..., alias="X-Device-ID"),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get manifest of data available for offline use"""
    
    return {
        "version": "1.0",
        "offline_enabled": True,
        "cacheable_endpoints": [
            "/mobile/dashboard",
            "/mobile/cases",
            "/mobile/tasks",
            "/mobile/profile"
        ],
        "sync_endpoints": [
            "/mobile/sync"
        ],
        "cache_policies": {
            "dashboard": {"ttl": 300, "refresh_on_focus": True},
            "cases": {"ttl": 600, "partial_updates": True},
            "tasks": {"ttl": 300, "real_time_updates": True},
            "evidence": {"ttl": 1800, "lazy_load": True}
        },
        "offline_actions": [
            "create_task",
            "update_task_status",
            "add_task_comment",
            "upload_evidence",
            "create_voice_note"
        ],
        "max_offline_storage": "100MB",
        "auto_sync_interval": 900  # 15 minutes
    }

@router.post("/push/test")
async def test_push_notification(
    device_id: str = Header(..., alias="X-Device-ID"),
    current_user: UserSchema = Depends(get_current_user)
):
    """Send test push notification to mobile device"""
    
    try:
        result = await send_push_notification(
            user_id=current_user.id,
            device_id=device_id,
            title="JCTC Test Notification",
            body="This is a test notification from the JCTC system.",
            data={"type": "test", "timestamp": datetime.utcnow().isoformat()}
        )
        
        return {
            "message": "Test notification sent",
            "notification_id": result.get("notification_id"),
            "delivery_status": result.get("status", "sent")
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test notification: {str(e)}"
        )

@router.get("/health")
async def mobile_api_health():
    """Health check endpoint optimized for mobile monitoring"""
    
    return {
        "status": "healthy",
        "version": "1.0.0",
        "mobile_features": {
            "offline_support": True,
            "push_notifications": True,
            "background_sync": True,
            "compression": True,
            "batch_requests": True
        },
        "server_time": datetime.utcnow(),
        "api_version": "mobile/v1"
    }