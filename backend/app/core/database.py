from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool
import logging
from typing import AsyncGenerator
from .config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    poolclass=NullPool,  # Disable connection pooling for development
    pool_pre_ping=True,
    future=True
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

# Create declarative base
Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get database session.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {type(e).__name__}: {str(e)}")
            raise
        finally:
            await session.close()

# Alias for compatibility
get_async_db = get_db


async def init_db():
    """
    Initialize database tables.
    Handles connection errors gracefully.
    """
    try:
        async with engine.begin() as conn:
            # Import all models to ensure they are registered with SQLAlchemy
            from app.models import User, Resume, JobComparison, GenieWish, DailyWishCount  # noqa: F401
            
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")
        logger.warning("Application will continue but database operations may fail until database is available")
        # Don't raise - allow app to start even if DB isn't ready initially
        # This enables health checks and other endpoints to work


async def close_db():
    """
    Close database connections.
    """
    await engine.dispose()
    logger.info("Database connections closed")


async def get_db_health():
    """
    Check database health and return status information.
    """
    try:
        from sqlalchemy import text
        async with AsyncSessionLocal() as session:
            # Simple query to test connection
            result = await session.execute(text("SELECT 1"))
            result.fetchone()  # Remove await - fetchone() is sync in SQLAlchemy 2.0
            return {"connection": "ok", "type": "postgresql"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        raise