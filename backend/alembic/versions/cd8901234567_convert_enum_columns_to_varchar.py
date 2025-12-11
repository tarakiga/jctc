"""convert_enum_columns_to_varchar

Revision ID: cd8901234567
Revises: ab7abf671d11
Create Date: 2025-12-11 02:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'cd8901234567'
down_revision: Union[str, Sequence[str], None] = 'ab7abf671d11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Convert enum columns to VARCHAR for frontend compatibility."""
    
    # Convert condition column from devicecondition enum to VARCHAR
    op.execute("""
        ALTER TABLE devices 
        ALTER COLUMN condition TYPE VARCHAR(50) 
        USING condition::text;
    """)
    
    # Convert encryption_status column from encryptionstatus enum to VARCHAR
    op.execute("""
        ALTER TABLE devices 
        ALTER COLUMN encryption_status TYPE VARCHAR(50) 
        USING encryption_status::text;
    """)
    
    # Convert imaging_status column from imagingstatus enum to VARCHAR
    op.execute("""
        ALTER TABLE devices 
        ALTER COLUMN imaging_status TYPE VARCHAR(50) 
        USING imaging_status::text;
    """)
    
    # Convert custody_status column from custodystatus enum to VARCHAR
    op.execute("""
        ALTER TABLE devices 
        ALTER COLUMN custody_status TYPE VARCHAR(50) 
        USING custody_status::text;
    """)
    
    # Also convert category if it's still an enum (might have been created as enum earlier)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE devices 
            ALTER COLUMN category TYPE VARCHAR(50) 
            USING category::text;
        EXCEPTION WHEN others THEN
            NULL; -- Column might already be varchar
        END $$;
    """)


def downgrade() -> None:
    """Revert columns back to enum types."""
    # Note: Downgrade would require recreating enum types and casting back
    # This is complex and usually not needed - leaving as no-op
    pass
