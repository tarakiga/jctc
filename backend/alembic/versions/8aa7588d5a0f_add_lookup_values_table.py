"""Add lookup_values table

Revision ID: 8aa7588d5a0f
Revises: add_case_intake_fields
Create Date: 2025-12-06 01:04:34.414109

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8aa7588d5a0f'
down_revision: Union[str, Sequence[str], None] = 'add_case_intake_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create lookup_values table only
    op.create_table('lookup_values',
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('value', sa.String(length=100), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('sort_order', sa.Integer(), nullable=True, default=0),
        sa.Column('is_system', sa.Boolean(), nullable=False, default=False),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('updated_by', sa.UUID(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category', 'value', name='uq_lookup_category_value')
    )
    op.create_index(op.f('ix_lookup_values_category'), 'lookup_values', ['category'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_lookup_values_category'), table_name='lookup_values')
    op.drop_table('lookup_values')

