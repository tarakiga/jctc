"""Email service for sending emails via configured SMTP providers"""
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import ssl
from typing import List, Optional, Dict, Any
from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import re

# Load environment variables at module level
load_dotenv()

from app.models.email import EmailSettings, EmailTemplate


class EmailEncryption:
    """Handle encryption/decryption of SMTP passwords"""
    
    def __init__(self):
        encryption_key = os.getenv('EMAIL_ENCRYPTION_KEY')
        if not encryption_key:
            raise ValueError("EMAIL_ENCRYPTION_KEY environment variable not set")
        self.cipher = Fernet(encryption_key.encode())
    
    def encrypt(self, plain_text: str) -> str:
        """Encrypt plain text password"""
        return self.cipher.encrypt(plain_text.encode()).decode()
    
    def decrypt(self, encrypted_text: str) -> str:
        """Decrypt encrypted password"""
        return self.cipher.decrypt(encrypted_text.encode()).decode()


class EmailService:
    """Service for sending emails using configured SMTP settings"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.encryption = EmailEncryption()
    
    async def get_active_config(self) -> Optional[EmailSettings]:
        """Fetch the active email configuration"""
        result = await self.db.execute(
            select(EmailSettings).where(EmailSettings.is_active == True)
        )
        return result.scalar_one_or_none()
    
    async def get_template(self, template_key: str) -> Optional[EmailTemplate]:
        """Fetch email template by key"""
        result = await self.db.execute(
            select(EmailTemplate).where(
                EmailTemplate.template_key == template_key,
                EmailTemplate.is_active == True
            )
        )
        return result.scalar_one_or_none()
    
    def render_template(self, template: str, variables: Dict[str, str]) -> str:
        """Replace {{variable}} placeholders with actual values"""
        rendered = template
        for key, value in variables.items():
            # Support both {{key}} and {{{{key}}}} formats
            rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
        return rendered
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_body: str,
        plain_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        reply_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email using configured SMTP settings
        
        Args:
            to_emails: List of recipient email addresses
            subject: Email subject line
            html_body: HTML version of email body
            plain_body: Plain text version (optional)
            cc: CC recipients (optional)
            bcc: BCC recipients (optional)
            reply_to: Custom reply-to address (optional, overrides config)
        
        Returns:
            dict: Status and message
        
        Raises:
            Exception: If no active config or SMTP error
        """
        config = await self.get_active_config()
        if not config:
            raise Exception("No active email configuration found. Please configure email settings in admin panel.")
        
        # Decrypt password
        try:
            password = self.encryption.decrypt(config.smtp_password_encrypted)
        except Exception as e:
            raise Exception(f"Failed to decrypt SMTP password: {str(e)}")
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{config.from_name} <{config.from_email}>"
        msg['To'] = ', '.join(to_emails)
        msg['Subject'] = subject
        
        # Set Reply-To
        if reply_to:
            msg['Reply-To'] = reply_to
        elif config.reply_to_email:
            msg['Reply-To'] = config.reply_to_email
        
        # Add CC and BCC
        if cc:
            msg['Cc'] = ', '.join(cc)
        if bcc:
            msg['Bcc'] = ', '.join(bcc)
        
        # Attach bodies
        if plain_body:
            msg.attach(MIMEText(plain_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        # All recipients for sending
        all_recipients = to_emails + (cc or []) + (bcc or [])
        
        # Send via SMTP
        try:
            if config.smtp_use_ssl:
                # SSL connection
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port, context=context)
            else:
                # Standard connection with optional TLS
                server = smtplib.SMTP(config.smtp_host, config.smtp_port)
                if config.smtp_use_tls:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
            
            # Login and send
            server.login(config.smtp_username, password)
            server.send_message(msg)
            server.quit()
            
            return {
                "status": "success",
                "message": f"Email sent successfully to {len(all_recipients)} recipient(s)"
            }
        
        except smtplib.SMTPAuthenticationError as e:
            raise Exception(f"SMTP Authentication failed: {str(e)}. Please verify username/password.")
        except smtplib.SMTPException as e:
            raise Exception(f"SMTP error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to send email: {str(e)}")
    
    async def send_templated_email(
        self,
        to_emails: List[str],
        template_key: str,
        variables: Dict[str, str],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send email using a predefined template
        
        Args:
            to_emails: List of recipient email addresses
            template_key: Template identifier (e.g., 'user_invite')
            variables: Dict of template variables to substitute
            **kwargs: Additional arguments passed to send_email
        
        Returns:
            dict: Status and message
        """
        template = await self.get_template(template_key)
        if not template:
            raise Exception(f"Email template '{template_key}' not found")
        
        # Render template
        rendered_subject = self.render_template(template.subject, variables)
        rendered_html = self.render_template(template.body_html, variables)
        rendered_plain = self.render_template(template.body_plain, variables) if template.body_plain else None
        
        return await self.send_email(
            to_emails=to_emails,
            subject=rendered_subject,
            html_body=rendered_html,
            plain_body=rendered_plain,
            **kwargs
        )
    
    async def test_connection(self, config_id: str, test_email: str) -> Dict[str, Any]:
        """
        Test email configuration by sending a test email
        
        Args:
            config_id: Email settings configuration ID
            test_email: Email address to send test to
        
        Returns:
            dict: Test result with status
        """
        # Get specific config (not necessarily active)
        result = await self.db.execute(
            select(EmailSettings).where(EmailSettings.id == config_id)
        )
        config = result.scalar_one_or_none()
        
        if not config:
            raise Exception("Email configuration not found")
        
        # Temporarily activate for testing
        original_config = await self.get_active_config()
        if original_config:
            original_config.is_active = False
        
        config.is_active = True
        await self.db.flush()
        
        try:
            # Send test email
            result = await self.send_email(
                to_emails=[test_email],
                subject="JCTC - Email Configuration Test",
                html_body="""
                <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #4F46E5;">Email Configuration Test</h2>
                    <p>Congratulations! Your email configuration is working correctly.</p>
                    <p>This test email was sent from the JCTC system using your configured SMTP settings.</p>
                    <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
                    <p style="color: #6B7280; font-size: 12px;">
                        Configuration: {provider}<br>
                        SMTP Host: {host}:{port}<br>
                        From: {from_email}
                    </p>
                </body>
                </html>
                """.format(
                    provider=config.provider,
                    host=config.smtp_host,
                    port=config.smtp_port,
                    from_email=config.from_email
                ),
                plain_body=f"Email configuration test successful!\n\nYour JCTC email settings are configured correctly.\n\nProvider: {config.provider}\nSMTP: {config.smtp_host}:{config.smtp_port}"
            )
            
            # Update test status
            config.last_test_sent_at = datetime.utcnow()
            config.last_test_status = "success"
            config.last_test_error = None
            config.test_email = test_email
            await self.db.commit()
            
            return {
                "success": True,
                "status": "success",
                "message": "Test email sent successfully. Check your inbox.",
                "test_email": test_email
            }
        
        except Exception as e:
            # Update error status
            config.last_test_sent_at = datetime.utcnow()
            config.last_test_status = "failed"
            config.last_test_error = str(e)
            await self.db.commit()
            
            raise Exception(f"Test failed: {str(e)}")
        
        finally:
            # Restore original active config
            config.is_active = False
            if original_config:
                original_config.is_active = True
            await self.db.commit()


# Provider configuration presets
EMAIL_PROVIDER_PRESETS = {
    'microsoft': {
        'name': 'Microsoft 365 / Outlook',
        'smtp_host': 'smtp.office365.com',
        'smtp_port': 587,
        'smtp_use_tls': True,
        'smtp_use_ssl': False,
        'instructions': 'Use your full email address as username. Generate an App Password at account.microsoft.com/security'
    },
    'gmail': {
        'name': 'Gmail',
        'smtp_host': 'smtp.gmail.com',
        'smtp_port': 587,
        'smtp_use_tls': True,
        'smtp_use_ssl': False,
        'instructions': 'Enable 2FA and generate an App Password at myaccount.google.com/apppasswords'
    },
    'zoho': {
        'name': 'Zoho Mail',
        'smtp_host': 'smtp.zoho.com',
        'smtp_port': 587,
        'smtp_use_tls': True,
        'smtp_use_ssl': False,
        'instructions': 'Generate an App Password in Zoho Mail settings under Security'
    },
    'sendgrid': {
        'name': 'SendGrid',
        'smtp_host': 'smtp.sendgrid.net',
        'smtp_port': 587,
        'smtp_use_tls': True,
        'smtp_use_ssl': False,
        'instructions': 'Use "apikey" as username and your SendGrid API key as password'
    },
    'aws_ses': {
        'name': 'AWS SES',
        'smtp_host': 'email-smtp.us-east-1.amazonaws.com',  # Region specific
        'smtp_port': 587,
        'smtp_use_tls': True,
        'smtp_use_ssl': False,
        'instructions': 'Use SMTP credentials generated in AWS SES console (not IAM credentials)'
    },
    'custom': {
        'name': 'Custom SMTP Server',
        'smtp_host': '',
        'smtp_port': 587,
        'smtp_use_tls': True,
        'smtp_use_ssl': False,
        'instructions': 'Enter your SMTP server details manually'
    }
}
