"""add legal_instrument_id to seizures

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2024-12-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add legal_instrument_id FK to seizures table
    op.add_column('seizures', sa.Column('legal_instrument_id', UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_seizures_legal_instrument_id',
        'seizures',
        'legal_instruments',
        ['legal_instrument_id'],
        ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_seizures_legal_instrument_id', 'seizures', type_='foreignkey')
    op.drop_column('seizures', 'legal_instrument_id')
