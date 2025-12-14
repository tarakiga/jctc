from pydantic_settings import BaseSettings
from pydantic import field_validator, ConfigDict
from typing import List, Optional
import secrets
from functools import lru_cache


class Settings(BaseSettings):
    # Application Settings
    app_name: str = "JCTC Management System"
    app_version: str = "1.0.0"
    debug: bool = False
    api_v1_str: str = "/api/v1"
    
    # Security
    secret_key: str = secrets.token_urlsafe(32)
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Database
    database_url: str
    database_test_url: Optional[str] = None
    
    # File Storage
    file_storage_path: str = "./storage"
    max_file_size: int = 100  # MB
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Email
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    email_from: str = "noreply@jctc.gov.ng"
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    # CORS
    allowed_origins: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:8080"]
    
    # Security Headers
    allowed_hosts: List[str] = ["localhost", "127.0.0.1"]
    
    # Field-level Encryption
    field_encryption_key: Optional[str] = None  # Fernet key for PII encryption
    
    # SSO/OAuth2 Configuration
    sso_enabled: bool = False
    sso_provider: str = "keycloak"  # keycloak, azure_ad, okta, generic_oidc
    sso_client_id: Optional[str] = None
    sso_client_secret: Optional[str] = None
    sso_authorization_url: Optional[str] = None
    sso_token_url: Optional[str] = None
    sso_userinfo_url: Optional[str] = None
    sso_logout_url: Optional[str] = None
    sso_scopes: List[str] = ["openid", "profile", "email"]
    sso_tenant_id: Optional[str] = None  # Azure AD
    sso_realm: Optional[str] = None      # Keycloak
    
    # Session Management
    session_timeout_minutes: int = 30
    max_concurrent_sessions: int = 5
    session_extend_on_activity: bool = True
    
    # SIEM Configuration
    siem_enabled: bool = False
    siem_webhook_url: Optional[str] = None
    siem_webhook_api_key: Optional[str] = None
    siem_syslog_host: Optional[str] = None
    siem_syslog_port: int = 514
    siem_syslog_protocol: str = "UDP"  # UDP or TCP
    siem_format: str = "json"  # json, cef, leef
    siem_export_interval_seconds: int = 60
    
    # S3/MinIO Object Storage
    s3_enabled: bool = False
    s3_endpoint_url: Optional[str] = None  # MinIO: http://localhost:9000
    s3_access_key: Optional[str] = None
    s3_secret_key: Optional[str] = None
    s3_region: str = "us-east-1"
    s3_bucket_name: str = "jctc-evidence"
    s3_use_ssl: bool = True
    s3_presigned_url_expiry: int = 3600  # 1 hour
    
    @field_validator("allowed_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()