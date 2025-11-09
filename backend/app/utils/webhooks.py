"""
Webhook handling utilities for the JCTC Integration API system.

This module provides comprehensive webhook functionality including:
- HMAC signature generation and verification
- Webhook delivery with retries and exponential backoff
- Event dispatching and payload formatting
- Circuit breaker pattern for failed endpoints
- Delivery status tracking and logging
"""

import asyncio
import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlparse

import aiohttp
import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class WebhookEventType(str, Enum):
    """Supported webhook event types."""
    
    # Case Management Events
    CASE_CREATED = "case.created"
    CASE_UPDATED = "case.updated" 
    CASE_ASSIGNED = "case.assigned"
    CASE_CLOSED = "case.closed"
    CASE_ESCALATED = "case.escalated"
    
    # Evidence Events
    EVIDENCE_ADDED = "evidence.added"
    EVIDENCE_ANALYZED = "evidence.analyzed"
    EVIDENCE_TRANSFERRED = "evidence.transferred"
    
    # Task Events
    TASK_CREATED = "task.created"
    TASK_ASSIGNED = "task.assigned"
    TASK_COMPLETED = "task.completed"
    TASK_OVERDUE = "task.overdue"
    
    # User Events
    USER_LOGGED_IN = "user.logged_in"
    USER_CREATED = "user.created"
    
    # System Events
    SYSTEM_ALERT = "system.alert"
    SYSTEM_MAINTENANCE = "system.maintenance"
    
    # Integration Events
    INTEGRATION_CONNECTED = "integration.connected"
    INTEGRATION_FAILED = "integration.failed"
    SYNC_COMPLETED = "sync.completed"


class DeliveryStatus(str, Enum):
    """Webhook delivery status."""
    
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    RETRYING = "retrying"
    ABANDONED = "abandoned"


class WebhookPayload(BaseModel):
    """Standard webhook payload structure."""
    
    event_type: WebhookEventType
    event_id: str
    timestamp: datetime
    data: Dict[str, Any]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DeliveryAttempt(BaseModel):
    """Individual delivery attempt record."""
    
    attempt_number: int
    timestamp: datetime
    status_code: Optional[int] = None
    response_time_ms: Optional[float] = None
    error_message: Optional[str] = None
    success: bool = False


class WebhookDeliveryResult(BaseModel):
    """Result of webhook delivery attempt."""
    
    webhook_id: str
    delivery_id: str
    status: DeliveryStatus
    attempts: List[DeliveryAttempt] = Field(default_factory=list)
    next_retry_at: Optional[datetime] = None
    final_attempt: bool = False
    error_message: Optional[str] = None


class CircuitBreakerState(str, Enum):
    """Circuit breaker states."""
    
    CLOSED = "closed"      # Normal operation
    OPEN = "open"         # Failing, block requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreakerConfig(BaseModel):
    """Configuration for circuit breaker."""
    
    enabled: bool = True
    failure_threshold: int = 5
    timeout_seconds: int = 60
    recovery_timeout_seconds: int = 300


class CircuitBreaker:
    """Circuit breaker implementation for webhook endpoints."""
    
    def __init__(
        self,
        config: Optional[CircuitBreakerConfig] = None,
        failure_threshold: int = 5,
        timeout_seconds: int = 60,
        recovery_timeout_seconds: int = 300
    ):
        if config:
            self.enabled = config.enabled
            self.failure_threshold = config.failure_threshold
            self.timeout_seconds = config.timeout_seconds
            self.recovery_timeout_seconds = config.recovery_timeout_seconds
        else:
            self.enabled = True
            self.failure_threshold = failure_threshold
            self.timeout_seconds = timeout_seconds
            self.recovery_timeout_seconds = recovery_timeout_seconds
        
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitBreakerState.CLOSED
    
    def can_execute(self) -> bool:
        """Check if circuit breaker allows execution."""
        
        # If disabled, always allow execution
        if not self.enabled:
            return True
        
        if self.state == CircuitBreakerState.CLOSED:
            return True
        
        if self.state == CircuitBreakerState.OPEN:
            if self.last_failure_time:
                time_since_failure = datetime.utcnow() - self.last_failure_time
                if time_since_failure.total_seconds() >= self.recovery_timeout_seconds:
                    self.state = CircuitBreakerState.HALF_OPEN
                    return True
            return False
        
        # HALF_OPEN: Allow one request to test
        return True
    
    def record_success(self):
        """Record successful execution."""
        self.failure_count = 0
        self.state = CircuitBreakerState.CLOSED
        self.last_failure_time = None
    
    def record_failure(self):
        """Record failed execution."""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN


