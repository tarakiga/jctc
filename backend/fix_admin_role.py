"""
Quick script to check and update admin user role to SUPER_ADMIN
"""
import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        print("🔍 Checking current admin user role...")
        
        # Check current role
        result = await session.execute(
            text("SELECT email, role FROM users WHERE email = 'admin@jctc.gov.ng'")
        )
        row = result.fetchone()
        
        if row:
            print(f"   Current: {row[0]} - Role: {row[1]}")
        else:
            print("   ❌ Admin user not found!")
            return
        
        # Update to SUPER_ADMIN
        print("\n🔄 Updating role to SUPER_ADMIN...")
        await session.execute(
            text("UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'admin@jctc.gov.ng'")
        )
        await session.commit()
        
        # Verify update
        result = await session.execute(
            text("SELECT email, role FROM users WHERE email = 'admin@jctc.gov.ng'")
        )
        row = result.fetchone()
        print(f"   Updated: {row[0]} - Role: {row[1]}")
        
        print("\n✅ Success! Now:")
        print("   1. Log out from the frontend")
        print("   2. Log back in as admin@jctc.gov.ng")
        print("   3. You should see the Create Case button")

if __name__ == "__main__":
    asyncio.run(main())
