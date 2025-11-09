"""
Unit tests for webhook handling utilities.

This module tests:
- HMAC signature generation and verification
- Webhook delivery with retries and circuit breaking
- Event dispatching and payload formatting
- Circuit breaker patterns
- Delivery status tracking
"""

import asyncio
import json
import pytest
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

import httpx

from app.utils.webhooks import (
    WebhookSignatureGenerator,
    WebhookDeliveryClient,
    WebhookEventDispatcher,
    WebhookTestClient,
    CircuitBreaker,
    CircuitBreakerState,
    WebhookEventType,
    DeliveryStatus,
    WebhookPayload,
    send_webhook_event,
    verify_webhook_signature,
    generate_webhook_signature
)


class TestWebhookSignatureGenerator:
    """Test HMAC-SHA256 signature generation and verification."""
    
    def test_generate_signature_string_payload(self):
        """Test signature generation with string payload."""
        payload = "test payload"
        secret = "test_secret"
        
        signature = WebhookSignatureGenerator.generate_signature(payload, secret)
        
        assert isinstance(signature, str)
        assert len(signature) == 64  # SHA256 hex digest length
    
    def test_generate_signature_bytes_payload(self):
        """Test signature generation with bytes payload."""
        payload = b"test payload"
        secret = "test_secret"
        
        signature = WebhookSignatureGenerator.generate_signature(payload, secret)
        
        assert isinstance(signature, str)
        assert len(signature) == 64
    
    def test_verify_signature_valid(self):
        """Test signature verification with valid signature."""
        payload = "test payload"
        secret = "test_secret"
        
        signature = WebhookSignatureGenerator.generate_signature(payload, secret)
        
        assert WebhookSignatureGenerator.verify_signature(payload, signature, secret) is True
    
    def test_verify_signature_invalid(self):
        """Test signature verification with invalid signature."""
        payload = "test payload"
        secret = "test_secret"
        wrong_signature = "invalid_signature"
        
        assert WebhookSignatureGenerator.verify_signature(payload, wrong_signature, secret) is False
    
    def test_verify_signature_wrong_secret(self):
        """Test signature verification with wrong secret."""
        payload = "test payload"
        secret = "test_secret"
        wrong_secret = "wrong_secret"
        
        signature = WebhookSignatureGenerator.generate_signature(payload, secret)
        
        assert WebhookSignatureGenerator.verify_signature(payload, signature, wrong_secret) is False
    
    def test_signature_consistency(self):
        """Test that same payload and secret produce same signature."""
        payload = "consistent test payload"
        secret = "consistent_secret"
        
        sig1 = WebhookSignatureGenerator.generate_signature(payload, secret)
        sig2 = WebhookSignatureGenerator.generate_signature(payload, secret)
        
        assert sig1 == sig2


class TestCircuitBreaker:
    """Test circuit breaker implementation."""
    
    def test_initial_state(self):
        """Test initial circuit breaker state."""
        cb = CircuitBreaker(failure_threshold=3, timeout_seconds=30)
        
        assert cb.state == CircuitBreakerState.CLOSED
        assert cb.failure_count == 0
        assert cb.can_execute() is True
    
    def test_record_success(self):
        """Test recording successful executions."""
        cb = CircuitBreaker(failure_threshold=3)
        
        # Record some failures first
        cb.record_failure()
        cb.record_failure()
        assert cb.failure_count == 2
        
        # Record success should reset
        cb.record_success()
        assert cb.failure_count == 0
        assert cb.state == CircuitBreakerState.CLOSED
        assert cb.last_failure_time is None
    
    def test_circuit_opens_after_threshold(self):
        """Test circuit opens after failure threshold."""
        cb = CircuitBreaker(failure_threshold=3)
        
        # Record failures up to threshold
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitBreakerState.CLOSED
        
        cb.record_failure()  # This should open the circuit
        assert cb.state == CircuitBreakerState.OPEN
        assert cb.can_execute() is False
    
    def test_circuit_half_open_after_timeout(self):
        """Test circuit transitions to half-open after recovery timeout."""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout_seconds=0.1)
        
        # Open the circuit
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitBreakerState.OPEN
        
        # Wait for recovery timeout
        import time
        time.sleep(0.2)
        
        # Should transition to half-open and allow execution
        assert cb.can_execute() is True
        assert cb.state == CircuitBreakerState.HALF_OPEN
    
    def test_disabled_circuit_breaker(self):
        """Test disabled circuit breaker always allows execution."""
        from app.utils.webhooks import CircuitBreakerConfig
        
        config = CircuitBreakerConfig(enabled=False)
        cb = CircuitBreaker(config)
        
        # Record many failures
        for _ in range(10):
            cb.record_failure()
        
        assert cb.can_execute() is True


