"""add_device_description_field

Revision ID: a414e95b1821
Revises: add_seizure_device_fields
Create Date: 2025-11-12 03:27:09.123882

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a414e95b1821'
down_revision: Union[str, Sequence[str], None] = 'add_seizure_device_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add description field to devices table."""
    op.add_column('devices', sa.Column('description', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove description field from devices table."""
    op.drop_column('devices', 'description')
