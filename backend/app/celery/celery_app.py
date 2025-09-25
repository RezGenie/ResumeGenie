"""
Advanced Celery Configuration and Background Tasks
Handles asynchronous processing for resume analysis, embeddings, and AI recommendations.
"""

import os
from celery import Celery
from celery.signals import worker_ready, worker_shutting_down
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create Celery instance
celery_app = Celery(
    "rezgenie",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.celery.tasks.resume_processing",
        "app.celery.tasks.embedding_tasks", 
        "app.celery.tasks.recommendation_tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task routing
    task_routes={
        "app.celery.tasks.resume_processing.*": {"queue": "resume_processing"},
        "app.celery.tasks.embedding_tasks.*": {"queue": "embeddings"},
        "app.celery.tasks.recommendation_tasks.*": {"queue": "recommendations"}
    },
    
    # Task execution
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task results
    result_expires=3600,  # 1 hour
    task_track_started=True,
    task_send_sent_event=True,
    
    # Worker configuration
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    
    # Retry configuration
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Monitoring
    worker_send_task_events=True,
    task_send_events=True,
    
    # Security
    worker_hijack_root_logger=False,
    worker_log_format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    worker_task_log_format="[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s",
    
    # Beat schedule (for periodic tasks)
    beat_schedule={
        "cleanup-expired-tokens": {
            "task": "app.celery.tasks.maintenance.cleanup_expired_tokens",
            "schedule": 3600.0,  # Every hour
        },
        "update-daily-wish-counts": {
            "task": "app.celery.tasks.maintenance.reset_daily_wish_counts", 
            "schedule": 86400.0,  # Every 24 hours
        }
    }
)


@worker_ready.connect
def worker_ready_handler(sender=None, **kwargs):
    """Handler for when worker is ready."""
    logger.info(f"Celery worker ready: {sender}")


@worker_shutting_down.connect  
def worker_shutting_down_handler(sender=None, **kwargs):
    """Handler for when worker is shutting down."""
    logger.info(f"Celery worker shutting down: {sender}")


# Export celery app
__all__ = ["celery_app"]