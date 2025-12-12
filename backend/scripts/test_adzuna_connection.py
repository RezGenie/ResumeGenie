#!/usr/bin/env python3
"""
Adzuna API Connection Tester
Quick test to verify Adzuna API credentials and connectivity
"""
import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.services.providers.adzuna import adzuna_provider
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


async def test_connection():
    """Test Adzuna API connection"""
    logger.info("🧪 Testing Adzuna API Connection")
    logger.info("=" * 50)
    
    # Check credentials
    if not settings.adzuna_app_id or not settings.adzuna_app_key:
        logger.error("❌ Adzuna credentials not configured!")
        logger.error("Please set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env")
        return False
    
    logger.info(f"✓ App ID: {settings.adzuna_app_id[:8]}...")
    logger.info(f"✓ Country: {settings.adzuna_country.upper()}")
    logger.info(f"✓ Base URL: {settings.adzuna_base_url}")
    
    # Test API call
    logger.info("\n📡 Testing API call...")
    
    try:
        response = await adzuna_provider.fetch_jobs(
            what="software developer",
            page=1
        )
        
        results = response.get('results', [])
        total = response.get('count', 0)
        
        logger.info(f"✅ API Connection Successful!")
        logger.info(f"   - Results returned: {len(results)}")
        logger.info(f"   - Total available: {total}")
        
        if results:
            logger.info("\n📋 Sample Jobs:")
            for i, job in enumerate(results[:3], 1):
                title = job.get('title', 'N/A')
                company = job.get('company', {}).get('display_name', 'N/A')
                location = job.get('location', {}).get('display_name', 'N/A')
                logger.info(f"   {i}. {title}")
                logger.info(f"      Company: {company}")
                logger.info(f"      Location: {location}")
        
        # Test normalization
        logger.info("\n🔄 Testing data normalization...")
        normalized = adzuna_provider.normalize_job_data(results[0])
        logger.info(f"✅ Normalization successful!")
        logger.info(f"   - Title: {normalized['title']}")
        logger.info(f"   - Company: {normalized['company']}")
        logger.info(f"   - Remote: {normalized['remote']}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ API Connection Failed!")
        logger.error(f"   Error: {e}")
        return False


async def main():
    success = await test_connection()
    return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
