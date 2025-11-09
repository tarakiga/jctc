#!/usr/bin/env python3
"""
Phase 2A Evidence Management System Test Script

This script tests all the new Phase 2A functionality including:
- Evidence Management APIs
- Chain of Custody tracking
- Party Management (suspects/victims/witnesses)
- Legal Instruments (warrants/MLATs)
"""

import requests
import json
import uuid
import os
from datetime import datetime, date, timedelta
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@jctc.gov"
ADMIN_PASSWORD = "admin123"

class TestPhase2A:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_case_id = None
        self.test_evidence_id = None
        self.test_party_id = None
        self.test_instrument_id = None

    def authenticate(self):
        """Authenticate as admin user"""
        print("🔐 Authenticating...")
        
        response = self.session.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
            print("✅ Authentication successful")
        else:
            print(f"❌ Authentication failed: {response.status_code} - {response.text}")
            raise Exception("Authentication failed")

    def create_test_case(self):
        """Create a test case for our evidence tests"""
        print("\n📋 Creating test case...")
        
        case_data = {
            "case_number": f"TEST-{uuid.uuid4().hex[:8].upper()}",
            "title": "Phase 2A Test Case - Evidence Management",
            "description": "Test case for Phase 2A evidence management functionality",
            "priority": "HIGH",
            "status": "ACTIVE"
        }
        
        response = self.session.post(f"{BASE_URL}/cases/", json=case_data)
        
        if response.status_code == 201:
            self.test_case_id = response.json()["id"]
            print(f"✅ Test case created: {self.test_case_id}")
        else:
            print(f"❌ Failed to create test case: {response.status_code} - {response.text}")
            raise Exception("Failed to create test case")

    def test_evidence_management(self):
        """Test evidence CRUD operations"""
        print("\n🔍 Testing Evidence Management...")
        
        # Create evidence
        evidence_data = {
            "label": "TEST-EVIDENCE-001",
            "description": "Test digital evidence - smartphone data",
            "type": "DIGITAL_DEVICE",
            "source": "Search warrant execution",
            "acquired_date": str(date.today()),
            "acquired_by": "Detective Smith",
            "location_found": "Suspect's residence - bedroom",
            "case_id": self.test_case_id,
            "status": "COLLECTED",
            "retention_policy": "5Y_AFTER_CLOSE"
        }
        
        response = self.session.post(f"{BASE_URL}/evidence/", json=evidence_data)
        if response.status_code == 201:
            self.test_evidence_id = response.json()["id"]
            print(f"✅ Evidence created: {self.test_evidence_id}")
        else:
            print(f"❌ Failed to create evidence: {response.status_code} - {response.text}")
            return False
        
        # Get evidence
        response = self.session.get(f"{BASE_URL}/evidence/{self.test_evidence_id}")
        if response.status_code == 200:
            print("✅ Evidence retrieved successfully")
        else:
            print(f"❌ Failed to get evidence: {response.status_code}")
            return False
        
        # Update evidence
        update_data = {
            "description": "Updated: Test digital evidence - iPhone 12 Pro",
            "notes": "Device has been secured and is ready for forensic analysis"
        }
        
        response = self.session.put(f"{BASE_URL}/evidence/{self.test_evidence_id}", json=update_data)
        if response.status_code == 200:
            print("✅ Evidence updated successfully")
        else:
            print(f"❌ Failed to update evidence: {response.status_code}")
            return False
        
        # List evidence
        response = self.session.get(f"{BASE_URL}/evidence/", params={"case_id": self.test_case_id})
        if response.status_code == 200:
            evidence_list = response.json()
            print(f"✅ Evidence list retrieved: {len(evidence_list)} items")
        else:
            print(f"❌ Failed to list evidence: {response.status_code}")
            return False
        
        return True

    def test_file_upload(self):
        """Test evidence file upload with hashing"""
        print("\n📁 Testing File Upload...")
        
        # Create a test file
        test_file_content = b"This is a test evidence file with some binary data: " + os.urandom(1024)
        test_filename = "test_evidence.dat"
        
        files = {
            "file": (test_filename, test_file_content, "application/octet-stream")
        }
        
        data = {
            "description": "Test file attachment for evidence"
        }
        
        response = self.session.post(
            f"{BASE_URL}/evidence/{self.test_evidence_id}/files",
            files=files,
            data=data
        )
        
        if response.status_code == 201:
            file_info = response.json()
            print(f"✅ File uploaded successfully: {file_info['filename']}")
            print(f"   SHA256: {file_info['sha256_hash']}")
            print(f"   Size: {file_info['file_size']} bytes")
            
            # Test file integrity verification
            response = self.session.post(f"{BASE_URL}/evidence/{self.test_evidence_id}/verify")
            if response.status_code == 200:
                verification = response.json()
                print(f"✅ File integrity verified: {verification['all_valid']}")
            else:
                print(f"❌ Failed to verify file integrity: {response.status_code}")
                return False
            
        else:
            print(f"❌ Failed to upload file: {response.status_code} - {response.text}")
            return False
        
        return True

    def test_chain_of_custody(self):
        """Test chain of custody tracking"""
        print("\n🔗 Testing Chain of Custody...")
        
        # Initial custody entry (evidence collection)
        custody_data = {
            "action": "COLLECTED",
            "custodian_from": None,
            "custodian_to": "Detective Smith",
            "location_from": "Crime Scene",
            "location_to": "Evidence Room A-1",
            "purpose": "Initial evidence collection",
            "notes": "Evidence secured at crime scene and transported to evidence room"
        }
        
        response = self.session.post(f"{BASE_URL}/custody/{self.test_evidence_id}/entries", json=custody_data)
        if response.status_code == 201:
            print("✅ Initial custody entry created")
        else:
            print(f"❌ Failed to create custody entry: {response.status_code}")
            return False
        
        # Transfer custody for analysis
        transfer_data = {
            "custodian_to": "Forensic Analyst Johnson",
            "location_to": "Digital Forensics Lab",
            "purpose": "Digital forensic analysis",
            "notes": "Device transferred for mobile forensics examination"
        }
        
        response = self.session.post(f"{BASE_URL}/custody/{self.test_evidence_id}/transfer", json=transfer_data)
        if response.status_code == 200:
            print("✅ Custody transferred successfully")
        else:
            print(f"❌ Failed to transfer custody: {response.status_code}")
            return False
        
        # Check out evidence
        response = self.session.post(
            f"{BASE_URL}/custody/{self.test_evidence_id}/checkout",
            params={
                "checkout_to": "Senior Analyst Williams",
                "location_to": "Secure Lab Station 3",
                "purpose": "Advanced data recovery"
            }
        )
        
        if response.status_code == 200:
            print("✅ Evidence checked out successfully")
        else:
            print(f"❌ Failed to checkout evidence: {response.status_code}")
            return False
        
        # Check in evidence
        response = self.session.post(
            f"{BASE_URL}/custody/{self.test_evidence_id}/checkin",
            params={"notes": "Analysis completed, evidence returned to storage"}
        )
        
        if response.status_code == 200:
            print("✅ Evidence checked in successfully")
        else:
            print(f"❌ Failed to checkin evidence: {response.status_code}")
            return False
        
        # Get custody history
        response = self.session.get(f"{BASE_URL}/custody/{self.test_evidence_id}/history")
        if response.status_code == 200:
            history = response.json()
            print(f"✅ Custody history retrieved: {history['total_entries']} entries")
        else:
            print(f"❌ Failed to get custody history: {response.status_code}")
            return False
        
        # Check for gaps in chain of custody
        response = self.session.get(f"{BASE_URL}/custody/{self.test_evidence_id}/gaps")
        if response.status_code == 200:
            gaps_check = response.json()
            print(f"✅ Chain integrity check: Intact = {gaps_check['chain_intact']}")
        else:
            print(f"❌ Failed to check custody gaps: {response.status_code}")
            return False
        
        return True

    def test_party_management(self):
        """Test party (suspect/victim/witness) management"""
        print("\n👤 Testing Party Management...")
        
        # Create a suspect
        suspect_data = {
            "type": "SUSPECT",
            "first_name": "John",
            "last_name": "Doe",
            "date_of_birth": "1985-06-15",
            "nationality": "US",
            "identification_type": "DRIVER_LICENSE",
            "identification_number": "DL123456789",
            "address": "123 Main St",
            "city": "Anytown",
            "state": "NY",
            "country": "USA",
            "postal_code": "12345",
            "phone": "+1-555-123-4567",
            "email": "john.doe@example.com",
            "status": "ACTIVE"
        }
        
        response = self.session.post(f"{BASE_URL}/parties/", json=suspect_data)
        if response.status_code == 201:
            self.test_party_id = response.json()["id"]
            print(f"✅ Suspect created: {self.test_party_id}")
        else:
            print(f"❌ Failed to create suspect: {response.status_code}")
            return False
        
        # Associate party to case
        response = self.session.post(
            f"{BASE_URL}/parties/{self.test_party_id}/associate-case/{self.test_case_id}",
            params={"role": "PRIMARY_SUSPECT"}
        )
        
        if response.status_code == 200:
            print("✅ Party associated to case successfully")
        else:
            print(f"❌ Failed to associate party to case: {response.status_code}")
            return False
        
        # Create a victim
        victim_data = {
            "type": "VICTIM",
            "first_name": "Jane",
            "last_name": "Smith",
            "date_of_birth": "1990-03-22",
            "nationality": "US",
            "phone": "+1-555-987-6543",
            "email": "jane.smith@example.com",
            "status": "ACTIVE"
        }
        
        response = self.session.post(f"{BASE_URL}/parties/", json=victim_data)
        if response.status_code == 201:
            victim_id = response.json()["id"]
            print(f"✅ Victim created: {victim_id}")
        else:
            print(f"❌ Failed to create victim: {response.status_code}")
            return False
        
        # Search parties
        response = self.session.post(f"{BASE_URL}/parties/search", json={"last_name": "Doe"})
        if response.status_code == 200:
            search_results = response.json()
            print(f"✅ Party search completed: {len(search_results)} results")
        else:
            print(f"❌ Failed to search parties: {response.status_code}")
            return False
        
        # Check for duplicates
        response = self.session.get(f"{BASE_URL}/parties/{self.test_party_id}/duplicate-check")
        if response.status_code == 200:
            duplicate_check = response.json()
            print(f"✅ Duplicate check completed: {duplicate_check['total_found']} potential duplicates")
        else:
            print(f"❌ Failed to check for duplicates: {response.status_code}")
            return False
        
        return True

    def test_legal_instruments(self):
        """Test legal instruments (warrants/MLATs) management"""
        print("\n⚖️ Testing Legal Instruments...")
        
        # Create a search warrant
        warrant_data = {
            "type": "SEARCH_WARRANT",
            "reference_number": f"SW-{uuid.uuid4().hex[:8].upper()}",
            "title": "Search Warrant - Digital Devices",
            "description": "Warrant to search suspect's digital devices",
            "case_id": self.test_case_id,
            "issuing_authority": "District Court Judge",
            "issuing_country": "USA",
            "issue_date": str(date.today()),
            "expiry_date": str(date.today() + timedelta(days=30)),
            "execution_deadline": str(date.today() + timedelta(days=14)),
            "status": "ACTIVE",
            "priority": "HIGH",
            "subject_matter": "Digital forensic examination of seized devices",
            "legal_basis": "18 USC 2703",
            "conditions": "Search limited to evidence related to cybercrime investigation"
        }
        
        response = self.session.post(f"{BASE_URL}/legal-instruments/", json=warrant_data)
        if response.status_code == 201:
            self.test_instrument_id = response.json()["id"]
            print(f"✅ Search warrant created: {self.test_instrument_id}")
        else:
            print(f"❌ Failed to create warrant: {response.status_code}")
            return False
        
        # Create an MLAT request
        mlat_data = {
            "type": "MLAT_OUTGOING",
            "reference_number": f"MLAT-{uuid.uuid4().hex[:8].upper()}",
            "title": "MLAT Request - Financial Records",
            "description": "Request for financial records from foreign jurisdiction",
            "case_id": self.test_case_id,
            "issuing_authority": "US Department of Justice",
            "issuing_country": "USA",
            "receiving_authority": "Crown Prosecution Service",
            "receiving_country": "UK",
            "issue_date": str(date.today()),
            "execution_deadline": str(date.today() + timedelta(days=90)),
            "status": "PENDING",
            "priority": "MEDIUM",
            "subject_matter": "Banking records for suspect accounts",
            "legal_basis": "US-UK MLAT"
        }
        
        response = self.session.post(f"{BASE_URL}/legal-instruments/", json=mlat_data)
        if response.status_code == 201:
            mlat_id = response.json()["id"]
            print(f"✅ MLAT request created: {mlat_id}")
        else:
            print(f"❌ Failed to create MLAT: {response.status_code}")
            return False
        
        # Execute the warrant
        response = self.session.post(
            f"{BASE_URL}/legal-instruments/{self.test_instrument_id}/execute",
            params={"execution_notes": "Search warrant executed successfully, devices seized"}
        )
        
        if response.status_code == 200:
            print("✅ Warrant executed successfully")
        else:
            print(f"❌ Failed to execute warrant: {response.status_code}")
            return False
        
        # Get expiring instruments
        response = self.session.get(f"{BASE_URL}/legal-instruments/expiring", params={"days": 30})
        if response.status_code == 200:
            expiring = response.json()
            print(f"✅ Expiring instruments check: {len(expiring)} expiring soon")
        else:
            print(f"❌ Failed to get expiring instruments: {response.status_code}")
            return False
        
        # Get deadline alerts
        response = self.session.get(f"{BASE_URL}/legal-instruments/deadline-alerts")
        if response.status_code == 200:
            alerts = response.json()
            print(f"✅ Deadline alerts: {alerts['total_alerts']} alerts")
        else:
            print(f"❌ Failed to get deadline alerts: {response.status_code}")
            return False
        
        # Get statistics
        response = self.session.get(f"{BASE_URL}/legal-instruments/statistics")
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Legal instruments statistics: {stats['total_instruments']} total")
        else:
            print(f"❌ Failed to get statistics: {response.status_code}")
            return False
        
        return True

    def test_integration_scenarios(self):
        """Test integrated scenarios across all Phase 2A components"""
        print("\n🔄 Testing Integration Scenarios...")
        
        # Scenario 1: Complete evidence workflow
        print("  📋 Scenario 1: Complete evidence workflow")
        
        # Get parties associated with case
        response = self.session.get(f"{BASE_URL}/parties/case/{self.test_case_id}")
        if response.status_code == 200:
            case_parties = response.json()
            print(f"    ✅ Case parties: {len(case_parties)} associated")
        
        # Get evidence for case
        response = self.session.get(f"{BASE_URL}/evidence/", params={"case_id": self.test_case_id})
        if response.status_code == 200:
            case_evidence = response.json()
            print(f"    ✅ Case evidence: {len(case_evidence)} items")
        
        # Get legal instruments for case
        response = self.session.get(f"{BASE_URL}/legal-instruments/", params={"case_id": self.test_case_id})
        if response.status_code == 200:
            case_instruments = response.json()
            print(f"    ✅ Case instruments: {len(case_instruments)} items")
        
        print("  📋 Scenario 1 completed successfully")
        
        return True

    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Note: In a real system, you might want to delete test data
        # For now, we'll just mark the case as completed
        if self.test_case_id:
            update_data = {
                "status": "CLOSED",
                "notes": "Test case for Phase 2A functionality - completed"
            }
            response = self.session.put(f"{BASE_URL}/cases/{self.test_case_id}", json=update_data)
            if response.status_code == 200:
                print("✅ Test case closed")

    def run_all_tests(self):
        """Run all Phase 2A tests"""
        print("🚀 Starting Phase 2A Evidence Management System Tests")
        print("=" * 60)
        
        try:
            # Setup
            self.authenticate()
            self.create_test_case()
            
            # Core functionality tests
            tests = [
                ("Evidence Management", self.test_evidence_management),
                ("File Upload & Hashing", self.test_file_upload),
                ("Chain of Custody", self.test_chain_of_custody),
                ("Party Management", self.test_party_management),
                ("Legal Instruments", self.test_legal_instruments),
                ("Integration Scenarios", self.test_integration_scenarios)
            ]
            
            passed = 0
            failed = 0
            
            for test_name, test_func in tests:
                try:
                    if test_func():
                        passed += 1
                    else:
                        failed += 1
                        print(f"❌ {test_name} test failed")
                except Exception as e:
                    failed += 1
                    print(f"❌ {test_name} test failed with exception: {str(e)}")
            
            # Cleanup
            self.cleanup()
            
            # Results
            print("\n" + "=" * 60)
            print("📊 Phase 2A Test Results")
            print(f"✅ Passed: {passed}")
            print(f"❌ Failed: {failed}")
            print(f"📈 Success Rate: {(passed / (passed + failed)) * 100:.1f}%")
            
            if failed == 0:
                print("\n🎉 All Phase 2A tests passed successfully!")
                return True
            else:
                print(f"\n⚠️ {failed} test(s) failed. Check the output above for details.")
                return False
                
        except Exception as e:
            print(f"\n💥 Test suite failed with exception: {str(e)}")
            return False

if __name__ == "__main__":
    tester = TestPhase2A()
    success = tester.run_all_tests()
    exit(0 if success else 1)