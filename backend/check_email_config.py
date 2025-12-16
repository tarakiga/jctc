
import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv

# Add app directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env vars
load_dotenv()

from app.models.email import EmailSettings
from app.config.settings import settings

# Import models to ensure relationships are registered
from app.models.user import User
from app.models.ndpa_compliance import NDPAConsentRecord

# Database setup
DATABASE_URL = settings.database_url
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check_settings():
    print("Checking Email Settings...")
    async with AsyncSessionLocal() as session:
        # Check active settings
        result = await session.execute(
            select(EmailSettings).where(EmailSettings.is_active == True)
        )
        active = result.scalars().all()
        
        if active:
            print(f"Found {len(active)} active configuration(s):")
            for cfg in active:
                print(f"   - Provider: {cfg.provider}, Host: {cfg.smtp_host}, User: {cfg.smtp_username}")
        else:
            print("No active email configuration found. Attempting to activate the most recent one...")
            
            # Check inactive settings
            result = await session.execute(
                select(EmailSettings)
                .where(EmailSettings.is_active == False)
                .order_by(EmailSettings.updated_at.desc())
            )
            inactive = result.scalars().all()
            
            if inactive:
                latest = inactive[0]
                print(f"Activating most recent config: {latest.provider} (ID: {latest.id})")
                
                latest.is_active = True
                await session.commit()
                print("✅ Successfully activated configuration. Please retry your user creation/email test.")
            else:
                print("No email configurations found at all.")

if __name__ == "__main__":
    asyncio.run(check_settings())
