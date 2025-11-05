"""
Audit logging utilities for comprehensive system activity tracking.

This module provides:
- Structured audit logging with tamper-proof integrity
- Correlation ID tracking and request context enrichment
- Automatic audit trail generation for all system activities
- Compliance violation detection and reporting
- Data retention and archival management
"""

import uuid
import hashlib
import json
import logging
import traceback
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Union
from contextlib import contextmanager
from functools import wraps
from threading import local

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.models.audit import (
    AuditLog, ComplianceViolation, AuditConfiguration, 
    RetentionPolicy, DataRetentionJob, AuditArchive
)
from app.schemas.audit import (
    AuditAction, AuditEntity, AuditSeverity, ComplianceStatus,
    ViolationType, AuditLogCreate, AuditSearchFilters
)


# Thread-local storage for request context
_context = local()

# Logger for audit system
logger = logging.getLogger(__name__)


class AuditContext:
    """Context manager for audit trail correlation and enrichment."""
    
    def __init__(
        self,
        user_id: Optional[uuid.UUID] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        correlation_id: Optional[str] = None
    ):
        self.user_id = user_id
        self.session_id = session_id
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.correlation_id = correlation_id or str(uuid.uuid4())
    
    @classmethod
    def from_request(cls, request: Request, user_id: Optional[uuid.UUID] = None) -> 'AuditContext':
        """Create audit context from FastAPI request."""
        return cls(
            user_id=user_id,
            session_id=request.headers.get('X-Session-ID'),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get('User-Agent'),
            correlation_id=request.headers.get('X-Correlation-ID') or str(uuid.uuid4())
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary."""
        return {
            'user_id': str(self.user_id) if self.user_id else None,
            'session_id': self.session_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'correlation_id': self.correlation_id
        }


class AuditService:
    """
    Comprehensive audit logging service with integrity protection.
    
    Provides structured audit logging, compliance monitoring, and
    forensic-grade audit trail management.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self._configurations_cache = {}
        self._last_cache_update = None
        self._cache_ttl = timedelta(minutes=5)
    
    def set_context(
        self,
        user_id: Optional[uuid.UUID] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        correlation_id: Optional[str] = None
    ) -> None:
        """Set audit context for current thread."""
        _context.audit_context = AuditContext(
            user_id, session_id, ip_address, user_agent, correlation_id
        )
    
    def get_context(self) -> Optional[AuditContext]:
        """Get current audit context."""
        return getattr(_context, 'audit_context', None)
    
    @contextmanager
    def context(self, **kwargs):
        """Context manager for temporary audit context."""
        old_context = getattr(_context, 'audit_context', None)
        _context.audit_context = AuditContext(**kwargs)
        try:
            yield _context.audit_context
        finally:
            _context.audit_context = old_context
    
    def log_action(
        self,
        action: Union[AuditAction, str],
        entity_type: Union[AuditEntity, str],
        description: str,
        entity_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: Union[AuditSeverity, str] = AuditSeverity.LOW,
        user_id: Optional[uuid.UUID] = None,
        context: Optional[AuditContext] = None
    ) -> Optional[AuditLog]:
        """
        Log an audit action with full context and integrity protection.
        
        Args:
            action: Action being performed
            entity_type: Type of entity being acted upon
            description: Human-readable description
            entity_id: ID of specific entity (optional)
            details: Additional structured details
            severity: Severity level of the action
            user_id: User performing the action (optional, uses context if not provided)
            context: Audit context (optional, uses thread context if not provided)
        
        Returns:
            Created audit log entry or None if logging failed
        """
        try:
            # Use provided context or get from thread
            if context is None:
                context = self.get_context()
            
            # Check if this action should be audited
            if not self._should_audit_action(str(entity_type), str(action), str(severity)):
                return None
            
            # Prepare audit log data
            audit_data = AuditLogCreate(
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                description=description,
                details=details,
                severity=severity,
                user_id=user_id or (context.user_id if context else None),
                session_id=context.session_id if context else None,
                ip_address=context.ip_address if context else None,
                user_agent=context.user_agent if context else None,
                correlation_id=context.correlation_id if context else None
            )
            
            # Create audit log entry
            audit_log = AuditLog(**audit_data.dict())
            
            # Get previous checksum for chain integrity
            last_audit = self.db.query(AuditLog).order_by(desc(AuditLog.timestamp)).first()
            if last_audit:
                audit_log.previous_checksum = last_audit.checksum
            
            # Generate integrity checksum
            audit_log.generate_checksum()
            
            # Save to database
            self.db.add(audit_log)
            self.db.commit()
            
            # Check for compliance violations
            self._check_compliance_violations(audit_log)
            
            logger.info(f"Audit logged: {action} on {entity_type} by {user_id}")
            return audit_log
            
        except Exception as e:
            logger.error(f"Audit logging failed: {str(e)}")
            self.db.rollback()
            
            # Log the audit failure itself (if possible)
            self._log_audit_failure(action, entity_type, str(e))
            return None
    
    def search_audit_logs(
        self,
        filters: AuditSearchFilters,
        page: int = 1,
        size: int = 50,
        sort_by: str = "timestamp",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """
        Search audit logs with comprehensive filtering.
        
        Args:
            filters: Search filters
            page: Page number (1-based)
            size: Page size
            sort_by: Sort field
            sort_order: Sort order (asc/desc)
        
        Returns:
            Dictionary with audit logs and pagination info
        """
        try:
            query = self.db.query(AuditLog)
            
            # Apply filters
            if filters.user_id:
                query = query.filter(AuditLog.user_id == filters.user_id)
            
            if filters.entity_type:
                query = query.filter(AuditLog.entity_type == filters.entity_type)
            
            if filters.entity_id:
                query = query.filter(AuditLog.entity_id == filters.entity_id)
            
            if filters.action:
                query = query.filter(AuditLog.action == filters.action)
            
            if filters.severity:
                query = query.filter(AuditLog.severity == filters.severity)
            
            if filters.start_date:
                query = query.filter(AuditLog.timestamp >= filters.start_date)
            
            if filters.end_date:
                query = query.filter(AuditLog.timestamp <= filters.end_date)
            
            if filters.ip_address:
                query = query.filter(AuditLog.ip_address == filters.ip_address)
            
            if filters.session_id:
                query = query.filter(AuditLog.session_id == filters.session_id)
            
            if filters.correlation_id:
                query = query.filter(AuditLog.correlation_id == filters.correlation_id)
            
            if filters.search_text:
                search_pattern = f"%{filters.search_text}%"
                query = query.filter(
                    or_(
                        AuditLog.description.ilike(search_pattern),
                        AuditLog.details.astext.ilike(search_pattern)
                    )
                )
            
            # Apply sorting
            if sort_order.lower() == "desc":
                query = query.order_by(desc(getattr(AuditLog, sort_by)))
            else:
                query = query.order_by(getattr(AuditLog, sort_by))
            
            # Get total count
            total = query.count()
            
            # Apply pagination
            offset = (page - 1) * size
            items = query.offset(offset).limit(size).all()
            
            return {
                'items': items,
                'total': total,
                'page': page,
                'size': size,
                'pages': (total + size - 1) // size
            }
            
        except Exception as e:
            logger.error(f"Audit search failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Audit search failed")
    
    def verify_audit_integrity(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Verify audit log integrity for given date range.
        
        Args:
            start_date: Start date for verification
            end_date: End date for verification
        
        Returns:
            Dictionary with integrity verification results
        """
        try:
            query = self.db.query(AuditLog).order_by(AuditLog.timestamp)
            
            if start_date:
                query = query.filter(AuditLog.timestamp >= start_date)
            if end_date:
                query = query.filter(AuditLog.timestamp <= end_date)
            
            audit_logs = query.all()
            
            results = {
                'total_checked': len(audit_logs),
                'valid_entries': 0,
                'invalid_entries': 0,
                'chain_breaks': 0,
                'invalid_logs': []
            }
            
            previous_checksum = None
            
            for log in audit_logs:
                # Verify individual log integrity
                if not log.verify_integrity():
                    results['invalid_entries'] += 1
                    results['invalid_logs'].append({
                        'id': str(log.id),
                        'timestamp': log.timestamp.isoformat(),
                        'issue': 'Invalid checksum'
                    })
                else:
                    results['valid_entries'] += 1
                
                # Verify chain integrity
                if previous_checksum and log.previous_checksum != previous_checksum:
                    results['chain_breaks'] += 1
                    results['invalid_logs'].append({
                        'id': str(log.id),
                        'timestamp': log.timestamp.isoformat(),
                        'issue': 'Chain break detected'
                    })
                
                previous_checksum = log.checksum
            
            return results
            
        except Exception as e:
            logger.error(f"Integrity verification failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Integrity verification failed")
    
    def get_audit_statistics(self) -> Dict[str, Any]:
        """Get comprehensive audit statistics for dashboards."""
        try:
            now = datetime.utcnow()
            today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = today - timedelta(days=today.weekday())
            month_start = today.replace(day=1)
            
            # Basic counts
            total_entries = self.db.query(AuditLog).count()
            entries_today = self.db.query(AuditLog).filter(AuditLog.timestamp >= today).count()
            entries_this_week = self.db.query(AuditLog).filter(AuditLog.timestamp >= week_start).count()
            entries_this_month = self.db.query(AuditLog).filter(AuditLog.timestamp >= month_start).count()
            
            # Top actions
            top_actions = self.db.query(
                AuditLog.action,
                func.count(AuditLog.id).label('count')
            ).group_by(AuditLog.action).order_by(desc('count')).limit(10).all()
            
            # Top entities
            top_entities = self.db.query(
                AuditLog.entity_type,
                func.count(AuditLog.id).label('count')
            ).group_by(AuditLog.entity_type).order_by(desc('count')).limit(10).all()
            
            # Top users
            top_users = self.db.query(
                AuditLog.user_id,
                func.count(AuditLog.id).label('count')
            ).filter(AuditLog.user_id.isnot(None)).group_by(AuditLog.user_id).order_by(desc('count')).limit(10).all()
            
            # Severity breakdown
            severity_breakdown = dict(self.db.query(
                AuditLog.severity,
                func.count(AuditLog.id).label('count')
            ).group_by(AuditLog.severity).all())
            
            return {
                'total_entries': total_entries,
                'entries_today': entries_today,
                'entries_this_week': entries_this_week,
                'entries_this_month': entries_this_month,
                'top_actions': [{'action': action, 'count': count} for action, count in top_actions],
                'top_entities': [{'entity': entity, 'count': count} for entity, count in top_entities],
                'top_users': [{'user_id': str(user_id), 'count': count} for user_id, count in top_users],
                'severity_breakdown': severity_breakdown
            }
            
        except Exception as e:
            logger.error(f"Statistics generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Statistics generation failed")
    
    def _should_audit_action(self, entity_type: str, action: str, severity: str) -> bool:
        """Check if action should be audited based on configuration."""
        try:
            config = self._get_audit_configuration(entity_type)
            if not config or not config.is_active:
                return True  # Default to auditing if no config
            
            return (config.should_audit_action(action) and 
                   config.should_log_severity(severity))
                   
        except Exception:
            return True  # Default to auditing on error
    
    def _get_audit_configuration(self, entity_type: str) -> Optional[AuditConfiguration]:
        """Get audit configuration for entity type with caching."""
        now = datetime.utcnow()
        
        # Check cache validity
        if (self._last_cache_update is None or 
            now - self._last_cache_update > self._cache_ttl):
            self._refresh_configuration_cache()
        
        return self._configurations_cache.get(entity_type)
    
    def _refresh_configuration_cache(self) -> None:
        """Refresh audit configuration cache."""
        try:
            configs = self.db.query(AuditConfiguration).filter(
                AuditConfiguration.is_active == True
            ).all()
            
            self._configurations_cache = {
                config.entity_type: config for config in configs
            }
            self._last_cache_update = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Configuration cache refresh failed: {str(e)}")
    
    def _check_compliance_violations(self, audit_log: AuditLog) -> None:
        """Check audit log for potential compliance violations."""
        try:
            # Check for suspicious patterns
            violations = []
            
            # Check for failed login attempts
            if (audit_log.action == AuditAction.LOGIN and 
                audit_log.severity == AuditSeverity.HIGH):
                violations.append({
                    'type': ViolationType.ACCESS_CONTROL,
                    'title': 'Multiple Failed Login Attempts',
                    'description': f'Failed login detected from {audit_log.ip_address}'
                })
            
            # Check for unauthorized access attempts
            if audit_log.action == AuditAction.ACCESS_DENIED:
                violations.append({
                    'type': ViolationType.ACCESS_CONTROL,
                    'title': 'Unauthorized Access Attempt',
                    'description': f'Access denied for user {audit_log.user_id} to {audit_log.entity_type}'
                })
            
            # Check for bulk operations
            if audit_log.action in [AuditAction.DELETE, AuditAction.EXPORT] and audit_log.severity == AuditSeverity.HIGH:
                violations.append({
                    'type': ViolationType.DATA_INTEGRITY,
                    'title': 'High-Risk Data Operation',
                    'description': f'High-risk {audit_log.action} operation on {audit_log.entity_type}'
                })
            
            # Create compliance violations
            for violation_data in violations:
                violation = ComplianceViolation(
                    violation_type=violation_data['type'],
                    entity_type=audit_log.entity_type,
                    entity_id=audit_log.entity_id,
                    severity=audit_log.severity,
                    title=violation_data['title'],
                    description=violation_data['description'],
                    related_audit_logs=[audit_log.id]
                )
                self.db.add(violation)
            
            if violations:
                self.db.commit()
                
        except Exception as e:
            logger.error(f"Compliance check failed: {str(e)}")
    
    def _log_audit_failure(self, action: str, entity_type: str, error: str) -> None:
        """Log audit system failures."""
        try:
            failure_log = AuditLog(
                action=AuditAction.CONFIGURE,
                entity_type=AuditEntity.SYSTEM,
                description=f"Audit logging failed for {action} on {entity_type}: {error}",
                severity=AuditSeverity.CRITICAL,
                details={'original_action': action, 'original_entity': entity_type, 'error': error}
            )
            self.db.add(failure_log)
            self.db.commit()
        except Exception:
            # If we can't log the failure, write to system log
            logger.critical(f"Critical: Audit system failure - {error}")


def audit_action(
    action: Union[AuditAction, str],
    entity_type: Union[AuditEntity, str],
    description: str = None,
    severity: Union[AuditSeverity, str] = AuditSeverity.LOW,
    include_args: bool = False,
    include_result: bool = False
):
    """
    Decorator for automatic audit logging of function calls.
    
    Args:
        action: Audit action type
        entity_type: Entity type being acted upon
        description: Custom description (optional, uses function name if not provided)
        severity: Severity level
        include_args: Include function arguments in details
        include_result: Include function result in details
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get database session from function arguments
            db = None
            for arg in args:
                if isinstance(arg, Session):
                    db = arg
                    break
            
            if db is None:
                # Look for db in kwargs
                db = kwargs.get('db')
            
            if db is None:
                # Execute function without auditing if no db session
                return func(*args, **kwargs)
            
            audit_service = AuditService(db)
            
            # Prepare audit details
            details = {}
            if include_args:
                details['args'] = str(args)
                details['kwargs'] = {k: str(v) for k, v in kwargs.items()}
            
            # Extract entity ID if present
            entity_id = kwargs.get('id') or (args[1] if len(args) > 1 else None)
            if entity_id:
                entity_id = str(entity_id)
            
            try:
                # Execute function
                result = func(*args, **kwargs)
                
                # Include result in details if requested
                if include_result and result is not None:
                    details['result'] = str(result)[:1000]  # Limit size
                
                # Log successful action
                audit_description = description or f"Function {func.__name__} executed successfully"
                audit_service.log_action(
                    action=action,
                    entity_type=entity_type,
                    description=audit_description,
                    entity_id=entity_id,
                    details=details if details else None,
                    severity=severity
                )
                
                return result
                
            except Exception as e:
                # Log failed action
                details['error'] = str(e)
                audit_description = description or f"Function {func.__name__} failed: {str(e)}"
                audit_service.log_action(
                    action=action,
                    entity_type=entity_type,
                    description=audit_description,
                    entity_id=entity_id,
                    details=details,
                    severity=AuditSeverity.HIGH
                )
                raise
        
        return wrapper
    return decorator


class AuditMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for automatic audit context setup and request logging.
    """
    
    def __init__(self, app, db_session_factory):
        super().__init__(app)
        self.db_session_factory = db_session_factory
    
    async def dispatch(self, request: Request, call_next):
        # Generate correlation ID
        correlation_id = request.headers.get('X-Correlation-ID') or str(uuid.uuid4())
        
        # Set up audit context
        context = AuditContext.from_request(request)
        _context.audit_context = context
        
        # Add correlation ID to response headers
        response = await call_next(request)
        response.headers['X-Correlation-ID'] = correlation_id
        
        # Log HTTP request (for high-risk endpoints)
        if self._should_audit_request(request):
            with self.db_session_factory() as db:
                audit_service = AuditService(db)
                audit_service.log_action(
                    action=AuditAction.READ if request.method == "GET" else AuditAction.UPDATE,
                    entity_type=AuditEntity.SYSTEM,
                    description=f"HTTP {request.method} {request.url.path}",
                    details={
                        'method': request.method,
                        'path': request.url.path,
                        'status_code': response.status_code
                    },
                    severity=AuditSeverity.LOW,
                    context=context
                )
        
        return response
    
    def _should_audit_request(self, request: Request) -> bool:
        """Determine if HTTP request should be audited."""
        # Audit sensitive endpoints
        sensitive_paths = [
            '/auth/', '/admin/', '/users/', '/integrations/',
            '/evidence/', '/cases/', '/audit/'
        ]
        return any(path in request.url.path for path in sensitive_paths)