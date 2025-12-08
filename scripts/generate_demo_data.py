#!/usr/bin/env python3
"""
Demo Data Generator for JCTC Case Management System

This script generates realistic demo data for presentations and testing.
It connects to the backend API and populates the database with sample data.

Usage:
    python scripts/generate_demo_data.py [--api-url URL] [--clear-first]
    
Options:
    --api-url URL       API base URL (default: http://localhost:8000/api/v1)
    --clear-first       Clear existing demo data before generating new data
    --admin-email       Admin email for authentication (default: admin@jctc.gov.ng)
    --admin-password    Admin password for authentication (default: Admin@123)
"""

import argparse
import json
import random
import sys
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import uuid

try:
    import requests
except ImportError:
    print("Error: requests library is required. Install with: pip install requests")
    sys.exit(1)


# Demo data configuration
DEMO_USERS = [
    {
        "email": "admin@jctc.gov.ng",
        "password": "Admin@123",
        "full_name": "Administrator User",
        "role": "ADMIN",
        "org_unit": "HQ - Administration",
    },
    {
        "email": "supervisor@jctc.gov.ng",
        "password": "Supervisor@123",
        "full_name": "Sarah Williams",
        "role": "SUPERVISOR",
        "org_unit": "Lagos State Office",
    },
    {
        "email": "prosecutor@jctc.gov.ng",
        "password": "Prosecutor@123",
        "full_name": "Michael Okonkwo",
        "role": "PROSECUTOR",
        "org_unit": "Prosecution Division",
    },
    {
        "email": "investigator@jctc.gov.ng",
        "password": "Investigator@123",
        "full_name": "John Adebayo",
        "role": "INVESTIGATOR",
        "org_unit": "Investigation Unit",
    },
    {
        "email": "forensic@jctc.gov.ng",
        "password": "Forensic@123",
        "full_name": "Dr. Amina Hassan",
        "role": "FORENSIC",
        "org_unit": "Forensic Analysis Lab",
    },
    {
        "email": "liaison@jctc.gov.ng",
        "password": "Liaison@123",
        "full_name": "Emmanuel Nwosu",
        "role": "LIAISON",
        "org_unit": "International Cooperation",
    },
    {
        "email": "intake@jctc.gov.ng",
        "password": "Intake@123",
        "full_name": "Grace Okoro",
        "role": "INTAKE",
        "org_unit": "Case Intake Office",
    },
]

