"""
Revert admin user to ADMIN role and verify
"""
import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        print("🔄 Reverting admin user to ADMIN role...")
        
        # Update to ADMIN
        await session.execute(
            text("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@jctc.gov.ng'")
        )
        await session.commit()
        
        # Verify
        result = await session.execute(
            text("SELECT email, role FROM users WHERE email = 'admin@jctc.gov.ng'")
        )
        row = result.fetchone()
        print(f"✅ Updated: {row[0]} - Role: {row[1]}")
        
        print("\n✨ Done! Now:")
        print("   1. Log out from the frontend")
        print("   2. Log back in as admin@jctc.gov.ng")
        print("   3. ADMIN now has full access to everything")

if __name__ == "__main__":
    asyncio.run(main())
