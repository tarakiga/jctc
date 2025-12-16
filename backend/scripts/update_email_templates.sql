-- Sync email templates from local migration to production

-- Update user_invite template with original migration content
UPDATE email_templates SET 
  subject = 'Welcome to JCTC - Your Account Details',
  body_html = '<html><body><h2>Welcome to JCTC</h2><p>Hello {{user_name}},</p><p>You have been invited to join JCTC. Your login credentials are:</p><ul><li>Email: {{user_email}}</li><li>Temporary Password: {{temp_password}}</li></ul><p>Please login at: <a href="{{login_url}}">{{login_url}}</a></p><p>You will be required to change your password on first login.</p></body></html>',
  body_plain = 'Welcome to JCTC

Hello {{user_name}},

You have been invited to join JCTC.
Your login credentials are:
- Email: {{user_email}}
- Temporary Password: {{temp_password}}

Please login at: {{login_url}}

You will be required to change your password on first login.',
  variables = '["{{user_name}}", "{{user_email}}", "{{temp_password}}", "{{login_url}}"]'
WHERE template_key = 'user_invite';

-- Update password_reset template with original migration content
UPDATE email_templates SET 
  subject = 'JCTC - Password Reset Request',
  body_html = '<html><body><h2>Password Reset Request</h2><p>Hello {{user_name}},</p><p>We received a request to reset your password. Click the link below to reset it:</p><p><a href="{{reset_url}}">Reset Password</a></p><p>This link will expire in 1 hour.</p><p>If you did not request this, please ignore this email.</p></body></html>',
  body_plain = 'Password Reset Request

Hello {{user_name}},

We received a request to reset your password.

Reset your password at: {{reset_url}}

This link will expire in 1 hour.

If you did not request this, please ignore this email.',
  variables = '["{{user_name}}", "{{reset_url}}"]'
WHERE template_key = 'password_reset';

-- Update case_assignment template with original migration content
UPDATE email_templates SET 
  subject = 'JCTC - New Case Assigned: {{case_number}}',
  body_html = '<html><body><h2>Case Assignment Notification</h2><p>Hello {{user_name}},</p><p>You have been assigned to case <strong>{{case_number}}</strong>.</p><p><strong>Case Title:</strong> {{case_title}}</p><p><strong>Priority:</strong> {{case_priority}}</p><p>Please review the case details in the system.</p><p><a href="{{case_url}}">View Case</a></p></body></html>',
  body_plain = 'Case Assignment Notification

Hello {{user_name}},

You have been assigned to case {{case_number}}.

Case Title: {{case_title}}
Priority: {{case_priority}}

View case at: {{case_url}}',
  variables = '["{{user_name}}", "{{case_number}}", "{{case_title}}", "{{case_priority}}", "{{case_url}}"]'
WHERE template_key = 'case_assignment';
