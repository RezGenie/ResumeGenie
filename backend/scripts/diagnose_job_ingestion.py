#!/usr/bin/env python3
"""
Job Ingestion Diagnostic Tool
Comprehensive diagnostic to identify issues with job ingestion system
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, func, desc, and_, or_
from app.core.database import AsyncSessionLocal
from app.models.job import Job
from app.core.config import settings
from app.services.providers.adzuna import adzuna_provider
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def diagnose_database() -> Dict[str, Any]:
    """Diagnose database state"""
    logger.info("=" * 60)
    logger.info("📊 DATABASE DIAGNOSTICS")
    logger.info("=" * 60)
    
    results = {}
    
    async with AsyncSessionLocal() as db:
        # Total jobs
        total_result = await db.execute(select(func.count(Job.id)))
        total_jobs = total_result.scalar()
        results['total_jobs'] = total_jobs
        logger.info(f"✓ Total jobs in database: {total_jobs}")
        
        # Jobs with embeddings
        embedded_result = await db.execute(
            select(func.count(Job.id)).where(Job.job_embedding.isnot(None))
        )
        jobs_with_embeddings = embedded_result.scalar()
        results['jobs_with_embeddings'] = jobs_with_embeddings
        logger.info(f"✓ Jobs with embeddings: {jobs_with_embeddings} ({jobs_with_embeddings/total_jobs*100 if total_jobs > 0 else 0:.1f}%)")
        
        # Jobs by provider
        provider_result = await db.execute(
            select(Job.provider, func.count(Job.id)).group_by(Job.provider)
        )
        jobs_by_provider = dict(provider_result.all())
        results['jobs_by_provider'] = jobs_by_provider
        logger.info(f"✓ Jobs by provider: {jobs_by_provider}")
        
        # Jobs with missing critical fields
        missing_title = await db.execute(
            select(func.count(Job.id)).where(
                or_(Job.title.is_(None), Job.title == '')
            )
        )
        missing_company = await db.execute(
            select(func.count(Job.id)).where(
                or_(Job.company.is_(None), Job.company == '')
            )
        )
        missing_snippet = await db.execute(
            select(func.count(Job.id)).where(
                or_(Job.snippet.is_(None), Job.snippet == '')
            )
        )
        
        results['missing_title'] = missing_title.scalar()
        results['missing_company'] = missing_company.scalar()
        results['missing_snippet'] = missing_snippet.scalar()
        
        logger.info(f"⚠ Jobs missing title: {results['missing_title']}")
        logger.info(f"⚠ Jobs missing company: {results['missing_company']}")
        logger.info(f"⚠ Jobs missing snippet: {results['missing_snippet']}")
        
        # Job freshness
        if total_jobs > 0:
            most_recent_result = await db.execute(
                select(Job.posted_at).order_by(desc(Job.posted_at)).limit(1)
            )
            most_recent = most_recent_result.scalar()
            
            oldest_result = await db.execute(
                select(Job.posted_at).where(Job.posted_at.isnot(None)).order_by(Job.posted_at).limit(1)
            )
            oldest = oldest_result.scalar()
            
            if most_recent:
                age = datetime.now(timezone.utc) - most_recent
                results['most_recent_age_hours'] = age.total_seconds() / 3600
                logger.info(f"✓ Most recent job: {age.total_seconds()/3600:.1f} hours old")
            else:
                logger.warning("⚠ No jobs have posted_at dates!")
                
            if oldest:
                age = datetime.now(timezone.utc) - oldest
                results['oldest_age_days'] = age.total_seconds() / 86400
                logger.info(f"✓ Oldest job: {age.total_seconds()/86400:.1f} days old")
        
        # Jobs by age buckets
        now = datetime.now(timezone.utc)
        
        last_24h = await db.execute(
            select(func.count(Job.id)).where(
                Job.posted_at >= now - timedelta(hours=24)
            )
        )
        last_7d = await db.execute(
            select(func.count(Job.id)).where(
                Job.posted_at >= now - timedelta(days=7)
            )
        )
        last_30d = await db.execute(
            select(func.count(Job.id)).where(
                Job.posted_at >= now - timedelta(days=30)
            )
        )
        older_30d = await db.execute(
            select(func.count(Job.id)).where(
                Job.posted_at < now - timedelta(days=30)
            )
        )
        
        results['jobs_last_24h'] = last_24h.scalar()
        results['jobs_last_7d'] = last_7d.scalar()
        results['jobs_last_30d'] = last_30d.scalar()
        results['jobs_older_30d'] = older_30d.scalar()
        
        logger.info(f"✓ Jobs in last 24 hours: {results['jobs_last_24h']}")
        logger.info(f"✓ Jobs in last 7 days: {results['jobs_last_7d']}")
        logger.info(f"✓ Jobs in last 30 days: {results['jobs_last_30d']}")
        logger.info(f"⚠ Jobs older than 30 days: {results['jobs_older_30d']}")
        
        # Remote jobs
        remote_result = await db.execute(
            select(func.count(Job.id)).where(Job.remote.is_(True))
        )
        results['remote_jobs'] = remote_result.scalar()
        logger.info(f"✓ Remote jobs: {results['remote_jobs']} ({results['remote_jobs']/total_jobs*100 if total_jobs > 0 else 0:.1f}%)")
        
        # Jobs with salary info
        salary_result = await db.execute(
            select(func.count(Job.id)).where(
                and_(Job.salary_min.isnot(None), Job.salary_max.isnot(None))
            )
        )
        results['jobs_with_salary'] = salary_result.scalar()
        logger.info(f"✓ Jobs with salary info: {results['jobs_with_salary']} ({results['jobs_with_salary']/total_jobs*100 if total_jobs > 0 else 0:.1f}%)")
    
    return results


async def diagnose_configuration() -> Dict[str, Any]:
    """Diagnose configuration"""
    logger.info("\n" + "=" * 60)
    logger.info("⚙️  CONFIGURATION DIAGNOSTICS")
    logger.info("=" * 60)
    
    results = {}
    
    # Adzuna credentials
    has_app_id = bool(settings.adzuna_app_id)
    has_app_key = bool(settings.adzuna_app_key)
    results['adzuna_configured'] = has_app_id and has_app_key
    
    if has_app_id and has_app_key:
        logger.info(f"✓ Adzuna credentials configured")
        logger.info(f"  - App ID: {settings.adzuna_app_id[:8]}...")
        logger.info(f"  - Country: {settings.adzuna_country.upper()}")
    else:
        logger.error("✗ Adzuna credentials NOT configured!")
        results['error'] = "Missing Adzuna credentials"
    
    # OpenAI
    has_openai = bool(settings.openai_api_key)
    results['openai_configured'] = has_openai
    logger.info(f"{'✓' if has_openai else '✗'} OpenAI API key configured")
    
    # Database
    logger.info(f"✓ Database URL: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'configured'}")
    
    # Redis
    logger.info(f"✓ Redis URL: {settings.redis_url.split('@')[1] if '@' in settings.redis_url else 'configured'}")
    
    # Job processing settings
    logger.info(f"✓ Job cleanup days: {settings.job_cleanup_days}")
    logger.info(f"✓ Job ingestion interval: {settings.job_ingestion_interval}s ({settings.job_ingestion_interval/3600:.1f}h)")
    logger.info(f"✓ Embedding batch size: {settings.job_embedding_batch_size}")
    
    # Seed queries
    logger.info(f"✓ Seed queries available: {len(adzuna_provider.seed_queries)}")
    logger.info(f"  Sample queries: {', '.join(adzuna_provider.seed_queries[:5])}")
    
    return results


async def diagnose_api_connection() -> Dict[str, Any]:
    """Test Adzuna API connection"""
    logger.info("\n" + "=" * 60)
    logger.info("🌐 API CONNECTION TEST")
    logger.info("=" * 60)
    
    results = {}
    
    if not settings.adzuna_app_id or not settings.adzuna_app_key:
        logger.error("✗ Cannot test API - credentials not configured")
        results['success'] = False
        results['error'] = "Missing credentials"
        return results
    
    try:
        # Test with a simple query
        logger.info("Testing API connection with query: 'software developer'")
        response = await adzuna_provider.fetch_jobs(
            what="software developer",
            page=1
        )
        
        results_count = len(response.get('results', []))
        results['success'] = True
        results['results_count'] = results_count
        results['total_available'] = response.get('count', 0)
        
        logger.info(f"✓ API connection successful!")
        logger.info(f"  - Results returned: {results_count}")
        logger.info(f"  - Total available: {response.get('count', 0)}")
        
        if results_count > 0:
            sample_job = response['results'][0]
            logger.info(f"  - Sample job: {sample_job.get('title')} at {sample_job.get('company', {}).get('display_name')}")
        
    except Exception as e:
        logger.error(f"✗ API connection failed: {e}")
        results['success'] = False
        results['error'] = str(e)
    
    return results


async def generate_recommendations() -> None:
    """Generate recommendations based on diagnostics"""
    logger.info("\n" + "=" * 60)
    logger.info("💡 RECOMMENDATIONS")
    logger.info("=" * 60)
    
    async with AsyncSessionLocal() as db:
        total_result = await db.execute(select(func.count(Job.id)))
        total_jobs = total_result.scalar()
        
        if total_jobs == 0:
            logger.info("🔴 CRITICAL: No jobs in database!")
            logger.info("   → Run: python scripts/jobs_ingest.py --pages 5")
            logger.info("   → This will fetch ~750 diverse jobs")
        elif total_jobs < 100:
            logger.info("🟡 WARNING: Very few jobs in database")
            logger.info("   → Run full ingestion to get more jobs")
        
        # Check freshness
        most_recent_result = await db.execute(
            select(Job.posted_at).order_by(desc(Job.posted_at)).limit(1)
        )
        most_recent = most_recent_result.scalar()
        
        if most_recent:
            age = datetime.now(timezone.utc) - most_recent
            if age > timedelta(hours=12):
                logger.info("🟡 WARNING: Jobs are stale (>12 hours old)")
                logger.info("   → Check if Celery workers are running")
                logger.info("   → Run: celery -A app.celery.celery_app worker --loglevel=info")
        
        # Check embeddings
        embedded_result = await db.execute(
            select(func.count(Job.id)).where(Job.job_embedding.isnot(None))
        )
        jobs_with_embeddings = embedded_result.scalar()
        
        if jobs_with_embeddings < total_jobs:
            missing = total_jobs - jobs_with_embeddings
            logger.info(f"🟡 WARNING: {missing} jobs missing embeddings")
            logger.info("   → Run: python scripts/jobs_ingest.py --generate-embeddings")
        
        # Check old jobs
        old_result = await db.execute(
            select(func.count(Job.id)).where(
                Job.posted_at < datetime.now(timezone.utc) - timedelta(days=30)
            )
        )
        old_jobs = old_result.scalar()
        
        if old_jobs > 0:
            logger.info(f"🟡 WARNING: {old_jobs} jobs older than 30 days")
            logger.info("   → Run: python scripts/cleanup_jobs_database.py")


async def main():
    """Run all diagnostics"""
    logger.info("🔍 RezGenie Job Ingestion Diagnostic Tool")
    logger.info("Starting comprehensive diagnostics...\n")
    
    try:
        # Configuration check
        config_results = await diagnose_configuration()
        
        if not config_results.get('adzuna_configured'):
            logger.error("\n❌ Cannot proceed - Adzuna credentials not configured")
            logger.error("Please set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env file")
            return 1
        
        # API connection test
        api_results = await diagnose_api_connection()
        
        if not api_results.get('success'):
            logger.error("\n❌ API connection failed - check credentials and network")
            return 1
        
        # Database diagnostics
        db_results = await diagnose_database()
        
        # Generate recommendations
        await generate_recommendations()
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ DIAGNOSTICS COMPLETE")
        logger.info("=" * 60)
        
        return 0
        
    except Exception as e:
        logger.error(f"\n❌ Diagnostic failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
