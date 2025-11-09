"""
Security Hardening Module for JCTC Management System.

This module provides comprehensive security enhancements including:
- Rate limiting with sliding window implementation
- Advanced input sanitization and validation
- Enhanced JWT security with token blacklisting
- API key security features with rotation
- Advanced audit security and intrusion detection
"""

import hashlib
import hmac
import re
import secrets
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set, Callable
from urllib.parse import quote_plus, unquote_plus
import ipaddress
import jwt
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import redis
import logging
from pydantic import BaseModel, validator

from app.core.config import get_settings
from app.models import User, AuditLog
from app.schemas.audit import AuditLevel

logger = logging.getLogger(__name__)
settings = get_settings()


class SecurityConfig(BaseModel):
    """Security configuration settings."""
    
    # Rate limiting
    rate_limit_requests_per_minute: int = 60
    rate_limit_burst_size: int = 100
    rate_limit_window_minutes: int = 15
    
    # JWT security
    jwt_blacklist_enabled: bool = True
    jwt_refresh_token_expiry_hours: int = 24
    jwt_access_token_expiry_minutes: int = 30
    
    # API key security
    api_key_rotation_days: int = 90
    api_key_min_length: int = 32
    api_key_max_requests_per_hour: int = 1000
    
    # Input sanitization
    max_request_size_mb: int = 50
    max_string_length: int = 10000
    allowed_file_extensions: Set[str] = {'.pdf', '.doc', '.docx', '.txt', '.jpg', '.png', '.zip', '.7z'}
    
    # Security monitoring
    failed_login_threshold: int = 5
    account_lockout_minutes: int = 30
    suspicious_activity_threshold: int = 10
    
    # IP restrictions
    enable_ip_whitelist: bool = False
    allowed_ip_ranges: List[str] = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
    blocked_ip_addresses: List[str] = []


security_config = SecurityConfig()


class RateLimiter:
    """
    Advanced rate limiting with sliding window implementation.
    """
    
    def __init__(self, redis_client=None):
        try:
            import redis
            self.redis_client = redis_client or redis.from_url(
                settings.REDIS_URL or "redis://localhost:6379/1"
            )
            self.enabled = True
            logger.info("Rate limiter enabled with Redis backend")
        except Exception as e:
            logger.warning(f"Redis not available for rate limiting: {e}")
            self.redis_client = None
            self.enabled = False
            self._memory_cache = {}
    
    def is_allowed(
        self, 
        identifier: str, 
        max_requests: int = None, 
        window_minutes: int = None,
        burst_size: int = None
    ) -> tuple[bool, Dict[str, Any]]:
        """
        Check if request is allowed under rate limits.
        
        Returns:
            Tuple of (is_allowed: bool, rate_limit_info: Dict)
        """
        max_requests = max_requests or security_config.rate_limit_requests_per_minute
        window_minutes = window_minutes or security_config.rate_limit_window_minutes
        burst_size = burst_size or security_config.rate_limit_burst_size
        
        if not self.enabled:
            return True, {"requests_remaining": max_requests}
        
        current_time = int(time.time())
        window_start = current_time - (window_minutes * 60)
        
        try:
            if self.redis_client:
                return self._redis_rate_limit(identifier, max_requests, window_start, current_time, burst_size)
            else:
                return self._memory_rate_limit(identifier, max_requests, window_start, current_time, burst_size)
        
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Fail open - allow request if rate limiter fails
            return True, {"error": "rate_limiter_error"}
    
    def _redis_rate_limit(self, identifier: str, max_requests: int, window_start: int, current_time: int, burst_size: int):
        """Redis-based sliding window rate limiting."""
        pipe = self.redis_client.pipeline()
        
        # Remove old entries
        pipe.zremrangebyscore(identifier, 0, window_start)
        
        # Count current requests
        pipe.zcard(identifier)
        
        # Add current request
        pipe.zadd(identifier, {current_time: current_time})
        
        # Set expiry
        pipe.expire(identifier, security_config.rate_limit_window_minutes * 60)
        
        results = pipe.execute()
        current_requests = results[1] + 1  # +1 for the current request
        
        # Check burst limit
        recent_requests = self.redis_client.zcount(identifier, current_time - 60, current_time)
        if recent_requests > burst_size:
            return False, {
                "requests_remaining": 0,
                "reset_time": current_time + 60,
                "limit_type": "burst_limit_exceeded"
            }
        
        # Check window limit
        if current_requests > max_requests:
            return False, {
                "requests_remaining": 0,
                "reset_time": current_time + (security_config.rate_limit_window_minutes * 60),
                "limit_type": "window_limit_exceeded"
            }
        
        return True, {
            "requests_remaining": max_requests - current_requests,
            "reset_time": current_time + (security_config.rate_limit_window_minutes * 60)
        }
    
    def _memory_rate_limit(self, identifier: str, max_requests: int, window_start: int, current_time: int, burst_size: int):
        """In-memory fallback rate limiting."""
        if identifier not in self._memory_cache:
            self._memory_cache[identifier] = []
        
        # Clean old entries
        self._memory_cache[identifier] = [
            req_time for req_time in self._memory_cache[identifier] 
            if req_time > window_start
        ]
        
        # Check limits
        current_requests = len(self._memory_cache[identifier]) + 1
        recent_requests = len([t for t in self._memory_cache[identifier] if t > current_time - 60])
        
        if recent_requests > burst_size or current_requests > max_requests:
            return False, {"requests_remaining": 0}
        
        # Add current request
        self._memory_cache[identifier].append(current_time)
        
        return True, {"requests_remaining": max_requests - current_requests}


