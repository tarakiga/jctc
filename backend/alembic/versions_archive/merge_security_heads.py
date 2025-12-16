"""Merge heads into single migration chain

Revision ID: merge_security_heads
Revises: 946de172f034, add_user_sessions
Create Date: 2024-12-14

Merges the security enhancements branch with the main migration chain.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_security_heads'
down_revision = ('946de172f034', 'add_user_sessions')
branch_labels = None
depends_on = None


def upgrade():
    # This is a merge migration, no operations needed
    pass


def downgrade():
    # This is a merge migration, no operations needed
    pass