DEMO_CASES = [
    {
        "title": "Business Email Compromise - N50M Fraud",
        "description": "A sophisticated BEC attack targeting a major Nigerian bank. Attackers impersonated the CEO and requested fraudulent wire transfers totaling N50 million. Investigation ongoing with cooperation from FBI Cyber Division.",
        "status": "UNDER_INVESTIGATION",
        "severity": 5,
        "case_type": "FRAUD",
        "local_or_international": "INTERNATIONAL",
        "intake_channel": "REFERRAL",
        "risk_flags": ["FINANCIAL_CRITICAL", "CROSS_BORDER"],
        "platforms_implicated": ["Email", "Banking Portal"],
        "lga_state_location": "Lagos, Victoria Island",
    },
    {
        "title": "Romance Scam Network - Multiple Victims",
        "description": "International romance scam operation targeting elderly victims through dating platforms. At least 15 confirmed victims with total losses exceeding N20 million.",
        "status": "PENDING_PROSECUTION",
        "severity": 4,
        "case_type": "FRAUD",
        "local_or_international": "INTERNATIONAL",
        "intake_channel": "HOTLINE",
        "risk_flags": ["CROSS_BORDER"],
        "platforms_implicated": ["Facebook", "WhatsApp", "Dating Apps"],
        "lga_state_location": "Abuja, FCT",
    },
    {
        "title": "Corporate Data Breach - 500K Records Stolen",
        "description": "Major data breach at telecommunications company exposing personal information of 500,000 customers. Insider threat suspected.",
        "status": "IN_COURT",
        "severity": 5,
        "case_type": "HACKING",
        "local_or_international": "LOCAL",
        "intake_channel": "REFERRAL",
        "risk_flags": ["HIGH_PROFILE"],
        "platforms_implicated": ["Internal Systems", "Database"],
        "lga_state_location": "Port Harcourt, Rivers State",
    },
    {
        "title": "Phishing Campaign - Banking Credentials",
        "description": "Widespread phishing campaign mimicking major Nigerian banks. Fake websites set up to harvest login credentials.",
        "status": "OPEN",
        "severity": 3,
        "case_type": "FRAUD",
        "local_or_international": "LOCAL",
        "intake_channel": "EMAIL",
        "risk_flags": ["FINANCIAL_CRITICAL"],
        "platforms_implicated": ["Fake Banking Websites", "SMS"],
        "lga_state_location": "Lagos, Ikeja",
    },
    {
        "title": "Cryptocurrency Investment Fraud",
        "description": "Ponzi scheme disguised as cryptocurrency trading platform. Over 200 investors defrauded of approximately N30 million.",
        "status": "UNDER_INVESTIGATION",
        "severity": 4,
        "case_type": "FRAUD",
        "local_or_international": "LOCAL",
        "intake_channel": "WALK_IN",
        "risk_flags": ["FINANCIAL_CRITICAL"],
        "platforms_implicated": ["CryptoMax Website", "Telegram"],
        "lga_state_location": "Lagos, Lekki",
    },
    {
        "title": "Identity Theft - Social Media Account Hack",
        "description": "Individual social media account compromised and used to solicit money from contacts.",
        "status": "CLOSED",
        "severity": 2,
        "case_type": "IDENTITY_THEFT",
        "local_or_international": "LOCAL",
        "intake_channel": "WALK_IN",
        "platforms_implicated": ["Instagram", "WhatsApp"],
        "lga_state_location": "Ibadan, Oyo State",
    },
    {
        "title": "International Money Laundering Network",
        "description": "Cross-border money laundering operation using cryptocurrency and shell companies. Working with INTERPOL and FBI.",
        "status": "UNDER_INVESTIGATION",
        "severity": 5,
        "case_type": "FRAUD",
        "local_or_international": "INTERNATIONAL",
        "intake_channel": "PARTNER_AGENCY",
        "risk_flags": ["FINANCIAL_CRITICAL", "CROSS_BORDER", "HIGH_PROFILE"],
        "platforms_implicated": ["Cryptocurrency Exchanges", "Shell Companies"],
        "lga_state_location": "Lagos, Ikoyi",
        "originating_country": "Nigeria",
        "cooperating_countries": ["USA", "UK", "UAE", "Singapore"],
    },
    {
        "title": "Ransomware Attack - Hospital Systems",
        "description": "Ransomware attack on hospital management system in Kano. Patient data encrypted. Ransom of $50,000 in Bitcoin demanded.",
        "status": "PENDING_PROSECUTION",
        "severity": 5,
        "case_type": "HACKING",
        "local_or_international": "INTERNATIONAL",
        "intake_channel": "REFERRAL",
        "risk_flags": ["IMMINENT_HARM", "HIGH_PROFILE"],
        "platforms_implicated": ["Hospital Management System", "Network Infrastructure"],
        "lga_state_location": "Kano, Kano State",
    },
    {
        "title": "Online Sextortion Case",
        "description": "Victim reported being blackmailed with intimate images obtained through social engineering.",
        "status": "UNDER_INVESTIGATION",
        "severity": 4,
        "case_type": "SEXTORTION",
        "local_or_international": "LOCAL",
        "intake_channel": "HOTLINE",
        "risk_flags": ["SEXTORTION", "IMMINENT_HARM"],
        "platforms_implicated": ["Instagram", "Snapchat"],
        "lga_state_location": "Enugu, Enugu State",
    },
    {
        "title": "Child Safety - Online Grooming",
        "description": "Investigation into online grooming activities targeting minors through gaming platforms.",
        "status": "UNDER_INVESTIGATION",
        "severity": 5,
        "case_type": "HARASSMENT",
        "local_or_international": "INTERNATIONAL",
        "intake_channel": "PARTNER_AGENCY",
        "risk_flags": ["CHILD_SAFETY", "TRAFFICKING"],
        "platforms_implicated": ["Online Gaming Platform", "Discord"],
        "lga_state_location": "Lagos, Surulere",
    },
]

EVIDENCE_TYPES = ["DIGITAL", "PHYSICAL", "DOCUMENT", "FINANCIAL"]

DEMO_EVIDENCE = [
    {
        "label": "Email server logs showing spoofed communications",
        "category": "DIGITAL",
        "notes": "Complete email server logs for investigation period",
        "storage_location": "Digital Forensics Lab - Server Room A",
    },
    {
        "label": "Bank transaction records for fraudulent wire transfers",
        "category": "FINANCIAL",
        "notes": "Transaction records showing three fraudulent transfers",
        "storage_location": "Evidence Room B - Cabinet 12",
    },
    {
        "label": "Seized laptop containing fake dating profiles",
        "category": "PHYSICAL",
        "notes": "Dell Latitude laptop, serial number DL1234567",
        "storage_location": "Evidence Vault - Section C, Shelf 5",
    },
    {
        "label": "Victim statements and money transfer receipts",
        "category": "DOCUMENT",
        "notes": "15 victim statements documenting total losses",
        "storage_location": "Evidence Room A - File Cabinet 3",
    },
    {
        "label": "Database dump showing unauthorized access logs",
        "category": "DIGITAL",
        "notes": "Complete database dump with access logs",
        "storage_location": "Digital Forensics Lab - Secure Server 2",
    },
    {
        "label": "Screenshots of phishing websites",
        "category": "DIGITAL",
        "notes": "Complete mirror of 5 phishing domains before takedown",
        "storage_location": "Digital Evidence Archive - Cloud Storage",
    },
    {
        "label": "Cryptocurrency wallet addresses and transaction records",
        "category": "FINANCIAL",
        "notes": "Traced 47 Bitcoin transactions totaling 2.3 BTC",
        "storage_location": "Digital Evidence - Blockchain Analysis",
    },
    {
        "label": "Hospital server hard drives affected by ransomware",
        "category": "PHYSICAL",
        "notes": "3 server hard drives from hospital IT department",
        "storage_location": "Forensics Lab - Climate Controlled Room",
    },
]


