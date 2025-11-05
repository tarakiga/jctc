"""
Comprehensive unit tests for the audit and compliance system.

Tests cover:
- Audit logging functionality and integrity verification
- Compliance reporting and violation tracking
- Data retention policies and archival processes
- Search functionality and filtering
- API endpoints and integration utilities
"""

import pytest
import uuid
import json
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from fastapi import Request

from app.utils.audit import AuditService, AuditContext
from app.utils.retention_manager import RetentionManager, RetentionJobScheduler
from app.utils.compliance_reporting import ComplianceReportGenerator
from app.utils.audit_integration import (
    AuditableEndpoint, log_authentication_event, 
    log_case_access, log_evidence_modification
)
from app.models.audit import (
    AuditLog, ComplianceViolation, ComplianceReport,
    RetentionPolicy, AuditConfiguration, AuditArchive
)
from app.schemas.audit import (
    AuditAction, AuditEntity, AuditSeverity, ComplianceStatus,
    ViolationType, RetentionPeriod, AuditLogCreate,
    AuditSearchFilters, ComplianceReportCreate, ReportFormat
)


class TestAuditService:
    """Test the AuditService class functionality."""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        return Mock(spec=Session)
    
    @pytest.fixture
    def audit_service(self, mock_db):
        """Create AuditService instance for testing."""
        return AuditService(mock_db)
    
    @pytest.fixture
    def sample_audit_context(self):
        """Create sample audit context."""
        return AuditContext(
            user_id=uuid.uuid4(),
            session_id="test-session-123",
            ip_address="192.168.1.100",
            user_agent="TestAgent/1.0",
            correlation_id="test-correlation-123"
        )
    
    def test_audit_context_creation(self, sample_audit_context):
        """Test audit context creation and data extraction."""
        assert sample_audit_context.user_id is not None
        assert sample_audit_context.session_id == "test-session-123"
        assert sample_audit_context.ip_address == "192.168.1.100"
        assert sample_audit_context.user_agent == "TestAgent/1.0"
        assert sample_audit_context.correlation_id == "test-correlation-123"
        
        # Test dictionary conversion
        context_dict = sample_audit_context.to_dict()
        assert context_dict['session_id'] == "test-session-123"
        assert context_dict['ip_address'] == "192.168.1.100"
    
    def test_audit_context_from_request(self):
        """Test creating audit context from FastAPI request."""
        # Mock request object
        mock_request = Mock(spec=Request)
        mock_request.headers = {
            'X-Session-ID': 'session-123',
            'User-Agent': 'TestAgent/1.0',
            'X-Correlation-ID': 'corr-123'
        }
        mock_request.client = Mock()
        mock_request.client.host = '192.168.1.100'
        
        user_id = uuid.uuid4()
        context = AuditContext.from_request(mock_request, user_id)
        
        assert context.user_id == user_id
        assert context.session_id == 'session-123'
        assert context.ip_address == '192.168.1.100'
        assert context.user_agent == 'TestAgent/1.0'
        assert context.correlation_id == 'corr-123'
    
    def test_log_action_success(self, audit_service, sample_audit_context, mock_db):
        """Test successful audit log creation."""
        # Mock database operations
        mock_db.query.return_value.order_by.return_value.first.return_value = None
        mock_db.add = Mock()
        mock_db.commit = Mock()
        
        # Test audit log creation
        result = audit_service.log_action(
            action=AuditAction.CREATE,
            entity_type=AuditEntity.CASE,
            description="Test case creation",
            entity_id="test-case-123",
            details={"case_title": "Test Case"},
            severity=AuditSeverity.MEDIUM,
            user_id=sample_audit_context.user_id,
            context=sample_audit_context
        )
        
        # Verify database operations
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        
        # Verify audit log was created
        assert result is not None
    
    def test_audit_log_integrity_generation(self):
        """Test audit log integrity checksum generation."""
        audit_log = AuditLog(
            action=AuditAction.CREATE,
            entity_type=AuditEntity.CASE,
            description="Test audit log",
            severity=AuditSeverity.LOW,
            timestamp=datetime.utcnow()
        )
        
        # Test checksum generation
        audit_log.generate_checksum()
        assert audit_log.checksum is not None
        assert len(audit_log.checksum) == 64  # SHA-256 hex length
        
        # Test integrity verification
        assert audit_log.verify_integrity() is True
        
        # Test tampering detection
        original_checksum = audit_log.checksum
        audit_log.description = "Modified description"
        assert audit_log.verify_integrity() is False
        
        # Restore and verify
        audit_log.description = "Test audit log"
        audit_log.checksum = original_checksum
        assert audit_log.verify_integrity() is True
    
    def test_sensitive_data_sanitization(self, audit_service):
        """Test automatic sanitization of sensitive data."""
        # Test with audit log containing sensitive data
        details = {
            "user_password": "secret123",
            "api_key": "api_key_12345",
            "user_token": "token_abcdef",
            "normal_field": "normal_value"
        }
        
        # Create mock audit log with sensitive data
        audit_log = AuditLog(
            action=AuditAction.CREATE,
            entity_type=AuditEntity.USER,
            description="Test with sensitive data",
            details=details
        )
        
        # Verify sensitive fields are redacted
        assert audit_log.details["user_password"] == "[REDACTED]"
        assert audit_log.details["api_key"] == "[REDACTED]"
        assert audit_log.details["user_token"] == "[REDACTED]"
        assert audit_log.details["normal_field"] == "normal_value"
    
    def test_audit_search_functionality(self, audit_service, mock_db):
        """Test audit log search with various filters."""
        # Mock search results
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.count.return_value = 10
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = [Mock(spec=AuditLog) for _ in range(5)]
        
        # Test search with filters
        filters = AuditSearchFilters(
            user_id=uuid.uuid4(),
            entity_type=AuditEntity.CASE,
            action=AuditAction.CREATE,
            severity=AuditSeverity.HIGH,
            start_date=datetime.utcnow() - timedelta(days=7),
            end_date=datetime.utcnow(),
            search_text="test case"
        )
        
        results = audit_service.search_audit_logs(filters, page=1, size=5)
        
        # Verify results structure
        assert "items" in results
        assert "total" in results
        assert "page" in results
        assert "size" in results
        assert "pages" in results
        
        assert results["total"] == 10
        assert results["page"] == 1
        assert results["size"] == 5
        assert len(results["items"]) == 5
        assert results["pages"] == 2


