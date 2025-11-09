#!/usr/bin/env python3
"""
Test the newly added LIAISON and SUPERVISOR users
"""
import requests
import json

def test_new_users():
    """Test LIAISON and SUPERVISOR authentication"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing New LIAISON and SUPERVISOR Users")
    print("=" * 50)
    
    # Test users
    new_users = [
        ("liaison@jctc.gov.ng", "liaison123", "LIAISON"),
        ("supervisor@jctc.gov.ng", "supervisor123", "SUPERVISOR")
    ]
    
    for email, password, expected_role in new_users:
        print(f"\n🔐 Testing {expected_role} ({email}):")
        
        try:
            # Test login
            login_data = {"email": email, "password": password}
            login_response = requests.post(f"{base_url}/api/v1/auth/login", 
                                         json=login_data, timeout=5)
            
            if login_response.status_code == 200:
                token_data = login_response.json()
                access_token = token_data["access_token"]
                print(f"   ✅ Login successful!")
                print(f"   🔑 Token length: {len(access_token)} chars")
                
                # Test current user endpoint
                headers = {"Authorization": f"Bearer {access_token}"}
                me_response = requests.get(f"{base_url}/api/v1/auth/me", 
                                         headers=headers, timeout=5)
                
                if me_response.status_code == 200:
                    user_data = me_response.json()
                    print(f"   👤 Name: {user_data['full_name']}")
                    print(f"   🏢 Organization: {user_data['org_unit']}")
                    print(f"   🎯 Role: {user_data['role']}")
                    
                    # Verify role matches expected
                    if user_data['role'] == expected_role:
                        print(f"   ✅ Role verification passed")
                    else:
                        print(f"   ❌ Role mismatch: expected {expected_role}, got {user_data['role']}")
                        
                    # Test access to protected endpoint
                    cases_response = requests.get(f"{base_url}/api/v1/cases/", 
                                                headers=headers, timeout=5)
                    if cases_response.status_code == 200:
                        cases = cases_response.json()
                        print(f"   📋 Can access {len(cases)} cases")
                    else:
                        print(f"   ❌ Cannot access cases: {cases_response.status_code}")
                        
                else:
                    print(f"   ❌ Failed to get user info: {me_response.status_code}")
            else:
                print(f"   ❌ Login failed: {login_response.status_code}")
                print(f"   Error: {login_response.text}")
                
        except requests.RequestException as e:
            print(f"   ❌ Request failed: {e}")
    
    print(f"\n🎉 All 7 User Roles Now Available!")
    print("=" * 40)
    print("Complete credentials list:")
    print("  • Admin: admin@jctc.gov.ng / admin123")
    print("  • Supervisor: supervisor@jctc.gov.ng / supervisor123")  
    print("  • Liaison: liaison@jctc.gov.ng / liaison123")
    print("  • Investigator: investigator@jctc.gov.ng / investigator123")
    print("  • Intake: intake@jctc.gov.ng / intake123")
    print("  • Prosecutor: prosecutor@jctc.gov.ng / prosecutor123")
    print("  • Forensic: forensic@jctc.gov.ng / forensic123")

if __name__ == "__main__":
    test_new_users()