"""Seed activity types for team calendar."""
import asyncio
import uuid
from datetime import datetime

# Add parent to path
import sys
sys.path.insert(0, '.')

from app.db.session import get_db
from app.models.lookup_value import LookupValue
from sqlalchemy import select, text

async def seed_activity_types():
    """Seed activity types into lookup_values table."""
    activity_types = [
        {
            'category': 'activity_type',
            'value': 'MEETING',
            'label': 'Meeting',
            'description': 'Team meetings and discussions',
            'is_active': True,
            'is_system': True,
            'sort_order': 1,
            'color': '#3B82F6',
            'icon': 'calendar',
        },
        {
            'category': 'activity_type',
            'value': 'TRAVEL',
            'label': 'Travel',
            'description': 'Work-related travel',
            'is_active': True,
            'is_system': True,
            'sort_order': 2,
            'color': '#8B5CF6',
            'icon': 'plane',
        },
        {
            'category': 'activity_type',
            'value': 'TRAINING',
            'label': 'Training',
            'description': 'Training sessions and workshops',
            'is_active': True,
            'is_system': True,
            'sort_order': 3,
            'color': '#10B981',
            'icon': 'graduation-cap',
        },
        {
            'category': 'activity_type',
            'value': 'LEAVE',
            'label': 'Leave',
            'description': 'Time off and leave',
            'is_active': True,
            'is_system': True,
            'sort_order': 4,
            'color': '#F97316',
            'icon': 'coffee',
        },
    ]
    
    async for db in get_db():
        for activity in activity_types:
            # Check if exists
            result = await db.execute(
                select(LookupValue).where(
                    LookupValue.category == activity['category'],
                    LookupValue.value == activity['value']
                )
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"Activity type {activity['value']} already exists, skipping")
            else:
                lookup = LookupValue(
                    id=uuid.uuid4(),
                    category=activity['category'],
                    value=activity['value'],
                    label=activity['label'],
                    description=activity['description'],
                    is_active=activity['is_active'],
                    is_system=activity['is_system'],
                    sort_order=activity['sort_order'],
                    color=activity['color'],
                    icon=activity['icon'],
                    created_at=datetime.utcnow(),
                )
                db.add(lookup)
                print(f"Added activity type: {activity['value']}")
        
        await db.commit()
        print("Activity types seeded successfully!")
        break

if __name__ == "__main__":
    asyncio.run(seed_activity_types())