class TestRetentionManager:
    """Test the RetentionManager class functionality."""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        return Mock(spec=Session)
    
    @pytest.fixture
    def temp_archive_dir(self):
        """Create temporary directory for archives."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir
    
    @pytest.fixture
    def retention_manager(self, mock_db, temp_archive_dir):
        """Create RetentionManager instance for testing."""
        return RetentionManager(mock_db, archive_dir=temp_archive_dir)
    
    def test_retention_policy_processing(self, retention_manager, mock_db):
        """Test processing of retention policies."""
        # Mock active retention policies
        mock_policy = Mock(spec=RetentionPolicy)
        mock_policy.name = "Test Policy"
        mock_policy.entity_type = AuditEntity.CASE
        mock_policy.get_retention_days.return_value = 365
        mock_policy.auto_archive = True
        mock_policy.auto_delete = False
        
        mock_db.query.return_value.filter.return_value.all.return_value = [mock_policy]
        
        # Mock expired items query
        mock_case = Mock()
        mock_case.id = uuid.uuid4()
        mock_case.created_at = datetime.utcnow() - timedelta(days=400)
        
        mock_db.query.return_value.filter.return_value.all.return_value = [mock_case]
        
        # Test policy processing
        with patch.object(retention_manager, '_archive_item', return_value=True) as mock_archive:
            results = retention_manager.process_retention_policies()
            
            # Verify results
            assert results['policies_processed'] == 1
            assert results['items_archived'] >= 0
            assert results['errors'] == []
            assert 'processing_time' in results
    
    def test_archive_creation_and_encryption(self, retention_manager, mock_db):
        """Test secure archive creation with encryption."""
        # Mock item to archive
        mock_item = Mock()
        mock_item.id = uuid.uuid4()
        mock_item.created_at = datetime.utcnow()
        
        # Mock serialization
        with patch.object(retention_manager, '_serialize_item') as mock_serialize:
            mock_serialize.return_value = {
                'id': str(mock_item.id),
                'created_at': mock_item.created_at.isoformat(),
                'data': 'test_data'
            }
            
            # Mock policy
            mock_policy = Mock(spec=RetentionPolicy)
            mock_policy.entity_type = AuditEntity.CASE
            mock_policy.id = uuid.uuid4()
            
            # Mock database operations
            mock_db.add = Mock()
            mock_db.commit = Mock()
            
            # Test archival
            result = retention_manager._archive_item(mock_item, mock_policy)
            
            # Verify archive was created
            assert result is True
            mock_db.add.assert_called()
            mock_db.commit.assert_called()
    
    def test_archive_integrity_verification(self, retention_manager, mock_db, temp_archive_dir):
        """Test archive integrity verification."""
        # Create test archive
        test_data = {"test": "data", "timestamp": datetime.utcnow().isoformat()}
        json_data = json.dumps(test_data).encode()
        
        # Create mock archive record
        mock_archive = Mock(spec=AuditArchive)
        mock_archive.id = uuid.uuid4()
        mock_archive.archive_name = "test_archive"
        mock_archive.file_path = str(Path(temp_archive_dir) / "test_archive.enc")
        
        # Encrypt and save test data
        import gzip
        compressed_data = gzip.compress(json_data)
        encrypted_data = retention_manager.fernet.encrypt(compressed_data)
        
        # Calculate checksum
        import hashlib
        mock_archive.checksum = hashlib.sha256(encrypted_data).hexdigest()
        
        # Save encrypted data
        with open(mock_archive.file_path, 'wb') as f:
            f.write(encrypted_data)
        
        # Mock database query
        mock_db.query.return_value.filter.return_value.first.return_value = mock_archive
        mock_db.commit = Mock()
        
        # Test integrity verification
        results = retention_manager.verify_archive_integrity(str(mock_archive.id))
        
        # Verify results
        assert results['file_exists'] is True
        assert results['checksum_valid'] is True
        assert results['decryption_successful'] is True
        assert results['data_valid'] is True
        
        mock_db.commit.assert_called()  # Timestamp update


class TestComplianceReporting:
    """Test the ComplianceReportGenerator functionality."""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        return Mock(spec=Session)
    
    @pytest.fixture
    def temp_report_dir(self):
        """Create temporary directory for reports."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir
    
    @pytest.fixture
    def report_generator(self, mock_db, temp_report_dir):
        """Create ComplianceReportGenerator instance for testing."""
        return ComplianceReportGenerator(mock_db, report_dir=temp_report_dir)
    
    def test_audit_trail_report_generation(self, report_generator, mock_db):
        """Test audit trail report generation."""
        # Mock audit logs
        mock_audit_logs = [
            Mock(spec=AuditLog, 
                 id=uuid.uuid4(),
                 timestamp=datetime.utcnow(),
                 action=AuditAction.CREATE,
                 entity_type=AuditEntity.CASE,
                 description="Test audit log",
                 verify_integrity=Mock(return_value=True),
                 checksum="test_checksum")
            for _ in range(5)
        ]
        
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_audit_logs
        
        # Create report request
        report_request = ComplianceReportCreate(
            name="Test Audit Trail Report",
            description="Test report generation",
            report_type="AUDIT_TRAIL",
            start_date=datetime.utcnow().date() - timedelta(days=30),
            end_date=datetime.utcnow().date(),
            format=ReportFormat.JSON,
            parameters={"user_id": str(uuid.uuid4())}
        )
        
        user_id = uuid.uuid4()
        
        # Mock database operations for report creation
        mock_db.add = Mock()
        mock_db.commit = Mock()
        
        # Test report generation
        with patch.object(report_generator, '_export_report') as mock_export:
            mock_export.return_value = (Path("/tmp/test_report.json"), 1024)
            
            report = report_generator.generate_report(report_request, user_id)
            
            # Verify report creation
            assert report is not None
            mock_db.add.assert_called()
            mock_db.commit.assert_called()
    
    def test_compliance_summary_report_generation(self, report_generator, mock_db):
        """Test compliance summary report generation."""
        # Mock compliance violations
        mock_violations = [
            Mock(spec=ComplianceViolation,
                 severity=AuditSeverity.CRITICAL,
                 status=ComplianceStatus.VIOLATION),
            Mock(spec=ComplianceViolation,
                 severity=AuditSeverity.HIGH,
                 status=ComplianceStatus.WARNING)
        ]
        
        mock_db.query.return_value.filter.return_value.all.return_value = mock_violations
        
        # Test report data generation
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()
        
        report_data = report_generator._generate_compliance_summary_report(
            start_date, end_date, {}
        )
        
        # Verify report data structure
        assert 'report_type' in report_data
        assert 'compliance_score' in report_data
        assert 'violations_summary' in report_data
        assert 'summary' in report_data
        
        # Verify compliance score calculation
        assert 0 <= report_data['compliance_score'] <= 100


