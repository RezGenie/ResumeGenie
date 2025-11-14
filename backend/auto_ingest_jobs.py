#!/usr/bin/env python3
"""
Auto-ingest jobs on startup if database is empty.
This runs automatically during deployment.
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.models.job import Job
from app.core.config import settings
from app.services.providers.adzuna import adzuna_provider
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def auto_ingest_jobs():
    """Check if jobs exist, if not run initial ingestion."""
    try:
        # Check if Adzuna credentials are configured
        if not settings.adzuna_app_id or not settings.adzuna_app_key:
            logger.warning("⚠️  Adzuna API credentials not configured. Skipping job ingestion.")
            logger.info("To enable job fetching, set ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables")
            return
        
        # Check if we already have jobs
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(func.count(Job.id)))
            existing_count = result.scalar()
            
            if existing_count > 0:
                logger.info(f"✅ Database already has {existing_count} jobs. Skipping ingestion.")
                return
        
        logger.info("🔄 No jobs found in database. Running initial job ingestion...")
        logger.info(f"Using Adzuna API for {settings.adzuna_country.upper()}")
        
        # Run ingestion with default queries (3 pages per query)
        total_saved = 0
        for query in adzuna_provider.seed_queries[:3]:  # Use first 3 queries only
            logger.info(f"📥 Fetching jobs for: {query}")
            
            for page in range(1, 4):  # 3 pages per query
                try:
                    async with AsyncSessionLocal() as db:
                        saved_count = await adzuna_provider.ingest_and_save(
                            db=db,
                            what=query,
                            page=page
                        )
                        total_saved += saved_count
                        logger.info(f"  ✓ Page {page}: Saved {saved_count} jobs")
                        
                        if saved_count == 0:
                            break  # No more results
                            
                except Exception as e:
                    logger.error(f"  ✗ Error on page {page}: {e}")
                    break
                
                # Rate limiting
                await asyncio.sleep(1)
        
        logger.info(f"✅ Initial job ingestion complete! Total jobs: {total_saved}")
        
    except Exception as e:
        logger.error(f"❌ Auto-ingestion failed: {e}")
        logger.warning("Application will start anyway, but job discovery may be empty")

if __name__ == "__main__":
    asyncio.run(auto_ingest_jobs())