class InputSanitizer:
    """
    Advanced input sanitization and validation.
    """
    
    # Dangerous patterns to detect and block
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # Script tags
        r'javascript:',                # JavaScript protocol
        r'vbscript:',                 # VBScript protocol
        r'on\w+\s*=',                 # Event handlers
        r'eval\s*\(',                 # Eval function
        r'exec\s*\(',                 # Exec function
        r'system\s*\(',               # System calls
        r'__import__',                # Python imports
        r'subprocess',                # Process execution
        r'\bDROP\s+TABLE\b',          # SQL DROP
        r'\bDELETE\s+FROM\b',         # SQL DELETE
        r'\bINSERT\s+INTO\b',         # SQL INSERT
        r'\bUPDATE\s+.*\bSET\b',      # SQL UPDATE
        r'UNION\s+SELECT',            # SQL UNION
        r';\s*--',                    # SQL comments
        r'/\*.*?\*/',                 # SQL block comments
    ]
    
    # Compiled regex patterns for better performance
    _compiled_patterns = [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in DANGEROUS_PATTERNS]
    
    @classmethod
    def sanitize_string(cls, input_string: str, max_length: int = None) -> str:
        """
        Sanitize input string by removing dangerous content.
        
        Args:
            input_string: String to sanitize
            max_length: Maximum allowed length
            
        Returns:
            Sanitized string
            
        Raises:
            ValueError: If dangerous content is detected
        """
        if not isinstance(input_string, str):
            return str(input_string)
        
        max_length = max_length or security_config.max_string_length
        
        # Check length
        if len(input_string) > max_length:
            raise ValueError(f"Input too long: {len(input_string)} > {max_length}")
        
        # Check for dangerous patterns
        for pattern in cls._compiled_patterns:
            if pattern.search(input_string):
                logger.warning(f"Dangerous pattern detected: {pattern.pattern}")
                raise ValueError("Potentially dangerous content detected")
        
        # Remove null bytes and control characters
        sanitized = input_string.replace('\x00', '').replace('\r', '').replace('\n', ' ')
        
        # Normalize whitespace
        sanitized = ' '.join(sanitized.split())
        
        # HTML entity encoding for safety
        html_entities = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;',
        }
        
        for char, entity in html_entities.items():
            sanitized = sanitized.replace(char, entity)
        
        return sanitized
    
    @classmethod
    def validate_file_upload(cls, filename: str, content_type: str, file_size: int) -> bool:
        """
        Validate file upload security.
        
        Args:
            filename: Original filename
            content_type: MIME content type
            file_size: File size in bytes
            
        Returns:
            True if file is safe to upload
            
        Raises:
            ValueError: If file is potentially dangerous
        """
        # Check file size
        max_size_bytes = security_config.max_request_size_mb * 1024 * 1024
        if file_size > max_size_bytes:
            raise ValueError(f"File too large: {file_size} > {max_size_bytes}")
        
        # Check file extension
        file_ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
        if file_ext not in security_config.allowed_file_extensions:
            raise ValueError(f"File extension not allowed: {file_ext}")
        
        # Check filename for dangerous patterns
        sanitized_filename = cls.sanitize_string(filename, 255)
        if sanitized_filename != filename:
            raise ValueError("Potentially dangerous filename")
        
        # Additional MIME type validation
        safe_mime_types = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.zip': 'application/zip',
            '.7z': 'application/x-7z-compressed'
        }
        
        expected_mime = safe_mime_types.get(file_ext)
        if expected_mime and content_type != expected_mime:
            logger.warning(f"MIME type mismatch: expected {expected_mime}, got {content_type}")
        
        return True


