"""add_guardian_and_safeguarding_to_parties

Revision ID: fccb3b85b6f2
Revises: 7a8b9c0d1e2f
Create Date: 2025-12-08 02:36:23.080124

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fccb3b85b6f2'
down_revision: Union[str, Sequence[str], None] = '7a8b9c0d1e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add guardian_contact and safeguarding_flags columns to parties table."""
    op.add_column('parties', sa.Column('guardian_contact', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('parties', sa.Column('safeguarding_flags', postgresql.ARRAY(sa.String()), nullable=True))


def downgrade() -> None:
    """Remove guardian_contact and safeguarding_flags columns from parties table."""
    op.drop_column('parties', 'safeguarding_flags')
    op.drop_column('parties', 'guardian_contact')
