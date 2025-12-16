"""add is_reporter to parties

Revision ID: a1b2c3d4e5f6
Revises: fccb3b85b6f2
Create Date: 2024-12-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'fccb3b85b6f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_reporter column to parties table
    op.add_column('parties', sa.Column('is_reporter', sa.Boolean(), nullable=False, server_default='false'))
    
    # Remove the server_default after adding the column (optional, keeps schema clean)
    op.alter_column('parties', 'is_reporter', server_default=None)


def downgrade() -> None:
    op.drop_column('parties', 'is_reporter')
