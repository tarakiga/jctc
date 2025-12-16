
import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from dotenv import load_dotenv

# Add app directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env vars
load_dotenv()

from app.models.email import EmailTemplate
from app.config.settings import settings

# Import models to ensure relationships are registered
from app.models.user import User
from app.models.ndpa_compliance import NDPAConsentRecord

# Database setup
DATABASE_URL = settings.database_url
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Theme Configuration
BRAND_COLOR = "#0f172a" # Slate 900
ACCENT_COLOR = "#2563eb" # Blue 600
LOGO_URL = "https://jctc.ng/logo.png" # Assuming frontend deployment serves public assets at root

# Common Styles
BASE_STYLE = """
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #334155;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
"""

CONTAINER_STYLE = """
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
"""

HEADER_STYLE = f"""
    background-color: {BRAND_COLOR};
    padding: 24px;
    text-align: center;
"""

CONTENT_STYLE = """
    padding: 40px 32px;
"""

BUTTON_STYLE = f"""
    display: inline-block;
    background-color: {ACCENT_COLOR};
    color: #ffffff;
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    margin-top: 24px;
"""

FOOTER_STYLE = """
    background-color: #f8fafc;
    padding: 24px;
    text-align: center;
    font-size: 12px;
    color: #64748b;
    border-top: 1px solid #e2e8f0;
"""

def create_html_wrapper(title, content):
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 40px 0; background-color: #f1f5f9; {BASE_STYLE}">
    <div style="{CONTAINER_STYLE}">
        <!-- Header -->
        <div style="{HEADER_STYLE}">
            <img src="{LOGO_URL}" alt="JCTC Logo" height="40" style="display: block; margin: 0 auto;">
        </div>
        
        <!-- Content -->
        <div style="{CONTENT_STYLE}">
            {content}
        </div>
        
        <!-- Footer -->
        <div style="{FOOTER_STYLE}">
            <p style="margin-bottom: 8px;">&copy; 2025 Joint Counter Terrorism Centre. All rights reserved.</p>
            <p style="margin: 0;">This email was sent from an automated system. Please do not reply directly.</p>
        </div>
    </div>
</body>
</html>
"""

# Template Definitions
TEMPLATES = [
    {
        "key": "user_invite",
        "subject": "Welcome to JCTC Portal - Set Up Your Account",
        "variables": ["full_name", "email", "password", "login_url"],
        "body_html": create_html_wrapper(
            "Welcome to JCTC",
            f"""
            <h1 style="margin-top: 0; color: #0f172a; font-size: 24px; font-weight: 700;">Welcome to the Team</h1>
            <p>Dear {{{{full_name}}}},</p>
            <p>An account has been created for you on the Joint Counter Terrorism Centre (JCTC) portal. We are excited to have you on board.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Your credentials:</p>
                <div style="font-weight: 600; color: #0f172a;">Email: {{{{email}}}}</div>
                <div style="font-weight: 600; color: #0f172a;">Temporary Password: {{{{password}}}}</div>
            </div>
            
            <p>Please log in immediately to change your password and complete your profile setup.</p>
            
            <div style="text-align: center;">
                <a href="{{{{login_url}}}}" style="{BUTTON_STYLE}">Login to Portal</a>
            </div>
            """
        ),
        "body_plain": """
Welcome to the Team

Dear {{full_name}},

An account has been created for you on the Joint Counter Terrorism Centre (JCTC) portal.

Your credentials:
Email: {{email}}
Temporary Password: {{password}}

Please log in to change your password: {{login_url}}

© 2025 Joint Counter Terrorism Centre
        """
    },
    {
        "key": "calendar_invite",
        "subject": "Event Invitation: {{title}}",
        "variables": ["title", "start_time", "end_time", "location", "description", "organizer"],
        "body_html": create_html_wrapper(
            "Event Invitation",
            f"""
            <h1 style="margin-top: 0; color: #0f172a; font-size: 24px; font-weight: 700;">Event Invitation</h1>
            <p>You have been invited to the following event:</p>
            
            <h2 style="color: {ACCENT_COLOR}; font-size: 20px; margin-top: 24px;">{{{{title}}}}</h2>
            
            <div style="margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 100px;">When</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #0f172a;">
                            {{{{start_time}}}} - {{{{end_time}}}}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Where</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #0f172a;">{{{{location}}}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Organizer</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #0f172a;">{{{{organizer}}}}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background-color: #f8fafc; border-left: 4px solid {ACCENT_COLOR}; padding: 16px;">
                <p style="margin: 0; color: #475569; font-style: italic;">{{{{description}}}}</p>
            </div>
            """
        ),
        "body_plain": """
