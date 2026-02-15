from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Stock Alert API"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://stockalert:stockalert123@localhost:5432/stockalert"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Stock APIs
    FINNHUB_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    POLYGON_API_KEY: str = ""
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    
    # Twilio (SMS)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    
    # Alert Settings
    ALERT_CHECK_INTERVAL: int = 60  # seconds
    MAX_ALERTS_PER_USER: int = 50
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()
