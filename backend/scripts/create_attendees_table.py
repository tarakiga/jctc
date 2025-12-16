"""Create team_activity_attendees table."""
import asyncio
from app.database.base import AsyncSessionLocal
from sqlalchemy import text

# Import models to configure SQLAlchemy mappers
from app.models import user, case, evidence, ndpa_compliance  # noqa: F401


async def create_attendees_table():
    """Create the team_activity_attendees association table."""
    async with AsyncSessionLocal() as session:
        # Create table if not exists
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS team_activity_attendees (
                activity_id UUID REFERENCES team_activities(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
                PRIMARY KEY (activity_id, user_id)
            )
        """))
        
        # Create indexes
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_team_activity_attendees_activity_id 
            ON team_activity_attendees(activity_id)
        """))
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_team_activity_attendees_user_id 
            ON team_activity_attendees(user_id)
        """))
        
        await session.commit()
        print("team_activity_attendees table created successfully!")


if __name__ == "__main__":
    asyncio.run(create_attendees_table())
