"""Add SUPER_ADMIN role to UserRole enum

Revision ID: add_super_admin_role
Revises: 
Create Date: 2025-12-14

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_super_admin_role'
down_revision = 'add_task_template_id'  # Latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Add SUPER_ADMIN to the UserRole enum
    op.execute("ALTER TYPE userrole ADD VALUE 'SUPER_ADMIN'")


def downgrade():
    # Note: PostgreSQL doesn't support removing enum values
    # This would require recreating the enum and updating all references
    pass
