"""Email settings API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

from app.core.deps import get_db, get_current_user, require_admin
from app.models.email import EmailSettings, EmailTemplate
from app.models.user import User
from app.services.email_service import EmailService, EmailEncryption, EMAIL_PROVIDER_PRESETS

router = APIRouter()


# Schemas
class EmailSettingsCreate(BaseModel):
    provider: str
    smtp_host: str
    smtp_port: int = 587
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    smtp_username: str
    smtp_password: str  # Will be encrypted before storage
    from_email: EmailStr
    from_name: str = "JCTC System"
    reply_to_email: Optional[EmailStr] = None


class EmailSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_use_tls: Optional[bool] = None
    smtp_use_ssl: Optional[bool] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None  # Will be encrypted
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None
    reply_to_email: Optional[EmailStr] = None


class EmailSettingsResponse(BaseModel):
    id: str
    provider: str
    smtp_host: str
    smtp_port: int
    smtp_use_tls: bool
    smtp_use_ssl: bool
    smtp_username: str
    from_email: str
    from_name: str
    reply_to_email: Optional[str]
    is_active: bool
    test_email: Optional[str]
    last_test_sent_at: Optional[datetime]
    last_test_status: Optional[str]
    last_test_error: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        # Convert UUID to string before validation
        if hasattr(obj, 'id') and obj.id:
            obj_dict = {
                'id': str(obj.id),
                'provider': obj.provider,
                'smtp_host': obj.smtp_host,
                'smtp_port': obj.smtp_port,
                'smtp_use_tls': obj.smtp_use_tls,
                'smtp_use_ssl': obj.smtp_use_ssl,
                'smtp_username': obj.smtp_username,
                'from_email': obj.from_email,
                'from_name': obj.from_name,
                'reply_to_email': obj.reply_to_email,
                'is_active': obj.is_active,
                'test_email': obj.test_email,
                'last_test_sent_at': obj.last_test_sent_at,
                'last_test_status': obj.last_test_status,
                'last_test_error': obj.last_test_error,
                'created_at': obj.created_at,
                'updated_at': obj.updated_at,
            }
            return super().model_validate(obj_dict, *args, **kwargs)
        return super().model_validate(obj, *args, **kwargs)


class TestEmailRequest(BaseModel):
    test_email: EmailStr


class ProviderPreset(BaseModel):
    key: str
    name: str
    smtp_host: str
    smtp_port: int
    smtp_use_tls: bool
    smtp_use_ssl: bool
    instructions: str


# Endpoints
@router.get("/email-settings")
async def list_email_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all email configurations (super admin only)"""
    result = await db.execute(select(EmailSettings).order_by(EmailSettings.created_at.desc()))
    configs = result.scalars().all()
    
    # Manually serialize to handle UUID conversion
    return [
        {
            "id": str(config.id),
            "provider": config.provider,
            "smtp_host": config.smtp_host,
            "smtp_port": config.smtp_port,
            "smtp_use_tls": config.smtp_use_tls,
            "smtp_use_ssl": config.smtp_use_ssl,
            "smtp_username": config.smtp_username,
            "from_email": config.from_email,
            "from_name": config.from_name,
            "reply_to_email": config.reply_to_email,
            "is_active": config.is_active,
            "test_email": config.test_email,
            "last_test_sent_at": config.last_test_sent_at,
            "last_test_status": config.last_test_status,
            "last_test_error": config.last_test_error,
            "created_at": config.created_at,
            "updated_at": config.updated_at,
        }
        for config in configs
    ]


