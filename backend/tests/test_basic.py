#!/usr/bin/env python3
"""
Basic API testing without database
"""
import httpx
import asyncio
from app.main import app
from fastapi.testclient import TestClient

def test_basic_endpoints():
    """Test basic endpoints that don't require database"""
    print("🧪 Testing Basic Endpoints (No Database Required)")
    print("="*50)
    
    client = TestClient(app)
    
    # Test root endpoint
    print("\n1. Testing root endpoint...")
    response = client.get("/")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Test health check
    print("\n2. Testing health check...")
    response = client.get("/health")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Test OpenAPI schema
    print("\n3. Testing OpenAPI schema...")
    response = client.get("/openapi.json")
    print(f"   Status: {response.status_code}")
    print(f"   Schema keys: {list(response.json().keys())}")
    
    print("\n✅ Basic endpoints working!")

if __name__ == "__main__":
    test_basic_endpoints()