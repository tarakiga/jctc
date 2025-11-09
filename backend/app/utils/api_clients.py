"""
External API client utilities for the JCTC Integration API system.

This module provides comprehensive HTTP client functionality including:
- Reusable HTTP client with connection pooling
- Retry logic with exponential backoff
- Rate limiting and request throttling
- Multiple authentication strategies (API Key, JWT, OAuth)
- Request/response logging and monitoring
- Error handling and circuit breaker patterns
"""

import asyncio
import base64
import json
import logging
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Union, Callable
from urllib.parse import urljoin, urlparse

import httpx
import jwt
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class AuthenticationType(str, Enum):
    """Authentication types supported by API clients."""
    
    NONE = "none"
    API_KEY = "api_key"
    BEARER_TOKEN = "bearer_token"
    BASIC_AUTH = "basic_auth"
    JWT = "jwt"
    OAUTH2 = "oauth2"
    CUSTOM = "custom"


class HTTPMethod(str, Enum):
    """Supported HTTP methods."""
    
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"


class RateLimitStrategy(str, Enum):
    """Rate limiting strategies."""
    
    SLIDING_WINDOW = "sliding_window"
    FIXED_WINDOW = "fixed_window"
    TOKEN_BUCKET = "token_bucket"


class RequestStatus(str, Enum):
    """Request status enumeration."""
    
    SUCCESS = "success"
    ERROR = "error"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"
    AUTHENTICATION_ERROR = "authentication_error"
    CIRCUIT_OPEN = "circuit_open"


class AuthenticationConfig(BaseModel):
    """Authentication configuration for API clients."""
    
    type: AuthenticationType
    api_key: Optional[str] = None
    api_key_header: str = "X-API-Key"
    bearer_token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    jwt_secret: Optional[str] = None
    jwt_algorithm: str = "HS256"
    oauth2_config: Dict[str, Any] = Field(default_factory=dict)
    custom_headers: Dict[str, str] = Field(default_factory=dict)


class RetryConfig(BaseModel):
    """Retry configuration for API clients."""
    
    max_attempts: int = 3
    initial_delay: float = 1.0
    max_delay: float = 300.0
    backoff_multiplier: float = 2.0
    retry_on_status_codes: List[int] = Field(default_factory=lambda: [429, 500, 502, 503, 504])
    retry_on_exceptions: List[str] = Field(default_factory=lambda: ['TimeoutException', 'ConnectTimeout'])


class RateLimitConfig(BaseModel):
    """Rate limiting configuration."""
    
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    requests_per_second: float = 10.0
    requests_per_minute: Optional[int] = None
    requests_per_hour: Optional[int] = None
    burst_limit: Optional[int] = None


class CircuitBreakerConfig(BaseModel):
    """Circuit breaker configuration."""
    
    enabled: bool = True
    failure_threshold: int = 5
    timeout_seconds: int = 60
    recovery_timeout_seconds: int = 300


class APIClientConfig(BaseModel):
    """Complete API client configuration."""
    
    base_url: str
    name: Optional[str] = None
    authentication: AuthenticationConfig
    retry_config: RetryConfig = Field(default_factory=RetryConfig)
    rate_limit_config: RateLimitConfig = Field(default_factory=RateLimitConfig)
    circuit_breaker_config: CircuitBreakerConfig = Field(default_factory=CircuitBreakerConfig)
    default_timeout: float = 30.0
    verify_ssl: bool = True
    custom_headers: Dict[str, str] = Field(default_factory=dict)
    max_connections: int = 100
    max_keepalive_connections: int = 20


class APIRequest(BaseModel):
    """API request specification."""
    
    method: HTTPMethod
    url: str
    headers: Dict[str, str] = Field(default_factory=dict)
    params: Dict[str, Any] = Field(default_factory=dict)
    json_data: Optional[Dict[str, Any]] = None
    data: Optional[Union[str, bytes]] = None
    timeout: Optional[float] = None


class APIResponse(BaseModel):
    """API response wrapper."""
    
    status_code: int
    headers: Dict[str, str]
    content: bytes
    text: Optional[str] = None
    json_data: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = None
    response_time_ms: float
    from_cache: bool = False


class RequestResult(BaseModel):
    """Complete request result with metadata."""
    
    request: APIRequest
    response: Optional[APIResponse] = None
    status: RequestStatus
    error_message: Optional[str] = None
    attempts: int = 1
    total_time_ms: float
    timestamp: datetime


