#!/usr/bin/env python3
"""
List all users in the database
"""
import asyncio
from sqlalchemy import select
from app.database.base import get_db, AsyncSessionLocal
from app.models.user import User

async def list_users():
    print("📋 Listing all users in database...\n")
    
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(User))
            users = result.scalars().all()
            
            if not users:
                print("❌ No users found in database!")
                print("\nRun: python create_admin_user.py")
                return
            
            print(f"✅ Found {len(users)} users:\n")
            
            for user in users:
                print(f"👤 {user.full_name}")
                print(f"   Email: {user.email}")
                print(f"   Role: {user.role}")
                print(f"   Active: {user.is_active}")
                print()
                
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(list_users())
