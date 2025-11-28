"""fix_team_activity_datetime_columns

Revision ID: edab28787370
Revises: 66514205f8ba
Create Date: 2025-11-26 17:17:44.602867

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'edab28787370'
down_revision: Union[str, Sequence[str], None] = '66514205f8ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Convert string columns to datetime columns
    op.alter_column('team_activities', 'start_time',
                    type_=sa.DateTime(),
                    postgresql_using='start_time::timestamp')
    op.alter_column('team_activities', 'end_time',
                    type_=sa.DateTime(),
                    postgresql_using='end_time::timestamp')


def downgrade() -> None:
    """Downgrade schema."""
    # Convert datetime columns back to string columns
    op.alter_column('team_activities', 'start_time',
                    type_=sa.String(50))
    op.alter_column('team_activities', 'end_time',
                    type_=sa.String(50))
