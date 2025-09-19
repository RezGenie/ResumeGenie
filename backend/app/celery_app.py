from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "rezgenie",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=['app.tasks']
)

# Configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    result_expires=3600,
)

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    'generate-daily-insights': {
        'task': 'app.tasks.generate_daily_insights',
        'schedule': 60.0 * 60.0 * 24.0,  # Daily at midnight
    },
    'cleanup-old-files': {
        'task': 'app.tasks.cleanup_old_files',
        'schedule': 60.0 * 60.0 * 24.0 * 7.0,  # Weekly
    },
}