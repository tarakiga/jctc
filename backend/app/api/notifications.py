from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import json

from app.database import get_db
from app.models.notifications import Notification, NotificationPreference, NotificationTemplate
from app.models.user import User
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.legal import LegalInstrument
from app.schemas.notifications import (
    NotificationCreate,
    NotificationResponse,
    NotificationUpdate,
    NotificationPreferenceCreate,
    NotificationPreferenceResponse,
    NotificationTemplateCreate,
    NotificationTemplateResponse,
    BulkNotificationRequest,
    NotificationStats,
    AlertRule,
    AlertRuleResponse
)
from app.utils.auth import get_current_user
from app.schemas.user import User as UserSchema
from app.utils.notifications import (
    send_email_notification,
    send_sms_notification,
    send_push_notification,
    generate_notification_content,
    check_notification_conditions
)

router = APIRouter()

@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification: NotificationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Create and send a notification"""
    
    # Generate notification ID
    notification_id = str(uuid.uuid4())
    
    # Create notification record
    db_notification = Notification(
        id=notification_id,
        recipient_id=notification.recipient_id,
        sender_id=current_user.id,
        type=notification.type,
        category=notification.category,
        priority=notification.priority,
        title=notification.title,
        message=notification.message,
        data=notification.data or {},
        channels=notification.channels,
        scheduled_for=notification.scheduled_for,
        expires_at=notification.expires_at,
        is_read=False,
        created_at=datetime.utcnow()
    )
    
    try:
        db.add(db_notification)
        db.commit()
        db.refresh(db_notification)
        
        # Send notification via specified channels
        background_tasks.add_task(
            process_notification_delivery,
            db_notification.id,
            db_notification.channels
        )
        
        return NotificationResponse.from_orm(db_notification)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create notification: {str(e)}"
        )

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get notifications for the current user"""
    
    query = db.query(Notification).filter(
        Notification.recipient_id == current_user.id
    )
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    if category:
        query = query.filter(Notification.category == category)
    
    if priority:
        query = query.filter(Notification.priority == priority)
    
    # Filter out expired notifications
    query = query.filter(
        (Notification.expires_at.is_(None)) |
        (Notification.expires_at > datetime.utcnow())
    )
    
    notifications = query.order_by(
        Notification.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    return [NotificationResponse.from_orm(notif) for notif in notifications]

@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get a specific notification"""
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return NotificationResponse.from_orm(notification)

@router.put("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: str,
    notification_update: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Update notification (typically to mark as read)"""
    
    db_notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id
    ).first()
    
    if not db_notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Update fields
    update_data = notification_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_notification, field, value)
    
    if notification_update.is_read is not None:
        db_notification.read_at = datetime.utcnow() if notification_update.is_read else None
    
    try:
        db.commit()
        db.refresh(db_notification)
        return NotificationResponse.from_orm(db_notification)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notification: {str(e)}"
        )

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Mark all notifications as read for the current user"""
    
    query = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    )
    
    if category:
        query = query.filter(Notification.category == category)
    
    try:
        updated_count = query.update({
            "is_read": True,
            "read_at": datetime.utcnow()
        })
        db.commit()
        
        return {
            "message": f"Marked {updated_count} notifications as read",
            "updated_count": updated_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notifications as read: {str(e)}"
        )

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Delete a notification"""
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    try:
        db.delete(notification)
        db.commit()
        return {"message": "Notification deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete notification: {str(e)}"
        )

