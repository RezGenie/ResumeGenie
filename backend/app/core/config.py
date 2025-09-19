from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://rezgenie:rezgenie_password@localhost:5432/rezgenie"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Authentication
    JWT_SECRET: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # File upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_PATH: str = "/tmp/uploads"
    
    # Daily wishes limit
    DAILY_WISHES_LIMIT: int = 3
    
    class Config:
        env_file = ".env"


settings = Settings()