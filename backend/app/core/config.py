from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres123@postgres:5432/rezgenie"
    
    # Redis
    redis_url: str = "redis://:redis123@redis:6379/0"
    
    # MinIO/S3
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_secure: bool = False
    minio_bucket_name: str = "rezgenie-uploads"
    
    # OpenAI
    openai_api_key: str = ""
    # Choose a broadly-available default model; can be overridden by OPENAI_MODEL env var
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    
    # JWT
    jwt_secret_key: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    
    # Application
    environment: str = "development"
    debug: bool = True
    log_level: str = "info"
    
    # File Upload
    max_file_size: int = 10485760  # 10MB
    allowed_extensions: list = ["pdf", "docx"]
    
    # Rate Limiting
    daily_genie_wishes: int = 3
    rate_limit_per_minute: int = 60
    
    # Celery
    celery_broker_url: str = "redis://:redis123@redis:6379/0"
    celery_result_backend: str = "redis://:redis123@redis:6379/0"
    
    # Adzuna API Configuration
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    adzuna_country: str = "ca"  # Canada
    adzuna_base_url: str = "https://api.adzuna.com/v1/api/jobs"
    adzuna_rate_limit: int = 10
    adzuna_max_pages: int = 5
    
    # Job Processing Configuration
    job_embedding_batch_size: int = 50
    job_cleanup_days: int = 30
    job_ingestion_interval: int = 3600  # seconds

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Global settings instance
settings = get_settings()