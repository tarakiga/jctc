"""
Script to check if mock data exists in the database
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func
from app.database.base import AsyncSessionLocal
from app.models.case import Case
from app.models.evidence import EvidenceItem


async def main():
    """Main function to check data"""
    print("=" * 60)
    print("Checking Database Data")
    print("=" * 60)
    
    async with AsyncSessionLocal() as session:
        try:
            # Check cases
            cases_result = await session.execute(select(func.count(Case.id)))
            cases_count = cases_result.scalar()
            print(f"\n📁 Cases: {cases_count}")
            
            if cases_count > 0:
                # Get some case details
                cases_result = await session.execute(select(Case).limit(5))
                cases = cases_result.scalars().all()
                for case in cases:
                    print(f"   - {case.case_number}: {case.title} (Status: {case.status})")
            
            # Check evidence
            evidence_result = await session.execute(select(func.count(EvidenceItem.id)))
            evidence_count = evidence_result.scalar()
            print(f"\n🔍 Evidence Items: {evidence_count}")
            
            if evidence_count > 0:
                # Get some evidence details
                evidence_result = await session.execute(select(EvidenceItem).limit(5))
                evidence = evidence_result.scalars().all()
                for item in evidence:
                    print(f"   - {item.label} ({item.category}) - Case: {item.case_id}")
            
            print("\n" + "=" * 60)
            if cases_count == 0 and evidence_count == 0:
                print("⚠️  No data found. Run 'python scripts/seed_mock_data.py'")
            else:
                print("✓ Data exists in database")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n✗ Error checking database: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