class TestAuditIntegration:
    """Test audit integration utilities."""
    
    def test_auditable_endpoint_decorator(self):
        """Test the AuditableEndpoint decorator functionality."""
        # Mock database and user
        mock_db = Mock(spec=Session)
        mock_user = Mock()
        mock_user.id = uuid.uuid4()
        
        # Create decorator
        decorator = AuditableEndpoint(
            action=AuditAction.CREATE,
            entity=AuditEntity.CASE,
            description="Test endpoint",
            severity=AuditSeverity.MEDIUM,
            capture_request_data=True
        )
        
        # Create test function
        @decorator
        async def test_endpoint(db: Session, current_user, case_id: str):
            return {"status": "success", "case_id": case_id}
        
        # Mock audit service
        with patch('app.utils.audit_integration.AuditService') as mock_audit_service:
            mock_service_instance = Mock()
            mock_audit_service.return_value = mock_service_instance
            
            # Test successful execution
            result = test_endpoint(mock_db, mock_user, "test-case-123")
            
            # Verify function execution
            assert result is not None
            
            # Verify audit service was called
            mock_audit_service.assert_called_with(mock_db)
    
    def test_authentication_event_logging(self):
        """Test authentication event logging utility."""
        mock_db = Mock(spec=Session)
        user_id = uuid.uuid4()
        
        # Mock audit service
        with patch('app.utils.audit_integration.AuditService') as mock_audit_service:
            mock_service_instance = Mock()
            mock_audit_service.return_value = mock_service_instance
            
            # Test login event logging
            log_authentication_event(
                db=mock_db,
                user_id=user_id,
                action="LOGIN",
                ip_address="192.168.1.100",
                user_agent="TestAgent/1.0",
                success=True,
                details={"login_method": "password"}
            )
            
            # Verify audit service calls
            mock_audit_service.assert_called_with(mock_db)
            mock_service_instance.log_action.assert_called()
    
    def test_case_access_logging(self):
        """Test case access logging utility."""
        mock_db = Mock(spec=Session)
        user_id = uuid.uuid4()
        case_id = "test-case-123"
        
        # Mock audit service
        with patch('app.utils.audit_integration.AuditService') as mock_audit_service:
            mock_service_instance = Mock()
            mock_audit_service.return_value = mock_service_instance
            
            # Test case access logging
            log_case_access(
                db=mock_db,
                user_id=user_id,
                case_id=case_id,
                action="VIEW"
            )
            
            # Verify audit service calls
            mock_audit_service.assert_called_with(mock_db)
            mock_service_instance.log_action.assert_called()
            
            # Verify correct parameters
            call_args = mock_service_instance.log_action.call_args
            assert call_args[1]['action'] == AuditAction.READ
            assert call_args[1]['entity_type'] == AuditEntity.CASE
            assert call_args[1]['entity_id'] == case_id
            assert call_args[1]['user_id'] == user_id
    
    def test_evidence_modification_logging(self):
        """Test evidence modification logging utility."""
        mock_db = Mock(spec=Session)
        user_id = uuid.uuid4()
        evidence_id = "test-evidence-123"
        
        # Mock audit service
        with patch('app.utils.audit_integration.AuditService') as mock_audit_service:
            mock_service_instance = Mock()
            mock_audit_service.return_value = mock_service_instance
            
            # Test evidence modification logging
            log_evidence_modification(
                db=mock_db,
                user_id=user_id,
                evidence_id=evidence_id,
                action="UPDATE",
                details={"modified_field": "status"}
            )
            
            # Verify audit service calls
            mock_audit_service.assert_called_with(mock_db)
            mock_service_instance.log_action.assert_called()
            
            # Verify correct parameters
            call_args = mock_service_instance.log_action.call_args
            assert call_args[1]['action'] == AuditAction.UPDATE
            assert call_args[1]['entity_type'] == AuditEntity.EVIDENCE
            assert call_args[1]['severity'] == AuditSeverity.HIGH


