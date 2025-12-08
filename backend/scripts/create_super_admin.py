import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.database.base import AsyncSessionLocal
from app.models.user import User, UserRole
from app.utils.auth import get_password_hash

# Default credentials (can be overridden by environment variables)
DEFAULT_EMAIL = "admin@jctc.gov.ng"
DEFAULT_PASSWORD = "admin123"
DEFAULT_NAME = "System Administrator"

async def create_super_admin():
    """Create super admin user if not exists"""
    email = os.getenv("ADMIN_EMAIL", DEFAULT_EMAIL)
    password = os.getenv("ADMIN_PASSWORD", DEFAULT_PASSWORD)
    full_name = os.getenv("ADMIN_NAME", DEFAULT_NAME)

    print(f"Checking for admin user: {email}")

    async with AsyncSessionLocal() as session:
        try:
            # Check if user exists
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

            if user:
                print(f"User {email} already exists.")
                # Optional: Update role to ADMIN if not already
                if user.role != UserRole.ADMIN:
                    print("Updating user role to ADMIN...")
                    user.role = UserRole.ADMIN
                    await session.commit()
                    print("User role updated.")
                return

            print(f"Creating super admin user: {email}")
            
            # Create new user
            new_user = User(
                email=email,
                full_name=full_name,
                role=UserRole.ADMIN,
                is_active=True,
                hashed_password=get_password_hash(password),
                org_unit="JCTC Headquarters"
            )
            
            session.add(new_user)
            await session.commit()
            print("Super admin user created successfully!")

        except Exception as e:
            await session.rollback()
            print(f"Error creating admin user: {e}")
            sys.exit(1)

if __name__ == "__main__":
    print("=" * 60)
    print("Admin User Provisioning")
    print("=" * 60)
    asyncio.run(create_super_admin())
