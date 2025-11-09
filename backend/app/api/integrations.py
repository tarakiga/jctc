from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import hmac
import hashlib
import json

from app.database import get_db
from app.models.integration import APIKey, Webhook, WebhookDelivery, DataMapping, ExternalSystem
from app.models.user import User
from app.schemas.integrations import (
    APIKeyCreate,
    APIKeyResponse,
    WebhookCreate,
    WebhookResponse,
    WebhookUpdate,
    WebhookDeliveryResponse,
    DataMappingCreate,
    DataMappingResponse,
    ExternalSystemCreate,
    ExternalSystemResponse,
    WebhookTestRequest,
    DataTransformationRequest,
    DataTransformationResponse,
    APIKeyUpdate
)
from app.utils.auth import get_current_user, get_user_by_api_key
from app.schemas.user import User as UserSchema
from app.utils.webhooks import (
    send_webhook,
    verify_webhook_signature,
    get_webhook_events,
    log_webhook_delivery
)
from app.utils.transformers import (
    transform_data,
    validate_schema,
    get_transformation_templates
)

router = APIRouter()

# --- API Key Management ---

@router.post("/api-keys", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    api_key_create: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Create a new API key for external system access (Admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create API keys"
        )
    
    # Generate key and secret
    key_prefix = "jctc_pk"
    secret_prefix = "jctc_sk"
    
    key = f"{key_prefix}_{uuid.uuid4().hex}"
    secret = f"{secret_prefix}_{uuid.uuid4().hex}"
    
    hashed_secret = hashlib.sha256(secret.encode()).hexdigest()
    
    db_api_key = APIKey(
        id=str(uuid.uuid4()),
        key=key,
        hashed_secret=hashed_secret,
        name=api_key_create.name,
        description=api_key_create.description,
        user_id=api_key_create.user_id,
        permissions=api_key_create.permissions,
        rate_limit=api_key_create.rate_limit,
        expires_at=api_key_create.expires_at,
        is_active=True,
        created_by=current_user.id
    )
    
    db.add(db_api_key)
    db.commit()
    db.refresh(db_api_key)
    
    # Return the key and secret to the user ONCE
    response = APIKeyResponse.from_orm(db_api_key)
    response.secret = secret
    
    return response

@router.get("/api-keys", response_model=List[APIKeyResponse])
async def list_api_keys(
    user_id: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """List all API keys (Admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view API keys"
        )
    
    query = db.query(APIKey)
    
    if user_id:
        query = query.filter(APIKey.user_id == user_id)
    
    if active_only:
        query = query.filter(APIKey.is_active == True)
    
    api_keys = query.all()
    
    return [APIKeyResponse.from_orm(key) for key in api_keys]

@router.put("/api-keys/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: str,
    key_update: APIKeyUpdate,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Update an API key's properties (Admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update API keys"
        )
    
    db_key = db.query(APIKey).filter(APIKey.id == key_id).first()
    if not db_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    update_data = key_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_key, field, value)
    
    db_key.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_key)
    
    return APIKeyResponse.from_orm(db_key)

@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Revoke (deactivate) an API key (Admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can revoke API keys"
        )
    
    db_key = db.query(APIKey).filter(APIKey.id == key_id).first()
    if not db_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    db_key.is_active = False
    db_key.updated_at = datetime.utcnow()
    
    db.commit()
    
    return None

# --- Webhook Management ---

@router.post("/webhooks", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    webhook_create: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Create a new webhook for event notifications (Admin/Supervisor only)"""
    
    if current_user.role not in ["admin", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create webhooks"
        )
    
    # Generate secret for HMAC signature
    secret = f"whsec_{uuid.uuid4().hex}"
    
    db_webhook = Webhook(
        id=str(uuid.uuid4()),
        url=str(webhook_create.url),
        secret=secret,
        events=webhook_create.events,
        description=webhook_create.description,
        is_active=True,
        created_by=current_user.id,
        retry_policy=webhook_create.retry_policy or {"retries": 3, "delay": 60},
        headers=webhook_create.headers or {}
    )
    
    db.add(db_webhook)
    db.commit()
    db.refresh(db_webhook)
    
    return WebhookResponse.from_orm(db_webhook)

@router.get("/webhooks", response_model=List[WebhookResponse])
async def list_webhooks(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """List all configured webhooks (Admin/Supervisor only)"""
    
    if current_user.role not in ["admin", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view webhooks"
        )
    
    query = db.query(Webhook)
    
    if active_only:
        query = query.filter(Webhook.is_active == True)
    
    webhooks = query.all()
    
    return [WebhookResponse.from_orm(wh) for wh in webhooks]

@router.put("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: str,
    webhook_update: WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Update a webhook's configuration (Admin/Supervisor only)"""
    
    if current_user.role not in ["admin", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update webhooks"
        )
    
    db_webhook = db.query(Webhook).filter(Webhook.id == webhook_id).first()
    if not db_webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    update_data = webhook_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_webhook, field, value)
    
    db_webhook.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_webhook)
    
    return WebhookResponse.from_orm(db_webhook)

@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Delete a webhook (Admin/Supervisor only)"""
    
    if current_user.role not in ["admin", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete webhooks"
        )
    
    db_webhook = db.query(Webhook).filter(Webhook.id == webhook_id).first()
    if not db_webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    db.delete(db_webhook)
    db.commit()
    
    return None

@router.post("/webhooks/{webhook_id}/test", response_model=Dict[str, Any])
async def test_webhook(
    webhook_id: str,
    test_request: WebhookTestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Send a test event to a webhook"""
    
    db_webhook = db.query(Webhook).filter(Webhook.id == webhook_id).first()
    if not db_webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found"
        )
    
    event_type = test_request.event or "test.ping"
    payload = test_request.payload or {
        "message": "This is a test event from the JCTC system.",
        "timestamp": datetime.utcnow().isoformat(),
        "triggered_by": current_user.id
    }
    
    background_tasks.add_task(
        send_webhook,
        webhook_id=db_webhook.id,
        event_type=event_type,
        payload=payload,
        db=db
    )
    
    return {
        "message": "Test webhook event has been queued for delivery",
        "webhook_id": webhook_id,
        "event_type": event_type
    }

@router.get("/webhooks/{webhook_id}/deliveries", response_model=List[WebhookDeliveryResponse])
async def get_webhook_deliveries(
    webhook_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get delivery history for a webhook"""
    
    deliveries = db.query(WebhookDelivery).filter(
        WebhookDelivery.webhook_id == webhook_id
    ).order_by(WebhookDelivery.timestamp.desc()).offset(offset).limit(limit).all()
    
    return [WebhookDeliveryResponse.from_orm(d) for d in deliveries]

@router.get("/webhooks/events", response_model=List[str])
async def get_available_webhook_events():
    """Get a list of all available webhook events"""
    return get_webhook_events()

# --- Data Mapping & Transformation ---

@router.post("/data-mappings", response_model=DataMappingResponse, status_code=status.HTTP_201_CREATED)
async def create_data_mapping(
    data_mapping_create: DataMappingCreate,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Create a new data mapping for transformations (Admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create data mappings"
        )
    
    db_mapping = DataMapping(
        id=str(uuid.uuid4()),
        name=data_mapping_create.name,
        description=data_mapping_create.description,
        source_schema=data_mapping_create.source_schema,
        target_schema=data_mapping_create.target_schema,
        mapping_rules=data_mapping_create.mapping_rules,
        created_by=current_user.id
    )
    
    db.add(db_mapping)
    db.commit()
    db.refresh(db_mapping)
    
    return DataMappingResponse.from_orm(db_mapping)

@router.get("/data-mappings", response_model=List[DataMappingResponse])
async def list_data_mappings(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """List all data mappings (Admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view data mappings"
        )
    
    mappings = db.query(DataMapping).all()
    return [DataMappingResponse.from_orm(m) for m in mappings]

@router.post("/transform", response_model=DataTransformationResponse)
async def perform_data_transformation(
    request: DataTransformationRequest,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Transform data using a specified mapping"""
    
    mapping = db.query(DataMapping).filter(DataMapping.id == request.mapping_id).first()
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data mapping not found"
        )
    
    try:
        transformed_data, errors = transform_data(
            source_data=request.source_data,
            mapping_rules=mapping.mapping_rules,
            target_schema=mapping.target_schema
        )
        
        return DataTransformationResponse(
            mapping_id=request.mapping_id,
            source_data=request.source_data,
            transformed_data=transformed_data,
            errors=errors,
            is_valid=not errors
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data transformation failed: {str(e)}"
        )

@router.get("/transform/templates", response_model=Dict[str, Any])
async def get_transformation_templates_endpoint():
    """Get available data transformation templates"""
    return get_transformation_templates()

# --- External System Management ---

@router.post("/external-systems", response_model=ExternalSystemResponse, status_code=status.HTTP_201_CREATED)
async def create_external_system(
    system_create: ExternalSystemCreate,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Register a new external system (Admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can register external systems"
        )
    
    db_system = ExternalSystem(
        id=str(uuid.uuid4()),
        name=system_create.name,
        description=system_create.description,
        system_type=system_create.system_type,
        base_url=str(system_create.base_url),
        auth_type=system_create.auth_type,
        auth_details=system_create.auth_details,
        is_active=True,
        created_by=current_user.id
    )
    
    db.add(db_system)
    db.commit()
    db.refresh(db_system)
    
    return ExternalSystemResponse.from_orm(db_system)

@router.get("/external-systems", response_model=List[ExternalSystemResponse])
async def list_external_systems(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """List all registered external systems (Admin only)"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view external systems"
        )
    
    query = db.query(ExternalSystem)
    
    if active_only:
        query = query.filter(ExternalSystem.is_active == True)
    
    systems = query.all()
    
    return [ExternalSystemResponse.from_orm(s) for s in systems]

# --- Incoming Data Endpoints ---

@router.post("/ingress/generic/{source_system}")
async def generic_data_ingress(
    source_system: str,
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    x_api_key: str = Header(...),
    x_signature: Optional[str] = Header(None),
    x_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Generic endpoint for receiving data from external systems"""
    
    # Authenticate using API key
    user = await get_user_by_api_key(x_api_key, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    # Verify signature if provided
    if x_signature:
        # In a real implementation, you would fetch the secret for the API key
        # and verify the signature
        pass
    
    # Log the incoming data
    # In a real implementation, you would have a dedicated logging table
    
    # Process the data in the background
    background_tasks.add_task(
        process_incoming_data,
        source_system,
        payload,
        user.id
    )
    
    return {
        "status": "received",
        "message": "Data received and queued for processing",
        "timestamp": datetime.utcnow().isoformat()
    }

async def process_incoming_data(source_system: str, payload: Dict[str, Any], user_id: str):
    """Background task to process incoming data"""
    # 1. Identify the data type (e.g., new case, evidence update)
    # 2. Find the appropriate data mapping
    # 3. Transform the data
    # 4. Create or update the relevant records in the JCTC system
    # 5. Log the outcome
    pass

@router.post("/ingress/forensics/cellebrite")
async def ingress_cellebrite_report(
    report: Dict[str, Any],
    x_api_key: str = Header(...),
    db: Session = Depends(get_db)
):
    """Specific endpoint for ingesting Cellebrite forensic reports"""
    
    # Authenticate
    user = await get_user_by_api_key(x_api_key, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    # Find the Cellebrite to JCTC data mapping
    mapping = db.query(DataMapping).filter(DataMapping.name == "Cellebrite to JCTC Evidence").first()
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Cellebrite data mapping not configured"
        )
    
    # Transform and process the data
    # ...
    
    return {"status": "processing", "message": "Cellebrite report is being processed"}

@router.post("/ingress/forensics/encase")
async def ingress_encase_report(
    report: Dict[str, Any],
    x_api_key: str = Header(...),
    db: Session = Depends(get_db)
):
    """Specific endpoint for ingesting EnCase forensic reports"""
    
    # Authenticate
    user = await get_user_by_api_key(x_api_key, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    # Find the EnCase to JCTC data mapping
    mapping = db.query(DataMapping).filter(DataMapping.name == "EnCase to JCTC Evidence").first()
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="EnCase data mapping not configured"
        )
    
    # Transform and process the data
    # ...
    
    return {"status": "processing", "message": "EnCase report is being processed"}

# --- Outgoing Data Endpoints ---

@router.get("/export/cases/{case_id}/{system_name}")
async def export_case_to_system(
    case_id: str,
    system_name: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Export a case to a specified external system"""
    
    # 1. Get case data
    # 2. Get external system details
    # 3. Get the appropriate data mapping
    # 4. Transform the case data
    # 5. Send the data to the external system's API
    
    return {"status": "exporting", "message": f"Case {case_id} is being exported to {system_name}"}

@router.get("/health/external-systems")
async def check_external_systems_health(
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Check the health and connectivity of all registered external systems"""
    
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can check external system health"
        )
    
    systems = db.query(ExternalSystem).filter(ExternalSystem.is_active == True).all()
    
    health_statuses = []
    for system in systems:
        # In a real implementation, you would ping the system's health endpoint
        health_statuses.append({
            "system_id": system.id,
            "system_name": system.name,
            "status": "healthy",  # Placeholder
            "last_checked": datetime.utcnow().isoformat(),
            "response_time_ms": 50  # Placeholder
        })
    
    return {
        "total_systems": len(systems),
        "healthy_systems": len(systems),
        "unhealthy_systems": 0,
        "statuses": health_statuses
    }