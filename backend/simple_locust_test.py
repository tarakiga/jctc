"""
Simple Locust performance test for JCTC Management System.
Tests basic endpoints without authentication requirements.
"""
from locust import HttpUser, task, between
import random

class SimpleJCTCUser(HttpUser):
    """Simple user for basic performance testing."""
    
    wait_time = between(1, 3)
    host = "http://localhost:8000"
    
    @task(10)
    def test_docs_endpoint(self):
        """Test the docs endpoint (no auth required)."""
        with self.client.get("/docs", catch_response=True, name="Swagger Docs") as response:
            if response.status_code != 200:
                response.failure(f"Docs failed: {response.status_code}")
    
    @task(8)
    def test_openapi_spec(self):
        """Test the OpenAPI specification endpoint."""
        with self.client.get("/openapi.json", catch_response=True, name="OpenAPI Spec") as response:
            if response.status_code != 200:
                response.failure(f"OpenAPI failed: {response.status_code}")
    
    @task(5)
    def test_health_endpoint(self):
        """Test health check if available."""
        with self.client.get("/health", catch_response=True, name="Health Check") as response:
            if response.status_code not in [200, 404]:  # 404 is OK if endpoint doesn't exist
                response.failure(f"Health check failed: {response.status_code}")
    
    @task(3)
    def test_root_endpoint(self):
        """Test the root endpoint."""
        with self.client.get("/", catch_response=True, name="Root Endpoint") as response:
            if response.status_code not in [200, 404, 307]:  # Various acceptable responses
                response.failure(f"Root failed: {response.status_code}")

class LightLoadUser(SimpleJCTCUser):
    """Light load testing user."""
    weight = 3
    wait_time = between(2, 5)

class MediumLoadUser(SimpleJCTCUser):
    """Medium load testing user."""
    weight = 2
    wait_time = between(1, 3)

class HeavyLoadUser(SimpleJCTCUser):
    """Heavy load testing user."""
    weight = 1
    wait_time = between(0.5, 2)