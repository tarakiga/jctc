"""update_attachments_and_collaborations_tables

Revision ID: 13548486c725
Revises: a414e95b1821
Create Date: 2025-11-12 04:05:23.771292

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13548486c725'
down_revision: Union[str, Sequence[str], None] = 'a414e95b1821'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Update attachments and collaborations tables."""
    
    # Drop existing tables to recreate with new schema
    op.execute('DROP TABLE IF EXISTS attachments CASCADE')
    op.execute('DROP TABLE IF EXISTS case_collaborations CASCADE')
    
    # Create enum types if they don't exist
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attachmentclassification') THEN
                CREATE TYPE attachmentclassification AS ENUM ('PUBLIC', 'LE_SENSITIVE', 'PRIVILEGED');
            END IF;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'virusscanstatus') THEN
                CREATE TYPE virusscanstatus AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED');
            END IF;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'collaborationstatus') THEN
                CREATE TYPE collaborationstatus AS ENUM ('INITIATED', 'ACTIVE', 'COMPLETED', 'SUSPENDED');
            END IF;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partnertype') THEN
                CREATE TYPE partnertype AS ENUM ('LAW_ENFORCEMENT', 'INTERNATIONAL', 'REGULATOR', 'ISP', 'BANK', 'OTHER');
            END IF;
        END $$;
    """)
    
    # Use raw SQL to create tables with existing enum types
    op.execute("""
        CREATE TABLE attachments (
            id UUID PRIMARY KEY,
            case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
            title VARCHAR(500) NOT NULL,
            filename VARCHAR(255) NOT NULL,
            file_size INTEGER NOT NULL,
            file_type VARCHAR(100) NOT NULL,
            file_path VARCHAR(500),
            download_url VARCHAR(1000),
            classification attachmentclassification NOT NULL DEFAULT 'LE_SENSITIVE',
            sha256_hash VARCHAR(64) NOT NULL UNIQUE,
            virus_scan_status virusscanstatus NOT NULL DEFAULT 'PENDING',
            virus_scan_details TEXT,
            uploaded_by UUID NOT NULL REFERENCES users(id),
            uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX ix_attachments_case_id ON attachments(case_id);
    """)
    
    op.execute("""
        CREATE TABLE case_collaborations (
            id UUID PRIMARY KEY,
            case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
            partner_org VARCHAR(255) NOT NULL,
            partner_type partnertype NOT NULL,
            contact_person VARCHAR(255) NOT NULL,
            contact_email VARCHAR(255) NOT NULL,
            contact_phone VARCHAR(50) NOT NULL,
            reference_no VARCHAR(100),
            scope TEXT NOT NULL,
            mou_reference VARCHAR(255),
            status collaborationstatus NOT NULL DEFAULT 'INITIATED',
            initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX ix_case_collaborations_case_id ON case_collaborations(case_id);
    """)


def downgrade() -> None:
    """Downgrade schema - Restore original tables."""
    
    # Drop new tables
    op.drop_index('ix_case_collaborations_case_id', 'case_collaborations')
    op.drop_table('case_collaborations')
    op.drop_index('ix_attachments_case_id', 'attachments')
    op.drop_table('attachments')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS partnertype')
    op.execute('DROP TYPE IF EXISTS collaborationstatus')
    op.execute('DROP TYPE IF EXISTS virusscanstatus')
    op.execute('DROP TYPE IF EXISTS attachmentclassification')
    
    # Recreate original simple tables
    op.create_table(
        'attachments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('case_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('sha256', sa.String(64), nullable=True),
        sa.Column('file_size', sa.String(20), nullable=True),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('uploaded_by', sa.UUID(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table(
        'case_collaborations',
        sa.Column('case_id', sa.UUID(), nullable=False),
        sa.Column('partner_org', sa.String(255), nullable=False),
        sa.Column('contact', sa.String(255), nullable=True),
        sa.Column('reference_no', sa.String(100), nullable=True),
        sa.Column('scope', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('case_id', 'partner_org')
    )
