"""
Audit integration utilities for existing API endpoints.

This module provides decorators and utilities to easily integrate
comprehensive audit logging into existing API endpoints without
major code changes.
"""

import functools
import inspect
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.utils.audit import AuditService, AuditContext
from app.schemas.audit import AuditAction, AuditEntity, AuditSeverity
from app.database.session import get_db
from app.models.users import User


class AuditableEndpoint:
    """
    Decorator for adding audit logging to API endpoints.
    
    Usage:
        @router.post("/cases/")
        @AuditableEndpoint(
            action=AuditAction.CREATE,
            entity=AuditEntity.CASE,
            description="Create new case"
        )
        async def create_case(...):
            ...
    """
    
    def __init__(
        self,
        action: AuditAction,
        entity: AuditEntity,
        description: str = None,
        severity: AuditSeverity = AuditSeverity.LOW,
        capture_request_data: bool = False,
        capture_response_data: bool = False,
        sensitive_fields: list = None
    ):
        self.action = action
        self.entity = entity
        self.description = description
        self.severity = severity
        self.capture_request_data = capture_request_data
        self.capture_response_data = capture_response_data
        self.sensitive_fields = sensitive_fields or ['password', 'token', 'secret', 'key']
    
    def __call__(self, func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract common parameters
            db = None
            current_user = None
            entity_id = None
            request = None
            
            # Get function signature
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            
            # Extract parameters we need
            for param_name, param_value in bound_args.arguments.items():
                if hasattr(param_value, 'query'):  # Database session
                    db = param_value
                elif isinstance(param_value, User):  # Current user
                    current_user = param_value
                elif isinstance(param_value, Request):  # Request object
                    request = param_value
                elif param_name in ['case_id', 'user_id', 'evidence_id', 'id']:  # Entity ID
                    entity_id = str(param_value) if param_value else None
            
            # Prepare audit details
            details = {}
            if self.capture_request_data:
                details['request_params'] = self._sanitize_data(bound_args.arguments)
            
            # Create audit context if we have request
            audit_context = None
            if request:
                audit_context = AuditContext.from_request(
                    request, 
                    current_user.id if current_user else None
                )
            
            try:
                # Execute the original function
                result = await func(*args, **kwargs)
                
                # Capture response data if requested
                if self.capture_response_data and result:
                    details['response_data'] = self._sanitize_data(
                        result.dict() if hasattr(result, 'dict') else str(result)
                    )
                
                # Log successful action if we have db session
                if db and current_user:
                    audit_service = AuditService(db)
                    description = self.description or f"{func.__name__} executed successfully"
                    
                    audit_service.log_action(
                        action=self.action,
                        entity_type=self.entity,
                        description=description,
                        entity_id=entity_id,
                        details=details if details else None,
                        severity=self.severity,
                        user_id=current_user.id,
                        context=audit_context
                    )
                
                return result
                
            except Exception as e:
                # Log failed action
                if db and current_user:
                    audit_service = AuditService(db)
                    description = self.description or f"{func.__name__} failed: {str(e)}"
                    details['error'] = str(e)
                    details['error_type'] = type(e).__name__
                    
                    audit_service.log_action(
                        action=self.action,
                        entity_type=self.entity,
                        description=description,
                        entity_id=entity_id,
                        details=details,
                        severity=AuditSeverity.HIGH,
                        user_id=current_user.id,
                        context=audit_context
                    )
                
                # Re-raise the original exception
                raise
        
        return wrapper
    
    def _sanitize_data(self, data: Any) -> Dict[str, Any]:
        """Sanitize data by removing sensitive fields."""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                if any(sensitive in key.lower() for sensitive in self.sensitive_fields):
                    sanitized[key] = '[REDACTED]'
                elif isinstance(value, dict):
                    sanitized[key] = self._sanitize_data(value)
                elif isinstance(value, (list, tuple)):
                    sanitized[key] = [
                        self._sanitize_data(item) if isinstance(item, dict) else str(item)
                        for item in value
                    ]
                else:
                    sanitized[key] = str(value) if value is not None else None
            return sanitized
        return str(data) if data is not None else None


class AuditIntegrationMiddleware(BaseHTTPMiddleware):
    """
    Middleware for automatic audit logging of all API requests.
    
    Provides comprehensive request/response logging for audit trails.
    """
    
    def __init__(self, app, db_session_factory, audit_sensitive_endpoints: bool = True):
        super().__init__(app)
        self.db_session_factory = db_session_factory
        self.audit_sensitive_endpoints = audit_sensitive_endpoints
        
        # Define sensitive endpoints that should always be audited
        self.sensitive_paths = [
            '/api/v1/auth/',
            '/api/v1/users/',
            '/api/v1/cases/',
            '/api/v1/evidence/',
            '/api/v1/parties/',
            '/api/v1/legal-instruments/',
            '/api/v1/integrations/',
            '/api/v1/audit/'
        ]
        
        # Define high-risk operations
        self.high_risk_methods = ['POST', 'PUT', 'PATCH', 'DELETE']
    
    async def dispatch(self, request: Request, call_next):
        # Generate correlation ID
        correlation_id = request.headers.get('X-Correlation-ID') or str(uuid.uuid4())
        
        # Determine if this request should be audited
        should_audit = self._should_audit_request(request)
        
        # Set up audit context in request state
        request.state.audit_context = AuditContext.from_request(request)
        request.state.correlation_id = correlation_id
        
        start_time = datetime.utcnow()
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Add correlation ID to response
            response.headers['X-Correlation-ID'] = correlation_id
            
            # Log successful request if needed
            if should_audit:
                await self._log_request(
                    request, response, start_time, None
                )
            
            return response
            
        except Exception as e:
            # Log failed request if needed
            if should_audit:
                await self._log_request(
                    request, None, start_time, e
                )
            
            # Re-raise the exception
            raise
    
    def _should_audit_request(self, request: Request) -> bool:
        """Determine if a request should be audited."""
        if not self.audit_sensitive_endpoints:
            return False
        
        # Always audit sensitive endpoints
        path = request.url.path
        if any(sensitive in path for sensitive in self.sensitive_paths):
            return True
        
        # Always audit high-risk methods
        if request.method in self.high_risk_methods:
            return True
        
        return False
    
    async def _log_request(
        self, 
        request: Request, 
        response: Optional[Response], 
        start_time: datetime,
        exception: Optional[Exception]
    ):
        """Log HTTP request for audit purposes."""
        try:
            # Determine action based on HTTP method
            action_mapping = {
                'GET': AuditAction.READ,
                'POST': AuditAction.CREATE,
                'PUT': AuditAction.UPDATE,
                'PATCH': AuditAction.UPDATE,
                'DELETE': AuditAction.DELETE
            }
            
            action = action_mapping.get(request.method, AuditAction.READ)
            
            # Determine severity
            if exception:
                severity = AuditSeverity.HIGH
            elif request.method in self.high_risk_methods:
                severity = AuditSeverity.MEDIUM
            else:
                severity = AuditSeverity.LOW
            
            # Calculate request duration
            end_time = datetime.utcnow()
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            # Prepare audit details
            details = {
                'method': request.method,
                'path': request.url.path,
                'query_params': dict(request.query_params) if request.query_params else None,
                'duration_ms': round(duration_ms, 2),
                'user_agent': request.headers.get('User-Agent'),
                'content_type': request.headers.get('Content-Type')
            }
            
            if response:
                details['status_code'] = response.status_code
                details['response_size'] = response.headers.get('Content-Length')
            
            if exception:
                details['error'] = str(exception)
                details['error_type'] = type(exception).__name__
            
            # Create description
            if exception:
                description = f"HTTP {request.method} {request.url.path} failed: {str(exception)}"
            else:
                status_code = response.status_code if response else 'unknown'
                description = f"HTTP {request.method} {request.url.path} - {status_code}"
            
            # Get audit context from request state
            audit_context = getattr(request.state, 'audit_context', None)
            
            # Log to audit system
            with self.db_session_factory() as db:
                audit_service = AuditService(db)
                audit_service.log_action(
                    action=action,
                    entity_type=AuditEntity.SYSTEM,
                    description=description,
                    details=details,
                    severity=severity,
                    context=audit_context
                )
                
        except Exception as e:
            # Don't let audit logging break the application
            # Log to system logger instead
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Audit logging failed: {str(e)}")


# Utility functions for common audit patterns

def audit_case_operation(action: AuditAction, description: str = None):
    """Decorator for case-related operations."""
    return AuditableEndpoint(
        action=action,
        entity=AuditEntity.CASE,
        description=description,
        severity=AuditSeverity.MEDIUM,
        capture_request_data=True
    )

def audit_evidence_operation(action: AuditAction, description: str = None):
    """Decorator for evidence-related operations."""
    return AuditableEndpoint(
        action=action,
        entity=AuditEntity.EVIDENCE,
        description=description,
        severity=AuditSeverity.HIGH,  # Evidence is high-sensitivity
        capture_request_data=True,
        capture_response_data=True
    )

def audit_user_operation(action: AuditAction, description: str = None):
    """Decorator for user-related operations."""
    return AuditableEndpoint(
        action=action,
        entity=AuditEntity.USER,
        description=description,
        severity=AuditSeverity.HIGH,  # User operations are high-sensitivity
        capture_request_data=True,
        sensitive_fields=['password', 'token', 'secret', 'key', 'credential']
    )

def audit_party_operation(action: AuditAction, description: str = None):
    """Decorator for party-related operations."""
    return AuditableEndpoint(
        action=action,
        entity=AuditEntity.PARTY,
        description=description,
        severity=AuditSeverity.MEDIUM,
        capture_request_data=True
    )

def audit_legal_instrument_operation(action: AuditAction, description: str = None):
    """Decorator for legal instrument operations."""
    return AuditableEndpoint(
        action=action,
        entity=AuditEntity.LEGAL_INSTRUMENT,
        description=description,
        severity=AuditSeverity.HIGH,  # Legal instruments are high-sensitivity
        capture_request_data=True
    )

def audit_integration_operation(action: AuditAction, description: str = None):
    """Decorator for integration-related operations."""
    return AuditableEndpoint(
        action=action,
        entity=AuditEntity.INTEGRATION,
        description=description,
        severity=AuditSeverity.HIGH,  # Integration operations are high-sensitivity
        capture_request_data=True
    )


# Quick integration functions for existing endpoints

async def log_case_access(db, user_id: uuid.UUID, case_id: str, action: str = "VIEW"):
    """Quick function to log case access."""
    audit_service = AuditService(db)
    audit_service.log_action(
        action=AuditAction.READ if action == "VIEW" else AuditAction.UPDATE,
        entity_type=AuditEntity.CASE,
        entity_id=case_id,
        description=f"Case {action.lower()}ed by user",
        severity=AuditSeverity.LOW,
        user_id=user_id
    )

async def log_evidence_modification(
    db, 
    user_id: uuid.UUID, 
    evidence_id: str, 
    action: str, 
    details: Dict[str, Any] = None
):
    """Quick function to log evidence modifications."""
    audit_service = AuditService(db)
    
    action_mapping = {
        'CREATE': AuditAction.CREATE,
        'UPDATE': AuditAction.UPDATE,
        'DELETE': AuditAction.DELETE,
        'TRANSFER': AuditAction.TRANSFER
    }
    
    audit_service.log_action(
        action=action_mapping.get(action, AuditAction.UPDATE),
        entity_type=AuditEntity.EVIDENCE,
        entity_id=evidence_id,
        description=f"Evidence {action.lower()}",
        details=details,
        severity=AuditSeverity.HIGH,
        user_id=user_id
    )

async def log_user_action(
    db, 
    acting_user_id: uuid.UUID, 
    target_user_id: str, 
    action: str,
    details: Dict[str, Any] = None
):
    """Quick function to log user management actions."""
    audit_service = AuditService(db)
    
    action_mapping = {
        'CREATE': AuditAction.CREATE,
        'UPDATE': AuditAction.UPDATE,
        'DELETE': AuditAction.DELETE,
        'LOGIN': AuditAction.LOGIN,
        'LOGOUT': AuditAction.LOGOUT,
        'ACCESS_DENIED': AuditAction.ACCESS_DENIED
    }
    
    audit_service.log_action(
        action=action_mapping.get(action, AuditAction.UPDATE),
        entity_type=AuditEntity.USER,
        entity_id=target_user_id,
        description=f"User {action.lower()}",
        details=details,
        severity=AuditSeverity.HIGH,
        user_id=acting_user_id
    )

async def log_authentication_event(
    db,
    user_id: Optional[uuid.UUID],
    action: str,
    ip_address: str = None,
    user_agent: str = None,
    success: bool = True,
    details: Dict[str, Any] = None
):
    """Log authentication events with enhanced security tracking."""
    audit_service = AuditService(db)
    
    # Create audit context for authentication
    context = AuditContext(
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    action_mapping = {
        'LOGIN': AuditAction.LOGIN,
        'LOGOUT': AuditAction.LOGOUT,
        'FAILED_LOGIN': AuditAction.ACCESS_DENIED,
        'PASSWORD_RESET': AuditAction.UPDATE,
        'ACCOUNT_LOCKED': AuditAction.UPDATE
    }
    
    severity = AuditSeverity.LOW if success else AuditSeverity.HIGH
    
    audit_service.log_action(
        action=action_mapping.get(action, AuditAction.LOGIN),
        entity_type=AuditEntity.SESSION,
        entity_id=str(user_id) if user_id else None,
        description=f"Authentication: {action}",
        details=details,
        severity=severity,
        user_id=user_id,
        context=context
    )


def log_prosecution_activity(
    db,
    user_id: uuid.UUID,
    case_id: uuid.UUID,
    action: str,
    details: Dict[str, Any] = None
):
    """Log prosecution-related activities for legal audit trails."""
    try:
        # Map prosecution action strings to AuditAction enums
        action_mapping = {
            'CHARGES_FILED': AuditAction.CREATE,
            'CHARGE_UPDATED': AuditAction.UPDATE,
            'CHARGE_WITHDRAWN': AuditAction.DELETE,
            'COURT_SESSION_SCHEDULED': AuditAction.CREATE,
            'COURT_SESSION_UPDATED': AuditAction.UPDATE,
            'CASE_OUTCOME_RECORDED': AuditAction.CREATE,
            'CASE_OUTCOME_UPDATED': AuditAction.UPDATE,
            'PROSECUTION_VIEW': AuditAction.READ
        }
        
        audit_action = action_mapping.get(action.upper(), AuditAction.UPDATE)
        
        audit_service = AuditService(db)
        audit_service.log_action(
            action=audit_action,
            entity_type=AuditEntity.CASE,  # Prosecution activities relate to cases
            description=f"Prosecution activity: {action.replace('_', ' ').title()}",
            entity_id=str(case_id),
            details=details,
            severity=AuditSeverity.HIGH,  # Prosecution activities are legally significant
            user_id=user_id
        )
    except Exception as e:
        # Don't break the application if audit logging fails
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Prosecution audit logging failed: {str(e)}")


def log_device_activity(
    db,
    user_id: uuid.UUID,
    device_id: str,
    action: str,
    details: Dict[str, Any] = None
):
    """Log device seizure and forensic activities."""
    try:
        # Map device action strings to AuditAction enums
        action_mapping = {
            'DEVICE_SEIZED': AuditAction.CREATE,
            'DEVICE_IMAGED': AuditAction.UPDATE,
            'IMAGING_STARTED': AuditAction.UPDATE,
            'IMAGING_COMPLETED': AuditAction.UPDATE,
            'ARTIFACT_ADDED': AuditAction.CREATE,
            'DEVICE_RELEASED': AuditAction.UPDATE,
            'DEVICE_VIEW': AuditAction.READ
        }
        
        audit_action = action_mapping.get(action.upper(), AuditAction.UPDATE)
        
        audit_service = AuditService(db)
        audit_service.log_action(
            action=audit_action,
            entity_type=AuditEntity.EVIDENCE,  # Devices are evidence
            description=f"Device activity: {action.replace('_', ' ').title()}",
            entity_id=device_id,
            details=details,
            severity=AuditSeverity.HIGH,  # Device operations are forensically critical
            user_id=user_id
        )
    except Exception as e:
        # Don't break the application if audit logging fails
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Device audit logging failed: {str(e)}")


def log_international_cooperation(
    db,
    user_id: uuid.UUID,
    case_id: uuid.UUID,
    action: str,
    details: Dict[str, Any] = None
):
    """Log international cooperation activities for cross-border cases."""
    try:
        # Map international cooperation actions
        action_mapping = {
            'MLAT_REQUEST_SENT': AuditAction.CREATE,
            'MLAT_REQUEST_RECEIVED': AuditAction.CREATE,
            'PRESERVATION_REQUEST': AuditAction.CREATE,
            'TAKEDOWN_REQUEST': AuditAction.CREATE,
            'INTERPOL_NOTICE': AuditAction.CREATE,
            'COOPERATION_UPDATE': AuditAction.UPDATE,
            'INTERNATIONAL_VIEW': AuditAction.READ
        }
        
        audit_action = action_mapping.get(action.upper(), AuditAction.CREATE)
        
        audit_service = AuditService(db)
        audit_service.log_action(
            action=audit_action,
            entity_type=AuditEntity.CASE,  # International activities relate to cases
            description=f"International cooperation: {action.replace('_', ' ').title()}",
            entity_id=str(case_id),
            details=details,
            severity=AuditSeverity.HIGH,  # International cooperation is critical
            user_id=user_id
        )
    except Exception as e:
        # Don't break the application if audit logging fails
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"International cooperation audit logging failed: {str(e)}")
