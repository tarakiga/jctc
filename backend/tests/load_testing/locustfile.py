"""
Load Testing Configuration for JCTC Management System using Locust.

This file defines load testing scenarios for all major API endpoints
to ensure the system can handle production traffic loads.
"""

import json
import random
from datetime import datetime, timedelta
from uuid import uuid4
from locust import HttpUser, task, between, tag


class JCTCUser(HttpUser):
    """
    Base user class for JCTC Management System load testing.
    """
    
    wait_time = between(1, 5)  # Wait 1-5 seconds between requests
    host = "http://localhost:8000"
    
    def on_start(self):
        """Setup method called when a user starts."""
        self.login()
        self.case_id = None
        self.charge_ids = []
        self.session_ids = []
    
    def login(self):
        """Authenticate user and get access token."""
        # Use different user types for testing
        user_types = [
            {"email": "admin@jctc.gov.ng", "password": "admin123"},
            {"email": "prosecutor@jctc.gov.ng", "password": "prosecutor123"},
            {"email": "investigator@jctc.gov.ng", "password": "investigator123"},
            {"email": "forensic@jctc.gov.ng", "password": "forensic123"}
        ]
        
        user_creds = random.choice(user_types)
        
        response = self.client.post(
            "/api/v1/auth/login",
            json=user_creds,
            name="Authentication"
        )
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(10)
    @tag("core", "dashboard")
    def view_dashboard(self):
        """Test dashboard endpoint performance."""
        if not self.token:
            return
        
        # Test different dashboard types
        endpoints = [
            "/api/v1/cases/",
            "/api/v1/prosecution/dashboard",
            "/api/v1/devices/statistics/forensic-workload"
        ]
        
        endpoint = random.choice(endpoints)
        
        with self.client.get(
            endpoint,
            headers=self.headers,
            catch_response=True,
            name="Dashboard Views"
        ) as response:
            if response.status_code not in [200, 403]:  # 403 is OK for wrong roles
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(5)
    @tag("core", "cases")
    def create_case(self):
        """Test case creation performance."""
        if not self.token:
            return
        
        case_data = {
            "title": f"Load Test Case {random.randint(1000, 9999)}",
            "description": "This is a load testing case for performance evaluation",
            "case_type_id": 1,  # Assuming case type 1 exists
            "priority": random.choice(["LOW", "MEDIUM", "HIGH", "URGENT"]),
            "source": "COMPLAINT"
        }
        
        with self.client.post(
            "/api/v1/cases/",
            json=case_data,
            headers=self.headers,
            catch_response=True,
            name="Create Case"
        ) as response:
            if response.status_code == 201:
                self.case_id = response.json()["id"]
            elif response.status_code != 403:  # 403 is OK for wrong roles
                response.failure(f"Failed to create case: {response.status_code}")
    
    @task(8)
    @tag("core", "cases")
    def list_cases(self):
        """Test case listing with various filters."""
        if not self.token:
            return
        
        # Test different filter combinations
        filter_params = [
            "",
            "?status=OPEN",
            "?priority=HIGH",
            "?page=1&per_page=20",
            f"?created_after={datetime.utcnow().date() - timedelta(days=30)}",
        ]
        
        params = random.choice(filter_params)
        
        with self.client.get(
            f"/api/v1/cases/{params}",
            headers=self.headers,
            catch_response=True,
            name="List Cases"
        ) as response:
            if response.status_code not in [200, 403]:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(3)
    @tag("prosecution", "charges")
    def create_charges(self):
        """Test charge creation performance."""
        if not self.token or not self.case_id:
            return
        
        charge_data = {
            "case_id": self.case_id,
            "charge_description": f"Load test charge - {random.choice(['Fraud', 'Hacking', 'Identity Theft'])}",
            "statute": f"Section {random.randint(100, 999)}",
            "severity": random.choice(["MISDEMEANOR", "FELONY"]),
            "status": "PENDING"
        }
        
        with self.client.post(
            "/api/v1/prosecution/charges",
            json=charge_data,
            headers=self.headers,
            catch_response=True,
            name="Create Charges"
        ) as response:
            if response.status_code == 201:
                charge_id = response.json()["id"]
                self.charge_ids.append(charge_id)
            elif response.status_code != 403:
                response.failure(f"Failed to create charge: {response.status_code}")
    
    @task(4)
    @tag("prosecution", "sessions")
    def schedule_court_session(self):
        """Test court session scheduling."""
        if not self.token or not self.case_id:
            return
        
        session_data = {
            "case_id": self.case_id,
            "session_date": (datetime.utcnow() + timedelta(days=random.randint(30, 90))).isoformat(),
            "session_type": random.choice(["ARRAIGNMENT", "TRIAL", "SENTENCING", "HEARING"]),
            "court_name": f"Load Test Court {random.randint(1, 10)}",
            "judge_name": f"Hon. Justice Load Test {random.randint(1, 20)}",
            "location": f"Court Room {random.randint(1, 10)}"
        }
        
        with self.client.post(
            "/api/v1/prosecution/court-sessions",
            json=session_data,
            headers=self.headers,
            catch_response=True,
            name="Schedule Court Session"
        ) as response:
            if response.status_code == 201:
                session_id = response.json()["id"]
                self.session_ids.append(session_id)
            elif response.status_code != 403:
                response.failure(f"Failed to create session: {response.status_code}")
    
    @task(2)
    @tag("devices", "seizures")
    def record_seizure(self):
        """Test device seizure recording."""
        if not self.token or not self.case_id:
            return
        
        seizure_data = {
            "location": f"Load Test Location {random.randint(1, 50)}",
            "notes": "Load testing seizure record"
        }
        
        with self.client.post(
            f"/api/v1/devices/{self.case_id}/seizures",
            json=seizure_data,
            headers=self.headers,
            catch_response=True,
            name="Record Seizure"
        ) as response:
            if response.status_code not in [201, 403, 404]:
                response.failure(f"Unexpected seizure status: {response.status_code}")
    
    @task(6)
    @tag("evidence", "list")
    def list_evidence(self):
        """Test evidence listing performance."""
        if not self.token:
            return
        
        with self.client.get(
            "/api/v1/evidence/",
            headers=self.headers,
            catch_response=True,
            name="List Evidence"
        ) as response:
            if response.status_code not in [200, 403]:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(7)
    @tag("users", "list")
    def list_users(self):
        """Test user listing performance."""
        if not self.token:
            return
        
        params = random.choice(["", "?role=INVESTIGATOR", "?is_active=true", "?page=1&per_page=10"])
        
        with self.client.get(
            f"/api/v1/users/{params}",
            headers=self.headers,
            catch_response=True,
            name="List Users"
        ) as response:
            if response.status_code not in [200, 403]:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(3)
    @tag("audit", "logs")
    def search_audit_logs(self):
        """Test audit log search performance."""
        if not self.token:
            return
        
        # Test different search parameters
        search_params = [
            "",
            "?action=CREATE",
            "?entity=CASE",
            f"?start_date={datetime.utcnow().date() - timedelta(days=7)}",
            "?limit=20"
        ]
        
        params = random.choice(search_params)
        
        with self.client.get(
            f"/api/v1/audit/logs/search{params}",
            headers=self.headers,
            catch_response=True,
            name="Search Audit Logs"
        ) as response:
            if response.status_code not in [200, 403]:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(2)
    @tag("bulk", "operations")
    def bulk_operations(self):
        """Test bulk operation performance."""
        if not self.token or len(self.charge_ids) < 2:
            return
        
        # Test bulk charge update
        bulk_data = {
            "charge_ids": self.charge_ids[:min(3, len(self.charge_ids))],
            "updates": {
                "status": "FILED",
                "notes": "Bulk load test update"
            }
        }
        
        with self.client.post(
            "/api/v1/prosecution/charges/bulk",
            json=bulk_data,
            headers=self.headers,
            catch_response=True,
            name="Bulk Operations"
        ) as response:
            if response.status_code not in [200, 403, 404]:
                response.failure(f"Bulk operation failed: {response.status_code}")
    
    @task(1)
    @tag("statistics", "reports")
    def get_statistics(self):
        """Test statistics and reporting endpoints."""
        if not self.token:
            return
        
        stats_endpoints = [
            "/api/v1/prosecution/statistics/performance",
            "/api/v1/devices/statistics/forensic-workload", 
            "/api/v1/audit/logs/statistics"
        ]
        
        endpoint = random.choice(stats_endpoints)
        
        with self.client.get(
            endpoint,
            headers=self.headers,
            catch_response=True,
            name="Statistics & Reports"
        ) as response:
            if response.status_code not in [200, 403]:
                response.failure(f"Statistics failed: {response.status_code}")


