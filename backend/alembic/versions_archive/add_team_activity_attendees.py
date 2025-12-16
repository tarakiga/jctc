"""add team_activity_attendees table

Revision ID: add_team_activity_attendees
Revises: 
Create Date: 2024-12-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_team_activity_attendees'
down_revision: Union[str, None] = '2ebe15c8dab4'  # Continues from ndpa head
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create team_activity_attendees association table
    op.create_table(
        'team_activity_attendees',
        sa.Column('activity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['activity_id'], ['team_activities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('activity_id', 'user_id')
    )
    
    # Create indexes for faster lookups
    op.create_index('ix_team_activity_attendees_activity_id', 'team_activity_attendees', ['activity_id'])
    op.create_index('ix_team_activity_attendees_user_id', 'team_activity_attendees', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_team_activity_attendees_user_id', table_name='team_activity_attendees')
    op.drop_index('ix_team_activity_attendees_activity_id', table_name='team_activity_attendees')
    op.drop_table('team_activity_attendees')
