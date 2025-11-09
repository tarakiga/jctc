#!/usr/bin/env python3
"""
Add missing LIAISON and SUPERVISOR users to JCTC Management System
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.user import User, UserRole
from app.utils.auth import get_password_hash
from app.config.settings import settings

async def add_missing_users():
    """Add LIAISON and SUPERVISOR users"""
    print("🔄 Adding missing LIAISON and SUPERVISOR users...")
    
    # Create async engine and session
    engine = create_async_engine(settings.database_url)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        try:
            # Create LIAISON user
            print("👤 Creating LIAISON user...")
            liaison_user = User(
                email="liaison@jctc.gov.ng",
                full_name="International Liaison Officer",
                role=UserRole.LIAISON,
                org_unit="JCTC International",
                is_active=True,
                hashed_password=get_password_hash("liaison123")
            )
            session.add(liaison_user)
            
            # Create SUPERVISOR user  
            print("👤 Creating SUPERVISOR user...")
            supervisor_user = User(
                email="supervisor@jctc.gov.ng",
                full_name="Operations Supervisor",
                role=UserRole.SUPERVISOR,
                org_unit="JCTC HQ",
                is_active=True,
                hashed_password=get_password_hash("supervisor123")
            )
            session.add(supervisor_user)
            
            # Commit changes
            await session.commit()
            
            print("✅ Successfully created:")
            print(f"   - LIAISON: liaison@jctc.gov.ng / liaison123")
            print(f"   - SUPERVISOR: supervisor@jctc.gov.ng / supervisor123")
            
            print("\n🔑 Complete User Credentials:")
            print("   Admin: admin@jctc.gov.ng / admin123")
            print("   Supervisor: supervisor@jctc.gov.ng / supervisor123")
            print("   Investigator: investigator@jctc.gov.ng / investigator123")
            print("   Intake: intake@jctc.gov.ng / intake123")
            print("   Prosecutor: prosecutor@jctc.gov.ng / prosecutor123")
            print("   Forensic: forensic@jctc.gov.ng / forensic123")
            print("   Liaison: liaison@jctc.gov.ng / liaison123")
            
        except Exception as e:
            print(f"❌ Error creating users: {e}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(add_missing_users())