class AdminUser(JCTCUser):
    """Admin user with elevated permissions for testing admin-only endpoints."""
    
    weight = 1  # Lower weight = fewer admin users
    
    def login(self):
        """Login as admin user."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "admin@jctc.gov.ng", "password": "admin123"},
            name="Admin Authentication"
        )
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(2)
    @tag("admin", "users")
    def create_user(self):
        """Test user creation (admin only)."""
        if not self.token:
            return
        
        user_data = {
            "email": f"loadtest_{random.randint(1000, 9999)}@test.com",
            "full_name": f"Load Test User {random.randint(1, 100)}",
            "role": random.choice(["INVESTIGATOR", "FORENSIC", "PROSECUTOR"]),
            "organization": "Load Test Organization",
            "password": "password123"
        }
        
        with self.client.post(
            "/api/v1/users/",
            json=user_data,
            headers=self.headers,
            catch_response=True,
            name="Create User (Admin)"
        ) as response:
            if response.status_code != 201:
                response.failure(f"Failed to create user: {response.status_code}")
    
    @task(3)
    @tag("admin", "audit")
    def admin_audit_operations(self):
        """Test admin audit operations."""
        if not self.token:
            return
        
        # Test integrity verification
        with self.client.post(
            "/api/v1/audit/logs/verify-integrity",
            json={"check_all": False, "sample_size": 100},
            headers=self.headers,
            catch_response=True,
            name="Audit Integrity Check"
        ) as response:
            if response.status_code != 200:
                response.failure(f"Integrity check failed: {response.status_code}")


class ProsecutorUser(JCTCUser):
    """Prosecutor user focusing on prosecution workflow testing."""
    
    weight = 3  # Medium weight
    
    def login(self):
        """Login as prosecutor user."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "prosecutor@jctc.gov.ng", "password": "prosecutor123"},
            name="Prosecutor Authentication"
        )
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(10)
    @tag("prosecution", "dashboard")
    def prosecution_dashboard(self):
        """Focus on prosecution dashboard."""
        if not self.token:
            return
        
        with self.client.get(
            "/api/v1/prosecution/dashboard",
            headers=self.headers,
            catch_response=True,
            name="Prosecution Dashboard"
        ) as response:
            if response.status_code != 200:
                response.failure(f"Dashboard failed: {response.status_code}")
    
    @task(8)
    @tag("prosecution", "calendar")
    def court_calendar(self):
        """Test court calendar performance."""
        if not self.token:
            return
        
        with self.client.get(
            "/api/v1/prosecution/court-sessions/calendar",
            headers=self.headers,
            catch_response=True,
            name="Court Calendar"
        ) as response:
            if response.status_code != 200:
                response.failure(f"Calendar failed: {response.status_code}")


