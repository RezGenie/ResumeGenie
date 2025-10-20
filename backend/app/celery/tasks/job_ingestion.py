"""
Job Data Processing Tasks
Handles background job ingestion, normalization, and embedding generation
"""

import logging
from datetime import datetime
from typing import Dict, Any

from celery import Task
from celery.schedules import crontab

from app.celery.celery_app import celery_app
from app.core.database import get_db
from app.services.providers.adzuna import adzuna_provider

logger = logging.getLogger(__name__)


class AsyncTask(Task):
    """Base task that handles async database operations"""
    
    async def run_async(self, *args, **kwargs):
        """Override this method in subclasses"""
        raise NotImplementedError
    
    def __call__(self, *args, **kwargs):
        """Wrapper to handle async execution"""
        import asyncio
        return asyncio.run(self.run_async(*args, **kwargs))


@celery_app.task(bind=True, base=AsyncTask, max_retries=3, default_retry_delay=300)
async def ingest_jobs_from_adzuna(self, pages_per_query: int = 3) -> Dict[str, Any]:
    """
    Periodic task to ingest jobs from Adzuna API
    
    Args:
        pages_per_query: Number of pages to fetch per seed query
        
    Returns:
        Ingestion results summary
    """
    try:
        logger.info("Starting Adzuna job ingestion task")
        
        # Run the ingestion
        results = await adzuna_provider.ingest_all_seed_queries(pages_per_query)
        
        total_jobs = sum(results.values())
        success_message = f"Successfully ingested {total_jobs} jobs from Adzuna"
        logger.info(success_message)
        
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "total_jobs": total_jobs,
            "results_by_query": results,
            "message": success_message
        }
        
    except Exception as e:
        error_message = f"Failed to ingest jobs from Adzuna: {str(e)}"
        logger.error(error_message, exc_info=True)
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            retry_delay = 300 * (2 ** self.request.retries)  # 5min, 10min, 20min
            raise self.retry(countdown=retry_delay, exc=e)
        
        return {
            "success": False,
            "timestamp": datetime.utcnow().isoformat(),
            "error": error_message,
            "retries": self.request.retries
        }


@celery_app.task(bind=True, base=AsyncTask, max_retries=2, default_retry_delay=60)
async def generate_job_embeddings(self, batch_size: int = 20) -> Dict[str, Any]:
    """
    Generate embeddings for jobs that don't have them
    
    Args:
        batch_size: Number of jobs to process in one batch
        
    Returns:
        Processing results summary
    """
    try:
        logger.info("Starting job embedding generation task")
        
        async for db in get_db():
            processed_count = await adzuna_provider.generate_embeddings(db, batch_size)
            
            success_message = f"Generated embeddings for {processed_count} jobs"
            logger.info(success_message)
            
            return {
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "processed_count": processed_count,
                "message": success_message
            }
            
    except Exception as e:
        error_message = f"Failed to generate job embeddings: {str(e)}"
        logger.error(error_message, exc_info=True)
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60, exc=e)
        
        return {
            "success": False,
            "timestamp": datetime.utcnow().isoformat(),
            "error": error_message,
            "retries": self.request.retries
        }


@celery_app.task(bind=True, base=AsyncTask)
async def cleanup_old_jobs(self, days_old: int = 90) -> Dict[str, Any]:
    """
    Cleanup jobs older than specified days
    
    Args:
        days_old: Jobs older than this many days will be deleted
        
    Returns:
        Cleanup results summary
    """
    try:
        from datetime import timedelta
        from sqlalchemy import delete
        from app.models.job import Job
        
        logger.info(f"Starting cleanup of jobs older than {days_old} days")
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        async for db in get_db():
            # Delete old jobs
            delete_stmt = delete(Job).where(Job.posted_at < cutoff_date)
            result = await db.execute(delete_stmt)
            deleted_count = result.rowcount
            
            await db.commit()
            
            success_message = f"Cleaned up {deleted_count} old jobs"
            logger.info(success_message)
            
            return {
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "deleted_count": deleted_count,
                "cutoff_date": cutoff_date.isoformat(),
                "message": success_message
            }
            
    except Exception as e:
        error_message = f"Failed to cleanup old jobs: {str(e)}"
        logger.error(error_message, exc_info=True)
        
        return {
            "success": False,
            "timestamp": datetime.utcnow().isoformat(),
            "error": error_message
        }


# Periodic task schedules
@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Configure periodic task schedules"""
    
    # Ingest jobs every 6 hours
    sender.add_periodic_task(
        21600.0,  # 6 hours in seconds
        ingest_jobs_from_adzuna.s(pages_per_query=3),
        name='ingest_jobs_every_6_hours',
    )
    
    # Generate embeddings every 2 hours (for new jobs)
    sender.add_periodic_task(
        7200.0,  # 2 hours in seconds
        generate_job_embeddings.s(batch_size=50),
        name='generate_embeddings_every_2_hours',
    )
    
    # Cleanup old jobs weekly (every Sunday at 2 AM)
    sender.add_periodic_task(
        crontab(hour=2, minute=0, day_of_week=0),
        cleanup_old_jobs.s(days_old=90),
        name='cleanup_old_jobs_weekly',
    )