class TestWebhookDeliveryClient:
    """Test webhook delivery client with retries and circuit breaking."""
    
    @pytest.fixture
    def mock_webhook_config(self):
        """Fixture providing mock webhook configuration."""
        return {
            'id': 'test_webhook_123',
            'url': 'https://example.com/webhook',
            'method': 'POST',
            'headers': {'Custom-Header': 'test-value'},
            'secret_token': 'test_secret'
        }
    
    @pytest.fixture
    def sample_payload(self):
        """Fixture providing sample webhook payload."""
        return WebhookPayload(
            event_type=WebhookEventType.CASE_CREATED,
            event_id='evt_test_123',
            timestamp=datetime.utcnow(),
            data={'case_id': 'case_123', 'title': 'Test Case'},
            metadata={'source': 'test'}
        )
    
    @pytest.mark.asyncio
    async def test_successful_delivery(self, mock_webhook_config, sample_payload):
        """Test successful webhook delivery."""
        client = WebhookDeliveryClient(max_retries=3)
        
        # Mock successful HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.reason_phrase = 'OK'
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            async with client:
                result = await client.deliver_webhook(mock_webhook_config, sample_payload)
        
        assert result.status == DeliveryStatus.DELIVERED
        assert result.webhook_id == 'test_webhook_123'
        assert len(result.attempts) == 1
        assert result.attempts[0].success is True
        assert result.final_attempt is True
    
    @pytest.mark.asyncio
    async def test_retry_on_server_error(self, mock_webhook_config, sample_payload):
        """Test retry behavior on server errors."""
        client = WebhookDeliveryClient(max_retries=2, initial_delay=0.01)  # Fast retry for testing
        
        # Mock server error response
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.reason_phrase = 'Internal Server Error'
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            async with client:
                result = await client.deliver_webhook(mock_webhook_config, sample_payload)
        
        assert result.status == DeliveryStatus.FAILED
        assert len(result.attempts) == 2  # Should retry once
        assert all(not attempt.success for attempt in result.attempts)
        assert result.final_attempt is True
    
    @pytest.mark.asyncio
    async def test_no_retry_on_client_error(self, mock_webhook_config, sample_payload):
        """Test no retry on client errors (4xx)."""
        client = WebhookDeliveryClient(max_retries=3)
        
        # Mock client error response
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.reason_phrase = 'Not Found'
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            async with client:
                result = await client.deliver_webhook(mock_webhook_config, sample_payload)
        
        assert result.status == DeliveryStatus.FAILED
        assert len(result.attempts) == 1  # Should not retry
        assert result.final_attempt is True
    
    @pytest.mark.asyncio
    async def test_signature_generation(self, mock_webhook_config, sample_payload):
        """Test HMAC signature is added to requests."""
        client = WebhookDeliveryClient()
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.reason_phrase = 'OK'
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            async with client:
                await client.deliver_webhook(mock_webhook_config, sample_payload)
        
        # Check that post was called with signature header
        call_args = mock_client.post.call_args
        headers = call_args.kwargs['headers']
        
        assert 'X-JCTC-Signature' in headers
        assert len(headers['X-JCTC-Signature']) == 64  # SHA256 hex length
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_blocks_delivery(self, mock_webhook_config, sample_payload):
        """Test circuit breaker blocks delivery when open."""
        client = WebhookDeliveryClient()
        
        # Force circuit breaker to open
        circuit_breaker = client.get_circuit_breaker(mock_webhook_config['url'])
        circuit_breaker.state = CircuitBreakerState.OPEN
        
        async with client:
            result = await client.deliver_webhook(mock_webhook_config, sample_payload)
        
        assert result.status == DeliveryStatus.FAILED
        assert 'Circuit breaker' in result.error_message
        assert len(result.attempts) == 0


