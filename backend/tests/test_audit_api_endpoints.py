"""
Integration tests for audit and compliance API endpoints.

Tests the FastAPI endpoints for:
- Audit log search, details, and export
- Compliance report generation and management
- Violation tracking and resolution
- Data retention policy management
- Audit configuration
- Dashboard statistics
"""

import pytest
import uuid
import json
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from fastapi import status
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch

from app.main import app  # Assuming the main FastAPI app
from app.models.audit import AuditLog, ComplianceReport, ComplianceViolation, RetentionPolicy
from app.schemas.audit import (
    AuditAction, AuditEntity, AuditSeverity, ComplianceStatus,
    AuditLogCreate, AuditSearchFilters, ComplianceReportCreate,
    ReportFormat, RetentionPolicyCreate
)
from app.core.deps import get_db, get_current_user
from app.core.permissions import check_audit_permissions


class TestAuditAPIEndpoints:
    """Test audit-related API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client with overridden dependencies."""
        # Mock database dependency
        def override_get_db():
            return Mock(spec=Session)
        
        # Mock user dependency
        def override_get_current_user():
            mock_user = Mock()
            mock_user.id = uuid.uuid4()
            mock_user.email = "test@example.com"
            mock_user.is_admin = True
            return mock_user
        
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        return TestClient(app)
    
    def test_search_audit_logs_success(self, client):
        """Test successful audit log search."""
        # Mock audit service search results
        mock_results = {
            "items": [
                {
                    "id": str(uuid.uuid4()),
                    "timestamp": datetime.utcnow().isoformat(),
                    "action": "CREATE",
                    "entity_type": "CASE",
                    "description": "Test audit log",
                    "severity": "MEDIUM",
                    "user_id": str(uuid.uuid4())
                }
            ],
            "total": 1,
            "page": 1,
            "size": 20,
            "pages": 1
        }
        
        with patch('app.api.v1.endpoints.audit.AuditService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.search_audit_logs.return_value = mock_results
            mock_service.return_value = mock_service_instance
            
            response = client.get("/api/v1/audit/logs/search", params={
                "entity_type": "CASE",
                "action": "CREATE",
                "page": 1,
                "size": 20
            })
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "items" in data
            assert "total" in data
            assert data["total"] == 1
    
    def test_get_audit_log_details_success(self, client):
        """Test retrieving specific audit log details."""
        audit_id = uuid.uuid4()
        mock_audit_log = Mock(spec=AuditLog)
        mock_audit_log.id = audit_id
        mock_audit_log.timestamp = datetime.utcnow()
        mock_audit_log.action = AuditAction.CREATE
        mock_audit_log.entity_type = AuditEntity.CASE
        mock_audit_log.description = "Test audit log"
        mock_audit_log.verify_integrity.return_value = True
        
        with patch('app.api.v1.endpoints.audit.AuditService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_audit_log.return_value = mock_audit_log
            mock_service.return_value = mock_service_instance
            
            response = client.get(f"/api/v1/audit/logs/{audit_id}")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert str(data["id"]) == str(audit_id)
    
    def test_get_audit_log_not_found(self, client):
        """Test retrieving non-existent audit log."""
        audit_id = uuid.uuid4()
        
        with patch('app.api.v1.endpoints.audit.AuditService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_audit_log.return_value = None
            mock_service.return_value = mock_service_instance
            
            response = client.get(f"/api/v1/audit/logs/{audit_id}")
            
            assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_verify_audit_integrity_success(self, client):
        """Test audit log integrity verification."""
        with patch('app.api.v1.endpoints.audit.AuditService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.verify_integrity.return_value = {
                "total_logs": 100,
                "verified_logs": 100,
                "failed_logs": 0,
                "integrity_score": 100.0,
                "verification_time": datetime.utcnow().isoformat()
            }
            mock_service.return_value = mock_service_instance
            
            response = client.post("/api/v1/audit/logs/verify-integrity")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["integrity_score"] == 100.0
    
    def test_export_audit_logs_success(self, client):
        """Test audit log export functionality."""
        export_request = {
            "start_date": (datetime.utcnow() - timedelta(days=30)).date().isoformat(),
            "end_date": datetime.utcnow().date().isoformat(),
            "format": "JSON",
            "filters": {
                "entity_type": "CASE"
            }
        }
        
        with patch('app.api.v1.endpoints.audit.AuditService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.export_audit_logs.return_value = "export-task-123"
            mock_service.return_value = mock_service_instance
            
            response = client.post("/api/v1/audit/logs/export", json=export_request)
            
            assert response.status_code == status.HTTP_202_ACCEPTED
            data = response.json()
            assert "task_id" in data
    
    def test_get_audit_statistics_success(self, client):
        """Test audit statistics retrieval."""
        with patch('app.api.v1.endpoints.audit.AuditService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.get_audit_statistics.return_value = {
                "total_logs": 1000,
                "logs_by_severity": {"HIGH": 50, "MEDIUM": 300, "LOW": 650},
                "logs_by_entity": {"CASE": 500, "USER": 300, "EVIDENCE": 200},
                "recent_activity": 25,
                "integrity_status": {"verified": 1000, "failed": 0}
            }
            mock_service.return_value = mock_service_instance
            
            response = client.get("/api/v1/audit/statistics")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["total_logs"] == 1000
            assert "logs_by_severity" in data
            assert "integrity_status" in data


class TestComplianceAPIEndpoints:
    """Test compliance-related API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client with overridden dependencies."""
        def override_get_db():
            return Mock(spec=Session)
        
        def override_get_current_user():
            mock_user = Mock()
            mock_user.id = uuid.uuid4()
            mock_user.email = "test@example.com"
            mock_user.is_admin = True
            return mock_user
        
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        return TestClient(app)
    
    def test_create_compliance_report_success(self, client):
        """Test successful compliance report creation."""
        report_request = {
            "name": "Monthly Compliance Report",
            "description": "Monthly audit trail and compliance summary",
            "report_type": "AUDIT_TRAIL",
            "start_date": (datetime.utcnow() - timedelta(days=30)).date().isoformat(),
            "end_date": datetime.utcnow().date().isoformat(),
            "format": "JSON",
            "parameters": {"user_id": str(uuid.uuid4())}
        }
        
        mock_report = Mock(spec=ComplianceReport)
        mock_report.id = uuid.uuid4()
        mock_report.name = report_request["name"]
        mock_report.status = "PENDING"
        
        with patch('app.api.v1.endpoints.audit.ComplianceReportGenerator') as mock_generator:
            mock_generator_instance = Mock()
            mock_generator_instance.generate_report.return_value = mock_report
            mock_generator.return_value = mock_generator_instance
            
            response = client.post("/api/v1/audit/compliance/reports", json=report_request)
            
            assert response.status_code == status.HTTP_201_CREATED
            data = response.json()
            assert data["name"] == report_request["name"]
            assert data["status"] == "PENDING"
    
    def test_list_compliance_reports_success(self, client):
        """Test listing compliance reports."""
        mock_reports = [
            Mock(spec=ComplianceReport, 
                 id=uuid.uuid4(),
                 name="Report 1",
                 created_at=datetime.utcnow(),
                 status="COMPLETED"),
            Mock(spec=ComplianceReport,
                 id=uuid.uuid4(),
                 name="Report 2",
                 created_at=datetime.utcnow(),
                 status="PENDING")
        ]
        
        with patch('app.api.v1.endpoints.audit.db') as mock_db:
            mock_db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_reports
            mock_db.query.return_value.filter.return_value.count.return_value = 2
            
            response = client.get("/api/v1/audit/compliance/reports")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "items" in data
            assert "total" in data
            assert data["total"] == 2
    
    def test_download_compliance_report_success(self, client):
        """Test compliance report download."""
        report_id = uuid.uuid4()
        
        with patch('app.api.v1.endpoints.audit.ComplianceReportGenerator') as mock_generator:
            mock_generator_instance = Mock()
            mock_generator_instance.get_report_file.return_value = "/tmp/report.json"
            mock_generator.return_value = mock_generator_instance
            
            with patch('builtins.open', create=True) as mock_open:
                mock_open.return_value.__enter__.return_value.read.return_value = b'{"data": "test"}'
                
                response = client.get(f"/api/v1/audit/compliance/reports/{report_id}/download")
                
                assert response.status_code == status.HTTP_200_OK
                assert response.headers["content-type"] == "application/json"
    
    def test_list_violations_success(self, client):
        """Test listing compliance violations."""
        mock_violations = [
            Mock(spec=ComplianceViolation,
                 id=uuid.uuid4(),
                 title="Test Violation 1",
                 severity=AuditSeverity.HIGH,
                 status=ComplianceStatus.VIOLATION,
                 detected_at=datetime.utcnow()),
            Mock(spec=ComplianceViolation,
                 id=uuid.uuid4(),
                 title="Test Violation 2",
                 severity=AuditSeverity.MEDIUM,
                 status=ComplianceStatus.WARNING,
                 detected_at=datetime.utcnow())
        ]
        
        with patch('app.api.v1.endpoints.audit.db') as mock_db:
            mock_db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_violations
            mock_db.query.return_value.filter.return_value.count.return_value = 2
            
            response = client.get("/api/v1/audit/compliance/violations")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "items" in data
            assert data["total"] == 2
    
    def test_update_violation_resolution_success(self, client):
        """Test updating violation resolution."""
        violation_id = uuid.uuid4()
        resolution_request = {
            "status": "COMPLIANT",
            "resolution_notes": "Issue resolved by updating access permissions"
        }
        
        mock_violation = Mock(spec=ComplianceViolation)
        mock_violation.id = violation_id
        mock_violation.mark_resolved = Mock()
        
        with patch('app.api.v1.endpoints.audit.db') as mock_db:
            mock_db.query.return_value.filter.return_value.first.return_value = mock_violation
            mock_db.commit = Mock()
            
            response = client.put(
                f"/api/v1/audit/compliance/violations/{violation_id}/resolve",
                json=resolution_request
            )
            
            assert response.status_code == status.HTTP_200_OK
            mock_violation.mark_resolved.assert_called()
            mock_db.commit.assert_called()


class TestRetentionPolicyEndpoints:
    """Test data retention policy API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client with overridden dependencies."""
        def override_get_db():
            return Mock(spec=Session)
        
        def override_get_current_user():
            mock_user = Mock()
            mock_user.id = uuid.uuid4()
            mock_user.email = "test@example.com"
            mock_user.is_admin = True
            return mock_user
        
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        return TestClient(app)
    
    def test_create_retention_policy_success(self, client):
        """Test successful retention policy creation."""
        policy_request = {
            "name": "Case Data Retention",
            "description": "Retention policy for case data",
            "entity_type": "CASE",
            "retention_period": "YEARS_7",
            "auto_archive": True,
            "auto_delete": False,
            "conditions": {"case_status": "CLOSED"}
        }
        
        mock_policy = Mock(spec=RetentionPolicy)
        mock_policy.id = uuid.uuid4()
        mock_policy.name = policy_request["name"]
        mock_policy.is_active = True
        
        with patch('app.api.v1.endpoints.audit.db') as mock_db:
            mock_db.add = Mock()
            mock_db.commit = Mock()
            mock_db.refresh = Mock()
            
            # Mock the RetentionPolicy constructor to return our mock
            with patch('app.api.v1.endpoints.audit.RetentionPolicy', return_value=mock_policy):
                response = client.post("/api/v1/audit/retention/policies", json=policy_request)
                
                assert response.status_code == status.HTTP_201_CREATED
                data = response.json()
                assert data["name"] == policy_request["name"]
    
    def test_list_retention_policies_success(self, client):
        """Test listing retention policies."""
        mock_policies = [
            Mock(spec=RetentionPolicy,
                 id=uuid.uuid4(),
                 name="Policy 1",
                 entity_type=AuditEntity.CASE,
                 is_active=True,
                 created_at=datetime.utcnow()),
            Mock(spec=RetentionPolicy,
                 id=uuid.uuid4(),
                 name="Policy 2",
                 entity_type=AuditEntity.EVIDENCE,
                 is_active=False,
                 created_at=datetime.utcnow())
        ]
        
        with patch('app.api.v1.endpoints.audit.db') as mock_db:
            mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_policies
            
            response = client.get("/api/v1/audit/retention/policies")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert len(data) == 2
    
    def test_execute_retention_policies_success(self, client):
        """Test manual execution of retention policies."""
        with patch('app.api.v1.endpoints.audit.RetentionManager') as mock_manager:
            mock_manager_instance = Mock()
            mock_manager_instance.process_retention_policies.return_value = {
                "policies_processed": 3,
                "items_archived": 15,
                "items_deleted": 5,
                "errors": [],
                "processing_time": 30.5
            }
            mock_manager.return_value = mock_manager_instance
            
            response = client.post("/api/v1/audit/retention/execute")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["policies_processed"] == 3
            assert data["items_archived"] == 15
    
    def test_get_retention_statistics_success(self, client):
        """Test retention statistics retrieval."""
        with patch('app.api.v1.endpoints.audit.RetentionManager') as mock_manager:
            mock_manager_instance = Mock()
            mock_manager_instance.get_retention_statistics.return_value = {
                "active_policies": 5,
                "total_archived_items": 1500,
                "total_deleted_items": 300,
                "archive_storage_used": 1024000,
                "upcoming_expirations": 25,
                "last_processed": datetime.utcnow().isoformat()
            }
            mock_manager.return_value = mock_manager_instance
            
            response = client.get("/api/v1/audit/retention/statistics")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["active_policies"] == 5
            assert data["total_archived_items"] == 1500


class TestAuditConfigurationEndpoints:
    """Test audit configuration API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client with overridden dependencies."""
        def override_get_db():
            return Mock(spec=Session)
        
        def override_get_current_user():
            mock_user = Mock()
            mock_user.id = uuid.uuid4()
            mock_user.email = "test@example.com"
            mock_user.is_admin = True
            return mock_user
        
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        return TestClient(app)
    
    def test_get_audit_configurations_success(self, client):
        """Test retrieving audit configurations."""
        mock_configs = [
            Mock(id=uuid.uuid4(),
                 entity_type=AuditEntity.CASE,
                 actions_to_audit=[AuditAction.CREATE, AuditAction.UPDATE],
                 minimum_severity=AuditSeverity.MEDIUM),
            Mock(id=uuid.uuid4(),
                 entity_type=AuditEntity.USER,
                 actions_to_audit=[AuditAction.DELETE],
                 minimum_severity=AuditSeverity.HIGH)
        ]
        
        with patch('app.api.v1.endpoints.audit.db') as mock_db:
            mock_db.query.return_value.filter.return_value.all.return_value = mock_configs
            
            response = client.get("/api/v1/audit/config")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert len(data) == 2
    
    def test_update_audit_configuration_success(self, client):
        """Test updating audit configuration."""
        config_request = {
            "entity_type": "CASE",
            "actions_to_audit": ["CREATE", "UPDATE", "DELETE"],
            "include_details": True,
            "minimum_severity": "MEDIUM",
            "retention_days": 365,
            "alert_on_failure": True
        }
        
        with patch('app.api.v1.endpoints.audit.AuditService') as mock_service:
            mock_service_instance = Mock()
            mock_service_instance.update_configuration.return_value = True
            mock_service.return_value = mock_service_instance
            
            response = client.put("/api/v1/audit/config", json=config_request)
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["message"] == "Configuration updated successfully"


class TestDashboardEndpoints:
    """Test audit dashboard API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client with overridden dependencies."""
        def override_get_db():
            return Mock(spec=Session)
        
        def override_get_current_user():
            mock_user = Mock()
            mock_user.id = uuid.uuid4()
            mock_user.email = "test@example.com"
            mock_user.is_admin = True
            return mock_user
        
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        return TestClient(app)
    
    def test_get_dashboard_summary_success(self, client):
        """Test dashboard summary retrieval."""
        mock_summary = {
            "audit_stats": {
                "total_logs": 5000,
                "recent_logs": 150,
                "integrity_score": 99.8,
                "logs_by_severity": {"CRITICAL": 5, "HIGH": 50, "MEDIUM": 500, "LOW": 4445}
            },
            "compliance_stats": {
                "total_violations": 25,
                "active_violations": 5,
                "resolved_violations": 20,
                "compliance_score": 95.5,
                "violations_by_type": {"DATA_RETENTION": 10, "ACCESS_CONTROL": 8, "DATA_INTEGRITY": 7}
            },
            "retention_stats": {
                "active_policies": 8,
                "archived_items": 2000,
                "upcoming_expirations": 30,
                "storage_used": "2.5 GB"
            },
            "recent_activity": [
                {
                    "timestamp": datetime.utcnow().isoformat(),
                    "type": "AUDIT_LOG",
                    "description": "New case created",
                    "severity": "MEDIUM"
                }
            ]
        }
        
        with patch('app.api.v1.endpoints.audit.AuditService') as mock_audit_service, \
             patch('app.api.v1.endpoints.audit.ComplianceReportGenerator') as mock_compliance, \
             patch('app.api.v1.endpoints.audit.RetentionManager') as mock_retention:
            
            mock_audit_service.return_value.get_audit_statistics.return_value = mock_summary["audit_stats"]
            mock_compliance.return_value.get_compliance_statistics.return_value = mock_summary["compliance_stats"]
            mock_retention.return_value.get_retention_statistics.return_value = mock_summary["retention_stats"]
            mock_audit_service.return_value.get_recent_activity.return_value = mock_summary["recent_activity"]
            
            response = client.get("/api/v1/audit/dashboard/summary")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "audit_stats" in data
            assert "compliance_stats" in data
            assert "retention_stats" in data
            assert "recent_activity" in data


class TestBulkOperationsEndpoints:
    """Test bulk operations API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Create test client with overridden dependencies."""
        def override_get_db():
            return Mock(spec=Session)
        
        def override_get_current_user():
            mock_user = Mock()
            mock_user.id = uuid.uuid4()
            mock_user.email = "test@example.com"
            mock_user.is_admin = True
            return mock_user
        
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        return TestClient(app)
    
    def test_execute_bulk_operation_success(self, client):
        """Test bulk operation execution."""
        bulk_request = {
            "operation": "ARCHIVE",
            "entity_type": "CASE",
            "criteria": {
                "created_before": (datetime.utcnow() - timedelta(days=365)).date().isoformat(),
                "status": "CLOSED"
            },
            "options": {
                "dry_run": False,
                "batch_size": 100
            }
        }
        
        with patch('app.api.v1.endpoints.audit.execute_bulk_operation_task') as mock_task:
            mock_task.delay.return_value.id = "bulk-task-123"
            
            response = client.post("/api/v1/audit/bulk/execute", json=bulk_request)
            
            assert response.status_code == status.HTTP_202_ACCEPTED
            data = response.json()
            assert "task_id" in data
            assert data["status"] == "PENDING"
    
    def test_get_bulk_operation_status_success(self, client):
        """Test bulk operation status retrieval."""
        task_id = "bulk-task-123"
        
        mock_status = {
            "task_id": task_id,
            "status": "SUCCESS",
            "progress": {
                "processed": 100,
                "total": 100,
                "percentage": 100.0
            },
            "result": {
                "items_processed": 100,
                "items_archived": 85,
                "errors": 0
            },
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": datetime.utcnow().isoformat()
        }
        
        with patch('app.api.v1.endpoints.audit.get_bulk_operation_status') as mock_get_status:
            mock_get_status.return_value = mock_status
            
            response = client.get(f"/api/v1/audit/bulk/status/{task_id}")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["status"] == "SUCCESS"
            assert data["progress"]["percentage"] == 100.0


# Test utilities and helpers

def create_mock_audit_log(action=AuditAction.CREATE, entity_type=AuditEntity.CASE):
    """Helper function to create mock audit log."""
    return Mock(spec=AuditLog,
                id=uuid.uuid4(),
                timestamp=datetime.utcnow(),
                action=action,
                entity_type=entity_type,
                description="Test audit log",
                severity=AuditSeverity.MEDIUM,
                user_id=uuid.uuid4(),
                verify_integrity=Mock(return_value=True))

def create_mock_compliance_violation(severity=AuditSeverity.HIGH):
    """Helper function to create mock compliance violation."""
    return Mock(spec=ComplianceViolation,
                id=uuid.uuid4(),
                severity=severity,
                status=ComplianceStatus.VIOLATION,
                detected_at=datetime.utcnow(),
                title="Test Violation",
                description="Test violation description")

def create_mock_retention_policy(entity_type=AuditEntity.CASE):
    """Helper function to create mock retention policy."""
    return Mock(spec=RetentionPolicy,
                id=uuid.uuid4(),
                name="Test Policy",
                entity_type=entity_type,
                is_active=True,
                auto_archive=True,
                auto_delete=False,
                created_at=datetime.utcnow())


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])