class EnhancedJWTSecurity:
    """
    Enhanced JWT security with token blacklisting and advanced features.
    """
    
    def __init__(self, redis_client=None):
        try:
            import redis
            self.redis_client = redis_client or redis.from_url(
                settings.REDIS_URL or "redis://localhost:6379/2"
            )
            self.enabled = True
        except Exception:
            self.redis_client = None
            self.enabled = False
            self._blacklist = set()
    
    def blacklist_token(self, token_jti: str, expiry_timestamp: int):
        """Add token to blacklist."""
        if not security_config.jwt_blacklist_enabled:
            return
        
        if self.redis_client:
            self.redis_client.setex(f"blacklist:{token_jti}", expiry_timestamp - int(time.time()), "1")
        else:
            self._blacklist.add(token_jti)
    
    def is_token_blacklisted(self, token_jti: str) -> bool:
        """Check if token is blacklisted."""
        if not security_config.jwt_blacklist_enabled:
            return False
        
        if self.redis_client:
            return bool(self.redis_client.get(f"blacklist:{token_jti}"))
        else:
            return token_jti in self._blacklist
    
    def generate_secure_token(self, payload: Dict[str, Any], token_type: str = "access") -> str:
        """Generate enhanced secure JWT token."""
        current_time = datetime.utcnow()
        
        if token_type == "access":
            expiry = current_time + timedelta(minutes=security_config.jwt_access_token_expiry_minutes)
        else:  # refresh token
            expiry = current_time + timedelta(hours=security_config.jwt_refresh_token_expiry_hours)
        
        # Enhanced payload with security features
        enhanced_payload = {
            **payload,
            "iat": current_time.timestamp(),
            "exp": expiry.timestamp(),
            "jti": secrets.token_urlsafe(32),  # Unique token ID
            "type": token_type,
            "iss": "jctc-system",  # Issuer
            "aud": "jctc-api",     # Audience
        }
        
        # Sign with algorithm and secret
        token = jwt.encode(
            enhanced_payload,
            settings.SECRET_KEY,
            algorithm="HS256"
        )
        
        return token
    
    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify and decode JWT token with enhanced security checks."""
        try:
            # Decode token
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
                audience="jctc-api",
                issuer="jctc-system"
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                raise jwt.InvalidTokenError("Invalid token type")
            
            # Check if token is blacklisted
            if self.is_token_blacklisted(payload.get("jti")):
                raise jwt.InvalidTokenError("Token has been revoked")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )


class IPSecurityManager:
    """
    IP-based security management including whitelisting and blocking.
    """
    
    @staticmethod
    def is_ip_allowed(client_ip: str) -> bool:
        """Check if IP address is allowed."""
        try:
            ip = ipaddress.ip_address(client_ip)
        except ValueError:
            logger.warning(f"Invalid IP address: {client_ip}")
            return False
        
        # Check blocked IPs
        for blocked_ip in security_config.blocked_ip_addresses:
            try:
                if ip == ipaddress.ip_address(blocked_ip):
                    return False
            except ValueError:
                continue
        
        # Check whitelist if enabled
        if security_config.enable_ip_whitelist:
            for allowed_range in security_config.allowed_ip_ranges:
                try:
                    if ip in ipaddress.ip_network(allowed_range):
                        return True
                except ValueError:
                    continue
            return False  # Not in whitelist
        
        return True  # Allowed if whitelist is disabled and not blocked
    
    @staticmethod
    def extract_client_ip(request: Request) -> str:
        """Extract real client IP from request headers."""
        # Check various headers for real IP
        ip_headers = [
            "X-Forwarded-For",
            "X-Real-IP",
            "CF-Connecting-IP",  # Cloudflare
            "X-Client-IP",
            "X-Forwarded"
        ]
        
        for header in ip_headers:
            ip = request.headers.get(header)
            if ip:
                # X-Forwarded-For can contain multiple IPs
                return ip.split(',')[0].strip()
        
        # Fallback to client host
        return request.client.host if request.client else "unknown"


class SecurityMonitor:
    """
    Monitor security events and detect suspicious activity.
    """
    
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
        self._suspicious_activity_cache = {}
    
    def log_security_event(
        self,
        event_type: str,
        user_id: Optional[int],
        client_ip: str,
        details: Dict[str, Any],
        severity: AuditLevel = AuditLevel.WARNING
    ):
        """Log security-related event."""
        try:
            with self.db_session_factory() as db:
                audit_log = AuditLog(
                    user_id=user_id,
                    action="SECURITY_EVENT",
                    entity="SYSTEM",
                    level=severity,
                    description=f"Security event: {event_type}",
                    details={
                        "event_type": event_type,
                        "client_ip": client_ip,
                        "timestamp": datetime.utcnow().isoformat(),
                        **details
                    }
                )
                
                db.add(audit_log)
                db.commit()
                
        except Exception as e:
            logger.error(f"Failed to log security event: {e}")
    
    def check_failed_login_attempts(self, identifier: str, client_ip: str) -> bool:
        """Check if account should be locked due to failed login attempts."""
        cache_key = f"failed_login:{identifier}"
        current_time = datetime.utcnow()
        
        if cache_key not in self._suspicious_activity_cache:
            self._suspicious_activity_cache[cache_key] = []
        
        # Clean old attempts
        cutoff_time = current_time - timedelta(minutes=security_config.account_lockout_minutes)
        self._suspicious_activity_cache[cache_key] = [
            attempt for attempt in self._suspicious_activity_cache[cache_key]
            if attempt["timestamp"] > cutoff_time
        ]
        
        # Add current attempt
        self._suspicious_activity_cache[cache_key].append({
            "timestamp": current_time,
            "client_ip": client_ip
        })
        
        # Check if threshold exceeded
        failed_attempts = len(self._suspicious_activity_cache[cache_key])
        if failed_attempts >= security_config.failed_login_threshold:
            self.log_security_event(
                "ACCOUNT_LOCKED",
                None,
                client_ip,
                {
                    "identifier": identifier,
                    "failed_attempts": failed_attempts,
                    "lockout_duration_minutes": security_config.account_lockout_minutes
                },
                AuditLevel.CRITICAL
            )
            return True
        
        return False
    
    def detect_suspicious_activity(self, user_id: int, client_ip: str, activity_type: str) -> bool:
        """Detect suspicious user activity patterns."""
        cache_key = f"suspicious:{user_id}:{client_ip}"
        current_time = datetime.utcnow()
        
        if cache_key not in self._suspicious_activity_cache:
            self._suspicious_activity_cache[cache_key] = []
        
        # Clean old activities
        cutoff_time = current_time - timedelta(hours=1)
        self._suspicious_activity_cache[cache_key] = [
            activity for activity in self._suspicious_activity_cache[cache_key]
            if activity["timestamp"] > cutoff_time
        ]
        
        # Add current activity
        self._suspicious_activity_cache[cache_key].append({
            "timestamp": current_time,
            "activity_type": activity_type
        })
        
        # Check for suspicious patterns
        activities = self._suspicious_activity_cache[cache_key]
        
        # Too many activities in short time
        if len(activities) > security_config.suspicious_activity_threshold:
            self.log_security_event(
                "SUSPICIOUS_ACTIVITY",
                user_id,
                client_ip,
                {
                    "activity_count": len(activities),
                    "activity_types": [a["activity_type"] for a in activities[-5:]],
                    "time_window_hours": 1
                },
                AuditLevel.HIGH
            )
            return True
        
        # Multiple different activity types rapidly
        unique_types = set(a["activity_type"] for a in activities[-10:])
        if len(unique_types) > 5 and len(activities[-10:]) > 8:
            self.log_security_event(
                "RAPID_ACTIVITY_VARIATION",
                user_id,
                client_ip,
                {"unique_activity_types": list(unique_types)},
                AuditLevel.HIGH
            )
            return True
        
        return False


# Security middleware and decorators

def require_secure_headers(func: Callable):
    """Decorator to enforce secure HTTP headers."""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        request = None
        
        # Find request object in arguments
        for arg in args:
            if isinstance(arg, Request):
                request = arg
                break
        
        if request:
            # Enforce HTTPS in production
            if settings.ENVIRONMENT == "production" and request.url.scheme != "https":
                raise HTTPException(
                    status_code=status.HTTP_426_UPGRADE_REQUIRED,
                    detail="HTTPS required"
                )
            
            # Check Content-Type for POST/PUT requests
            if request.method in ["POST", "PUT", "PATCH"]:
                content_type = request.headers.get("Content-Type", "")
                if not content_type.startswith(("application/json", "multipart/form-data")):
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail="Unsupported content type"
                    )
        
        result = await func(*args, **kwargs)
        
        # Add security headers to response
        if hasattr(result, 'headers'):
            security_headers = {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
                "X-XSS-Protection": "1; mode=block",
                "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                "Content-Security-Policy": "default-src 'self'",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            }
            
            for header, value in security_headers.items():
                result.headers[header] = value
        
        return result
    
    return wrapper


# Global security instances
rate_limiter = RateLimiter()
jwt_security = EnhancedJWTSecurity()


def apply_rate_limit(
    identifier_func: Callable[[Request], str] = lambda r: IPSecurityManager.extract_client_ip(r),
    max_requests: int = None,
    window_minutes: int = None
):
    """Decorator to apply rate limiting to endpoints."""
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            request = None
            
            # Find request object
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if request and rate_limiter.enabled:
                identifier = identifier_func(request)
                allowed, limit_info = rate_limiter.is_allowed(
                    identifier, max_requests, window_minutes
                )
                
                if not allowed:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded",
                        headers={
                            "Retry-After": str(limit_info.get("reset_time", 60)),
                            "X-RateLimit-Remaining": "0"
                        }
                    )
                
                # Add rate limit headers to successful responses
                result = await func(*args, **kwargs)
                if hasattr(result, 'headers'):
                    result.headers["X-RateLimit-Remaining"] = str(limit_info.get("requests_remaining", 0))
                
                return result
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator