"""Check charges table columns."""
import asyncio
from sqlalchemy import text
from app.database.base import engine


async def check_and_add():
    async with engine.connect() as conn:
        # Check existing columns
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='charges'"
        ))
        columns = [row[0] for row in result.fetchall()]
        print("Existing columns:", columns)
        
        if 'statute_section' not in columns:
            print("statute_section is MISSING - adding it...")
        else:
            print("statute_section EXISTS")
            
        if 'notes' not in columns:
            print("notes is MISSING - adding it...")
        else:
            print("notes EXISTS")
            
        if 'created_by' not in columns:
            print("created_by is MISSING - adding it...")
        else:
            print("created_by EXISTS")
    
    # Add columns if missing
    async with engine.begin() as conn:
        if 'statute_section' not in columns:
            await conn.execute(text("ALTER TABLE charges ADD COLUMN statute_section VARCHAR(100)"))
            print("Added statute_section")
        if 'notes' not in columns:
            await conn.execute(text("ALTER TABLE charges ADD COLUMN notes TEXT"))
            print("Added notes")
        if 'created_by' not in columns:
            await conn.execute(text("ALTER TABLE charges ADD COLUMN created_by UUID"))
            print("Added created_by")
    
    print("Done!")


if __name__ == "__main__":
    asyncio.run(check_and_add())
