#!/usr/bin/env python3
"""
Simple connectivity test for JCTC Management System server.
"""
import requests
import json

def test_server_connectivity():
    """Test basic server connectivity."""
    base_url = "http://localhost:8000"
    
    try:
        # Test root endpoint
        print(f"Testing {base_url}")
        response = requests.get(base_url, timeout=5)
        print(f"✅ Server accessible: {response.status_code}")
        
        # Test docs endpoint
        docs_response = requests.get(f"{base_url}/docs", timeout=5)
        print(f"✅ Docs accessible: {docs_response.status_code}")
        
        # Test API endpoint
        api_response = requests.get(f"{base_url}/api/v1/health", timeout=5)
        print(f"✅ Health check: {api_response.status_code}")
        if api_response.status_code == 200:
            print(f"   Response: {api_response.json()}")
        
        return True
        
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection failed: {e}")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_authentication():
    """Test authentication endpoint."""
    base_url = "http://localhost:8000"
    
    try:
        # Try to get login endpoint
        auth_response = requests.post(
            f"{base_url}/api/v1/auth/login",
            json={"email": "test@test.com", "password": "wrong"},
            timeout=5
        )
        print(f"✅ Auth endpoint accessible: {auth_response.status_code}")
        return True
        
    except Exception as e:
        print(f"❌ Auth test failed: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Testing JCTC Management System connectivity...")
    
    if test_server_connectivity():
        print("\n🔐 Testing authentication...")
        test_authentication()
    
    print("\n✨ Connectivity test completed!")