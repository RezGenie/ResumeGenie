from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Database - use environment variable or default
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres123@postgres:5432/rezgenie"
    )
    
    @field_validator('database_url', mode='before')
    @classmethod
    def convert_db_url_to_async(cls, v: str) -> str:
        """
        Convert synchronous PostgreSQL URL to async driver.
        Render provides DATABASE_URL with 'postgresql://' (psycopg2 - sync)
        but we need 'postgresql+asyncpg://' (asyncpg - async)
        """
        if isinstance(v, str):
            if v.startswith("postgresql://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v
    
    # Redis - use environment variable or default
    redis_url: str = os.getenv(
        "REDIS_URL",
        "redis://:redis123@redis:6379/0"
    )
    
    # Storage Configuration (MinIO locally, R2 in production)
    # Auto-detect from environment or provided value
    storage_provider: str = os.getenv("STORAGE_PROVIDER", "minio")  # "minio" or "r2"
    
    # MinIO Configuration (local development)
    minio_endpoint: str = os.getenv("MINIO_ENDPOINT", "minio:9000")
    minio_access_key: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    minio_secret_key: str = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
    minio_secure: bool = os.getenv("MINIO_SECURE", "false").lower() == "true"
    minio_bucket_name: str = os.getenv("MINIO_BUCKET_NAME", "rezgenie-uploads")
    
    # Cloudflare R2 Configuration (production)
    r2_endpoint: str = os.getenv("R2_ENDPOINT", "")
    r2_access_key: str = os.getenv("R2_ACCESS_KEY", "")
    r2_secret_key: str = os.getenv("R2_SECRET_KEY", "")
    r2_bucket_name: str = os.getenv("R2_BUCKET_NAME", "rezgenie-uploads")
    r2_secure: bool = True  # Always use HTTPS for R2
    
    @property
    def is_production(self) -> bool:
        """Check if we're running in production environment"""
        return self.storage_provider == "r2" or self.environment == "production"
    
    @property
    def storage_endpoint(self) -> str:
        """Get the appropriate storage endpoint"""
        if self.storage_provider == "r2":
            # R2 endpoint should be in format: <account_id>.r2.cloudflarestorage.com (no path, no protocol)
            endpoint = self.r2_endpoint.replace("https://", "").replace("http://", "")
            # Remove any trailing slashes or paths
            endpoint = endpoint.split("/")[0]
            return endpoint
        return self.minio_endpoint
    
    @property
    def storage_access_key(self) -> str:
        """Get the appropriate access key"""
        return self.r2_access_key if self.storage_provider == "r2" else self.minio_access_key
    
    @property
    def storage_secret_key(self) -> str:
        """Get the appropriate secret key"""
        return self.r2_secret_key if self.storage_provider == "r2" else self.minio_secret_key
    
    @property
    def storage_bucket_name(self) -> str:
        """Get the appropriate bucket name"""
        return self.r2_bucket_name if self.storage_provider == "r2" else self.minio_bucket_name
    
    @property
    def storage_secure(self) -> bool:
        """Get the appropriate secure setting"""
        return self.r2_secure if self.storage_provider == "r2" else self.minio_secure
    
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
    
    # CORS - Frontend origins (comma-separated for multiple)
    cors_origins: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    )
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Get CORS origins as a list"""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
    
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
    adzuna_rate_limit: str = "10"  # Changed to str to handle empty values
    adzuna_max_pages: str = "5"  # Changed to str to handle empty values
    
    @property
    def adzuna_rate_limit_int(self) -> int:
        """Get adzuna_rate_limit as integer"""
        try:
            return int(self.adzuna_rate_limit) if self.adzuna_rate_limit else 10
        except ValueError:
            return 10
    
    @property
    def adzuna_max_pages_int(self) -> int:
        """Get adzuna_max_pages as integer"""
        try:
            return int(self.adzuna_max_pages) if self.adzuna_max_pages else 5
        except ValueError:
            return 5
    
    # Job Processing Configuration
    job_embedding_batch_size: int = 50
    job_cleanup_days: int = 30
    job_ingestion_interval: int = 3600  # seconds
    
    # Stripe Configuration
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_pro_price_id: str = ""  # Set after creating product in Stripe
    stripe_unlimited_price_id: str = ""  # Set after creating product in Stripe

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Global settings instance
settings = get_settings()