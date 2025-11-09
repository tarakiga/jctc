#!/usr/bin/env python3
"""
Create admin user and sample data for JCTC Management System
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.user import User, UserRole, LookupCaseType
from app.utils.auth import get_password_hash
from app.config.settings import settings

async def create_sample_data():
    """Create admin user and sample case types"""
    print("🔄 Creating admin user and sample data...")
    
    # Create async engine and session
    engine = create_async_engine(settings.database_url)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        try:
            # Create admin user
            print("👤 Creating admin user...")
            admin_user = User(
                email="admin@jctc.gov.ng",
                full_name="System Administrator",
                role=UserRole.ADMIN,
                org_unit="JCTC HQ",
                is_active=True,
                hashed_password=get_password_hash("admin123")
            )
            session.add(admin_user)
            
            # Create some sample users with different roles
            print("👥 Creating sample users...")
            users = [
                User(
                    email="investigator@jctc.gov.ng",
                    full_name="Lead Investigator",
                    role=UserRole.INVESTIGATOR,
                    org_unit="JCTC Lagos",
                    is_active=True,
                    hashed_password=get_password_hash("investigator123")
                ),
                User(
                    email="intake@jctc.gov.ng",
                    full_name="Intake Officer",
                    role=UserRole.INTAKE,
                    org_unit="JCTC HQ",
                    is_active=True,
                    hashed_password=get_password_hash("intake123")
                ),
                User(
                    email="prosecutor@jctc.gov.ng",
                    full_name="Senior Prosecutor",
                    role=UserRole.PROSECUTOR,
                    org_unit="NAPTIP",
                    is_active=True,
                    hashed_password=get_password_hash("prosecutor123")
                ),
                User(
                    email="forensic@jctc.gov.ng",
                    full_name="Forensic Analyst",
                    role=UserRole.FORENSIC,
                    org_unit="JCTC Lab",
                    is_active=True,
                    hashed_password=get_password_hash("forensic123")
                )
            ]
            
            for user in users:
                session.add(user)
            
            # Create sample case types
            print("📋 Creating case types...")
            case_types = [
                LookupCaseType(
                    code="TIP_SEXTORTION",
                    label="Online Sextortion",
                    description="Cases involving online sextortion and blackmail"
                ),
                LookupCaseType(
                    code="ONLINE_CHILD_EXPLOITATION",
                    label="Online Child Exploitation", 
                    description="Cases involving exploitation of minors online"
                ),
                LookupCaseType(
                    code="CYBERBULLYING",
                    label="Cyberbullying",
                    description="Online harassment and bullying cases"
                ),
                LookupCaseType(
                    code="IDENTITY_THEFT",
                    label="Identity Theft",
                    description="Cases involving stolen personal information"
                ),
                LookupCaseType(
                    code="FINANCIAL_FRAUD",
                    label="Financial Fraud",
                    description="Online financial crimes and fraud"
                ),
                LookupCaseType(
                    code="RANSOMWARE",
                    label="Ransomware Attack",
                    description="Cases involving ransomware and extortion"
                ),
                LookupCaseType(
                    code="CYBERSTALKING",
                    label="Cyberstalking",
                    description="Online stalking and harassment cases"
                )
            ]
            
            for case_type in case_types:
                session.add(case_type)
            
            # Commit all changes
            await session.commit()
            
            print("✅ Successfully created:")
            print(f"   - 1 Admin user (admin@jctc.gov.ng / admin123)")
            print(f"   - 4 Sample users with different roles")
            print(f"   - {len(case_types)} Case types")
            
            print("\n🔑 User Credentials:")
            print("   Admin: admin@jctc.gov.ng / admin123")
            print("   Investigator: investigator@jctc.gov.ng / investigator123")
            print("   Intake: intake@jctc.gov.ng / intake123")
            print("   Prosecutor: prosecutor@jctc.gov.ng / prosecutor123")
            print("   Forensic: forensic@jctc.gov.ng / forensic123")
            
        except Exception as e:
            print(f"❌ Error creating data: {e}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_sample_data())