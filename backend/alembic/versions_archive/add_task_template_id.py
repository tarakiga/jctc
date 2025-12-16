"""Add task_template_id column to tasks

Revision ID: add_task_template_id
Revises: add_user_sessions
Create Date: 2024-12-14

Adds task_template_id column that exists in model but not in database.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_task_template_id'
down_revision = 'add_user_sessions'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tasks', sa.Column('task_template_id', sa.String(255), nullable=True))


def downgrade():
    op.drop_column('tasks', 'task_template_id')