class WebhookSignatureGenerator:
    """HMAC-SHA256 signature generation and verification."""
    
    @staticmethod
    def generate_signature(payload: Union[str, bytes], secret: str) -> str:
        """
        Generate HMAC-SHA256 signature for webhook payload.
        
        Args:
            payload: The webhook payload (string or bytes)
            secret: Secret key for HMAC generation
            
        Returns:
            Hexadecimal signature string
        """
        
        if isinstance(payload, str):
            payload = payload.encode('utf-8')
        
        signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    @staticmethod
    def verify_signature(payload: Union[str, bytes], signature: str, secret: str) -> bool:
        """
        Verify HMAC-SHA256 signature for webhook payload.
        
        Args:
            payload: The webhook payload (string or bytes)
            signature: The signature to verify
            secret: Secret key for HMAC verification
            
        Returns:
            True if signature is valid, False otherwise
        """
        
        expected_signature = WebhookSignatureGenerator.generate_signature(payload, secret)
        
        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(signature, expected_signature)


class WebhookDeliveryClient:
    """HTTP client for webhook delivery with retries and circuit breaking."""
    
    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 300.0,
        backoff_multiplier: float = 2.0,
        timeout_seconds: float = 30.0,
        user_agent: str = "JCTC-Webhook-Client/1.2"
    ):
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.backoff_multiplier = backoff_multiplier
        self.timeout_seconds = timeout_seconds
        self.user_agent = user_agent
        
        # Circuit breakers per URL
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        
        # HTTP client session
        self.client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout_seconds),
            headers={'User-Agent': self.user_agent}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.client:
            await self.client.aclose()
    
    def get_circuit_breaker(self, url: str) -> CircuitBreaker:
        """Get or create circuit breaker for URL."""
        
        parsed_url = urlparse(url)
        host = parsed_url.netloc
        
        if host not in self.circuit_breakers:
            self.circuit_breakers[host] = CircuitBreaker()
        
        return self.circuit_breakers[host]
    
    async def deliver_webhook(
        self,
        webhook_config: Dict[str, Any],
        payload: WebhookPayload,
        delivery_id: Optional[str] = None
    ) -> WebhookDeliveryResult:
        """
        Deliver webhook with retries and circuit breaking.
        
        Args:
            webhook_config: Webhook configuration dictionary
            payload: Webhook payload to deliver
            delivery_id: Optional delivery tracking ID
            
        Returns:
            WebhookDeliveryResult with delivery status and attempts
        """
        
        if not delivery_id:
            delivery_id = f"del_{int(time.time())}_{payload.event_id}"
        
        result = WebhookDeliveryResult(
            webhook_id=webhook_config['id'],
            delivery_id=delivery_id,
            status=DeliveryStatus.PENDING
        )
        
        circuit_breaker = self.get_circuit_breaker(webhook_config['url'])
        
        # Check circuit breaker
        if not circuit_breaker.can_execute():
            result.status = DeliveryStatus.FAILED
            result.error_message = f"Circuit breaker OPEN for {webhook_config['url']}"
            logger.warning(
                f"Circuit breaker OPEN for {webhook_config['url']}, skipping delivery"
            )
            return result
        
        # Prepare request
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': self.user_agent,
            **webhook_config.get('headers', {})
        }
        
        payload_json = payload.model_dump_json()
        
        # Add signature if secret is configured
        if webhook_config.get('secret_token'):
            signature = WebhookSignatureGenerator.generate_signature(
                payload_json, 
                webhook_config['secret_token']
            )
            headers['X-JCTC-Signature'] = signature
        
        # Attempt delivery with retries
        for attempt_num in range(1, self.max_retries + 1):
            attempt = DeliveryAttempt(
                attempt_number=attempt_num,
                timestamp=datetime.utcnow()
            )
            
            try:
                start_time = time.time()
                
                if not self.client:
                    raise RuntimeError("Client not initialized. Use async context manager.")
                
                response = await self.client.post(
                    webhook_config['url'],
                    headers=headers,
                    content=payload_json
                )
                
                end_time = time.time()
                attempt.response_time_ms = (end_time - start_time) * 1000
                attempt.status_code = response.status_code
                
                # Check if delivery was successful
                if 200 <= response.status_code < 300:
                    attempt.success = True
                    result.status = DeliveryStatus.DELIVERED
                    result.final_attempt = True
                    circuit_breaker.record_success()
                    
                    logger.info(
                        f"Webhook delivered successfully to {webhook_config['url']} "
                        f"(attempt {attempt_num}, {attempt.response_time_ms:.1f}ms)"
                    )
                    
                    result.attempts.append(attempt)
                    return result
                else:
                    attempt.error_message = f"HTTP {response.status_code}: {response.reason_phrase}"
                    
                    # Don't retry client errors (4xx)
                    if 400 <= response.status_code < 500:
                        result.status = DeliveryStatus.FAILED
                        result.final_attempt = True
                        circuit_breaker.record_failure()
                        
                        logger.warning(
                            f"Webhook delivery failed with client error {response.status_code} "
                            f"to {webhook_config['url']}, not retrying"
                        )
                        
                        result.attempts.append(attempt)
                        return result
            
            except Exception as e:
                attempt.error_message = str(e)
                logger.error(f"Webhook delivery attempt {attempt_num} failed: {e}")
            
            result.attempts.append(attempt)
            
            # If this was the last attempt, mark as failed
            if attempt_num >= self.max_retries:
                result.status = DeliveryStatus.FAILED
                result.final_attempt = True
                circuit_breaker.record_failure()
                return result
            
            # Calculate delay for next attempt
            delay = min(
                self.initial_delay * (self.backoff_multiplier ** (attempt_num - 1)),
                self.max_delay
            )
            
            result.status = DeliveryStatus.RETRYING
            result.next_retry_at = datetime.utcnow() + timedelta(seconds=delay)
            
            logger.info(f"Retrying webhook delivery in {delay:.1f} seconds...")
            await asyncio.sleep(delay)
        
        return result