@router.post("/bulk", response_model=Dict[str, Any])
async def send_bulk_notifications(
    request: BulkNotificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Send notifications to multiple recipients"""
    
    notification_ids = []
    
    for recipient_id in request.recipient_ids:
        # Check if recipient exists
        recipient = db.query(User).filter(User.id == recipient_id).first()
        if not recipient:
            continue
        
        notification_id = str(uuid.uuid4())
        
        db_notification = Notification(
            id=notification_id,
            recipient_id=recipient_id,
            sender_id=current_user.id,
            type=request.type,
            category=request.category,
            priority=request.priority,
            title=request.title,
            message=request.message,
            data=request.data or {},
            channels=request.channels,
            scheduled_for=request.scheduled_for,
            expires_at=request.expires_at,
            is_read=False,
            created_at=datetime.utcnow()
        )
        
        db.add(db_notification)
        notification_ids.append(notification_id)
    
    try:
        db.commit()
        
        # Queue notifications for delivery
        for notification_id in notification_ids:
            background_tasks.add_task(
                process_notification_delivery,
                notification_id,
                request.channels
            )
        
        return {
            "message": f"Created {len(notification_ids)} notifications",
            "notification_ids": notification_ids,
            "total_recipients": len(request.recipient_ids),
            "successful_notifications": len(notification_ids)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send bulk notifications: {str(e)}"
        )

@router.get("/preferences/", response_model=NotificationPreferenceResponse)
async def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get notification preferences for the current user"""
    
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create default preferences
        preferences = NotificationPreference(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            email_enabled=True,
            push_enabled=True,
            sms_enabled=False,
            categories={
                "case_updates": {"email": True, "push": True, "sms": False},
                "evidence_alerts": {"email": True, "push": True, "sms": False},
                "deadlines": {"email": True, "push": True, "sms": True},
                "assignments": {"email": True, "push": True, "sms": False}
            },
            quiet_hours_start="22:00",
            quiet_hours_end="08:00",
            timezone="UTC"
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return NotificationPreferenceResponse.from_orm(preferences)

@router.put("/preferences/", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    preferences_update: NotificationPreferenceCreate,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Update notification preferences for the current user"""
    
    db_preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    
    if not db_preferences:
        # Create new preferences
        db_preferences = NotificationPreference(
            id=str(uuid.uuid4()),
            user_id=current_user.id
        )
        db.add(db_preferences)
    
    # Update fields
    update_data = preferences_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_preferences, field, value)
    
    db_preferences.updated_at = datetime.utcnow()
    
    try:
        db.commit()
        db.refresh(db_preferences)
        return NotificationPreferenceResponse.from_orm(db_preferences)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update preferences: {str(e)}"
        )

@router.get("/stats", response_model=NotificationStats)
async def get_notification_statistics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get notification statistics for the current user"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Total notifications
    total_notifications = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.created_at >= start_date
    ).count()
    
    # Unread notifications
    unread_count = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    # Notifications by category
    category_stats = db.query(
        Notification.category,
        db.func.count(Notification.id).label('count')
    ).filter(
        Notification.recipient_id == current_user.id,
        Notification.created_at >= start_date
    ).group_by(Notification.category).all()
    
    category_counts = {item.category: item.count for item in category_stats}
    
    # Notifications by priority
    priority_stats = db.query(
        Notification.priority,
        db.func.count(Notification.id).label('count')
    ).filter(
        Notification.recipient_id == current_user.id,
        Notification.created_at >= start_date
    ).group_by(Notification.priority).all()
    
    priority_counts = {item.priority: item.count for item in priority_stats}
    
    return NotificationStats(
        total_notifications=total_notifications,
        unread_count=unread_count,
        read_count=total_notifications - unread_count,
        category_breakdown=category_counts,
        priority_breakdown=priority_counts,
        period_days=days
    )

@router.post("/templates/", response_model=NotificationTemplateResponse)
async def create_notification_template(
    template: NotificationTemplateCreate,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Create a notification template (Admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create notification templates"
        )
    
    template_id = str(uuid.uuid4())
    
    db_template = NotificationTemplate(
        id=template_id,
        name=template.name,
        description=template.description,
        category=template.category,
        title_template=template.title_template,
        message_template=template.message_template,
        variables=template.variables or {},
        default_channels=template.default_channels,
        default_priority=template.default_priority,
        is_active=template.is_active,
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    try:
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        return NotificationTemplateResponse.from_orm(db_template)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template: {str(e)}"
        )

@router.get("/templates/", response_model=List[NotificationTemplateResponse])
async def list_notification_templates(
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """List notification templates"""
    
    query = db.query(NotificationTemplate)
    
    if active_only:
        query = query.filter(NotificationTemplate.is_active == True)
    
    if category:
        query = query.filter(NotificationTemplate.category == category)
    
    templates = query.order_by(NotificationTemplate.name.asc()).all()
    return [NotificationTemplateResponse.from_orm(template) for template in templates]

@router.post("/system-alerts/legal-deadlines")
async def trigger_legal_deadline_alerts(
    days_ahead: int = 7,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Trigger alerts for upcoming legal instrument deadlines (Admin/System use)"""
    
    if current_user.role not in ["admin", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # Get legal instruments with upcoming deadlines
    deadline_date = datetime.now().date() + timedelta(days=days_ahead)
    
    expiring_instruments = db.query(LegalInstrument).filter(
        LegalInstrument.execution_deadline <= deadline_date,
        LegalInstrument.execution_deadline >= datetime.now().date(),
        LegalInstrument.status.in_(["ACTIVE", "PENDING", "ISSUED"])
    ).all()
    
    alert_count = 0
    
    for instrument in expiring_instruments:
        # Find relevant users (case investigators, supervisors)
        if instrument.case_id:
            case = db.query(Case).filter(Case.id == instrument.case_id).first()
            if case and case.lead_investigator_id:
                # Create alert for lead investigator
                notification_id = str(uuid.uuid4())
                
                days_remaining = (instrument.execution_deadline - datetime.now().date()).days
                
                notification = Notification(
                    id=notification_id,
                    recipient_id=case.lead_investigator_id,
                    sender_id=current_user.id,
                    type="DEADLINE_ALERT",
                    category="legal_deadlines",
                    priority="HIGH" if days_remaining <= 3 else "MEDIUM",
                    title=f"Legal Instrument Deadline Alert - {days_remaining} days remaining",
                    message=f"The {instrument.type} '{instrument.title}' (Ref: {instrument.reference_number}) expires in {days_remaining} days on {instrument.execution_deadline}.",
                    data={
                        "instrument_id": instrument.id,
                        "case_id": instrument.case_id,
                        "deadline": instrument.execution_deadline.isoformat(),
                        "days_remaining": days_remaining
                    },
                    channels=["email", "push"],
                    created_at=datetime.utcnow()
                )
                
                db.add(notification)
                alert_count += 1
    
    try:
        db.commit()
        return {
            "message": f"Created {alert_count} deadline alerts",
            "instruments_checked": len(expiring_instruments),
            "alerts_created": alert_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create deadline alerts: {str(e)}"
        )

# Background task functions

async def process_notification_delivery(notification_id: str, channels: List[str]):
    """Process notification delivery via specified channels"""
    # This would be implemented with actual email/SMS/push notification services
    # For now, we'll simulate the process
    
    # In a real implementation, you would:
    # 1. Fetch the notification from database
    # 2. Get recipient preferences
    # 3. Send via each enabled channel
    # 4. Update delivery status
    
    pass

async def send_email_notification_task(notification_id: str, email: str, subject: str, content: str):
    """Send email notification task"""
    # Implementation would use email service (SendGrid, SES, etc.)
    pass

async def send_push_notification_task(notification_id: str, device_token: str, title: str, message: str):
    """Send push notification task"""
    # Implementation would use push notification service (FCM, APNs, etc.)
    pass