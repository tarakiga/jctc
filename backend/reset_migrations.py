"""Reset migration history to clean slate"""
import asyncio
from sqlalchemy import text
from app.database.base import AsyncSessionLocal

async def reset_migration_history():
    """Clear alembic_version table to reset migration tracking"""
    async with AsyncSessionLocal() as db:
        try:
            # Clear migration version tracking
            await db.execute(text("DELETE FROM alembic_version"))
            await db.commit()
            print("✅ Migration history cleared successfully")
            print("📋 Database is now ready for fresh baseline migration")
        except Exception as e:
            print(f"❌ Error: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(reset_migration_history())
