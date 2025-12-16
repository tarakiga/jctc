"""add_evidence_id_to_artefacts

Revision ID: fg2345678901
Revises: ef0123456789
Create Date: 2025-12-11 03:11:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'fg2345678901'
down_revision: Union[str, Sequence[str], None] = 'ef0123456789'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add evidence_id column to artefacts table if it doesn't exist."""
    # Try to add evidence_id column - it might already exist as device_id
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE artefacts ADD COLUMN evidence_id UUID REFERENCES devices(id) ON DELETE CASCADE;
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # If device_id exists, copy values to evidence_id and drop device_id
    op.execute("""
        DO $$ BEGIN
            -- Copy device_id values to evidence_id if both exist
            UPDATE artefacts SET evidence_id = device_id WHERE evidence_id IS NULL AND device_id IS NOT NULL;
            -- Drop device_id column if it exists
            ALTER TABLE artefacts DROP COLUMN IF EXISTS device_id;
        EXCEPTION 
            WHEN undefined_column THEN null;
        END $$;
    """)


def downgrade() -> None:
    """Revert changes."""
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE artefacts ADD COLUMN device_id UUID REFERENCES devices(id) ON DELETE CASCADE;
            UPDATE artefacts SET device_id = evidence_id WHERE device_id IS NULL AND evidence_id IS NOT NULL;
            ALTER TABLE artefacts DROP COLUMN IF EXISTS evidence_id;
        EXCEPTION 
            WHEN duplicate_column THEN null;
        END $$;
    """)
