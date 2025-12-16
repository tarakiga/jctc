-- Fix user_invite template variables to match what code sends
-- Code sends: full_name, email, password, login_url
UPDATE email_templates SET 
  subject = 'Welcome to JCTC - Your Account Details',
  body_html = '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;"><h1 style="color: white; margin: 0;">Welcome to JCTC</h1></div><div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;"><p style="font-size: 16px;">Hello <strong>{{full_name}}</strong>,</p><p>You have been invited to join the JCTC platform. Your account has been created with the following credentials:</p><div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;"><p style="margin: 5px 0;"><strong>Email:</strong> {{email}}</p><p style="margin: 5px 0;"><strong>Temporary Password:</strong> {{password}}</p></div><p style="color: #e74c3c;"><strong>Important:</strong> Please change your password immediately after your first login.</p><p style="text-align: center; margin-top: 30px;"><a href="{{login_url}}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login Now</a></p><p style="margin-top: 30px; font-size: 12px; color: #666;">If the button above does not work, copy and paste this URL into your browser:<br/>{{login_url}}</p></div></body></html>',
  body_plain = 'Welcome to JCTC

Hello {{full_name}},

You have been invited to join the JCTC platform.

Your login credentials:
- Email: {{email}}
- Temporary Password: {{password}}

Please login at: {{login_url}}

Important: Change your password immediately after your first login.',
  variables = '["{{full_name}}", "{{email}}", "{{password}}", "{{login_url}}"]'
WHERE template_key = 'user_invite';

-- Fix password_reset template - code sends full_name, reset_url
UPDATE email_templates SET 
  subject = 'JCTC - Password Reset Request',
  body_html = '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;"><h1 style="color: white; margin: 0;">Password Reset</h1></div><div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;"><p style="font-size: 16px;">Hello <strong>{{full_name}}</strong>,</p><p>We received a request to reset your password. Click the button below to create a new password:</p><p style="text-align: center; margin: 30px 0;"><a href="{{reset_url}}" style="background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a></p><p style="color: #666; font-size: 14px;">This link will expire in 30 minutes.</p><p style="color: #666; font-size: 14px;">If you did not request this password reset, please ignore this email.</p><p style="margin-top: 30px; font-size: 12px; color: #666;">If the button above does not work, copy and paste this URL into your browser:<br/>{{reset_url}}</p></div></body></html>',
  body_plain = 'Password Reset Request

Hello {{full_name}},

We received a request to reset your password.

Reset your password at: {{reset_url}}

This link will expire in 30 minutes.

If you did not request this, please ignore this email.',
  variables = '["{{full_name}}", "{{reset_url}}"]'
WHERE template_key = 'password_reset';

-- Fix case_assignment template - code sends full_name, case_number, case_title, case_priority, case_url
UPDATE email_templates SET 
  subject = 'JCTC - New Case Assigned: {{case_number}}',
  body_html = '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;"><h1 style="color: white; margin: 0;">New Case Assignment</h1></div><div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;"><p style="font-size: 16px;">Hello <strong>{{full_name}}</strong>,</p><p>You have been assigned to a new case:</p><div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #11998e;"><p style="margin: 5px 0;"><strong>Case Number:</strong> {{case_number}}</p><p style="margin: 5px 0;"><strong>Title:</strong> {{case_title}}</p><p style="margin: 5px 0;"><strong>Priority:</strong> {{case_priority}}</p></div><p style="text-align: center; margin-top: 30px;"><a href="{{case_url}}" style="background: #11998e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Case</a></p></div></body></html>',
  body_plain = 'New Case Assignment

Hello {{full_name}},

You have been assigned to case {{case_number}}.

Case Title: {{case_title}}
Priority: {{case_priority}}

View case at: {{case_url}}',
  variables = '["{{full_name}}", "{{case_number}}", "{{case_title}}", "{{case_priority}}", "{{case_url}}"]'
WHERE template_key = 'case_assignment';

-- Fix calendar_invite template
UPDATE email_templates SET 
  subject = 'JCTC - Event Invitation: {{title}}',
  body_html = '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;"><h1 style="color: white; margin: 0;">Event Invitation</h1></div><div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;"><p style="font-size: 16px;">Hello,</p><p>You have been invited to <strong>{{title}}</strong>.</p><div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4facfe;"><p style="margin: 5px 0;"><strong>When:</strong> {{start_time}} - {{end_time}}</p><p style="margin: 5px 0;"><strong>Location:</strong> {{location}}</p><p style="margin: 5px 0;"><strong>Organizer:</strong> {{organizer}}</p></div><p><strong>Description:</strong></p><p style="color: #666;">{{description}}</p><p style="text-align: center; margin-top: 30px;">Please mark your calendar and ensure your attendance.</p></div></body></html>',
  body_plain = 'Event Invitation

You have been invited to {{title}}.

When: {{start_time}} - {{end_time}}
Location: {{location}}
Organizer: {{organizer}}

Description:
{{description}}

Please mark your calendar and ensure your attendance.',
  variables = '["{{title}}", "{{start_time}}", "{{end_time}}", "{{location}}", "{{organizer}}", "{{description}}"]'
WHERE template_key = 'calendar_invite';
