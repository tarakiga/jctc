"""Fix activity_type lookup values from uppercase to lowercase."""
import asyncio
from app.database.base import AsyncSessionLocal
from sqlalchemy import text

# Import models to configure SQLAlchemy mappers
from app.models import user, case, evidence, ndpa_compliance  # noqa: F401


async def fix_activity_types():
    """Update activity_type values to lowercase to match WorkActivity enum."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("UPDATE lookup_values SET value = LOWER(value) WHERE category = 'activity_type'")
        )
        await session.commit()
        print(f"Updated {result.rowcount} activity_type values to lowercase")


if __name__ == "__main__":
    asyncio.run(fix_activity_types())
