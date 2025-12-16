"""add_file_columns_to_evidence

Revision ID: 7a8b9c0d1e2f
Revises: 5f9e8a1b2c3d
Create Date: 2025-12-07 07:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7a8b9c0d1e2f'
down_revision = '5f9e8a1b2c3d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('evidence_items', sa.Column('file_path', sa.String(length=500), nullable=True))
    op.add_column('evidence_items', sa.Column('file_size', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('evidence_items', 'file_size')
    op.drop_column('evidence_items', 'file_path')