class TestWebhookEventDispatcher:
    """Test webhook event dispatcher."""
    
    @pytest.fixture
    def dispatcher(self):
        """Fixture providing webhook event dispatcher."""
        return WebhookEventDispatcher()
    
    @pytest.fixture
    def mock_webhook_configs(self):
        """Fixture providing mock webhook configurations."""
        return [
            {
                'id': 'webhook_1',
                'url': 'https://system1.com/webhook',
                'event_types': ['case.created', 'case.updated'],
                'is_active': True,
                'filters': {}
            },
            {
                'id': 'webhook_2',
                'url': 'https://system2.com/webhook',
                'event_types': ['case.created'],
                'is_active': True,
                'filters': {'priority': ['high', 'critical']}
            },
            {
                'id': 'webhook_3',
                'url': 'https://system3.com/webhook',
                'event_types': ['task.created'],
                'is_active': False,  # Inactive
                'filters': {}
            }
        ]
    
    def test_subscribe_webhook(self, dispatcher, mock_webhook_configs):
        """Test webhook subscription to event types."""
        webhook_config = mock_webhook_configs[0]
        dispatcher.subscribe_webhook(webhook_config)
        
        assert WebhookEventType.CASE_CREATED in dispatcher.event_subscribers
        assert WebhookEventType.CASE_UPDATED in dispatcher.event_subscribers
        assert webhook_config in dispatcher.event_subscribers[WebhookEventType.CASE_CREATED]
    
    def test_unsubscribe_webhook(self, dispatcher, mock_webhook_configs):
        """Test webhook unsubscription."""
        webhook_config = mock_webhook_configs[0]
        dispatcher.subscribe_webhook(webhook_config)
        
        # Verify subscription
        assert webhook_config in dispatcher.event_subscribers[WebhookEventType.CASE_CREATED]
        
        # Unsubscribe
        dispatcher.unsubscribe_webhook('webhook_1')
        
        # Verify unsubscription
        assert webhook_config not in dispatcher.event_subscribers[WebhookEventType.CASE_CREATED]
    
    @pytest.mark.asyncio
    async def test_dispatch_event_to_subscribers(self, dispatcher, mock_webhook_configs):
        """Test event dispatch to subscribed webhooks."""
        # Subscribe webhooks
        for config in mock_webhook_configs:
            dispatcher.subscribe_webhook(config)
        
        # Mock successful delivery
        with patch.object(dispatcher.delivery_client, 'deliver_webhook') as mock_deliver:
            mock_deliver.return_value = Mock(status=DeliveryStatus.DELIVERED)
            
            async with dispatcher.delivery_client:
                results = await dispatcher.dispatch_event(
                    WebhookEventType.CASE_CREATED,
                    {'case_id': 'case_123', 'priority': 'high'}
                )
        
        # Should deliver to active webhooks subscribed to case.created
        # webhook_1 and webhook_2 should receive, webhook_3 is inactive
        assert len(results) == 2
        assert mock_deliver.call_count == 2
    
    @pytest.mark.asyncio
    async def test_event_filtering(self, dispatcher, mock_webhook_configs):
        """Test event filtering based on webhook filters."""
        # Subscribe webhooks
        for config in mock_webhook_configs:
            dispatcher.subscribe_webhook(config)
        
        with patch.object(dispatcher.delivery_client, 'deliver_webhook') as mock_deliver:
            mock_deliver.return_value = Mock(status=DeliveryStatus.DELIVERED)
            
            async with dispatcher.delivery_client:
                # Dispatch event with medium priority
                results = await dispatcher.dispatch_event(
                    WebhookEventType.CASE_CREATED,
                    {'case_id': 'case_123', 'priority': 'medium'}
                )
        
        # Only webhook_1 should receive (no priority filter)
        # webhook_2 should be filtered out (requires high/critical priority)
        assert len(results) == 1
        assert mock_deliver.call_count == 1
    
    def test_matches_filters_no_filters(self, dispatcher):
        """Test filter matching with no filters configured."""
        event_data = {'case_id': 'case_123', 'priority': 'low'}
        filters = {}
        
        assert dispatcher._matches_filters(event_data, filters) is True
    
    def test_matches_filters_list_filter_match(self, dispatcher):
        """Test filter matching with list filter that matches."""
        event_data = {'case_id': 'case_123', 'priority': 'high'}
        filters = {'priority': ['high', 'critical']}
        
        assert dispatcher._matches_filters(event_data, filters) is True
    
    def test_matches_filters_list_filter_no_match(self, dispatcher):
        """Test filter matching with list filter that doesn't match."""
        event_data = {'case_id': 'case_123', 'priority': 'low'}
        filters = {'priority': ['high', 'critical']}
        
        assert dispatcher._matches_filters(event_data, filters) is False
    
    def test_matches_filters_exact_match(self, dispatcher):
        """Test filter matching with exact value."""
        event_data = {'case_id': 'case_123', 'status': 'active'}
        filters = {'status': 'active'}
        
        assert dispatcher._matches_filters(event_data, filters) is True
    
    def test_matches_filters_missing_field(self, dispatcher):
        """Test filter matching with missing field in event data."""
        event_data = {'case_id': 'case_123'}
        filters = {'priority': ['high']}
        
        assert dispatcher._matches_filters(event_data, filters) is False