Event Invitation

You have been invited to: {{title}}

When: {{start_time}} - {{end_time}}
Where: {{location}}
Organizer: {{organizer}}

Description:
{{description}}

© 2025 Joint Counter Terrorism Centre
        """
    },
    {
        "key": "password_reset",
        "subject": "Password Reset Request",
        "variables": ["full_name", "reset_url", "expiry_minutes"],
        "body_html": create_html_wrapper(
            "Password Reset",
            f"""
            <h1 style="margin-top: 0; color: #0f172a; font-size: 24px; font-weight: 700;">Password Reset</h1>
            <p>Dear {{{{full_name}}}},</p>
            <p>We received a request to reset your password for the JCTC portal. If you didn't make this request, you can safely ignore this email.</p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{{{reset_url}}}}" style="{BUTTON_STYLE}">Reset Password</a>
            </div>
            
            <p style="font-size: 14px; color: #64748b;">This link will expire in {{{{expiry_minutes}}}} minutes.</p>
            <p style="font-size: 14px; color: #64748b; margin-top: 24px;">Or copy and paste this URL into your browser:</p>
            <p style="font-size: 12px; color: {ACCENT_COLOR}; word-break: break-all;">{{{{reset_url}}}}</p>
            """
        ),
        "body_plain": """
Password Reset

Dear {{full_name}},

We received a request to reset your password.
Click the link below to verify your email address and choose a new password:

{{reset_url}}

This link expires in {{expiry_minutes}} minutes.
If you didn't make this request, please ignore it.

© 2025 Joint Counter Terrorism Centre
        """
    },
    {
        "key": "case_assignment",
        "subject": "Case Assignment: {{case_number}}",
        "variables": ["full_name", "case_number", "case_title", "role", "assigned_by", "case_url"],
        "body_html": create_html_wrapper(
            "Case Assignment",
            f"""
            <h1 style="margin-top: 0; color: #0f172a; font-size: 24px; font-weight: 700;">Case Assignment Notification</h1>
            <p>Dear {{{{full_name}}}},</p>
            <p>You have been assigned to a case in the JCTC Case Management System.</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid {ACCENT_COLOR}; padding: 16px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; width: 120px;">Case Number</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{{{{case_number}}}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Case Title</td>
                        <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">{{{{case_title}}}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Your Role</td>
                        <td style="padding: 8px 0; font-weight: 600; color: {ACCENT_COLOR};">{{{{role}}}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b;">Assigned By</td>
                        <td style="padding: 8px 0; color: #0f172a;">{{{{assigned_by}}}}</td>
                    </tr>
                </table>
            </div>
            
            <p>Please review the case details and begin your assigned responsibilities as soon as possible.</p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{{{case_url}}}}" style="{BUTTON_STYLE}">View Case Details</a>
            </div>
            """
        ),
        "body_plain": """
Case Assignment Notification

Dear {{full_name}},

You have been assigned to a case in the JCTC Case Management System.

Case Number: {{case_number}}
Case Title: {{case_title}}
Your Role: {{role}}
Assigned By: {{assigned_by}}

Please review the case details and begin your assigned responsibilities.

View Case: {{case_url}}

© 2025 Joint Counter Terrorism Centre
        """
    }
]

async def seed_templates():
    print("Seeding Email Templates...")
    async with AsyncSessionLocal() as session:
        for tpl in TEMPLATES:
            print(f"   Processing: {tpl['key']}")
            
            # Check if exists
            result = await session.execute(
                select(EmailTemplate).where(EmailTemplate.template_key == tpl['key'])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print("     - Updating existing template")
                existing.subject = tpl['subject']
                existing.body_html = tpl['body_html']
                existing.body_plain = tpl['body_plain']
                existing.variables = tpl['variables']
            else:
                print("     - Creating new template")
                new_tpl = EmailTemplate(
                    template_key=tpl['key'],
                    subject=tpl['subject'],
                    body_html=tpl['body_html'],
                    body_plain=tpl['body_plain'],
                    variables=tpl['variables'],
                    is_active=True
                )
                session.add(new_tpl)
        
        await session.commit()
    
    print("Templates seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_templates())