class RateLimiter:
    """Rate limiter implementation with multiple strategies."""
    
    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.request_times: List[float] = []
        self.lock = asyncio.Lock()
    
    async def acquire(self) -> bool:
        """Acquire rate limit permission."""
        
        async with self.lock:
            now = time.time()
            
            if self.config.strategy == RateLimitStrategy.SLIDING_WINDOW:
                # Remove old requests outside the window
                window_size = 1.0  # 1 second for requests_per_second
                self.request_times = [t for t in self.request_times if now - t < window_size]
                
                # Check if we can make another request
                if len(self.request_times) < self.config.requests_per_second:
                    self.request_times.append(now)
                    return True
                else:
                    return False
            
            elif self.config.strategy == RateLimitStrategy.FIXED_WINDOW:
                # Simple fixed window implementation
                current_window = int(now)
                window_requests = [t for t in self.request_times if int(t) == current_window]
                
                if len(window_requests) < self.config.requests_per_second:
                    self.request_times.append(now)
                    return True
                else:
                    return False
            
            elif self.config.strategy == RateLimitStrategy.TOKEN_BUCKET:
                # Simplified token bucket
                # For full implementation, you'd maintain tokens and refill rate
                if len(self.request_times) == 0 or now - self.request_times[-1] > (1.0 / self.config.requests_per_second):
                    self.request_times.append(now)
                    return True
                else:
                    return False
        
        return False
    
    async def wait_for_availability(self) -> float:
        """Wait until rate limit allows next request."""
        
        wait_time = 0.0
        max_wait_time = 60.0  # Maximum wait time
        
        while not await self.acquire() and wait_time < max_wait_time:
            sleep_time = 1.0 / self.config.requests_per_second
            await asyncio.sleep(sleep_time)
            wait_time += sleep_time
        
        return wait_time


