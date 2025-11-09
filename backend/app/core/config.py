from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:postgres123@postgres:5432/rezgenie"  # Base URL, will be modified for async/sync as needed
    
    # Redis
    redis_url: str = "redis://:redis123@redis:6379/0"
    
    # Storage Configuration (MinIO locally, R2 in production)
    storage_provider: str = "minio"  # "minio" or "r2"
    
    # MinIO Configuration (local development)
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_secure: bool = False
    minio_bucket_name: str = "rezgenie-uploads"
    
    # Cloudflare R2 Configuration (production)
    r2_endpoint: str = ""
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_bucket_name: str = "rezgenie-uploads"
    r2_secure: bool = True  # Always use HTTPS for R2
    
    @property
    def is_production(self) -> bool:
        """Check if we're running in production environment"""
        return self.environment == "production"
    
    @property
    def storage_endpoint(self) -> str:
        """Get the appropriate storage endpoint"""
        return self.r2_endpoint if self.is_production else self.minio_endpoint
    
    @property
    def storage_access_key(self) -> str:
        """Get the appropriate access key"""
        return self.r2_access_key if self.is_production else self.minio_access_key
    
    @property
    def storage_secret_key(self) -> str:
        """Get the appropriate secret key"""
        return self.r2_secret_key if self.is_production else self.minio_secret_key
    
    @property
    def storage_bucket_name(self) -> str:
        """Get the appropriate bucket name"""
        return self.r2_bucket_name if self.is_production else self.minio_bucket_name
    
    @property
    def storage_secure(self) -> bool:
        """Get the appropriate secure setting"""
        return self.r2_secure if self.is_production else self.minio_secure
    
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