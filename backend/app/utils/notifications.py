"""
Notification utility functions for email, SMS, and push notifications
"""

import smtplib
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

from app.config.settings import settings

logger = logging.getLogger(__name__)

# Email Configuration
SMTP_SERVER = getattr(settings, 'SMTP_SERVER', 'localhost')
SMTP_PORT = getattr(settings, 'SMTP_PORT', 587)
SMTP_USERNAME = getattr(settings, 'SMTP_USERNAME', '')
SMTP_PASSWORD = getattr(settings, 'SMTP_PASSWORD', '')
SMTP_USE_TLS = getattr(settings, 'SMTP_USE_TLS', True)
FROM_EMAIL = getattr(settings, 'FROM_EMAIL', 'noreply@jctc.gov.ng')

async def send_email_notification(
    to_email: str,
    subject: str,
    content: str,
    html_content: Optional[str] = None,
    attachments: Optional[List[Dict[str, Any]]] = None
) -> bool:
    """
    Send email notification
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        content: Plain text content
        html_content: HTML content (optional)
        attachments: List of attachments (optional)
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add plain text part
        text_part = MIMEText(content, 'plain', 'utf-8')
        msg.attach(text_part)
        
        # Add HTML part if provided
        if html_content:
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
        
        # Add attachments if provided
        if attachments:
            for attachment in attachments:
                file_part = MIMEBase('application', 'octet-stream')
                file_part.set_payload(attachment['content'])
                encoders.encode_base64(file_part)
                file_part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {attachment["filename"]}'
                )
                msg.attach(file_part)
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            if SMTP_USE_TLS:
                server.starttls()
            
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            
            server.send_message(msg)
        
        logger.info(f"Email notification sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email notification to {to_email}: {str(e)}")
        return False

async def send_sms_notification(
    phone_number: str,
    message: str,
    priority: str = "normal"
) -> bool:
    """
    Send SMS notification using SMS service provider
    
    Args:
        phone_number: Recipient phone number
        message: SMS message content
        priority: Message priority (normal, high)
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        # This is a placeholder implementation
        # In production, you would integrate with SMS providers like:
        # - Twilio
        # - AWS SNS
        # - African SMS providers (Nigeria)
        
        logger.info(f"SMS notification would be sent to {phone_number}: {message}")
        
        # Simulate SMS sending
        return True
        
    except Exception as e:
        logger.error(f"Failed to send SMS notification to {phone_number}: {str(e)}")
        return False

async def send_push_notification(
    device_tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    priority: str = "normal"
) -> Dict[str, bool]:
    """
    Send push notification using Firebase Cloud Messaging (FCM)
    
    Args:
        device_tokens: List of device tokens
        title: Notification title
        body: Notification body
        data: Additional data payload
        priority: Notification priority (normal, high)
    
    Returns:
        Dict[str, bool]: Results for each device token
    """
    results = {}
    
    try:
        # This is a placeholder implementation
        # In production, you would use Firebase Admin SDK or similar:
        
        # from firebase_admin import messaging
        # 
        # message = messaging.MulticastMessage(
        #     notification=messaging.Notification(title=title, body=body),
        #     data=data or {},
        #     tokens=device_tokens,
        #     android=messaging.AndroidConfig(priority=priority),
        #     apns=messaging.APNSConfig(
        #         headers={'apns-priority': '5' if priority == 'high' else '10'}
        #     )
        # )
        # 
        # response = messaging.send_multicast(message)
        
        for token in device_tokens:
            logger.info(f"Push notification would be sent to {token}: {title}")
            results[token] = True
        
        return results
        
    except Exception as e:
        logger.error(f"Failed to send push notifications: {str(e)}")
        for token in device_tokens:
            results[token] = False
        return results