class ForensicUser(JCTCUser):
    """Forensic user focusing on device and evidence management."""
    
    weight = 2  # Lower weight
    
    def login(self):
        """Login as forensic user."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "forensic@jctc.gov.ng", "password": "forensic123"},
            name="Forensic Authentication"
        )
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(8)
    @tag("devices", "workload")
    def forensic_workload(self):
        """Test forensic workload statistics."""
        if not self.token:
            return
        
        with self.client.get(
            "/api/v1/devices/statistics/forensic-workload",
            headers=self.headers,
            catch_response=True,
            name="Forensic Workload"
        ) as response:
            if response.status_code != 200:
                response.failure(f"Workload stats failed: {response.status_code}")
    
    @task(6)
    @tag("evidence", "chain")
    def chain_of_custody(self):
        """Test chain of custody operations."""
        if not self.token:
            return
        
        with self.client.get(
            "/api/v1/custody/",
            headers=self.headers,
            catch_response=True,
            name="Chain of Custody"
        ) as response:
            if response.status_code not in [200, 404]:  # 404 OK if no custody records
                response.failure(f"Custody check failed: {response.status_code}")


# Load testing scenarios
class LightLoad(JCTCUser):
    """Light load scenario - normal business hours traffic."""
    weight = 10
    wait_time = between(3, 8)


class MediumLoad(JCTCUser):
    """Medium load scenario - busy periods."""
    weight = 15
    wait_time = between(1, 4)


class HeavyLoad(JCTCUser):
    """Heavy load scenario - peak traffic."""
    weight = 8
    wait_time = between(0.5, 2)


# Custom load testing tasks
class StressTestUser(JCTCUser):
    """Stress test user for high-load scenarios."""
    
    wait_time = between(0.1, 1)  # Very fast requests
    weight = 1  # Only a few stress test users
    
    @task(20)
    def rapid_dashboard_requests(self):
        """Rapid dashboard requests for stress testing."""
        if not self.token:
            return
        
        endpoints = [
            "/api/v1/prosecution/dashboard",
            "/api/v1/cases/",
            "/api/v1/users/"
        ]
        
        endpoint = random.choice(endpoints)
        
        with self.client.get(
            endpoint,
            headers=self.headers,
            catch_response=True,
            name="Stress Test Requests"
        ) as response:
            if response.status_code not in [200, 403]:
                response.failure(f"Stress test failed: {response.status_code}")
    
    @task(5)
    def concurrent_case_creation(self):
        """Concurrent case creation for database stress testing."""
        if not self.token:
            return
        
        case_data = {
            "title": f"Stress Test Case {uuid4().hex[:8]}",
            "description": "Stress testing case creation",
            "case_type_id": 1,
            "priority": "MEDIUM",
            "source": "COMPLAINT"
        }
        
        with self.client.post(
            "/api/v1/cases/",
            json=case_data,
            headers=self.headers,
            catch_response=True,
            name="Stress Case Creation"
        ) as response:
            if response.status_code not in [201, 403, 429]:  # 429 = rate limited
                response.failure(f"Stress case creation failed: {response.status_code}")