class DemoDataGenerator:
    """Generates and populates demo data via the JCTC API."""

    def __init__(self, api_url: str, admin_email: str, admin_password: str):
        self.api_url = api_url.rstrip("/")
        self.admin_email = admin_email
        self.admin_password = admin_password
        self.token: Optional[str] = None
        self.created_cases: List[Dict[str, Any]] = []
        self.created_evidence: List[Dict[str, Any]] = []

    def _headers(self) -> Dict[str, str]:
        """Get request headers with authentication."""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def _request(
        self, method: str, endpoint: str, data: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Make an API request."""
        url = f"{self.api_url}{endpoint}"
        try:
            response = requests.request(
                method,
                url,
                headers=self._headers(),
                json=data,
                timeout=30,
            )
            if response.status_code in (200, 201):
                return response.json() if response.content else {}
            elif response.status_code == 422:
                print(f"Validation error: {response.json()}")
                return None
            else:
                print(f"Request failed: {response.status_code} - {response.text}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            return None

    def authenticate(self) -> bool:
        """Authenticate with the API."""
        print(f"Authenticating as {self.admin_email}...")
        
        # Try form-based authentication
        try:
            response = requests.post(
                f"{self.api_url}/auth/login",
                data={
                    "username": self.admin_email,
                    "password": self.admin_password,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30,
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                if self.token:
                    print("✓ Authentication successful")
                    return True
        except Exception as e:
            print(f"Form auth failed: {e}")

        # Try JSON-based authentication
        result = self._request(
            "POST",
            "/auth/login",
            {"email": self.admin_email, "password": self.admin_password},
        )
        if result and "access_token" in result:
            self.token = result["access_token"]
            print("✓ Authentication successful")
            return True

        print("✗ Authentication failed")
        return False

    def create_cases(self) -> None:
        """Create demo cases."""
        print("\nCreating demo cases...")
        
        for case_data in DEMO_CASES:
            result = self._request("POST", "/cases", case_data)
            if result:
                self.created_cases.append(result)
                print(f"  ✓ Created case: {case_data['title'][:50]}...")
            else:
                print(f"  ✗ Failed to create case: {case_data['title'][:50]}...")

        print(f"\n✓ Created {len(self.created_cases)} cases")

    def create_evidence(self) -> None:
        """Create demo evidence items linked to cases."""
        print("\nCreating demo evidence...")

        if not self.created_cases:
            print("  No cases available to link evidence to")
            return

        for i, evidence_data in enumerate(DEMO_EVIDENCE):
            # Link evidence to a random case
            case = self.created_cases[i % len(self.created_cases)]
            evidence_payload = {
                **evidence_data,
                "case_id": case.get("id"),
            }
            
            result = self._request("POST", "/evidence", evidence_payload)
            if result:
                self.created_evidence.append(result)
                print(f"  ✓ Created evidence: {evidence_data['label'][:50]}...")
            else:
                print(f"  ✗ Failed to create evidence: {evidence_data['label'][:50]}...")

        print(f"\n✓ Created {len(self.created_evidence)} evidence items")

    def generate_all(self) -> bool:
        """Generate all demo data."""
        print("\n" + "=" * 60)
        print("JCTC Demo Data Generator")
        print("=" * 60)
        print(f"\nAPI URL: {self.api_url}")

        if not self.authenticate():
            print("\nFailed to authenticate. Please check credentials.")
            return False

        self.create_cases()
        self.create_evidence()

        print("\n" + "=" * 60)
        print("Summary")
        print("=" * 60)
        print(f"  Cases created: {len(self.created_cases)}")
        print(f"  Evidence created: {len(self.created_evidence)}")
        print("=" * 60)

        return True


def main():
    parser = argparse.ArgumentParser(
        description="Generate demo data for JCTC Case Management System"
    )
    parser.add_argument(
        "--api-url",
        default="http://localhost:8000/api/v1",
        help="API base URL (default: http://localhost:8000/api/v1)",
    )
    parser.add_argument(
        "--admin-email",
        default="admin@jctc.gov.ng",
        help="Admin email for authentication",
    )
    parser.add_argument(
        "--admin-password",
        default="Admin@123",
        help="Admin password for authentication",
    )
    parser.add_argument(
        "--clear-first",
        action="store_true",
        help="Clear existing demo data before generating new data (not implemented)",
    )

    args = parser.parse_args()

    generator = DemoDataGenerator(
        api_url=args.api_url,
        admin_email=args.admin_email,
        admin_password=args.admin_password,
    )

    success = generator.generate_all()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
