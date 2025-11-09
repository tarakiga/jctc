"""
NDPA Compliance Load Testing for JCTC Management System using Locust.

This file focuses specifically on testing NDPA compliance endpoints
to ensure they perform well under load.
"""

import json
import random
from datetime import datetime, timedelta
from uuid import uuid4
from locust import HttpUser, task, between, tag


class NDPAComplianceUser(HttpUser):
    """
    NDPA Compliance focused user class for load testing.
    """
    
    wait_time = between(2, 6)  # Slightly longer wait for compliance operations
    host = "http://localhost:8000"
    
    def on_start(self):
        """Setup method called when a user starts."""
        self.login()
        self.consent_ids = []
        self.request_ids = []
        self.breach_ids = []
    
    def login(self):
        """Authenticate user and get access token."""
        # Use different user types for testing NDPA compliance
        user_types = [
            {"email": "admin@jctc.gov.ng", "password": "admin123"},
            {"email": "dpo@jctc.gov.ng", "password": "dpo123"},  # Data Protection Officer
            {"email": "compliance@jctc.gov.ng", "password": "compliance123"},
            {"email": "legal@jctc.gov.ng", "password": "legal123"}
        ]
        
        user_creds = random.choice(user_types)
        
        response = self.client.post(
            "/api/v1/auth/login",
            json=user_creds,
            name="NDPA Authentication"
        )
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(15)
    @tag("ndpa", "assessment")
    def ndpa_compliance_assessment(self):
        """Test NDPA compliance assessment endpoint."""
        if not self.token:
            return
        
        with self.client.post(
            "/api/v1/ndpa/assess",
            headers=self.headers,
            catch_response=True,
            name="NDPA Compliance Assessment"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "overall_score" in data and "status" in data:
                    response.success()
                else:
                    response.failure("Invalid assessment response format")
            elif response.status_code == 403:
                response.success()  # Permission denied is acceptable
            else:
                response.failure(f"Assessment failed: {response.status_code}")
    
    @task(12)
    @tag("ndpa", "status")
    def ndpa_compliance_status(self):
        """Test NDPA compliance status endpoint."""
        if not self.token:
            return
        
        with self.client.get(
            "/api/v1/ndpa/status",
            headers=self.headers,
            catch_response=True,
            name="NDPA Compliance Status"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "overall_score" in data and "status" in data:
                    response.success()
                else:
                    response.failure("Invalid status response format")
            elif response.status_code == 403:
                response.success()
            else:
                response.failure(f"Status check failed: {response.status_code}")
    
    @task(10)
    @tag("ndpa", "dashboard")
    def ndpa_compliance_dashboard(self):
        """Test NDPA compliance dashboard endpoint."""
        if not self.token:
            return
        
        with self.client.get(
            "/api/v1/ndpa/dashboard",
            headers=self.headers,
            catch_response=True,
            name="NDPA Compliance Dashboard"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "overall_compliance_score" in data and "metrics" in data:
                    response.success()
                else:
                    response.failure("Invalid dashboard response format")
            elif response.status_code == 403:
                response.success()
            else:
                response.failure(f"Dashboard failed: {response.status_code}")
    
    @task(8)
    @tag("ndpa", "consent")
    def create_ndpa_consent(self):
        """Test NDPA consent creation endpoint."""
        if not self.token:
            return
        
        consent_data = {
            "data_subject_id": f"subject_{random.randint(1000, 9999)}",
            "purpose": random.choice([
                "Investigation Processing", 
                "Evidence Management", 
                "Legal Proceedings",
                "Case Documentation",
                "Forensic Analysis"
            ]),
            "data_categories": random.sample([
                "Personal Data", 
                "Contact Information", 
                "Financial Data",
                "Location Data",
                "Communication Records"
            ], k=random.randint(1, 3)),
            "consent_text": "I consent to the processing of my personal data for the specified purpose.",
            "withdrawal_method": "email_request"
        }
        
        with self.client.post(
            "/api/v1/ndpa/consent",
            json=consent_data,
            headers=self.headers,
            catch_response=True,
            name="NDPA Create Consent"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "id" in data:
                    self.consent_ids.append(data["id"])
                    response.success()
                else:
                    response.failure("Invalid consent response format")
            elif response.status_code == 403:
                response.success()
            else:
                response.failure(f"Consent creation failed: {response.status_code}")
    
    @task(5)
    @tag("ndpa", "consent", "withdrawal")
    def withdraw_ndpa_consent(self):
        """Test NDPA consent withdrawal endpoint."""
        if not self.token or not self.consent_ids:
            return
        
        consent_id = random.choice(self.consent_ids)
        
        with self.client.put(
            f"/api/v1/ndpa/consent/{consent_id}/withdraw",
            headers=self.headers,
            catch_response=True,
            name="NDPA Withdraw Consent"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "WITHDRAWN":
                    response.success()
                    # Remove from active consent list
                    if consent_id in self.consent_ids:
                        self.consent_ids.remove(consent_id)
                else:
                    response.failure("Invalid withdrawal response format")
            elif response.status_code in [403, 404]:
                response.success()
            else:
                response.failure(f"Consent withdrawal failed: {response.status_code}")
    
    @task(7)
    @tag("ndpa", "data_subject_rights")
    def create_data_subject_request(self):
        """Test data subject rights request creation."""
        if not self.token:
            return
        
        request_data = {
            "data_subject_id": f"subject_{random.randint(1000, 9999)}",
            "request_type": random.choice([
                "ACCESS", "RECTIFICATION", "ERASURE", 
                "PORTABILITY", "OBJECT", "RESTRICT"
            ]),
            "description": "Load testing data subject request",
            "contact_email": f"subject{random.randint(1, 1000)}@example.com"
        }
        
        with self.client.post(
            "/api/v1/ndpa/data-subject-requests",
            json=request_data,
            headers=self.headers,
            catch_response=True,
            name="NDPA Data Subject Request"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "id" in data:
                    self.request_ids.append(data["id"])
                    response.success()
                else:
                    response.failure("Invalid request response format")
            elif response.status_code == 403:
                response.success()
            else:
                response.failure(f"Data subject request failed: {response.status_code}")
    
    @task(6)
    @tag("ndpa", "data_subject_rights", "list")
    def list_data_subject_requests(self):
        """Test listing data subject requests."""
        if not self.token:
            return
        
        with self.client.get(
            "/api/v1/ndpa/data-subject-requests",
            headers=self.headers,
            catch_response=True,
            name="NDPA List Data Subject Requests"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    response.success()
                else:
                    response.failure("Invalid request list response format")
            elif response.status_code == 403:
                response.success()
            else:
                response.failure(f"Request listing failed: {response.status_code}")
    
    @task(4)
    @tag("ndpa", "breach")
    def create_breach_notification(self):
        """Test breach notification creation."""
        if not self.token:
            return
        
        breach_data = {
            "incident_title": f"Load Test Security Incident {random.randint(1000, 9999)}",
            "description": "Simulated security breach for load testing purposes",
            "data_categories_affected": random.sample([
                "Personal Data", "Financial Data", "Contact Information",
                "Location Data", "Communication Records", "Biometric Data"
            ], k=random.randint(1, 3)),
            "data_subjects_affected": random.randint(10, 1000),
            "risk_level": random.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
            "containment_measures": "Immediate containment and investigation initiated"
        }
        
        with self.client.post(
            "/api/v1/ndpa/breach-notifications",
            json=breach_data,
            headers=self.headers,
            catch_response=True,
            name="NDPA Breach Notification"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "id" in data:
                    self.breach_ids.append(data["id"])
                    response.success()
                else:
                    response.failure("Invalid breach response format")
            elif response.status_code == 403:
                response.success()
            else:
                response.failure(f"Breach notification failed: {response.status_code}")
    
    @task(3)
    @tag("ndpa", "breach", "list")
    def list_breach_notifications(self):
        """Test listing breach notifications."""
        if not self.token:
            return
        
        with self.client.get(
            "/api/v1/ndpa/breach-notifications",
            headers=self.headers,
            catch_response=True,
            name="NDPA List Breach Notifications"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    response.success()
                else:
                    response.failure("Invalid breach list response format")
            elif response.status_code == 403:
                response.success()
            else:
                response.failure(f"Breach listing failed: {response.status_code}")
    
    @task(5)
    @tag("ndpa", "transfer")
    def validate_cross_border_transfer(self):
        """Test cross-border transfer validation."""
        if not self.token:
            return
        
        transfer_data = {
            "destination_country": random.choice([
                "Ghana", "Kenya", "South Africa", "United Kingdom",
                "United States", "Germany", "France", "Canada"
            ]),
            "data_categories": random.sample([
                "Personal Data", "Financial Data", "Contact Information",
                "Investigation Records", "Evidence Data"
            ], k=random.randint(1, 3)),
            "transfer_purpose": "Investigation cooperation",
            "safeguards": random.choice([
                "Standard Contractual Clauses", 
                "Adequacy Decision",
                "Binding Corporate Rules",
                "Codes of Conduct"
            ])
        }
        
        with self.client.post(
            "/api/v1/ndpa/validate-transfer",
            json=transfer_data,
            headers=self.headers,
            catch_response=True,
            name="NDPA Cross-Border Transfer Validation"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "transfer_valid" in data:
                    response.success()
                else:
                    response.failure("Invalid transfer validation response")
            elif response.status_code == 403:
                response.success()
            else:
                response.failure(f"Transfer validation failed: {response.status_code}")
    
    @task(3)
    @tag("ndpa", "reports")
    def generate_ndpa_reports(self):
        """Test NDPA report generation."""
        if not self.token:
            return
        
        report_types = [
            "NDPA_COMPLIANCE",
            "NITDA_SUBMISSION", 
            "NDPA_BREACH_NOTIFICATION",
            "NDPA_DATA_SUBJECT_RIGHTS",
            "NDPA_PROCESSING_ACTIVITIES",
            "NDPA_DPIA_REPORT"
        ]
        
        report_type = random.choice(report_types)
        
        report_params = {
            "date_range": {
                "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
                "end_date": datetime.now().isoformat()
            },
            "include_details": random.choice([True, False]),
            "format": random.choice(["PDF", "CSV", "JSON"])
        }
        
        with self.client.post(
            f"/api/v1/ndpa/reports/{report_type}",
            json=report_params,
            headers=self.headers,
            catch_response=True,
            name="NDPA Generate Reports"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if "report_id" in data and "status" in data:
                    response.success()
                else:
                    response.failure("Invalid report response format")
            elif response.status_code == 403:
                response.success()
            else:
                response.failure(f"Report generation failed: {response.status_code}")
    
    @task(4)
    @tag("ndpa", "violations")
    def list_ndpa_violations(self):
        """Test NDPA violations listing."""
        if not self.token:
            return
        
        # Test with different filter parameters
        params = random.choice([
            "",
            "?severity=HIGH",
            "?status=OPEN", 
            "?severity=CRITICAL&status=OPEN"
        ])
        
        with self.client.get(
            f"/api/v1/ndpa/violations{params}",
            headers=self.headers,
            catch_response=True,
            name="NDPA List Violations"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    response.success()
                else:
                    response.failure("Invalid violations response format")
            elif response.status_code == 403:
                response.success()
            else:
                response.failure(f"Violations listing failed: {response.status_code}")


class NDPAAdminUser(NDPAComplianceUser):
    """Admin user with elevated NDPA compliance permissions."""
    
    weight = 3  # Higher weight for admin operations
    
    def login(self):
        """Login as admin user with full NDPA permissions."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "admin@jctc.gov.ng", "password": "admin123"},
            name="NDPA Admin Authentication"
        )
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(20)
    @tag("ndpa", "admin", "assessment")
    def comprehensive_ndpa_assessment(self):
        """Admin-level comprehensive NDPA assessment."""
        if not self.token:
            return
        
        # Admin users get more frequent assessment calls
        with self.client.post(
            "/api/v1/ndpa/assess",
            headers=self.headers,
            catch_response=True,
            name="NDPA Admin Assessment"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Admin assessment failed: {response.status_code}")


class NDPALightLoad(NDPAComplianceUser):
    """Light load NDPA compliance testing."""
    weight = 8
    wait_time = between(4, 8)


class NDPAMediumLoad(NDPAComplianceUser):
    """Medium load NDPA compliance testing."""
    weight = 12
    wait_time = between(2, 5)


class NDPAHeavyLoad(NDPAComplianceUser):
    """Heavy load NDPA compliance testing."""
    weight = 6
    wait_time = between(1, 3)


class NDPAStressTest(NDPAComplianceUser):
    """Stress test for NDPA compliance endpoints."""
    
    weight = 2
    wait_time = between(0.5, 2)
    
    @task(30)
    @tag("ndpa", "stress", "rapid")
    def rapid_ndpa_requests(self):
        """Rapid NDPA compliance requests for stress testing."""
        if not self.token:
            return
        
        # Rapidly cycle through different NDPA endpoints
        endpoints = [
            "/api/v1/ndpa/status",
            "/api/v1/ndpa/dashboard",
            "/api/v1/ndpa/violations"
        ]
        
        endpoint = random.choice(endpoints)
        
        with self.client.get(
            endpoint,
            headers=self.headers,
            catch_response=True,
            name="NDPA Stress Test"
        ) as response:
            if response.status_code in [200, 403]:
                response.success()
            else:
                response.failure(f"Stress test failed: {response.status_code}")