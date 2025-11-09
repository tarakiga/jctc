#!/usr/bin/env python3
"""
Test login with test credentials
"""
import asyncio
from passlib.context import CryptContext
from sqlalchemy import select
from app.database.base import AsyncSessionLocal
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def test_login():
    print("🔐 Testing login credentials...\n")
    
    test_creds = {
        "admin@jctc.gov.ng": "Admin@123",
        "investigator@jctc.gov.ng": "Investigator@123",
        "prosecutor@jctc.gov.ng": "Prosecutor@123",
    }
    
    async with AsyncSessionLocal() as session:
        for email, password in test_creds.items():
            result = await session.execute(
                select(User).where(User.email == email)
            )
            user = result.scalar_one_or_none()
            
            if user:
                password_match = pwd_context.verify(password, user.hashed_password)
                status = "✅ MATCH" if password_match else "❌ NO MATCH"
                print(f"{status} - {email}")
                if not password_match:
                    print(f"  Expected password: {password}")
                    print(f"  Hash in DB: {user.hashed_password[:50]}...")
            else:
                print(f"❌ USER NOT FOUND - {email}")
            print()

if __name__ == "__main__":
    asyncio.run(test_login())
