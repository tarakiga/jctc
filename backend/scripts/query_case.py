"""Query case type data from lookup_values table."""
import asyncio
import logging
logging.disable(logging.CRITICAL)

from app.database.base import AsyncSessionLocal
from sqlalchemy import text

async def query():
    async with AsyncSessionLocal() as session:
        print("=" * 60)
        print("CASE_TYPE VALUES IN lookup_values:")
        print("=" * 60)
        result = await session.execute(text("SELECT id, value, label, color FROM lookup_values WHERE category = 'case_type' ORDER BY sort_order"))
        rows = result.fetchall()
        if rows:
            for row in rows:
                print(f"  {row[1]:30} | {row[2]:30} | {row[3]}")
        else:
            print("  (no entries - need to add via Admin UI)")
        
        print("\n" + "=" * 60)
        print("CASES TABLE - case_type column:")
        print("=" * 60)
        result2 = await session.execute(text("SELECT id, case_number, case_type FROM cases LIMIT 5"))
        rows2 = result2.fetchall()
        if rows2:
            for row in rows2:
                print(f"  {row[1]} | case_type={row[2]}")
        else:
            print("  (no cases)")

if __name__ == "__main__":
    asyncio.run(query())