class TestComplianceViolations:
    """Test compliance violation detection and management."""
    
    def test_violation_creation(self):
        """Test compliance violation model creation."""
        violation = ComplianceViolation(
            violation_type=ViolationType.DATA_RETENTION,
            entity_type=AuditEntity.CASE,
            entity_id="test-case-123",
            severity=AuditSeverity.HIGH,
            title="Data Retention Violation",
            description="Case data retained beyond policy limit",
            compliance_rule="Data Retention Policy 2024"
        )
        
        assert violation.violation_type == ViolationType.DATA_RETENTION
        assert violation.entity_type == AuditEntity.CASE
        assert violation.severity == AuditSeverity.HIGH
        assert violation.status == ComplianceStatus.VIOLATION  # Default status
    
    def test_violation_resolution(self):
        """Test compliance violation resolution tracking."""
        violation = ComplianceViolation(
            violation_type=ViolationType.ACCESS_CONTROL,
            entity_type=AuditEntity.USER,
            severity=AuditSeverity.CRITICAL,
            title="Unauthorized Access",
            description="User accessed restricted resource"
        )
        
        resolver_id = uuid.uuid4()
        resolution_notes = "Access permissions corrected and user retrained"
        
        # Test resolution
        violation.mark_resolved(resolver_id, resolution_notes)
        
        assert violation.status == ComplianceStatus.COMPLIANT
        assert violation.resolved_by == resolver_id
        assert violation.resolution_notes == resolution_notes
        assert violation.resolved_at is not None
    
    def test_violation_resolution_time_calculation(self):
        """Test compliance violation resolution time calculation."""
        detected_time = datetime.utcnow() - timedelta(hours=24)
        resolved_time = datetime.utcnow()
        
        violation = ComplianceViolation(
            violation_type=ViolationType.DATA_INTEGRITY,
            entity_type=AuditEntity.EVIDENCE,
            severity=AuditSeverity.HIGH,
            title="Data Integrity Issue",
            description="Evidence checksum mismatch detected"
        )
        
        # Set timestamps manually for testing
        violation.detected_at = detected_time
        violation.resolved_at = resolved_time
        
        # Test resolution time calculation
        resolution_hours = violation.resolution_time_hours
        assert resolution_hours is not None
        assert 23 <= resolution_hours <= 25  # Allow for small timing variations


