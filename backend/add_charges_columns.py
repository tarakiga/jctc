"""Script to add missing columns to charges table."""
import asyncio
from sqlalchemy import text
from app.database.base import engine


async def add_columns():
    async with engine.begin() as conn:
        # Add statute_section column
        try:
            await conn.execute(text("ALTER TABLE charges ADD COLUMN IF NOT EXISTS statute_section VARCHAR(100)"))
            print("Added statute_section column")
        except Exception as e:
            print(f"statute_section: {e}")
        
        # Add notes column
        try:
            await conn.execute(text("ALTER TABLE charges ADD COLUMN IF NOT EXISTS notes TEXT"))
            print("Added notes column")
        except Exception as e:
            print(f"notes: {e}")
        
        # Add created_by column
        try:
            await conn.execute(text("ALTER TABLE charges ADD COLUMN IF NOT EXISTS created_by UUID"))
            print("Added created_by column")
        except Exception as e:
            print(f"created_by: {e}")
        
        # Add foreign key constraint
        try:
            await conn.execute(text("""
                ALTER TABLE charges 
                ADD CONSTRAINT IF NOT EXISTS fk_charges_created_by 
                FOREIGN KEY (created_by) REFERENCES users(id)
            """))
            print("Added foreign key constraint")
        except Exception as e:
            print(f"FK constraint: {e}")
    
    print("Done!")


if __name__ == "__main__":
    asyncio.run(add_columns())