class CircuitBreaker:
    """Circuit breaker for API client reliability."""
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half_open
    
    def can_request(self) -> bool:
        """Check if requests are allowed through circuit breaker."""
        
        if not self.config.enabled:
            return True
        
        if self.state == "closed":
            return True
        
        if self.state == "open":
            if self.last_failure_time:
                time_since_failure = time.time() - self.last_failure_time
                if time_since_failure >= self.config.recovery_timeout_seconds:
                    self.state = "half_open"
                    return True
            return False
        
        if self.state == "half_open":
            return True
        
        return False
    
    def record_success(self):
        """Record successful request."""
        self.failure_count = 0
        self.state = "closed"
        self.last_failure_time = None
    
    def record_failure(self):
        """Record failed request."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.config.failure_threshold:
            self.state = "open"


class AuthenticationManager:
    """Manage authentication for API clients."""
    
    def __init__(self, config: AuthenticationConfig):
        self.config = config
        self._cached_token = None
        self._token_expires_at = None
    
    async def get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers for requests."""
        
        headers = {}
        
        if self.config.type == AuthenticationType.NONE:
            pass
        
        elif self.config.type == AuthenticationType.API_KEY:
            if self.config.api_key:
                headers[self.config.api_key_header] = self.config.api_key
        
        elif self.config.type == AuthenticationType.BEARER_TOKEN:
            if self.config.bearer_token:
                headers["Authorization"] = f"Bearer {self.config.bearer_token}"
        
        elif self.config.type == AuthenticationType.BASIC_AUTH:
            if self.config.username and self.config.password:
                credentials = base64.b64encode(
                    f"{self.config.username}:{self.config.password}".encode()
                ).decode()
                headers["Authorization"] = f"Basic {credentials}"
        
        elif self.config.type == AuthenticationType.JWT:
            token = await self._get_jwt_token()
            if token:
                headers["Authorization"] = f"Bearer {token}"
        
        elif self.config.type == AuthenticationType.OAUTH2:
            token = await self._get_oauth2_token()
            if token:
                headers["Authorization"] = f"Bearer {token}"
        
        # Add custom headers
        headers.update(self.config.custom_headers)
        
        return headers
    
    async def _get_jwt_token(self) -> Optional[str]:
        """Generate or retrieve JWT token."""
        
        if not self.config.jwt_secret:
            return None
        
        # Check if cached token is still valid
        if self._cached_token and self._token_expires_at:
            if datetime.utcnow() < self._token_expires_at:
                return self._cached_token
        
        # Generate new JWT token
        payload = {
            "iss": "jctc_integration",
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        
        token = jwt.encode(payload, self.config.jwt_secret, algorithm=self.config.jwt_algorithm)
        
        # Cache the token
        self._cached_token = token
        self._token_expires_at = payload["exp"]
        
        return token
    
    async def _get_oauth2_token(self) -> Optional[str]:
        """Get OAuth2 token (simplified implementation)."""
        
        # This would typically involve the full OAuth2 flow
        # For now, return cached token if available
        oauth_config = self.config.oauth2_config
        
        if "access_token" in oauth_config:
            return oauth_config["access_token"]
        
        return None


class APIClient:
    """Comprehensive HTTP client for external API integration."""
    
    def __init__(self, config: APIClientConfig):
        self.config = config
        self.rate_limiter = RateLimiter(config.rate_limit_config)
        self.circuit_breaker = CircuitBreaker(config.circuit_breaker_config)
        self.auth_manager = AuthenticationManager(config.authentication)
        self.client: Optional[httpx.AsyncClient] = None
        self.request_count = 0
        self.success_count = 0
        self.error_count = 0
    
    async def __aenter__(self):
        """Async context manager entry."""
        limits = httpx.Limits(
            max_connections=self.config.max_connections,
            max_keepalive_connections=self.config.max_keepalive_connections
        )
        
        timeout = httpx.Timeout(self.config.default_timeout)
        
        self.client = httpx.AsyncClient(
            base_url=self.config.base_url,
            limits=limits,
            timeout=timeout,
            verify=self.config.verify_ssl,
            headers=self.config.custom_headers
        )
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.client:
            await self.client.aclose()
    
    async def request(
        self,
        method: HTTPMethod,
        endpoint: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        data: Optional[Union[str, bytes]] = None,
        timeout: Optional[float] = None
    ) -> RequestResult:
        """
        Make HTTP request with full retry, rate limiting, and error handling.
        
        Args:
            method: HTTP method to use
            endpoint: API endpoint (relative to base_url)
            headers: Optional request headers
            params: Optional query parameters
            json_data: Optional JSON payload
            data: Optional raw data payload
            timeout: Optional request timeout
            
        Returns:
            RequestResult with response and metadata
        """
        
        # Build request
        api_request = APIRequest(
            method=method,
            url=urljoin(self.config.base_url, endpoint),
            headers=headers or {},
            params=params or {},
            json_data=json_data,
            data=data,
            timeout=timeout or self.config.default_timeout
        )
        
        start_time = time.time()
        attempts = 0
        last_exception = None
        
        # Check circuit breaker
        if not self.circuit_breaker.can_request():
            return RequestResult(
                request=api_request,
                status=RequestStatus.CIRCUIT_OPEN,
                error_message="Circuit breaker is open",
                attempts=0,
                total_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow()
            )
        
        # Retry loop
        for attempt in range(1, self.config.retry_config.max_attempts + 1):
            attempts = attempt
            
            try:
                # Wait for rate limit
                if not await self.rate_limiter.acquire():
                    wait_time = await self.rate_limiter.wait_for_availability()
                    if wait_time >= 60.0:  # If we waited too long, it's rate limited
                        return RequestResult(
                            request=api_request,
                            status=RequestStatus.RATE_LIMITED,
                            error_message=f"Rate limited, waited {wait_time:.2f} seconds",
                            attempts=attempts,
                            total_time_ms=(time.time() - start_time) * 1000,
                            timestamp=datetime.utcnow()
                        )
                
                # Make the request
                response = await self._make_request(api_request)
                
                # Check if response indicates success
                if 200 <= response.status_code < 300:
                    self.success_count += 1
                    self.circuit_breaker.record_success()
                    
                    return RequestResult(
                        request=api_request,
                        response=response,
                        status=RequestStatus.SUCCESS,
                        attempts=attempts,
                        total_time_ms=(time.time() - start_time) * 1000,
                        timestamp=datetime.utcnow()
                    )
                
                # Check if we should retry based on status code
                elif response.status_code in self.config.retry_config.retry_on_status_codes:
                    last_exception = Exception(f"HTTP {response.status_code}")
                    
                    # Don't retry on last attempt
                    if attempt < self.config.retry_config.max_attempts:
                        delay = self._calculate_retry_delay(attempt)
                        logger.info(f"Retrying request after {delay:.2f}s (attempt {attempt})")
                        await asyncio.sleep(delay)
                        continue
                
                # Non-retryable error
                self.error_count += 1
                self.circuit_breaker.record_failure()
                
                error_message = f"HTTP {response.status_code}"
                if response.status_code == 401:
                    status = RequestStatus.AUTHENTICATION_ERROR
                else:
                    status = RequestStatus.ERROR
                
                return RequestResult(
                    request=api_request,
                    response=response,
                    status=status,
                    error_message=error_message,
                    attempts=attempts,
                    total_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.utcnow()
                )
            
            except Exception as e:
                last_exception = e
                self.error_count += 1
                
                # Check if this is a retryable exception
                exception_name = type(e).__name__
                if exception_name in self.config.retry_config.retry_on_exceptions:
                    if attempt < self.config.retry_config.max_attempts:
                        delay = self._calculate_retry_delay(attempt)
                        logger.info(f"Retrying request after {delay:.2f}s due to {exception_name}")
                        await asyncio.sleep(delay)
                        continue
                
                # Non-retryable exception or final attempt
                self.circuit_breaker.record_failure()
                
                status = RequestStatus.TIMEOUT if "timeout" in str(e).lower() else RequestStatus.ERROR
                
                return RequestResult(
                    request=api_request,
                    status=status,
                    error_message=str(e),
                    attempts=attempts,
                    total_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.utcnow()
                )
        
        # If we get here, all retries failed
        self.circuit_breaker.record_failure()
        
        return RequestResult(
            request=api_request,
            status=RequestStatus.ERROR,
            error_message=str(last_exception) if last_exception else "All retry attempts failed",
            attempts=attempts,
            total_time_ms=(time.time() - start_time) * 1000,
            timestamp=datetime.utcnow()
        )
    
    async def _make_request(self, api_request: APIRequest) -> APIResponse:
        """Make the actual HTTP request."""
        
        if not self.client:
            raise RuntimeError("Client not initialized. Use async context manager.")
        
        # Get authentication headers
        auth_headers = await self.auth_manager.get_auth_headers()
        
        # Merge headers
        headers = {**auth_headers, **api_request.headers}
        
        # Make request
        request_start = time.time()
        
        response = await self.client.request(
            method=api_request.method.value,
            url=api_request.url,
            headers=headers,
            params=api_request.params,
            json=api_request.json_data,
            content=api_request.data,
            timeout=api_request.timeout
        )
        
        request_end = time.time()
        response_time_ms = (request_end - request_start) * 1000
        
        # Parse response content
        content = response.content
        text = None
        json_data = None
        
        try:
            text = response.text
            if response.headers.get("content-type", "").startswith("application/json"):
                json_data = response.json()
        except Exception:
            pass  # Ignore parsing errors
        
        # Increment request counter
        self.request_count += 1
        
        return APIResponse(
            status_code=response.status_code,
            headers=dict(response.headers),
            content=content,
            text=text,
            json_data=json_data,
            response_time_ms=response_time_ms,
            from_cache=False
        )
    
    def _calculate_retry_delay(self, attempt: int) -> float:
        """Calculate delay before retry attempt."""
        
        delay = self.config.retry_config.initial_delay * (
            self.config.retry_config.backoff_multiplier ** (attempt - 1)
        )
        
        return min(delay, self.config.retry_config.max_delay)
    
    # Convenience methods for common HTTP operations
    async def get(self, endpoint: str, **kwargs) -> RequestResult:
        """Make GET request."""
        return await self.request(HTTPMethod.GET, endpoint, **kwargs)
    
    async def post(self, endpoint: str, **kwargs) -> RequestResult:
        """Make POST request."""
        return await self.request(HTTPMethod.POST, endpoint, **kwargs)
    
    async def put(self, endpoint: str, **kwargs) -> RequestResult:
        """Make PUT request."""
        return await self.request(HTTPMethod.PUT, endpoint, **kwargs)
    
    async def patch(self, endpoint: str, **kwargs) -> RequestResult:
        """Make PATCH request."""
        return await self.request(HTTPMethod.PATCH, endpoint, **kwargs)
    
    async def delete(self, endpoint: str, **kwargs) -> RequestResult:
        """Make DELETE request."""
        return await self.request(HTTPMethod.DELETE, endpoint, **kwargs)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get client statistics."""
        return {
            "request_count": self.request_count,
            "success_count": self.success_count,
            "error_count": self.error_count,
            "success_rate": (self.success_count / max(self.request_count, 1)) * 100,
            "circuit_breaker_state": self.circuit_breaker.state,
            "circuit_breaker_failures": self.circuit_breaker.failure_count
        }


class APIClientManager:
    """Manage multiple API clients."""
    
    def __init__(self):
        self.clients: Dict[str, APIClient] = {}
        self.configs: Dict[str, APIClientConfig] = {}
    
    def register_client(self, name: str, config: APIClientConfig):
        """Register a new API client configuration."""
        self.configs[name] = config
    
    def get_client(self, name: str) -> Optional[APIClient]:
        """Get an API client by name."""
        if name not in self.clients and name in self.configs:
            self.clients[name] = APIClient(self.configs[name])
        
        return self.clients.get(name)
    
    async def test_client(self, name: str, test_endpoint: str = "/health") -> Dict[str, Any]:
        """Test an API client's connectivity."""
        
        client = self.get_client(name)
        if not client:
            return {"success": False, "error": "Client not found"}
        
        try:
            async with client:
                result = await client.get(test_endpoint)
                
                return {
                    "success": result.status == RequestStatus.SUCCESS,
                    "status": result.status,
                    "status_code": result.response.status_code if result.response else None,
                    "response_time_ms": result.response.response_time_ms if result.response else None,
                    "error_message": result.error_message,
                    "attempts": result.attempts
                }
        
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all registered clients."""
        return {
            name: client.get_stats() 
            for name, client in self.clients.items()
        }


# Global client manager
api_client_manager = APIClientManager()


# Convenience functions for common external system integrations

async def create_forensic_tool_client(
    tool_name: str,
    base_url: str,
    api_key: str
) -> APIClient:
    """Create API client for forensic tools (Cellebrite, Oxygen, etc.)."""
    
    config = APIClientConfig(
        base_url=base_url,
        name=f"forensic_tool_{tool_name.lower()}",
        authentication=AuthenticationConfig(
            type=AuthenticationType.API_KEY,
            api_key=api_key,
            api_key_header="X-API-Key"
        ),
        retry_config=RetryConfig(
            max_attempts=5,
            initial_delay=2.0,
            max_delay=60.0
        ),
        rate_limit_config=RateLimitConfig(
            requests_per_second=5.0,  # Conservative for forensic tools
            requests_per_hour=1000
        ),
        default_timeout=300.0,  # Longer timeout for forensic operations
        custom_headers={
            "User-Agent": f"JCTC-Integration/{tool_name}",
            "Accept": "application/json"
        }
    )
    
    return APIClient(config)


async def create_database_client(
    database_name: str,
    base_url: str,
    username: str,
    password: str
) -> APIClient:
    """Create API client for law enforcement databases."""
    
    config = APIClientConfig(
        base_url=base_url,
        name=f"database_{database_name.lower()}",
        authentication=AuthenticationConfig(
            type=AuthenticationType.BASIC_AUTH,
            username=username,
            password=password
        ),
        retry_config=RetryConfig(
            max_attempts=3,
            initial_delay=1.0,
            max_delay=30.0
        ),
        rate_limit_config=RateLimitConfig(
            requests_per_second=2.0,  # Very conservative for sensitive databases
            requests_per_hour=500
        ),
        circuit_breaker_config=CircuitBreakerConfig(
            failure_threshold=3,
            timeout_seconds=30,
            recovery_timeout_seconds=180
        ),
        verify_ssl=True  # Always verify SSL for sensitive systems
    )
    
    return APIClient(config)


async def create_notification_client(
    service_name: str,
    base_url: str,
    bearer_token: str
) -> APIClient:
    """Create API client for notification services (email, SMS, etc.)."""
    
    config = APIClientConfig(
        base_url=base_url,
        name=f"notification_{service_name.lower()}",
        authentication=AuthenticationConfig(
            type=AuthenticationType.BEARER_TOKEN,
            bearer_token=bearer_token
        ),
        retry_config=RetryConfig(
            max_attempts=2,  # Don't retry too much for notifications
            initial_delay=0.5,
            max_delay=5.0
        ),
        rate_limit_config=RateLimitConfig(
            requests_per_second=10.0,
            requests_per_hour=3600
        ),
        default_timeout=15.0  # Quick timeout for notifications
    )
    
    return APIClient(config)