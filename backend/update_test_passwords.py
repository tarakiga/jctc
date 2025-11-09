#!/usr/bin/env python3
"""
Update test user passwords to match our documentation
"""
import asyncio
from passlib.context import CryptContext
from sqlalchemy import select
from app.database.base import AsyncSessionLocal
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def update_passwords():
    print("🔑 Updating test user passwords...\n")
    
    # Passwords from our TESTING_GUIDE.md
    test_creds = {
        "admin@jctc.gov.ng": "Admin@123",
        "supervisor@jctc.gov.ng": "Supervisor@123",
        "prosecutor@jctc.gov.ng": "Prosecutor@123",
        "investigator@jctc.gov.ng": "Investigator@123",
        "forensic@jctc.gov.ng": "Forensic@123",
        "liaison@jctc.gov.ng": "Liaison@123",
        "intake@jctc.gov.ng": "Intake@123",
    }
    
    async with AsyncSessionLocal() as session:
        for email, password in test_creds.items():
            result = await session.execute(
                select(User).where(User.email == email)
            )
            user = result.scalar_one_or_none()
            
            if user:
                user.hashed_password = pwd_context.hash(password)
                session.add(user)
                print(f"✅ Updated password for {email}")
            else:
                print(f"❌ User not found: {email}")
        
        await session.commit()
        print(f"\n✨ All passwords updated successfully!")
        print(f"\nYou can now log in with:")
        print(f"  Email: admin@jctc.gov.ng")
        print(f"  Password: Admin@123")

if __name__ == "__main__":
    asyncio.run(update_passwords())
