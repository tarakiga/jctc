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