def generate_notification_content(
    template: str,
    variables: Dict[str, Any],
    content_type: str = "text"
) -> str:
    """
    Generate notification content from template and variables
    
    Args:
        template: Template string with placeholders
        variables: Variable values to substitute
        content_type: Content type (text, html)
    
    Returns:
        str: Generated content
    """
    try:
        # Simple template substitution
        # In production, you might use Jinja2 or similar templating engine
        
        content = template
        for key, value in variables.items():
            placeholder = f"{{{key}}}"
            content = content.replace(placeholder, str(value))
        
        return content
        
    except Exception as e:
        logger.error(f"Failed to generate notification content: {str(e)}")
        return template

def check_notification_conditions(
    conditions: Dict[str, Any],
    context: Dict[str, Any]
) -> bool:
    """
    Check if notification conditions are met
    
    Args:
        conditions: Notification conditions to check
        context: Context data to evaluate against
    
    Returns:
        bool: True if conditions are met, False otherwise
    """
    try:
        # Simple condition checking
        # In production, you might implement a more sophisticated rule engine
        
        for key, expected_value in conditions.items():
            if key not in context:
                return False
            
            actual_value = context[key]
            
            # Handle different comparison types
            if isinstance(expected_value, dict):
                operator = expected_value.get('operator', 'equals')
                value = expected_value.get('value')
                
                if operator == 'equals':
                    if actual_value != value:
                        return False
                elif operator == 'not_equals':
                    if actual_value == value:
                        return False
                elif operator == 'greater_than':
                    if actual_value <= value:
                        return False
                elif operator == 'less_than':
                    if actual_value >= value:
                        return False
                elif operator == 'contains':
                    if value not in str(actual_value):
                        return False
                elif operator == 'in':
                    if actual_value not in value:
                        return False
            else:
                # Simple equality check
                if actual_value != expected_value:
                    return False
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to check notification conditions: {str(e)}")
        return False

def is_quiet_hours(
    user_timezone: str,
    quiet_start: str,
    quiet_end: str,
    current_time: Optional[datetime] = None
) -> bool:
    """
    Check if current time is within user's quiet hours
    
    Args:
        user_timezone: User's timezone
        quiet_start: Quiet hours start time (HH:MM)
        quiet_end: Quiet hours end time (HH:MM)
        current_time: Current time (defaults to now)
    
    Returns:
        bool: True if in quiet hours, False otherwise
    """
    try:
        if not current_time:
            current_time = datetime.now()
        
        # Parse quiet hours
        start_time = time.fromisoformat(quiet_start)
        end_time = time.fromisoformat(quiet_end)
        current_time_only = current_time.time()
        
        # Handle quiet hours that span midnight
        if start_time > end_time:
            # Quiet hours span midnight (e.g., 22:00 to 08:00)
            return current_time_only >= start_time or current_time_only <= end_time
        else:
            # Quiet hours within same day (e.g., 13:00 to 14:00)
            return start_time <= current_time_only <= end_time
        
    except Exception as e:
        logger.error(f"Failed to check quiet hours: {str(e)}")
        return False

def get_notification_priority_score(priority: str) -> int:
    """
    Get numeric score for notification priority
    
    Args:
        priority: Priority level (LOW, MEDIUM, HIGH, CRITICAL)
    
    Returns:
        int: Numeric priority score
    """
    priority_scores = {
        'LOW': 1,
        'MEDIUM': 2,
        'HIGH': 3,
        'CRITICAL': 4
    }
    return priority_scores.get(priority, 2)

