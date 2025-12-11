"""add_category_to_devices

Revision ID: ab7abf671d11
Revises: c3d4e5f6g7h8
Create Date: 2025-12-11 02:10:07.871560

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ab7abf671d11'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing columns to devices table for Evidence features."""
    
    # Create evidencecategory enum type if not exists
    op.execute("""
        DO $$ BEGIN 
            CREATE TYPE evidencecategory AS ENUM('DIGITAL', 'PHYSICAL'); 
        EXCEPTION 
            WHEN duplicate_object THEN null; 
        END $$;
    """)
    
    # Add category column (simple varchar with default for now to avoid enum issues)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE devices ADD COLUMN category VARCHAR(50) DEFAULT 'PHYSICAL';
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # Add evidence_type column (varchar to match lookup pattern)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE devices ADD COLUMN evidence_type VARCHAR(50);
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # Add storage_location column
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE devices ADD COLUMN storage_location VARCHAR(500);
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # Add retention_policy column
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE devices ADD COLUMN retention_policy VARCHAR(100);
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # Add collected_at column
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE devices ADD COLUMN collected_at TIMESTAMP WITH TIME ZONE;
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # Add collected_by column with foreign key
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE devices ADD COLUMN collected_by UUID REFERENCES users(id);
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # Add file_path column
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE devices ADD COLUMN file_path VARCHAR(500);
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # Add file_size column
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE devices ADD COLUMN file_size INTEGER;
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # Add sha256 column
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE devices ADD COLUMN sha256 VARCHAR(64);
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)


def downgrade() -> None:
    """Remove columns added in upgrade."""
    # Use IF EXISTS for safe downgrade
    op.execute("ALTER TABLE devices DROP COLUMN IF EXISTS sha256;")
    op.execute("ALTER TABLE devices DROP COLUMN IF EXISTS file_size;")
    op.execute("ALTER TABLE devices DROP COLUMN IF EXISTS file_path;")
    op.execute("ALTER TABLE devices DROP COLUMN IF EXISTS collected_by;")
    op.execute("ALTER TABLE devices DROP COLUMN IF EXISTS collected_at;")
    op.execute("ALTER TABLE devices DROP COLUMN IF EXISTS retention_policy;")
    op.execute("ALTER TABLE devices DROP COLUMN IF EXISTS storage_location;")
    op.execute("ALTER TABLE devices DROP COLUMN IF EXISTS evidence_type;")
    op.execute("ALTER TABLE devices DROP COLUMN IF EXISTS category;")
