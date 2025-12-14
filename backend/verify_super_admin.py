"""
Verify admin user role and provide JWT debugging info
"""
import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        print("=" * 60)
        print("SUPER_ADMIN VERIFICATION")
        print("=" * 60)
        
        # Check database role
        result = await session.execute(
            text("SELECT email, role, is_active FROM users WHERE email = 'admin@jctc.gov.ng'")
        )
        row = result.fetchone()
        
        if row:
            print(f"\n✓ Database Record:")
            print(f"  Email: {row[0]}")
            print(f"  Role: {row[1]}")
            print(f"  Active: {row[2]}")
            
            if row[1] == 'SUPER_ADMIN':
                print("\n✅ Role is correctly set to SUPER_ADMIN")
            else:
                print(f"\n❌ Role is {row[1]}, not SUPER_ADMIN!")
                print("   Run: python setup_super_admin.py")
        else:
            print("\n❌ User not found in database!")
        
        print("\n" + "=" * 60)
        print("NEXT STEPS:")
        print("=" * 60)
        print("\n1. LOG OUT from the frontend completely")
        print("2. Clear browser localStorage (F12 > Application > Local Storage)")
        print("3. Log back in as admin@jctc.gov.ng")
        print("\nYour old JWT token still has the old role!")
        print("You MUST log out and log back in to get a new token.")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
