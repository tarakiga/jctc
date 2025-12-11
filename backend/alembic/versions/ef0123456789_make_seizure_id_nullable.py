"""make_seizure_id_nullable

Revision ID: ef0123456789
Revises: cd8901234567
Create Date: 2025-12-11 03:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'ef0123456789'
down_revision: Union[str, Sequence[str], None] = 'cd8901234567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make seizure_id nullable to allow evidence creation without a seizure."""
    op.execute("""
        ALTER TABLE devices 
        ALTER COLUMN seizure_id DROP NOT NULL;
    """)


def downgrade() -> None:
    """Revert seizure_id to NOT NULL."""
    op.execute("""
        ALTER TABLE devices 
        ALTER COLUMN seizure_id SET NOT NULL;
    """)