class WebhookEventDispatcher:
    """Central dispatcher for webhook events."""
    
    def __init__(self):
        self.delivery_client = WebhookDeliveryClient()
        self.event_subscribers: Dict[WebhookEventType, List[Dict[str, Any]]] = {}
    
    def subscribe_webhook(self, webhook_config: Dict[str, Any]):
        """Subscribe a webhook to specific event types."""
        
        for event_type in webhook_config.get('event_types', []):
            if event_type not in self.event_subscribers:
                self.event_subscribers[event_type] = []
            
            self.event_subscribers[event_type].append(webhook_config)
    
    def unsubscribe_webhook(self, webhook_id: str):
        """Unsubscribe a webhook from all events."""
        
        for event_type, subscribers in self.event_subscribers.items():
            self.event_subscribers[event_type] = [
                webhook for webhook in subscribers 
                if webhook['id'] != webhook_id
            ]
    
    async def dispatch_event(
        self,
        event_type: WebhookEventType,
        event_data: Dict[str, Any],
        event_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[WebhookDeliveryResult]:
        """
        Dispatch event to all subscribed webhooks.
        
        Args:
            event_type: Type of event being dispatched
            event_data: Event data payload
            event_id: Optional event ID (generated if not provided)
            metadata: Optional event metadata
            
        Returns:
            List of delivery results for each webhook
        """
        
        if not event_id:
            event_id = f"evt_{int(time.time())}_{event_type.value}"
        
        if metadata is None:
            metadata = {}
        
        # Create standard payload
        payload = WebhookPayload(
            event_type=event_type,
            event_id=event_id,
            timestamp=datetime.utcnow(),
            data=event_data,
            metadata={
                'source': 'jctc_system',
                'api_version': '1.2',
                **metadata
            }
        )
        
        # Get subscribed webhooks for this event type
        subscribers = self.event_subscribers.get(event_type, [])
        
        if not subscribers:
            logger.debug(f"No webhooks subscribed to {event_type.value}")
            return []
        
        logger.info(f"Dispatching {event_type.value} event to {len(subscribers)} webhooks")
        
        # Deliver to all subscribers concurrently
        delivery_tasks = []
        
        async with self.delivery_client:
            for webhook_config in subscribers:
                # Check if webhook is active
                if not webhook_config.get('is_active', False):
                    continue
                
                # Apply event filters if configured
                if not self._matches_filters(event_data, webhook_config.get('filters', {})):
                    continue
                
                task = self.delivery_client.deliver_webhook(
                    webhook_config=webhook_config,
                    payload=payload
                )
                delivery_tasks.append(task)
            
            # Wait for all deliveries to complete
            if delivery_tasks:
                results = await asyncio.gather(*delivery_tasks, return_exceptions=True)
                
                # Filter out exceptions and log them
                delivery_results = []
                for result in results:
                    if isinstance(result, Exception):
                        logger.error(f"Webhook delivery task failed: {result}")
                    else:
                        delivery_results.append(result)
                
                return delivery_results
            
            return []
    
    def _matches_filters(self, event_data: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        """Check if event data matches webhook filters."""
        
        if not filters:
            return True
        
        for filter_key, filter_value in filters.items():
            event_value = event_data.get(filter_key)
            
            if event_value is None:
                return False
            
            # Handle list filters (OR logic)
            if isinstance(filter_value, list):
                if event_value not in filter_value:
                    return False
            else:
                if event_value != filter_value:
                    return False
        
        return True


class WebhookTestClient:
    """Test client for webhook endpoints."""
    
    @staticmethod
    async def test_webhook_connectivity(
        url: str,
        method: str = "POST",
        headers: Optional[Dict[str, str]] = None,
        timeout: float = 10.0
    ) -> Dict[str, Any]:
        """
        Test webhook endpoint connectivity.
        
        Args:
            url: Webhook URL to test
            method: HTTP method to use
            headers: Optional HTTP headers
            timeout: Request timeout in seconds
            
        Returns:
            Dictionary with test results
        """
        
        test_payload = {
            "event_type": "test.connectivity",
            "event_id": "test_" + str(int(time.time())),
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "test": True,
                "message": "JCTC webhook connectivity test"
            },
            "metadata": {
                "source": "jctc_webhook_test",
                "test_mode": True
            }
        }
        
        test_headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'JCTC-Webhook-Test-Client/1.2'
        }
        
        if headers:
            test_headers.update(headers)
        
        async with httpx.AsyncClient(timeout=httpx.Timeout(timeout)) as client:
            try:
                start_time = time.time()
                
                response = await client.request(
                    method=method,
                    url=url,
                    headers=test_headers,
                    json=test_payload
                )
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                return {
                    'success': 200 <= response.status_code < 300,
                    'status_code': response.status_code,
                    'response_time_ms': response_time,
                    'response_headers': dict(response.headers),
                    'url': url,
                    'error_message': None if 200 <= response.status_code < 300 
                                   else f"HTTP {response.status_code}"
                }
            
            except Exception as e:
                return {
                    'success': False,
                    'status_code': None,
                    'response_time_ms': None,
                    'response_headers': {},
                    'url': url,
                    'error_message': str(e)
                }


# Global event dispatcher instance
webhook_dispatcher = WebhookEventDispatcher()


# Convenience functions for common webhook operations
async def send_webhook_event(
    event_type: WebhookEventType,
    event_data: Dict[str, Any],
    event_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> List[WebhookDeliveryResult]:
    """
    Convenience function to send webhook events.
    
    Args:
        event_type: Type of event to send
        event_data: Event data payload
        event_id: Optional event ID
        metadata: Optional event metadata
        
    Returns:
        List of delivery results
    """
    
    return await webhook_dispatcher.dispatch_event(
        event_type=event_type,
        event_data=event_data,
        event_id=event_id,
        metadata=metadata
    )


def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    """
    Convenience function to verify webhook signatures.
    
    Args:
        payload: Webhook payload string
        signature: Signature to verify
        secret: Secret key
        
    Returns:
        True if signature is valid, False otherwise
    """
    
    return WebhookSignatureGenerator.verify_signature(payload, signature, secret)


def generate_webhook_signature(payload: str, secret: str) -> str:
    """
    Convenience function to generate webhook signatures.
    
    Args:
        payload: Webhook payload string
        secret: Secret key
        
    Returns:
        Generated signature
    """
    
    return WebhookSignatureGenerator.generate_signature(payload, secret)