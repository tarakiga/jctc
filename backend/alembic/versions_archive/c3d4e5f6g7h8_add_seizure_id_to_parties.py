"""add seizure_id to parties

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2024-12-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add seizure_id FK to parties table for witness linking
    op.add_column('parties', sa.Column('seizure_id', UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_parties_seizure_id',
        'parties',
        'seizures',
        ['seizure_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('fk_parties_seizure_id', 'parties', type_='foreignkey')
    op.drop_column('parties', 'seizure_id')
