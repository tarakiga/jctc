-- Email System Tables
-- This script creates the email_settings and email_templates tables

-- Create email_settings table
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    
    -- SMTP Configuration
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_use_tls BOOLEAN NOT NULL DEFAULT true,
    smtp_use_ssl BOOLEAN NOT NULL DEFAULT false,
    
    -- Authentication
    smtp_username VARCHAR(255) NOT NULL,
    smtp_password_encrypted TEXT NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL DEFAULT 'JCTC System',
    reply_to_email VARCHAR(255),
    
    -- Testing & Status
    is_active BOOLEAN NOT NULL DEFAULT false,
    test_email VARCHAR(255),
    last_test_sent_at TIMESTAMP WITH TIME ZONE,
    last_test_status VARCHAR(50),
    last_test_error TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Only one active configuration allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_settings_active 
    ON email_settings(is_active) 
    WHERE is_active = true;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_plain TEXT,
    variables JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default email templates (only if they don't exist)
INSERT INTO email_templates (template_key, subject, body_html, body_plain, variables, is_active)
VALUES
    (
        'user_invite',
        'Welcome to JCTC - Your Account Details',
        '<html><body><h2>Welcome to JCTC</h2><p>Hello {{user_name}},</p><p>You have been invited to join JCTC. Your login credentials are:</p><ul><li>Email: {{user_email}}</li><li>Temporary Password: {{temp_password}}</li></ul><p>Please login at: <a href="{{login_url}}">{{login_url}}</a></p><p>You will be required to change your password on first login.</p></body></html>',
        'Welcome to JCTC\n\nHello {{user_name}},\n\nYou have been invited to join JCTC.\nYour login credentials are:\n- Email: {{user_email}}\n- Temporary Password: {{temp_password}}\n\nPlease login at: {{login_url}}\n\nYou will be required to change your password on first login.',
        '["{{user_name}}", "{{user_email}}", "{{temp_password}}", "{{login_url}}"]',
        true
    ),
    (
        'password_reset',
        'JCTC - Password Reset Request',
        '<html><body><h2>Password Reset Request</h2><p>Hello {{user_name}},</p><p>We received a request to reset your password. Click the link below to reset it:</p><p><a href="{{reset_url}}">Reset Password</a></p><p>This link will expire in 1 hour.</p><p>If you did not request this, please ignore this email.</p></body></html>',
        'Password Reset Request\n\nHello {{user_name}},\n\nWe received a request to reset your password.\n\nReset your password at: {{reset_url}}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.',
        '["{{user_name}}", "{{reset_url}}"]',
        true
    ),
    (
        'case_assignment',
        'JCTC - New Case Assigned: {{case_number}}',
        '<html><body><h2>Case Assignment Notification</h2><p>Hello {{user_name}},</p><p>You have been assigned to case <strong>{{case_number}}</strong>.</p><p><strong>Case Title:</strong> {{case_title}}</p><p><strong>Priority:</strong> {{case_priority}}</p><p>Please review the case details in the system.</p><p><a href="{{case_url}}">View Case</a></p></body></html>',
        'Case Assignment Notification\n\nHello {{user_name}},\n\nYou have been assigned to case {{case_number}}.\n\nCase Title: {{case_title}}\nPriority: {{case_priority}}\n\nView case at: {{case_url}}',
        '["{{user_name}}", "{{case_number}}", "{{case_title}}", "{{case_priority}}", "{{case_url}}"]',
        true
    )
ON CONFLICT (template_key) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Email system tables created successfully!';
END$$;
