#!/usr/bin/env python3
"""
Job Database Cleanup Script
Removes outdated, invalid, and low-quality jobs from the database
"""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
import argparse

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, delete, and_, or_, func
from app.core.database import AsyncSessionLocal
from app.models.job import Job
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def cleanup_old_jobs(days: int = 30, dry_run: bool = False) -> int:
    """Remove jobs older than specified days"""
    logger.info(f"🗑️  Cleaning up jobs older than {days} days...")
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    async with AsyncSessionLocal() as db:
        # Find old jobs
        result = await db.execute(
            select(Job).where(Job.posted_at < cutoff_date)
        )
        old_jobs = result.scalars().all()
        count = len(old_jobs)
        
        if count == 0:
            logger.info("   ✓ No old jobs to remove")
            return 0
        
        if dry_run:
            logger.info(f"   [DRY RUN] Would remove {count} old jobs")
            return count
        
        # Delete old jobs
        delete_stmt = delete(Job).where(Job.posted_at < cutoff_date)
        await db.execute(delete_stmt)
        await db.commit()
        
        logger.info(f"   ✓ Removed {count} old jobs")
        return count


async def cleanup_invalid_jobs(dry_run: bool = False) -> int:
    """Remove jobs with missing critical fields"""
    logger.info("🔍 Cleaning up jobs with missing critical fields...")
    
    async with AsyncSessionLocal() as db:
        # Find jobs with missing title, company, or snippet
        result = await db.execute(
            select(Job).where(
                or_(
                    Job.title.is_(None),
                    Job.title == '',
                    Job.company.is_(None),
                    Job.company == '',
                    Job.snippet.is_(None),
                    Job.snippet == '',
                    Job.redirect_url.is_(None),
                    Job.redirect_url == ''
                )
            )
        )
        invalid_jobs = result.scalars().all()
        count = len(invalid_jobs)
        
        if count == 0:
            logger.info("   ✓ No invalid jobs to remove")
            return 0
        
        if dry_run:
            logger.info(f"   [DRY RUN] Would remove {count} invalid jobs")
            for job in invalid_jobs[:5]:  # Show first 5
                logger.info(f"      - ID {job.id}: title='{job.title}', company='{job.company}'")
            return count
        
        # Delete invalid jobs
        job_ids = [job.id for job in invalid_jobs]
        delete_stmt = delete(Job).where(Job.id.in_(job_ids))
        await db.execute(delete_stmt)
        await db.commit()
        
        logger.info(f"   ✓ Removed {count} invalid jobs")
        return count


async def cleanup_duplicate_jobs(dry_run: bool = False) -> int:
    """Remove duplicate jobs (same provider + provider_job_id)"""
    logger.info("🔄 Cleaning up duplicate jobs...")
    
    async with AsyncSessionLocal() as db:
        # Find duplicates - keep the most recent one
        result = await db.execute(
            select(Job.provider, Job.provider_job_id, func.count(Job.id).label('count'))
            .group_by(Job.provider, Job.provider_job_id)
            .having(func.count(Job.id) > 1)
        )
        duplicates = result.all()
        
        if not duplicates:
            logger.info("   ✓ No duplicate jobs found")
            return 0
        
        total_removed = 0
        
        for provider, provider_job_id, count in duplicates:
            # Get all jobs with this provider + provider_job_id
            jobs_result = await db.execute(
                select(Job)
                .where(and_(Job.provider == provider, Job.provider_job_id == provider_job_id))
                .order_by(Job.created_at.desc())
            )
            jobs = jobs_result.scalars().all()
            
            # Keep the first (most recent), delete the rest
            jobs_to_delete = jobs[1:]
            
            if dry_run:
                logger.info(f"   [DRY RUN] Would remove {len(jobs_to_delete)} duplicates of {provider}:{provider_job_id}")
            else:
                for job in jobs_to_delete:
                    await db.delete(job)
                total_removed += len(jobs_to_delete)
        
        if not dry_run:
            await db.commit()
            logger.info(f"   ✓ Removed {total_removed} duplicate jobs")
        
        return total_removed


async def cleanup_low_quality_jobs(dry_run: bool = False) -> int:
    """Remove low-quality jobs (very short descriptions, suspicious content)"""
    logger.info("📊 Cleaning up low-quality jobs...")
    
    async with AsyncSessionLocal() as db:
        # Find jobs with very short snippets (< 50 chars)
        result = await db.execute(
            select(Job).where(
                and_(
                    Job.snippet.isnot(None),
                    func.length(Job.snippet) < 50
                )
            )
        )
        low_quality_jobs = result.scalars().all()
        count = len(low_quality_jobs)
        
        if count == 0:
            logger.info("   ✓ No low-quality jobs to remove")
            return 0
        
        if dry_run:
            logger.info(f"   [DRY RUN] Would remove {count} low-quality jobs")
            return count
        
        # Delete low-quality jobs
        job_ids = [job.id for job in low_quality_jobs]
        delete_stmt = delete(Job).where(Job.id.in_(job_ids))
        await db.execute(delete_stmt)
        await db.commit()
        
        logger.info(f"   ✓ Removed {count} low-quality jobs")
        return count


