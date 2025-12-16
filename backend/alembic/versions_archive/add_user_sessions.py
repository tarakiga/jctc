"""Add user sessions table for session management

Revision ID: add_user_sessions
Revises: abac_case_sensitivity
Create Date: 2024-12-14

Adds user_sessions table for session tracking, concurrent session limits,
and security audit of user access.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_user_sessions'
down_revision = 'abac_case_sensitivity'
branch_labels = None
depends_on = None


def upgrade():
    # Create user_sessions table
    op.create_table(
        'user_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('token_hash', sa.String(64), unique=True, nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_activity', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.String(500)),
        sa.Column('is_active', sa.Boolean, default=True, index=True),
        sa.Column('invalidated_at', sa.DateTime(timezone=True)),
        sa.Column('invalidation_reason', sa.String(100)),
        sa.Column('sso_session_id', sa.String(255)),
        sa.Column('sso_provider', sa.String(50)),
    )
    
    # Add indexes for common queries
    op.create_index('ix_user_sessions_user_active', 'user_sessions', ['user_id', 'is_active'])
    op.create_index('ix_user_sessions_expires', 'user_sessions', ['expires_at', 'is_active'])


def downgrade():
    op.drop_index('ix_user_sessions_expires', table_name='user_sessions')
    op.drop_index('ix_user_sessions_user_active', table_name='user_sessions')
    op.drop_table('user_sessions')
