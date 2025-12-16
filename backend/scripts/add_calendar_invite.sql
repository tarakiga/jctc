-- Add calendar_invite template for event attendees
INSERT INTO email_templates (id, template_key, subject, body_html, body_plain, variables, is_active)
VALUES (
    gen_random_uuid(),
    'calendar_invite',
    'JCTC - Event Invitation: {{title}}',
    '<html><body><h2>Event Invitation</h2><p>Hello,</p><p>You have been invited to <strong>{{title}}</strong>.</p><p><strong>When:</strong> {{start_time}} - {{end_time}}</p><p><strong>Location:</strong> {{location}}</p><p><strong>Organizer:</strong> {{organizer}}</p><p><strong>Description:</strong><br/>{{description}}</p><p>Please mark your calendar and ensure your attendance.</p></body></html>',
    'Event Invitation

You have been invited to {{title}}.

When: {{start_time}} - {{end_time}}
Location: {{location}}
Organizer: {{organizer}}

Description:
{{description}}

Please mark your calendar and ensure your attendance.',
    '["{{title}}", "{{start_time}}", "{{end_time}}", "{{location}}", "{{organizer}}", "{{description}}"]',
    true
) ON CONFLICT (template_key) DO NOTHING;
