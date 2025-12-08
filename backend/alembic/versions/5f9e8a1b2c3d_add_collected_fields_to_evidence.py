"""add_collected_fields_to_evidence

Revision ID: 5f9e8a1b2c3d
Revises: fda22dfa40e5
Create Date: 2025-12-07 06:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '5f9e8a1b2c3d'
down_revision = 'fda22dfa40e5'
branch_labels = None
depends_on = None


def upgrade():
    # Add collected_at and collected_by columns to evidence_items table
    op.add_column('evidence_items', sa.Column('collected_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('evidence_items', sa.Column('collected_by', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Create foreign key constraint for collected_by
    op.create_foreign_key(None, 'evidence_items', 'users', ['collected_by'], ['id'])


def downgrade():
    # Remove columns
    op.drop_column('evidence_items', 'collected_by')
    op.drop_column('evidence_items', 'collected_at')