async def cleanup_jobs_without_dates(dry_run: bool = False) -> int:
    """Remove jobs without posted_at dates"""
    logger.info("📅 Cleaning up jobs without posted dates...")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Job).where(Job.posted_at.is_(None))
        )
        jobs_without_dates = result.scalars().all()
        count = len(jobs_without_dates)
        
        if count == 0:
            logger.info("   ✓ No jobs without dates")
            return 0
        
        if dry_run:
            logger.info(f"   [DRY RUN] Would remove {count} jobs without dates")
            return count
        
        # Delete jobs without dates
        delete_stmt = delete(Job).where(Job.posted_at.is_(None))
        await db.execute(delete_stmt)
        await db.commit()
        
        logger.info(f"   ✓ Removed {count} jobs without dates")
        return count


async def show_statistics() -> None:
    """Show database statistics after cleanup"""
    logger.info("\n" + "=" * 60)
    logger.info("📊 DATABASE STATISTICS")
    logger.info("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Total jobs
        total_result = await db.execute(select(func.count(Job.id)))
        total = total_result.scalar()
        logger.info(f"Total jobs: {total}")
        
        # Jobs by age
        now = datetime.now(timezone.utc)
        
        last_24h = await db.execute(
            select(func.count(Job.id)).where(Job.posted_at >= now - timedelta(hours=24))
        )
        last_7d = await db.execute(
            select(func.count(Job.id)).where(Job.posted_at >= now - timedelta(days=7))
        )
        last_30d = await db.execute(
            select(func.count(Job.id)).where(Job.posted_at >= now - timedelta(days=30))
        )
        
        logger.info(f"  - Last 24 hours: {last_24h.scalar()}")
        logger.info(f"  - Last 7 days: {last_7d.scalar()}")
        logger.info(f"  - Last 30 days: {last_30d.scalar()}")
        
        # Jobs with embeddings
        embedded = await db.execute(
            select(func.count(Job.id)).where(Job.job_embedding.isnot(None))
        )
        logger.info(f"Jobs with embeddings: {embedded.scalar()}")
        
        # Remote jobs
        remote = await db.execute(
            select(func.count(Job.id)).where(Job.remote.is_(True))
        )
        logger.info(f"Remote jobs: {remote.scalar()}")


async def main():
    """Main cleanup function"""
    parser = argparse.ArgumentParser(description="Clean up job database")
    parser.add_argument('--days', type=int, default=30, help='Remove jobs older than N days (default: 30)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be removed without actually removing')
    parser.add_argument('--skip-old', action='store_true', help='Skip removing old jobs')
    parser.add_argument('--skip-invalid', action='store_true', help='Skip removing invalid jobs')
    parser.add_argument('--skip-duplicates', action='store_true', help='Skip removing duplicates')
    parser.add_argument('--skip-low-quality', action='store_true', help='Skip removing low-quality jobs')
    parser.add_argument('--skip-no-dates', action='store_true', help='Skip removing jobs without dates')
    
    args = parser.parse_args()
    
    logger.info("🧹 RezGenie Job Database Cleanup")
    logger.info("=" * 60)
    
    if args.dry_run:
        logger.info("🔍 DRY RUN MODE - No changes will be made")
        logger.info("=" * 60)
    
    try:
        total_removed = 0
        
        # Run cleanup tasks
        if not args.skip_old:
            removed = await cleanup_old_jobs(args.days, args.dry_run)
            total_removed += removed
        
        if not args.skip_invalid:
            removed = await cleanup_invalid_jobs(args.dry_run)
            total_removed += removed
        
        if not args.skip_duplicates:
            removed = await cleanup_duplicate_jobs(args.dry_run)
            total_removed += removed
        
        if not args.skip_low_quality:
            removed = await cleanup_low_quality_jobs(args.dry_run)
            total_removed += removed
        
        if not args.skip_no_dates:
            removed = await cleanup_jobs_without_dates(args.dry_run)
            total_removed += removed
        
        # Show statistics
        await show_statistics()
        
        logger.info("\n" + "=" * 60)
        if args.dry_run:
            logger.info(f"✅ DRY RUN COMPLETE - Would remove {total_removed} jobs")
        else:
            logger.info(f"✅ CLEANUP COMPLETE - Removed {total_removed} jobs")
        logger.info("=" * 60)
        
        return 0
        
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
