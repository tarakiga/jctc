"""
Script to populate the database with mock cases and evidence for testing
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy import select
from app.database.base import AsyncSessionLocal
from app.models.case import Case, CaseStatus
from app.models.evidence import EvidenceItem, EvidenceCategory, ChainOfCustody, CustodyAction
from app.models.user import User, UserRole


async def get_or_create_user(session):
    """Get existing user or create a test user"""
    result = await session.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    
    if not user:
        print("No user found. Please create a user first.")
        sys.exit(1)
    
    return user


async def create_mock_cases(session, user):
    """Create mock cases"""
    print("Creating mock cases...")
    
    cases_data = [
        {
            "case_number": "JCTC-2025-A7B3C",
            "title": "Business Email Compromise - ABC Corp",
            "description": "Investigation into BEC attack targeting finance department. Suspect impersonated CEO to authorize fraudulent wire transfers totaling $450,000.",
            "case_type_id": None,
            "severity": 5,
            "status": CaseStatus.UNDER_INVESTIGATION,
            "local_or_international": "LOCAL",
            "originating_country": "NG",  # Nigeria
            "date_reported": datetime.now() - timedelta(days=15),
        },
        {
            "case_number": "JCTC-2025-B8C4D",
            "title": "Corporate Data Breach - TechStart Inc",
            "description": "Unauthorized access to customer database. Approximately 50,000 customer records exposed including PII and payment information.",
            "case_type_id": None,
            "severity": 4,
            "status": CaseStatus.OPEN,
            "local_or_international": "LOCAL",
            "originating_country": None,
            "date_reported": datetime.now() - timedelta(days=8),
        },
        {
            "case_number": "JCTC-2025-C9D5E",
            "title": "Ransomware Attack - City Hospital",
            "description": "Ransomware encrypted critical hospital systems. Ransom demand of 50 BTC. Patient data potentially compromised.",
            "case_type_id": None,
            "severity": 5,
            "status": CaseStatus.UNDER_INVESTIGATION,
            "local_or_international": "LOCAL",
            "originating_country": None,
            "date_reported": datetime.now() - timedelta(days=3),
        },
        {
            "case_number": "JCTC-2025-D0E6F",
            "title": "Cryptocurrency Fraud Investigation",
            "description": "Ponzi scheme using fake cryptocurrency investment platform. Estimated 200+ victims with losses exceeding $2M.",
            "case_type_id": None,
            "severity": 4,
            "status": CaseStatus.PENDING_PROSECUTION,
            "local_or_international": "INTERNATIONAL",
            "originating_country": "RU",  # Russia
            "cooperating_countries": ["US", "GB"],  # USA, UK
            "date_reported": datetime.now() - timedelta(days=45),
        },
        {
            "case_number": "JCTC-2025-E1F7G",
            "title": "Social Media Account Hijacking",
            "description": "Multiple high-profile social media accounts compromised through SIM swapping attack. Used for cryptocurrency scams.",
            "case_type_id": None,
            "severity": 3,
            "status": CaseStatus.UNDER_INVESTIGATION,
            "local_or_international": "LOCAL",
            "originating_country": None,
            "date_reported": datetime.now() - timedelta(days=12),
        },
        {
            "case_number": "JCTC-2024-F2G8H",
            "title": "Online Banking Fraud Ring",
            "description": "Organized group using phishing to steal online banking credentials. Over 100 victims identified.",
            "case_type_id": None,
            "severity": 4,
            "status": CaseStatus.IN_COURT,
            "local_or_international": "LOCAL",
            "originating_country": None,
            "date_reported": datetime.now() - timedelta(days=120),
        },
    ]
    
    cases = []
    for case_data in cases_data:
        case = Case(
            id=uuid4(),
            **case_data,
            created_by=user.id,
            lead_investigator=user.id,
        )
        session.add(case)
        cases.append(case)
    
    await session.flush()
    print(f"✓ Created {len(cases)} mock cases")
    return cases


async def create_mock_evidence(session, cases, user):
    """Create mock evidence items"""
    print("Creating mock evidence...")
    
    evidence_data = [
        # Case 1 - BEC
        {
            "case": cases[0],
            "label": "Email Server Logs",
            "category": EvidenceCategory.DIGITAL,
            "storage_location": "Evidence Vault - Shelf A3",
            "notes": "Complete email server logs showing suspicious login patterns and email forwarding rules",
        },
        {
            "case": cases[0],
            "label": "Bank Transaction Records",
            "category": EvidenceCategory.PHYSICAL,
            "storage_location": "Evidence Vault - Shelf A3",
            "notes": "Wire transfer records showing unauthorized transactions to offshore accounts",
        },
        # Case 2 - Data Breach
        {
            "case": cases[1],
            "label": "Server Hard Drive",
            "category": EvidenceCategory.PHYSICAL,
            "storage_location": "Evidence Vault - Shelf B1",
            "notes": "Hard drive from compromised server. Contains access logs and malware traces.",
        },
        {
            "case": cases[1],
            "label": "Network Traffic Capture",
            "category": EvidenceCategory.DIGITAL,
            "storage_location": "Digital Evidence Storage - Server 1",
            "notes": "PCAP files showing data exfiltration patterns over 48-hour period",
        },
        # Case 3 - Ransomware
        {
            "case": cases[2],
            "label": "Ransomware Sample",
            "category": EvidenceCategory.DIGITAL,
            "storage_location": "Malware Lab - Isolated System",
            "notes": "Encrypted file samples and ransom note. SHA256: 5f4dcc3b5aa765d61d8327deb882cf99",
        },
        {
            "case": cases[2],
            "label": "Network Logs",
            "category": EvidenceCategory.DIGITAL,
            "storage_location": "Digital Evidence Storage - Server 2",
            "notes": "Firewall and IDS logs showing initial compromise vector",
        },
        {
            "case": cases[2],
            "label": "Backup Server Drive",
            "category": EvidenceCategory.PHYSICAL,
            "storage_location": "Evidence Vault - Shelf C2",
            "notes": "Backup server that was also encrypted during attack",
        },
        # Case 4 - Crypto Fraud
        {
            "case": cases[3],
            "label": "Website Source Code",
            "category": EvidenceCategory.DIGITAL,
            "storage_location": "Digital Evidence Storage - Server 1",
            "notes": "Source code of fraudulent cryptocurrency investment platform",
        },
        {
            "case": cases[3],
            "label": "Database Dump",
            "category": EvidenceCategory.DIGITAL,
            "storage_location": "Digital Evidence Storage - Server 1",
            "notes": "Complete database including victim information and transaction records",
        },
        # Case 5 - Social Media Hijacking
        {
            "case": cases[4],
            "label": "SIM Card Records",
            "category": EvidenceCategory.PHYSICAL,
            "storage_location": "Evidence Vault - Shelf D1",
            "notes": "SIM card swap authorization records from mobile carrier",
        },
        {
            "case": cases[4],
            "label": "Phone Call Recordings",
            "category": EvidenceCategory.DIGITAL,
            "storage_location": "Digital Evidence Storage - Server 3",
            "notes": "Recorded calls between suspects coordinating the attack",
        },
    ]
    
    evidence_items = []
    for item_data in evidence_data:
        case = item_data.pop("case")
        evidence = EvidenceItem(
            id=uuid4(),
            case_id=case.id,
            **item_data,
            retention_policy="7Y_AFTER_CLOSE",
        )
        session.add(evidence)
        evidence_items.append(evidence)
        
        # Add chain of custody entry
        custody_entry = ChainOfCustody(
            id=uuid4(),
            evidence_id=evidence.id,
            action=CustodyAction.SEIZED,
            to_user=user.id,
            timestamp=datetime.now() - timedelta(days=5),
            location="Crime Scene / Digital Forensics Lab",
            details="Evidence collected and secured in evidence management system",
        )
        session.add(custody_entry)
    
    await session.flush()
    print(f"✓ Created {len(evidence_items)} mock evidence items")
    return evidence_items


async def main():
    """Main function to seed database"""
    print("=" * 60)
    print("Seeding Database with Mock Data")
    print("=" * 60)
    
    async with AsyncSessionLocal() as session:
        try:
            # Get or create user
            user = await get_or_create_user(session)
            print(f"Using user: {user.full_name} ({user.email})")
            
            # Create mock data
            cases = await create_mock_cases(session, user)
            evidence = await create_mock_evidence(session, cases, user)
            
            # Commit transaction
            await session.commit()
            
            print("\n" + "=" * 60)
            print("✓ Database seeded successfully!")
            print(f"  - {len(cases)} cases created")
            print(f"  - {len(evidence)} evidence items created")
            print("=" * 60)
            
        except Exception as e:
            await session.rollback()
            print(f"\n✗ Error seeding database: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
