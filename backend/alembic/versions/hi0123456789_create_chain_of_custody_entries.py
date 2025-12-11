"""Create chain_of_custody_entries table

Revision ID: hi0123456789
Revises: fg2345678901
Create Date: 2025-12-11 05:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'hi0123456789'
down_revision = 'fg2345678901'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create custodyaction enum type if it doesn't exist
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'custodyaction') THEN
                CREATE TYPE custodyaction AS ENUM (
                    'COLLECTED', 'STORED', 'TRANSFERRED', 'EXAMINED', 
                    'ANALYZED', 'IMAGED', 'RETURNED', 'DISPOSED', 
                    'SEALED', 'OPENED', 'COURT_PRESENTED', 'SEIZED',
                    'CHECKOUT', 'CHECKIN', 'ACCESSED'
                );
            END IF;
        END$$;
    """)
    
    # Create chain_of_custody_entries table if it doesn't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS chain_of_custody_entries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            evidence_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
            action custodyaction NOT NULL,
            custodian_from UUID REFERENCES users(id),
            custodian_to UUID NOT NULL REFERENCES users(id),
            location_from VARCHAR(255),
            location_to VARCHAR(255),
            purpose VARCHAR(500) NOT NULL,
            notes TEXT,
            signature_path VARCHAR(500),
            signature_verified BOOLEAN DEFAULT FALSE,
            requires_approval BOOLEAN DEFAULT FALSE,
            approval_status VARCHAR(20) DEFAULT 'PENDING',
            approved_by UUID REFERENCES users(id),
            approval_timestamp TIMESTAMP WITH TIME ZONE,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID NOT NULL REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    
    # Create indexes for common queries
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_chain_of_custody_entries_evidence_id 
        ON chain_of_custody_entries(evidence_id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_chain_of_custody_entries_timestamp 
        ON chain_of_custody_entries(timestamp);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS chain_of_custody_entries;")
    # Note: Not dropping custodyaction enum as it may be used elsewhere