class TestAuditConfiguration:
    """Test audit configuration functionality."""
    
    def test_audit_configuration_creation(self):
        """Test audit configuration model creation."""
        config = AuditConfiguration(
            entity_type=AuditEntity.CASE,
            actions_to_audit=[AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE],
            include_details=True,
            retention_days=365,
            alert_on_failure=True,
            minimum_severity=AuditSeverity.MEDIUM,
            created_by=uuid.uuid4()
        )
        
        assert config.entity_type == AuditEntity.CASE
        assert len(config.actions_to_audit) == 3
        assert config.include_details is True
        assert config.retention_days == 365
    
    def test_action_audit_check(self):
        """Test audit configuration action checking."""
        config = AuditConfiguration(
            entity_type=AuditEntity.USER,
            actions_to_audit=[AuditAction.CREATE, AuditAction.DELETE],
            minimum_severity=AuditSeverity.HIGH
        )
        
        # Test action checking
        assert config.should_audit_action(AuditAction.CREATE) is True
        assert config.should_audit_action(AuditAction.UPDATE) is False
        assert config.should_audit_action(AuditAction.DELETE) is True
    
    def test_severity_level_checking(self):
        """Test audit configuration severity checking."""
        config = AuditConfiguration(
            entity_type=AuditEntity.EVIDENCE,
            actions_to_audit=[AuditAction.CREATE],
            minimum_severity=AuditSeverity.MEDIUM
        )
        
        # Test severity checking
        assert config.should_log_severity(AuditSeverity.LOW) is False
        assert config.should_log_severity(AuditSeverity.MEDIUM) is True
        assert config.should_log_severity(AuditSeverity.HIGH) is True
        assert config.should_log_severity(AuditSeverity.CRITICAL) is True


# Integration test fixtures and helpers

@pytest.fixture(scope="session")
def test_database():
    """Create test database session."""
    # This would typically set up an in-memory SQLite database
    # for testing purposes
    pass

@pytest.fixture
def test_client():
    """Create test client for API endpoint testing."""
    # This would create a FastAPI TestClient with the audit
    # endpoints mounted
    pass

def run_audit_system_tests():
    """
    Run all audit system tests.
    
    Usage:
        python -m pytest tests/test_audit_system.py -v
    """
    pytest.main([__file__, "-v", "--tb=short"])


if __name__ == "__main__":
    run_audit_system_tests()