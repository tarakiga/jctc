"""
Execute SQL to add SUPER_ADMIN role and update admin user
"""
import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        try:
            print("🔄 Adding SUPER_ADMIN to database enum...")
            
            # Add SUPER_ADMIN to enum
            # Note: PostgreSQL doesn't support IF NOT EXISTS for enum values in older versions
            # We'll catch the error if it already exists
            try:
                await session.execute(text("ALTER TYPE userrole ADD VALUE 'SUPER_ADMIN'"))
                await session.commit()
                print("✅ SUPER_ADMIN value added to enum")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("ℹ️  SUPER_ADMIN already exists in enum")
                    await session.rollback()
                else:
                    raise
            
            print("\n🔄 Updating admin user role...")
            # Update admin user to SUPER_ADMIN
            result = await session.execute(
                text("UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'admin@jctc.gov.ng' RETURNING email, role")
            )
            await session.commit()
            
            row = result.fetchone()
            if row:
                print(f"✅ Updated: {row[0]} -> Role: {row[1]}")
            
            print("\n✨ Success! Now:")
            print("   1. Log out from the frontend")
            print("   2. Log back in as admin@jctc.gov.ng")
            print("   3. You should see the Create Case button!")
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(main())