class TestWebhookTestClient:
    """Test webhook test client."""
    
    @pytest.mark.asyncio
    async def test_successful_connectivity_test(self):
        """Test successful webhook endpoint connectivity test."""
        url = 'https://example.com/webhook'
        
        # Mock successful HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {'content-type': 'application/json'}
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.request.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            result = await WebhookTestClient.test_webhook_connectivity(url)
        
        assert result['success'] is True
        assert result['status_code'] == 200
        assert result['url'] == url
        assert result['error_message'] is None
        assert result['response_time_ms'] is not None
    
    @pytest.mark.asyncio
    async def test_failed_connectivity_test(self):
        """Test failed webhook endpoint connectivity test."""
        url = 'https://unreachable.example.com/webhook'
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.request.side_effect = httpx.ConnectError("Connection failed")
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            result = await WebhookTestClient.test_webhook_connectivity(url)
        
        assert result['success'] is False
        assert result['status_code'] is None
        assert result['url'] == url
        assert 'Connection failed' in result['error_message']


class TestConvenienceFunctions:
    """Test convenience functions."""
    
    def test_verify_webhook_signature(self):
        """Test convenience function for signature verification."""
        payload = "test payload"
        secret = "test_secret"
        signature = generate_webhook_signature(payload, secret)
        
        assert verify_webhook_signature(payload, signature, secret) is True
    
    def test_generate_webhook_signature(self):
        """Test convenience function for signature generation."""
        payload = "test payload"
        secret = "test_secret"
        
        signature = generate_webhook_signature(payload, secret)
        
        assert isinstance(signature, str)
        assert len(signature) == 64
    
    @pytest.mark.asyncio
    async def test_send_webhook_event(self):
        """Test convenience function for sending webhook events."""
        with patch('app.utils.webhooks.webhook_dispatcher.dispatch_event') as mock_dispatch:
            mock_dispatch.return_value = [Mock(status=DeliveryStatus.DELIVERED)]
            
            results = await send_webhook_event(
                WebhookEventType.CASE_CREATED,
                {'case_id': 'case_123'}
            )
        
        assert mock_dispatch.called
        assert len(results) == 1


if __name__ == '__main__':
    pytest.main([__file__])