def should_send_notification(
    notification_preferences: Dict[str, Any],
    notification_category: str,
    notification_priority: str,
    channel: str,
    current_time: Optional[datetime] = None
) -> bool:
    """
    Determine if notification should be sent based on user preferences
    
    Args:
        notification_preferences: User's notification preferences
        notification_category: Notification category
        notification_priority: Notification priority
        channel: Delivery channel (email, push, sms)
        current_time: Current time
    
    Returns:
        bool: True if notification should be sent, False otherwise
    """
    try:
        # Check if channel is globally enabled
        channel_enabled_key = f"{channel}_enabled"
        if not notification_preferences.get(channel_enabled_key, False):
            return False
        
        # Check category-specific preferences
        categories = notification_preferences.get('categories', {})
        category_prefs = categories.get(notification_category, {})
        
        # If category-specific preference exists, use it
        if channel in category_prefs:
            if not category_prefs[channel]:
                return False
        
        # Check quiet hours for non-critical notifications
        if notification_priority != 'CRITICAL':
            quiet_hours_enabled = notification_preferences.get('quiet_hours_enabled', False)
            if quiet_hours_enabled:
                timezone = notification_preferences.get('timezone', 'UTC')
                quiet_start = notification_preferences.get('quiet_hours_start', '22:00')
                quiet_end = notification_preferences.get('quiet_hours_end', '08:00')
                
                if is_quiet_hours(timezone, quiet_start, quiet_end, current_time):
                    return False
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to determine if notification should be sent: {str(e)}")
        return True  # Default to sending if there's an error

def format_notification_for_channel(
    title: str,
    message: str,
    data: Dict[str, Any],
    channel: str
) -> Dict[str, Any]:
    """
    Format notification content for specific delivery channel
    
    Args:
        title: Notification title
        message: Notification message
        data: Additional data
        channel: Delivery channel
    
    Returns:
        Dict[str, Any]: Formatted notification content
    """
    try:
        if channel == 'email':
            return {
                'subject': title,
                'text_content': message,
                'html_content': f"<h3>{title}</h3><p>{message}</p>",
                'data': data
            }
        elif channel == 'sms':
            # SMS has character limits, so truncate if necessary
            sms_content = f"{title}: {message}"
            if len(sms_content) > 160:
                sms_content = sms_content[:157] + "..."
            
            return {
                'message': sms_content,
                'data': data
            }
        elif channel == 'push':
            return {
                'title': title,
                'body': message,
                'data': data
            }
        else:
            return {
                'title': title,
                'message': message,
                'data': data
            }
            
    except Exception as e:
        logger.error(f"Failed to format notification for channel {channel}: {str(e)}")
        return {
            'title': title,
            'message': message,
            'data': data
        }

# Notification delivery status tracking
DELIVERY_STATUS = {
    'PENDING': 'Notification queued for delivery',
    'SENT': 'Notification sent to provider',
    'DELIVERED': 'Notification delivered to recipient',
    'FAILED': 'Notification delivery failed',
    'BOUNCED': 'Notification bounced (invalid recipient)',
    'OPENED': 'Notification opened by recipient',
    'CLICKED': 'Notification link clicked by recipient'
}

def get_delivery_status_description(status: str) -> str:
    """Get human-readable description for delivery status"""
    return DELIVERY_STATUS.get(status, 'Unknown status')

# Notification categories and their default settings
DEFAULT_NOTIFICATION_CATEGORIES = {
    'case_updates': {
        'name': 'Case Updates',
        'description': 'Updates about case progress and status changes',
        'default_channels': ['email', 'push'],
        'default_priority': 'MEDIUM'
    },
    'evidence_alerts': {
        'name': 'Evidence Alerts',
        'description': 'Alerts about evidence handling and chain of custody',
        'default_channels': ['email', 'push'],
        'default_priority': 'HIGH'
    },
    'deadlines': {
        'name': 'Deadlines',
        'description': 'Upcoming deadlines and time-sensitive alerts',
        'default_channels': ['email', 'push', 'sms'],
        'default_priority': 'HIGH'
    },
    'assignments': {
        'name': 'Task Assignments',
        'description': 'New task assignments and updates',
        'default_channels': ['email', 'push'],
        'default_priority': 'MEDIUM'
    },
    'system': {
        'name': 'System Notifications',
        'description': 'System maintenance and important announcements',
        'default_channels': ['email', 'push'],
        'default_priority': 'MEDIUM'
    },
    'security': {
        'name': 'Security Alerts',
        'description': 'Security-related notifications and alerts',
        'default_channels': ['email', 'push', 'sms'],
        'default_priority': 'CRITICAL'
    }
}