"""add email settings and templates tables

Revision ID: email_system_001
Revises: add_team_activity_attendees
Create Date: 2025-12-16 01:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'email_system_001'
down_revision = 'add_team_activity_attendees'
branch_labels = None
depends_on = None


def upgrade():
    # Create email_settings table
    op.create_table(
        'email_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('provider', sa.String(50), nullable=False, comment='Email provider: microsoft, gmail, zoho, smtp'),
        
        # SMTP Configuration
        sa.Column('smtp_host', sa.String(255), nullable=False),
        sa.Column('smtp_port', sa.Integer, nullable=False, server_default='587'),
        sa.Column('smtp_use_tls', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('smtp_use_ssl', sa.Boolean, nullable=False, server_default='false'),
        
        # Authentication
        sa.Column('smtp_username', sa.String(255), nullable=False),
        sa.Column('smtp_password_encrypted', sa.Text, nullable=False, comment='Encrypted SMTP password'),
        sa.Column('from_email', sa.String(255), nullable=False),
        sa.Column('from_name', sa.String(255), nullable=False, server_default='JCTC System'),
        sa.Column('reply_to_email', sa.String(255), nullable=True),
        
        # Testing & Status
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('test_email', sa.String(255), nullable=True),
        sa.Column('last_test_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_test_status', sa.String(50), nullable=True, comment='success, failed'),
        sa.Column('last_test_error', sa.Text, nullable=True),
        
        # Metadata
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )
    
    # Only one active configuration allowed
    op.create_index(
        'idx_email_settings_active',
        'email_settings',
        ['is_active'],
        unique=True,
        postgresql_where=sa.text('is_active = true')
    )
    
    # Create email_templates table
    op.create_table(
        'email_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('template_key', sa.String(100), unique=True, nullable=False, comment='user_invite, password_reset, etc.'),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('body_html', sa.Text, nullable=False),
        sa.Column('body_plain', sa.Text, nullable=True),
        sa.Column('variables', postgresql.JSONB, nullable=True, comment='List of allowed template variables'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    
    # Insert default email templates
    op.execute("""
        INSERT INTO email_templates (template_key, subject, body_html, body_plain, variables, is_active)
        VALUES
        (
            'user_invite',
            'Welcome to JCTC - Your Account Details',
            '<html><body><h2>Welcome to JCTC</h2><p>Hello {{user_name}},</p><p>You have been invited to join JCTC. Your login credentials are:</p><ul><li>Email: {{user_email}}</li><li>Temporary Password: {{temp_password}}</li></ul><p>Please login at: <a href="{{login_url}}">{{login_url}}</a></p><p>You will be required to change your password on first login.</p></body></html>',
            'Welcome to JCTC\\n\\nHello {{user_name}},\\n\\nYou have been invited to join JCTC.\\nYour login credentials are:\\n- Email: {{user_email}}\\n- Temporary Password: {{temp_password}}\\n\\nPlease login at: {{login_url}}\\n\\nYou will be required to change your password on first login.',
            '["{{user_name}}", "{{user_email}}", "{{temp_password}}", "{{login_url}}"]',
            true
        ),
        (
            'password_reset',
            'JCTC - Password Reset Request',
            '<html><body><h2>Password Reset Request</h2><p>Hello {{user_name}},</p><p>We received a request to reset your password. Click the link below to reset it:</p><p><a href="{{reset_url}}">Reset Password</a></p><p>This link will expire in 1 hour.</p><p>If you did not request this, please ignore this email.</p></body></html>',
            'Password Reset Request\\n\\nHello {{user_name}},\\n\\nWe received a request to reset your password.\\n\\nReset your password at: {{reset_url}}\\n\\nThis link will expire in 1 hour.\\n\\nIf you did not request this, please ignore this email.',
            '["{{user_name}}", "{{reset_url}}"]',
            true
        ),
        (
            'case_assignment',
            'JCTC - New Case Assigned: {{case_number}}',
            '<html><body><h2>Case Assignment Notification</h2><p>Hello {{user_name}},</p><p>You have been assigned to case <strong>{{case_number}}</strong>.</p><p><strong>Case Title:</strong> {{case_title}}</p><p><strong>Priority:</strong> {{case_priority}}</p><p>Please review the case details in the system.</p><p><a href="{{case_url}}">View Case</a></p></body></html>',
            'Case Assignment Notification\\n\\nHello {{user_name}},\\n\\nYou have been assigned to case {{case_number}}.\\n\\nCase Title: {{case_title}}\\nPriority: {{case_priority}}\\n\\nView case at: {{case_url}}',
            '["{{user_name}}", "{{case_number}}", "{{case_title}}", "{{case_priority}}", "{{case_url}}"]',
            true
        )
    """)


def downgrade():
    op.drop_index('idx_email_settings_active', table_name='email_settings')
    op.drop_table('email_templates')
    op.drop_table('email_settings')