@router.get("/email-settings/active", response_model=Optional[EmailSettingsResponse])
async def get_active_email_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get the currently active email configuration"""
    result = await db.execute(
        select(EmailSettings).where(EmailSettings.is_active == True)
    )
    config = result.scalar_one_or_none()
    return config


@router.get("/email-settings/providers", response_model=List[ProviderPreset])
async def list_provider_presets(
    current_user: User = Depends(require_admin)
):
    """List available email provider presets"""
    presets = [
        ProviderPreset(key=key, **values)
        for key, values in EMAIL_PROVIDER_PRESETS.items()
    ]
    return presets


@router.post("/email-settings", status_code=status.HTTP_201_CREATED)
async def create_email_settings(
    settings: EmailSettingsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create new email configuration (super admin only)"""
    
    # Encrypt password
    encryption = EmailEncryption()
    encrypted_password = encryption.encrypt(settings.smtp_password)
    
    # Deactivate any existing active configs
    await db.execute(
        update(EmailSettings).values(is_active=False)
    )
    
    # Create new config (inactive by default until tested)
    new_config = EmailSettings(
        **settings.dict(exclude={'smtp_password'}),
        smtp_password_encrypted=encrypted_password,
        is_active=False,
        created_by=current_user.id
    )
    
    db.add(new_config)
    await db.commit()
    await db.refresh(new_config)
    
    # Return dict with stringified UUID
    return {
        "id": str(new_config.id),
        "provider": new_config.provider,
        "smtp_host": new_config.smtp_host,
        "smtp_port": new_config.smtp_port,
        "smtp_use_tls": new_config.smtp_use_tls,
        "smtp_use_ssl": new_config.smtp_use_ssl,
        "smtp_username": new_config.smtp_username,
        "from_email": new_config.from_email,
        "from_name": new_config.from_name,
        "reply_to_email": new_config.reply_to_email,
        "is_active": new_config.is_active,
        "test_email": new_config.test_email,
        "last_test_sent_at": new_config.last_test_sent_at,
        "last_test_status": new_config.last_test_status,
        "last_test_error": new_config.last_test_error,
        "created_at": new_config.created_at,
        "updated_at": new_config.updated_at,
    }


@router.get("/email-settings/{config_id}", response_model=EmailSettingsResponse)
async def get_email_settings(
    config_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get specific email configuration"""
    result = await db.execute(
        select(EmailSettings).where(EmailSettings.id == config_id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Email configuration not found")
    
    return config


@router.patch("/email-settings/{config_id}", response_model=EmailSettingsResponse)
async def update_email_settings(
    config_id: str,
    settings: EmailSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update email configuration (super admin only)"""
    
    result = await db.execute(
        select(EmailSettings).where(EmailSettings.id == config_id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Email configuration not found")
    
    # Update fields
    update_data = settings.dict(exclude_unset=True)
    
    # Encrypt password if provided
    if 'smtp_password' in update_data and update_data['smtp_password']:
        encryption = EmailEncryption()
        update_data['smtp_password_encrypted'] = encryption.encrypt(update_data.pop('smtp_password'))
    
    for field, value in update_data.items():
        setattr(config, field, value)
    
    config.updated_at = datetime.utcnow()
    
    # If changing critical settings, deactivate until tested again
    if any(key in update_data for key in ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password_encrypted']):
        config.is_active = False
        config.last_test_status = None
    
    await db.commit()
    await db.refresh(config)
    
    return config


@router.post("/email-settings/{config_id}/test")
async def test_email_configuration(
    config_id: str,
    test_request: TestEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Send a test email to verify configuration"""
    
    email_service = EmailService(db)
    
    try:
        result = await email_service.test_connection(config_id, test_request.test_email)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.post("/email-settings/{config_id}/activate")
async def activate_email_configuration(
    config_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Activate email configuration after successful test"""
    
    result = await db.execute(
        select(EmailSettings).where(EmailSettings.id == config_id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Email configuration not found")
    
    # Verify it was tested successfully
    if config.last_test_status != "success":
        raise HTTPException(
            status_code=400,
            detail="Cannot activate configuration that has not been tested successfully. Please test first."
        )
    
    # Deactivate all other configs
    await db.execute(
        update(EmailSettings).values(is_active=False)
    )
    
    # Activate this one
    config.is_active = True
    config.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(config)
    
    return {
        "status": "success",
        "message": "Email configuration activated successfully"
    }


@router.delete("/email-settings/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email_configuration(
    config_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete email configuration (super admin only)"""
    
    result = await db.execute(
        select(EmailSettings).where(EmailSettings.id == config_id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Email configuration not found")
    
    # Prevent deletion of active config
    if config.is_active:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete active email configuration. Please activate another configuration first."
        )
    
    await db.delete(config)
    await db.commit()
    
    return None


# Email Templates Endpoints
@router.get("/email-templates", response_model=List[dict])
async def list_email_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all email templates"""
    result = await db.execute(select(EmailTemplate).order_by(EmailTemplate.template_key))
    templates = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "template_key": t.template_key,
            "subject": t.subject,
            "variables": t.variables,
            "is_active": t.is_active,
            "created_at": t.created_at,
            "updated_at": t.updated_at
        }
        for t in templates
    ]


@router.get("/email-templates/{template_key}", response_model=dict)
async def get_email_template(
    template_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get specific email template"""
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.template_key == template_key)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "id": str(template.id),
        "template_key": template.template_key,
        "subject": template.subject,
        "body_html": template.body_html,
        "body_plain": template.body_plain,
        "variables": template.variables,
        "is_active": template.is_active,
        "created_at": template.created_at,
        "updated_at": template.updated_at
    }
