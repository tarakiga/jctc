#!/usr/bin/env python3
"""
Comprehensive server testing script
"""
import requests
import time
import subprocess
import sys
import threading
from pathlib import Path

def test_server_endpoints():
    """Test server endpoints with HTTP requests"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Server Endpoints")
    print("="*40)
    
    # Wait for server to start
    print("\n⏳ Waiting for server to start...")
    max_attempts = 30
    for attempt in range(max_attempts):
        try:
            response = requests.get(f"{base_url}/health", timeout=2)
            if response.status_code == 200:
                print("✅ Server is running!")
                break
        except requests.RequestException:
            if attempt < max_attempts - 1:
                time.sleep(1)
            else:
                print("❌ Server failed to start or is not responding")
                return False
    
    # Test basic endpoints
    endpoints_to_test = [
        ("/", "GET", "Root endpoint"),
        ("/health", "GET", "Health check"),
        ("/docs", "GET", "API Documentation"),
        ("/openapi.json", "GET", "OpenAPI Schema")
    ]
    
    print("\n🔍 Testing Endpoints:")
    print("-" * 40)
    
    for endpoint, method, description in endpoints_to_test:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            status = "✅" if response.status_code == 200 else "❌"
            print(f"{status} {method} {endpoint} - {description}")
            print(f"    Status: {response.status_code}")
            if endpoint == "/health":
                print(f"    Response: {response.json()}")
        except requests.RequestException as e:
            print(f"❌ {method} {endpoint} - {description}")
            print(f"    Error: {e}")
    
    # Test API endpoints that require authentication
    print(f"\n🔒 Testing Protected Endpoints:")
    print("-" * 40)
    
    protected_endpoints = [
        ("/api/v1/cases/", "GET", "List cases (should require auth)"),
        ("/api/v1/users/", "GET", "List users (should require auth)"),
        ("/api/v1/auth/me", "GET", "Get current user (should require auth)")
    ]
    
    for endpoint, method, description in protected_endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            status = "✅" if response.status_code == 401 else "⚠️"
            print(f"{status} {method} {endpoint} - {description}")
            print(f"    Status: {response.status_code} (401 expected for no auth)")
            if response.status_code != 401:
                print(f"    Response: {response.text[:200]}...")
        except requests.RequestException as e:
            print(f"❌ {method} {endpoint} - {description}")
            print(f"    Error: {e}")
    
    # Test login endpoint (should work even without database)
    print(f"\n🔐 Testing Authentication Endpoint:")
    print("-" * 40)
    
    try:
        login_data = {
            "email": "test@example.com", 
            "password": "testpass"
        }
        response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data, timeout=5)
        print(f"🔑 POST /api/v1/auth/login")
        print(f"    Status: {response.status_code} (500 expected without database)")
        if response.status_code != 200:
            error_detail = response.json().get('detail', 'No detail') if response.headers.get('content-type') == 'application/json' else 'Non-JSON response'
            print(f"    Error: {error_detail}")
    except requests.RequestException as e:
        print(f"❌ POST /api/v1/auth/login")
        print(f"    Error: {e}")
    
    return True

def main():
    print("🚀 JCTC Management System - Server Testing")
    print("=" * 50)
    
    # Check if server is already running
    try:
        response = requests.get("http://localhost:8000/health", timeout=2)
        if response.status_code == 200:
            print("✅ Server is already running on port 8000")
            test_server_endpoints()
            return
    except requests.RequestException:
        pass
    
    print("🔄 Starting server for testing...")
    
    # Start server in background
    server_process = None
    try:
        server_process = subprocess.Popen([
            sys.executable, "run.py"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Give server time to start
        time.sleep(3)
        
        # Test endpoints
        test_server_endpoints()
        
    except KeyboardInterrupt:
        print("\n⏹️ Testing interrupted by user")
    except Exception as e:
        print(f"❌ Error during testing: {e}")
    finally:
        if server_process:
            print("\n🔄 Stopping server...")
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()
    
    print("\n📊 Testing Summary:")
    print("- Basic endpoints should return 200")
    print("- Protected endpoints should return 401 (Unauthorized)")
    print("- Database-dependent endpoints may return 500 without DB")
    print("- This is normal for testing without a database setup")
    
    print(f"\n📚 Next Steps:")
    print("1. Access interactive docs: http://localhost:8000/docs")
    print("2. Set up PostgreSQL database for full functionality")
    print("3. Create admin user and test authentication")

if __name__ == "__main__":
    main()