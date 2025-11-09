import json
import hmac
import hashlib
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from dataclasses import dataclass
from enum import Enum
import pandas as pd
import io
import csv
import logging
import uuid
import secrets

from ..models.integrations import (
    Integration, Webhook, WebhookDelivery, APIKey, DataExport, DataImport,
    SyncJob, IntegrationLog, DataMapping, IntegrationStatus
)
from ..schemas.integrations import (
    IntegrationCreate, IntegrationUpdate, WebhookCreate, APIKeyCreate,
    DataExportRequest, DataImportRequest, ValidationResult, ConnectionTestResult,
    ExternalSystemConnector, IntegrationTemplate
)

logger = logging.getLogger(__name__)

class IntegrationError(Exception):
    """Custom exception for integration-related errors"""
    pass

class WebhookError(Exception):
    """Custom exception for webhook-related errors"""
    pass

class DataTransformationError(Exception):
    """Custom exception for data transformation errors"""
    pass

# Integration Management Utilities

class IntegrationManager:
    """Manager for external system integrations"""
    
    def __init__(self):
        self.available_connectors = self._initialize_connectors()
        self.integration_templates = self._load_templates()
    
    async def create_integration(
        self, 
        integration_data: IntegrationCreate, 
        user_id: str, 
        db: AsyncSession
    ) -> Integration:
        """Create a new integration"""
        try:
            # Validate configuration
            await self._validate_config(integration_data.config, integration_data.integration_type)
            
            integration = Integration(
                name=integration_data.name,
                description=integration_data.description,
                integration_type=integration_data.integration_type.value,
                system_identifier=integration_data.system_identifier,
                config=integration_data.config.dict(),
                is_active=integration_data.is_active,
                auto_sync=integration_data.auto_sync,
                sync_interval_minutes=integration_data.sync_interval_minutes,
                data_retention_days=integration_data.data_retention_days,
                tags=integration_data.tags,
                created_by=user_id
            )
            
            if integration.auto_sync and integration.sync_interval_minutes:
                integration.schedule_next_sync()
            
            db.add(integration)
            await db.commit()
            await db.refresh(integration)
            
            # Log integration creation
            await self._log_integration_event(
                integration.id, "info", "Integration created", user_id, db
            )
            
            return integration
            
        except Exception as e:
            await db.rollback()
            raise IntegrationError(f"Failed to create integration: {str(e)}")
    
    async def update_integration(
        self,
        integration_id: str,
        update_data: IntegrationUpdate,
        user_id: str,
        db: AsyncSession
    ) -> Optional[Integration]:
        """Update an existing integration"""
        try:
            result = await db.execute(
                select(Integration).where(Integration.id == integration_id)
            )
            integration = result.scalar_one_or_none()
            
            if not integration:
                return None
            
            # Update fields
            if update_data.name is not None:
                integration.name = update_data.name
            if update_data.description is not None:
                integration.description = update_data.description
            if update_data.config is not None:
                await self._validate_config(update_data.config, integration.integration_type)
                integration.config = update_data.config.dict()
            if update_data.is_active is not None:
                integration.is_active = update_data.is_active
            if update_data.auto_sync is not None:
                integration.auto_sync = update_data.auto_sync
            if update_data.sync_interval_minutes is not None:
                integration.sync_interval_minutes = update_data.sync_interval_minutes
            if update_data.data_retention_days is not None:
                integration.data_retention_days = update_data.data_retention_days
            if update_data.tags is not None:
                integration.tags = update_data.tags
            
            integration.updated_by = user_id
            integration.updated_at = datetime.utcnow()
            
            # Reschedule sync if needed
            if integration.auto_sync and integration.sync_interval_minutes:
                integration.schedule_next_sync()
            
            await db.commit()
            
            # Log update
            await self._log_integration_event(
                integration.id, "info", "Integration updated", user_id, db
            )
            
            return integration
            
        except Exception as e:
            await db.rollback()
            raise IntegrationError(f"Failed to update integration: {str(e)}")
    
    async def delete_integration(
        self,
        integration_id: str,
        user_id: str,
        db: AsyncSession
    ) -> bool:
        """Soft delete an integration"""
        try:
            result = await db.execute(
                select(Integration).where(Integration.id == integration_id)
            )
            integration = result.scalar_one_or_none()
            
            if not integration:
                return False
            
            integration.is_active = False
            integration.status = IntegrationStatus.INACTIVE
            integration.updated_by = user_id
            integration.updated_at = datetime.utcnow()
            
            await db.commit()
            
            # Log deletion
            await self._log_integration_event(
                integration.id, "warning", "Integration deleted", user_id, db
            )
            
            return True
            
        except Exception as e:
            await db.rollback()
            raise IntegrationError(f"Failed to delete integration: {str(e)}")
    
    async def list_integrations(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        system_type: Optional[str] = None,
        db: AsyncSession
    ) -> List[Integration]:
        """List integrations with filtering"""
        query = select(Integration).offset(skip).limit(limit)
        
        filters = []
        if status:
            filters.append(Integration.status == status)
        if system_type:
            filters.append(Integration.integration_type == system_type)
        
        if filters:
            query = query.where(and_(*filters))
        
        query = query.order_by(Integration.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_integration(
        self,
        integration_id: str,
        db: AsyncSession
    ) -> Optional[Integration]:
        """Get integration by ID"""
        result = await db.execute(
            select(Integration).where(Integration.id == integration_id)
        )
        return result.scalar_one_or_none()
    
    async def test_integration(
        self,
        integration_id: str,
        db: AsyncSession
    ) -> Optional[ConnectionTestResult]:
        """Test integration connectivity"""
        integration = await self.get_integration(integration_id, db)
        if not integration:
            return None
        
        try:
            start_time = datetime.utcnow()
            
            # Test based on integration type
            if integration.integration_type == "api":
                result = await self._test_api_connection(integration)
            elif integration.integration_type == "database":
                result = await self._test_database_connection(integration)
            elif integration.integration_type == "forensic_tool":
                result = await self._test_forensic_tool_connection(integration)
            else:
                result = ConnectionTestResult(
                    success=False,
                    response_time_ms=0,
                    error_message="Unsupported integration type",
                    tested_at=datetime.utcnow()
                )
            
            # Update integration health status
            integration.last_health_check = datetime.utcnow()
            if result.success:
                integration.status = IntegrationStatus.ACTIVE
                integration.last_error = None
            else:
                integration.status = IntegrationStatus.ERROR
                integration.last_error = result.error_message
            
            await db.commit()
            
            # Log test result
            level = "info" if result.success else "error"
            message = "Integration test successful" if result.success else f"Integration test failed: {result.error_message}"
            await self._log_integration_event(
                integration.id, level, message, None, db
            )
            
            return result
            
        except Exception as e:
            await self._log_integration_event(
                integration.id, "error", f"Integration test error: {str(e)}", None, db
            )
            return ConnectionTestResult(
                success=False,
                response_time_ms=0,
                error_message=str(e),
                tested_at=datetime.utcnow()
            )
    
    async def _validate_config(self, config, integration_type: str):
        """Validate integration configuration"""
        required_fields = {
            "api": ["base_url"],
            "database": ["host", "database"],
            "forensic_tool": ["tool_path"],
            "webhook": ["url"],
            "file_system": ["base_path"]
        }
        
        if integration_type in required_fields:
            for field in required_fields[integration_type]:
                if field not in config.dict() or not config.dict()[field]:
                    raise IntegrationError(f"Missing required field: {field}")
    
    async def _test_api_connection(self, integration: Integration) -> ConnectionTestResult:
        """Test API connection"""
        config = integration.config
        base_url = config.get("base_url")
        
        if not base_url:
            return ConnectionTestResult(
                success=False,
                response_time_ms=0,
                error_message="Base URL not configured",
                tested_at=datetime.utcnow()
            )
        
        try:
            start_time = datetime.utcnow()
            
            async with aiohttp.ClientSession() as session:
                # Test with health check endpoint or root
                test_url = f"{base_url.rstrip('/')}/health"
                headers = config.get("headers", {})
                
                async with session.get(test_url, headers=headers, timeout=30) as response:
                    end_time = datetime.utcnow()
                    response_time = int((end_time - start_time).total_seconds() * 1000)
                    
                    return ConnectionTestResult(
                        success=response.status < 400,
                        response_time_ms=response_time,
                        status_code=response.status,
                        error_message=None if response.status < 400 else f"HTTP {response.status}",
                        tested_at=end_time
                    )
                    
        except asyncio.TimeoutError:
            return ConnectionTestResult(
                success=False,
                response_time_ms=30000,
                error_message="Connection timeout",
                tested_at=datetime.utcnow()
            )
        except Exception as e:
            return ConnectionTestResult(
                success=False,
                response_time_ms=0,
                error_message=str(e),
                tested_at=datetime.utcnow()
            )
    
    async def _test_database_connection(self, integration: Integration) -> ConnectionTestResult:
        """Test database connection"""
        # Placeholder for database connection test
        # Would implement actual database connectivity testing
        return ConnectionTestResult(
            success=True,
            response_time_ms=100,
            capabilities_detected=["read", "write"],
            tested_at=datetime.utcnow()
        )
    
    async def _test_forensic_tool_connection(self, integration: Integration) -> ConnectionTestResult:
        """Test forensic tool connection"""
        # Placeholder for forensic tool connectivity testing
        # Would implement actual tool-specific testing
        return ConnectionTestResult(
            success=True,
            response_time_ms=500,
            capabilities_detected=["extract", "analyze"],
            tested_at=datetime.utcnow()
        )
    
    def _initialize_connectors(self) -> List[ExternalSystemConnector]:
        """Initialize available system connectors"""
        return [
            ExternalSystemConnector(
                connector_id="cellebrite_ufed",
                name="Cellebrite UFED",
                description="Mobile forensic extraction and analysis",
                system_type="forensic_tool",
                supported_versions=["7.x", "8.x", "9.x"],
                required_credentials=["license_key", "api_token"],
                capabilities=["extract", "analyze", "report"],
                is_available=True
            ),
            ExternalSystemConnector(
                connector_id="oxygen_suite",
                name="Oxygen Forensic Suite",
                description="Comprehensive digital forensics platform",
                system_type="forensic_tool",
                supported_versions=["14.x", "15.x"],
                required_credentials=["username", "password"],
                capabilities=["extract", "analyze", "timeline"],
                is_available=True
            ),
            ExternalSystemConnector(
                connector_id="interpol_database",
                name="INTERPOL I-24/7",
                description="INTERPOL global police communications system",
                system_type="database",
                required_credentials=["organization_code", "user_credentials"],
                capabilities=["query", "alert", "notice"],
                is_available=True
            ),
            ExternalSystemConnector(
                connector_id="afis_database",
                name="AFIS Database",
                description="Automated Fingerprint Identification System",
                system_type="database",
                required_credentials=["database_connection", "user_credentials"],
                capabilities=["fingerprint_search", "palm_print_search"],
                is_available=True
            )
        ]
    
    def _load_templates(self) -> List[IntegrationTemplate]:
        """Load integration templates"""
        return [
            IntegrationTemplate(
                template_id="cellebrite_template",
                name="Cellebrite UFED Integration",
                description="Pre-configured integration for Cellebrite UFED",
                system_type="forensic_tool",
                vendor="Cellebrite",
                default_config={
                    "tool_path": "C:\\Program Files\\Cellebrite\\UFED",
                    "api_endpoint": "http://localhost:8080/api",
                    "timeout_seconds": 300
                },
                required_fields=["license_key", "api_token"],
                setup_instructions="Install Cellebrite UFED and configure API access",
                is_verified=True,
                created_at=datetime.utcnow()
            ),
            # Add more templates as needed
        ]
    
    async def get_available_connectors(self) -> List[ExternalSystemConnector]:
        """Get list of available connectors"""
        return self.available_connectors
    
    async def get_integration_templates(
        self, 
        system_type: Optional[str] = None
    ) -> List[IntegrationTemplate]:
        """Get integration templates"""
        templates = self.integration_templates
        if system_type:
            templates = [t for t in templates if t.system_type == system_type]
        return templates
    
    async def apply_template(
        self,
        template_id: str,
        customization: Optional[Dict[str, Any]],
        user_id: str,
        db: AsyncSession
    ) -> Integration:
        """Apply integration template"""
        template = next((t for t in self.integration_templates if t.template_id == template_id), None)
        if not template:
            raise IntegrationError(f"Template not found: {template_id}")
        
        # Create integration data from template
        config = template.default_config.copy()
        if customization:
            config.update(customization.get("config_overrides", {}))
        
        integration_data = IntegrationCreate(
            name=customization.get("custom_name", template.name),
            description=customization.get("custom_description", template.description),
            integration_type=template.system_type,
            system_identifier=f"{template_id}_{uuid.uuid4().hex[:8]}",
            config=config
        )
        
        return await self.create_integration(integration_data, user_id, db)
    
    async def _log_integration_event(
        self,
        integration_id: str,
        level: str,
        message: str,
        user_id: Optional[str],
        db: AsyncSession,
        **kwargs
    ):
        """Log integration event"""
        log_entry = IntegrationLog(
            integration_id=integration_id,
            level=level,
            message=message,
            user_id=user_id,
            **kwargs
        )
        db.add(log_entry)
        await db.commit()

# Webhook Handling Utilities

class WebhookHandler:
    """Handler for webhook operations"""
    
    def __init__(self):
        self.session = aiohttp.ClientSession()
    
    async def create_webhook(
        self,
        webhook_data: WebhookCreate,
        user_id: str,
        db: AsyncSession
    ) -> Webhook:
        """Create a new webhook"""
        try:
            webhook = Webhook(
                name=webhook_data.name,
                description=webhook_data.description,
                url=webhook_data.url,
                method=webhook_data.method,
                event_types=[e.value for e in webhook_data.event_types],
                headers=webhook_data.headers,
                authentication=webhook_data.authentication,
                timeout_seconds=webhook_data.timeout_seconds,
                retry_attempts=webhook_data.retry_attempts,
                retry_delay_seconds=webhook_data.retry_delay_seconds,
                is_active=webhook_data.is_active,
                verify_ssl=webhook_data.verify_ssl,
                secret_token=webhook_data.secret_token,
                created_by=user_id
            )
            
            db.add(webhook)
            await db.commit()
            await db.refresh(webhook)
            
            return webhook
            
        except Exception as e:
            await db.rollback()
            raise WebhookError(f"Failed to create webhook: {str(e)}")
    
    async def list_webhooks(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = False,
        event_type: Optional[str] = None,
        db: AsyncSession
    ) -> List[Webhook]:
        """List webhooks with filtering"""
        query = select(Webhook).offset(skip).limit(limit)
        
        filters = []
        if active_only:
            filters.append(Webhook.is_active == True)
        if event_type:
            # For JSON array contains query - implementation depends on database
            filters.append(Webhook.event_types.contains([event_type]))
        
        if filters:
            query = query.where(and_(*filters))
        
        query = query.order_by(Webhook.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def test_webhook(
        self,
        webhook_id: str,
        test_payload: Optional[Dict[str, Any]],
        db: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """Test webhook delivery"""
        result = await db.execute(
            select(Webhook).where(Webhook.id == webhook_id)
        )
        webhook = result.scalar_one_or_none()
        
        if not webhook:
            return None
        
        # Create test payload
        payload = test_payload or {
            "event_type": "system.test",
            "timestamp": datetime.utcnow().isoformat(),
            "event_id": str(uuid.uuid4()),
            "data": {"message": "Test webhook delivery"},
            "metadata": {"test": True}
        }
        
        try:
            # Deliver test webhook
            success, response_data = await self._deliver_webhook(webhook, payload)
            
            return {
                "success": success,
                "webhook_id": webhook_id,
                "response_data": response_data,
                "test_payload": payload,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "webhook_id": webhook_id,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def process_incoming_webhook(
        self,
        webhook_id: str,
        body: bytes,
        signature: Optional[str],
        timestamp: Optional[str],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Process incoming webhook data"""
        result = await db.execute(
            select(Webhook).where(Webhook.id == webhook_id)
        )
        webhook = result.scalar_one_or_none()
        
        if not webhook:
            raise WebhookError("Webhook not found")
        
        # Verify signature if secret token is configured
        if webhook.secret_token and signature:
            if not self._verify_signature(body, signature, webhook.secret_token):
                raise WebhookError("Invalid signature")
        
        # Parse payload
        try:
            payload_data = json.loads(body.decode('utf-8'))
        except json.JSONDecodeError:
            raise WebhookError("Invalid JSON payload")
        
        # Create delivery record
        delivery = WebhookDelivery(
            webhook_id=webhook_id,
            event_type=payload_data.get("event_type", "unknown"),
            event_id=payload_data.get("event_id", str(uuid.uuid4())),
            payload=payload_data,
            status="received"
        )
        
        db.add(delivery)
        await db.commit()
        
        return {
            "status": "received",
            "delivery_id": delivery.id,
            "requires_processing": True,
            "data": payload_data
        }
    
    async def process_webhook_data(
        self,
        webhook_id: str,
        data: Dict[str, Any],
        db: AsyncSession
    ):
        """Process webhook data in background"""
        # Implement webhook data processing logic
        # This would handle the actual business logic based on event type
        try:
            event_type = data.get("event_type")
            
            if event_type == "case.created":
                await self._handle_case_created(data)
            elif event_type == "evidence.analyzed":
                await self._handle_evidence_analyzed(data)
            # Add more event handlers as needed
                
            logger.info(f"Processed webhook data for event: {event_type}")
            
        except Exception as e:
            logger.error(f"Failed to process webhook data: {str(e)}")
            raise
    
    async def _deliver_webhook(
        self,
        webhook: Webhook,
        payload: Dict[str, Any]
    ) -> Tuple[bool, Dict[str, Any]]:
        """Deliver webhook payload"""
        try:
            headers = webhook.headers.copy()
            headers["Content-Type"] = "application/json"
            
            # Add signature if secret token is configured
            if webhook.secret_token:
                payload_json = json.dumps(payload)
                signature = self._generate_signature(payload_json.encode(), webhook.secret_token)
                headers["X-Signature"] = signature
                headers["X-Timestamp"] = str(int(datetime.utcnow().timestamp()))
            
            async with self.session.request(
                method=webhook.method,
                url=webhook.url,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=webhook.timeout_seconds),
                ssl=webhook.verify_ssl
            ) as response:
                response_body = await response.text()
                
                return response.status < 400, {
                    "status_code": response.status,
                    "response_body": response_body[:1000],  # Limit response body size
                    "headers": dict(response.headers)
                }
                
        except asyncio.TimeoutError:
            return False, {"error": "Request timeout"}
        except Exception as e:
            return False, {"error": str(e)}
    
    def _generate_signature(self, payload: bytes, secret: str) -> str:
        """Generate HMAC signature for webhook payload"""
        return hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
    
    def _verify_signature(self, payload: bytes, signature: str, secret: str) -> bool:
        """Verify webhook signature"""
        expected_signature = self._generate_signature(payload, secret)
        return hmac.compare_digest(signature, expected_signature)
    
    async def _handle_case_created(self, data: Dict[str, Any]):
        """Handle case created event"""
        # Implement case creation webhook handling
        pass
    
    async def _handle_evidence_analyzed(self, data: Dict[str, Any]):
        """Handle evidence analyzed event"""
        # Implement evidence analysis webhook handling
        pass
    
    async def get_delivery_history(
        self,
        webhook_id: str,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        db: AsyncSession
    ) -> List[WebhookDelivery]:
        """Get webhook delivery history"""
        query = select(WebhookDelivery).where(WebhookDelivery.webhook_id == webhook_id)
        
        if status:
            query = query.where(WebhookDelivery.status == status)
        
        query = query.offset(skip).limit(limit).order_by(WebhookDelivery.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def retry_delivery(
        self,
        delivery_id: str,
        user_id: str,
        db: AsyncSession
    ):
        """Retry failed webhook delivery"""
        result = await db.execute(
            select(WebhookDelivery).where(WebhookDelivery.id == delivery_id)
        )
        delivery = result.scalar_one_or_none()
        
        if not delivery or not delivery.can_retry():
            return
        
        # Get webhook
        webhook_result = await db.execute(
            select(Webhook).where(Webhook.id == delivery.webhook_id)
        )
        webhook = webhook_result.scalar_one_or_none()
        
        if not webhook:
            return
        
        # Attempt delivery
        delivery.attempt_count += 1
        success, response_data = await self._deliver_webhook(webhook, delivery.payload)
        
        if success:
            delivery.mark_success(
                response_data.get("status_code"),
                response_data.get("response_body")
            )
            webhook.increment_delivery_stats(True)
        else:
            delivery.mark_failed(
                response_data.get("error", "Unknown error"),
                response_data.get("status_code")
            )
            webhook.increment_delivery_stats(False)
        
        await db.commit()

# Data Transformation Utilities

class DataTransformer:
    """Utilities for data transformation and mapping"""
    
    def __init__(self):
        pass
    
    async def validate_import_data(
        self,
        data: Union[str, Dict[str, Any]],
        format: str
    ) -> ValidationResult:
        """Validate import data format and structure"""
        try:
            if format == "json":
                return await self._validate_json_data(data)
            elif format == "xml":
                return await self._validate_xml_data(data)
            elif format == "csv":
                return await self._validate_csv_data(data)
            else:
                return ValidationResult(
                    is_valid=False,
                    errors=[f"Unsupported format: {format}"],
                    validated_at=datetime.utcnow()
                )
                
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                errors=[f"Validation error: {str(e)}"],
                validated_at=datetime.utcnow()
            )
    
    async def _validate_json_data(self, data: Union[str, Dict]) -> ValidationResult:
        """Validate JSON data"""
        errors = []
        warnings = []
        
        try:
            if isinstance(data, str):
                parsed_data = json.loads(data)
            else:
                parsed_data = data
            
            # Basic structure validation
            if not isinstance(parsed_data, (dict, list)):
                errors.append("JSON data must be object or array")
            
            # Check for required fields (would be configurable)
            if isinstance(parsed_data, dict):
                required_fields = ["id", "type"]  # Example required fields
                for field in required_fields:
                    if field not in parsed_data:
                        warnings.append(f"Missing recommended field: {field}")
            
            return ValidationResult(
                is_valid=len(errors) == 0,
                errors=errors,
                warnings=warnings,
                validated_at=datetime.utcnow()
            )
            
        except json.JSONDecodeError as e:
            return ValidationResult(
                is_valid=False,
                errors=[f"Invalid JSON: {str(e)}"],
                validated_at=datetime.utcnow()
            )
    
    async def _validate_xml_data(self, data: str) -> ValidationResult:
        """Validate XML data"""
        try:
            ET.fromstring(data)
            return ValidationResult(
                is_valid=True,
                validated_at=datetime.utcnow()
            )
        except ET.ParseError as e:
            return ValidationResult(
                is_valid=False,
                errors=[f"Invalid XML: {str(e)}"],
                validated_at=datetime.utcnow()
            )
    
    async def _validate_csv_data(self, data: str) -> ValidationResult:
        """Validate CSV data"""
        try:
            # Parse CSV to check structure
            csv_file = io.StringIO(data)
            reader = csv.reader(csv_file)
            headers = next(reader)
            
            if not headers:
                return ValidationResult(
                    is_valid=False,
                    errors=["CSV must have headers"],
                    validated_at=datetime.utcnow()
                )
            
            return ValidationResult(
                is_valid=True,
                validated_at=datetime.utcnow()
            )
            
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                errors=[f"Invalid CSV: {str(e)}"],
                validated_at=datetime.utcnow()
            )
    
    async def create_mapping(
        self,
        mapping_data: Dict[str, Any],
        user_id: str,
        db: AsyncSession
    ) -> DataMapping:
        """Create data mapping configuration"""
        try:
            mapping = DataMapping(
                name=mapping_data["name"],
                description=mapping_data.get("description"),
                source_system=mapping_data["source_system"],
                target_system=mapping_data["target_system"],
                field_mappings=mapping_data["field_mappings"],
                transformation_rules=mapping_data.get("transformation_rules", {}),
                validation_rules=mapping_data.get("validation_rules", {}),
                created_by=user_id
            )
            
            db.add(mapping)
            await db.commit()
            await db.refresh(mapping)
            
            return mapping
            
        except Exception as e:
            await db.rollback()
            raise DataTransformationError(f"Failed to create mapping: {str(e)}")
    
    async def transform_data(
        self,
        transformation_request: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Transform data using mapping rules"""
        mapping_id = transformation_request.get("mapping_id")
        source_data = transformation_request.get("source_data")
        
        if not mapping_id or not source_data:
            raise DataTransformationError("Missing mapping_id or source_data")
        
        # Get mapping
        result = await db.execute(
            select(DataMapping).where(DataMapping.id == mapping_id)
        )
        mapping = result.scalar_one_or_none()
        
        if not mapping:
            raise DataTransformationError("Mapping not found")
        
        try:
            start_time = datetime.utcnow()
            
            # Apply field mappings
            transformed_data = {}
            for source_field, target_field in mapping.field_mappings.items():
                if source_field in source_data:
                    transformed_data[target_field] = source_data[source_field]
            
            # Apply transformation rules
            for field, rule in mapping.transformation_rules.items():
                if field in transformed_data:
                    transformed_data[field] = await self._apply_transformation_rule(
                        transformed_data[field], rule
                    )
            
            # Apply validation rules
            validation_errors = []
            for field, rule in mapping.validation_rules.items():
                if field in transformed_data:
                    is_valid, error = await self._apply_validation_rule(
                        transformed_data[field], rule
                    )
                    if not is_valid:
                        validation_errors.append(f"{field}: {error}")
            
            end_time = datetime.utcnow()
            transformation_time = int((end_time - start_time).total_seconds() * 1000)
            
            # Record transformation statistics
            mapping.record_transformation(len(validation_errors) == 0)
            await db.commit()
            
            return {
                "transformed_data": transformed_data,
                "validation_errors": validation_errors,
                "transformation_time_ms": transformation_time,
                "timestamp": end_time.isoformat()
            }
            
        except Exception as e:
            mapping.record_transformation(False)
            await db.commit()
            raise DataTransformationError(f"Transformation failed: {str(e)}")
    
    async def _apply_transformation_rule(self, value: Any, rule: Dict[str, Any]) -> Any:
        """Apply transformation rule to value"""
        rule_type = rule.get("type")
        
        if rule_type == "uppercase":
            return str(value).upper()
        elif rule_type == "lowercase":
            return str(value).lower()
        elif rule_type == "format_date":
            # Parse and reformat date
            from dateutil import parser
            parsed_date = parser.parse(str(value))
            return parsed_date.strftime(rule.get("format", "%Y-%m-%d"))
        elif rule_type == "replace":
            return str(value).replace(rule.get("from", ""), rule.get("to", ""))
        else:
            return value  # No transformation
    
    async def _apply_validation_rule(
        self, 
        value: Any, 
        rule: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """Apply validation rule to value"""
        rule_type = rule.get("type")
        
        if rule_type == "required":
            if not value or (isinstance(value, str) and not value.strip()):
                return False, "Field is required"
        elif rule_type == "max_length":
            max_len = rule.get("max", 255)
            if len(str(value)) > max_len:
                return False, f"Value exceeds maximum length of {max_len}"
        elif rule_type == "regex":
            import re
            pattern = rule.get("pattern")
            if pattern and not re.match(pattern, str(value)):
                return False, f"Value does not match required pattern"
        
        return True, None

# External API Client Utilities

class ExternalAPIClient:
    """Client for external API integrations"""
    
    def __init__(self):
        self.session = aiohttp.ClientSession()
    
    async def connect_system(
        self,
        connector_type: str,
        config: Dict[str, Any],
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Connect to external system"""
        try:
            if connector_type == "forensic_tools":
                return await self._connect_forensic_tool(config)
            elif connector_type == "databases":
                return await self._connect_database(config)
            elif connector_type == "law_enforcement":
                return await self._connect_law_enforcement(config)
            else:
                raise IntegrationError(f"Unsupported connector type: {connector_type}")
                
        except Exception as e:
            raise IntegrationError(f"Failed to connect to {connector_type}: {str(e)}")
    
    async def _connect_forensic_tool(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Connect to forensic tool"""
        # Implement forensic tool connection logic
        return {
            "status": "connected",
            "tool_version": "9.0",
            "capabilities": ["extract", "analyze", "report"],
            "connection_time": datetime.utcnow().isoformat()
        }
    
    async def _connect_database(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Connect to database system"""
        # Implement database connection logic
        return {
            "status": "connected",
            "database_type": config.get("type", "unknown"),
            "capabilities": ["query", "search"],
            "connection_time": datetime.utcnow().isoformat()
        }
    
    async def _connect_law_enforcement(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Connect to law enforcement system"""
        # Implement law enforcement system connection logic
        return {
            "status": "connected",
            "system_type": config.get("system", "unknown"),
            "capabilities": ["query", "alert", "notice"],
            "connection_time": datetime.utcnow().isoformat()
        }
    
    async def create_sync_job(
        self,
        connector_type: str,
        sync_config: Dict[str, Any],
        user_id: str,
        db: AsyncSession
    ) -> SyncJob:
        """Create synchronization job"""
        try:
            # Find or create integration for this connector
            system_identifier = f"{connector_type}_{user_id}"
            
            result = await db.execute(
                select(Integration).where(Integration.system_identifier == system_identifier)
            )
            integration = result.scalar_one_or_none()
            
            if not integration:
                # Create minimal integration for sync job
                integration = Integration(
                    name=f"{connector_type.title()} Sync",
                    integration_type="api",
                    system_identifier=system_identifier,
                    config=sync_config,
                    created_by=user_id
                )
                db.add(integration)
                await db.flush()
            
            # Create sync job
            sync_job = SyncJob(
                integration_id=integration.id,
                connector_type=connector_type,
                sync_direction=sync_config.get("direction", "import"),
                entity_types=sync_config.get("entity_types", []),
                sync_filters=sync_config.get("filters", {}),
                created_by=user_id
            )
            
            db.add(sync_job)
            await db.commit()
            await db.refresh(sync_job)
            
            return sync_job
            
        except Exception as e:
            await db.rollback()
            raise IntegrationError(f"Failed to create sync job: {str(e)}")
    
    async def process_sync_job(self, job_id: str, db: AsyncSession):
        """Process synchronization job in background"""
        result = await db.execute(
            select(SyncJob).where(SyncJob.id == job_id)
        )
        sync_job = result.scalar_one_or_none()
        
        if not sync_job:
            return
        
        try:
            sync_job.start_processing()
            await db.commit()
            
            # Simulate sync processing
            await asyncio.sleep(2)  # Simulate processing time
            
            # Update progress
            sync_job.update_progress(
                processed=100,
                created=50,
                updated=30,
                failed=20
            )
            
            sync_job.complete_processing()
            await db.commit()
            
            logger.info(f"Sync job {job_id} completed successfully")
            
        except Exception as e:
            sync_job.mark_failed(str(e))
            await db.commit()
            logger.error(f"Sync job {job_id} failed: {str(e)}")

# Integration Monitoring Utilities

class IntegrationMonitor:
    """Monitor integration health and performance"""
    
    async def get_overall_health(self, db: AsyncSession) -> Dict[str, Any]:
        """Get overall integration health status"""
        # Get integration counts by status
        result = await db.execute(
            select(
                func.count(Integration.id).label("total"),
                func.count(Integration.id).filter(Integration.is_active == True).label("active"),
                func.count(Integration.id).filter(Integration.status == "error").label("failed")
            )
        )
        counts = result.first()
        
        # Calculate average response time
        result = await db.execute(
            select(func.avg(Integration.average_response_time))
            .where(Integration.is_active == True)
        )
        avg_response_time = result.scalar() or 0.0
        
        # Calculate error rate (last 24h)
        yesterday = datetime.utcnow() - timedelta(days=1)
        result = await db.execute(
            select(
                func.count(IntegrationLog.id).label("total_logs"),
                func.count(IntegrationLog.id).filter(IntegrationLog.level == "error").label("error_logs")
            ).where(IntegrationLog.timestamp >= yesterday)
        )
        log_counts = result.first()
        
        error_rate = 0.0
        if log_counts.total_logs > 0:
            error_rate = (log_counts.error_logs / log_counts.total_logs) * 100
        
        # Determine overall status
        overall_status = "healthy"
        if counts.failed > 0:
            if counts.failed / counts.total > 0.1:  # >10% failed
                overall_status = "critical"
            else:
                overall_status = "warning"
        
        return {
            "overall_status": overall_status,
            "total_integrations": counts.total,
            "active_integrations": counts.active,
            "failed_integrations": counts.failed,
            "average_response_time": round(avg_response_time, 2),
            "error_rate_24h": round(error_rate, 2),
            "last_check": datetime.utcnow(),
            "issues": []  # Would populate with specific issues
        }
    
    async def get_metrics(
        self,
        timeframe: str = "24h",
        integration_id: Optional[str] = None,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get integration metrics"""
        # Parse timeframe
        timeframe_hours = {
            "1h": 1,
            "24h": 24,
            "7d": 168,
            "30d": 720
        }
        
        hours = timeframe_hours.get(timeframe, 24)
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Base query
        query = select(IntegrationLog).where(IntegrationLog.timestamp >= start_time)
        
        if integration_id:
            query = query.where(IntegrationLog.integration_id == integration_id)
        
        result = await db.execute(query)
        logs = result.scalars().all()
        
        # Calculate metrics
        total_requests = len(logs)
        successful_requests = len([l for l in logs if l.level not in ["error", "critical"]])
        failed_requests = total_requests - successful_requests
        
        response_times = [l.response_time_ms for l in logs if l.response_time_ms]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        min_response_time = min(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0
        
        error_rate = (failed_requests / max(total_requests, 1)) * 100
        uptime_percentage = 100 - error_rate
        
        return {
            "timeframe": timeframe,
            "integration_id": integration_id,
            "total_requests": total_requests,
            "successful_requests": successful_requests,
            "failed_requests": failed_requests,
            "average_response_time": round(avg_response_time, 2),
            "min_response_time": min_response_time,
            "max_response_time": max_response_time,
            "error_rate": round(error_rate, 2),
            "uptime_percentage": round(uptime_percentage, 2),
            "data_points": [],  # Would populate with time series data
            "top_errors": []    # Would populate with common errors
        }
    
    async def get_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        level: Optional[str] = None,
        integration_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        db: AsyncSession
    ) -> List[IntegrationLog]:
        """Get integration logs with filtering"""
        query = select(IntegrationLog).offset(skip).limit(limit)
        
        filters = []
        if level:
            filters.append(IntegrationLog.level == level)
        if integration_id:
            filters.append(IntegrationLog.integration_id == integration_id)
        if start_date:
            filters.append(IntegrationLog.timestamp >= start_date)
        if end_date:
            filters.append(IntegrationLog.timestamp <= end_date)
        
        if filters:
            query = query.where(and_(*filters))
        
        query = query.order_by(IntegrationLog.timestamp.desc())
        
        result = await db.execute(query)
        return result.scalars().all()

# Global utility instances
integration_manager = IntegrationManager()
webhook_handler = WebhookHandler()
data_transformer = DataTransformer()
external_api_client = ExternalAPIClient()
integration_monitor = IntegrationMonitor()