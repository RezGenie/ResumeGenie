#!/usr/bin/env python3
"""
RezGenie Database Setup Script
Initializes database, runs migrations, and sets up initial data.
"""

import asyncio
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

from app.core.database import init_db, engine
from app.core.config import settings
from sqlalchemy import text
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def check_database_connection():
    """Check if database connection is working."""
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful")
            return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


async def check_extensions():
    """Check if required PostgreSQL extensions are installed."""
    try:
        async with engine.begin() as conn:
            # Check pgvector extension
            result = await conn.execute(
                text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            )
            if result.fetchone():
                logger.info("✅ pgvector extension is installed")
            else:
                logger.warning("⚠️  pgvector extension not found")
                
            # Check uuid extension
            result = await conn.execute(
                text("SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'")
            )
            if result.fetchone():
                logger.info("✅ uuid-ossp extension is installed")
            else:
                logger.warning("⚠️  uuid-ossp extension not found")
                
        return True
    except Exception as e:
        logger.error(f"❌ Failed to check extensions: {e}")
        return False


async def create_tables():
    """Create database tables."""
    try:
        await init_db()
        logger.info("✅ Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {e}")
        return False


async def main():
    """Main setup function."""
    logger.info("🚀 Starting RezGenie database setup...")
    
    # Check configuration
    logger.info(f"Database URL: {settings.database_url}")
    logger.info(f"Environment: {settings.environment}")
    
    # Check database connection
    if not await check_database_connection():
        logger.error("Cannot proceed without database connection")
        return False
    
    # Check extensions
    await check_extensions()
    
    # Create tables
    if not await create_tables():
        logger.error("Failed to create database tables")
        return False
    
    logger.info("🎉 Database setup completed successfully!")
    return True


if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Setup failed with error: {e}")
        sys.exit(1)