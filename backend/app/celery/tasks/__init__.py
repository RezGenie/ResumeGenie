"""
Celery Task Definitions
Contains all Celery task implementations for background processing.
"""

from .embedding_tasks import generate_embedding
from .genie_processing import generate_wish_recommendations, cleanup_old_wishes
from .recommendation_tasks import (
    generate_resume_recommendations,
    generate_job_match_recommendations, 
    generate_skill_recommendations,
    batch_process_recommendations
)
# Import other task modules as needed
# from .job_analysis import *
# from .resume_processing import *

__all__ = [
    'generate_embedding',
    'generate_wish_recommendations', 
    'cleanup_old_wishes',
    'generate_resume_recommendations',
    'generate_job_match_recommendations',
    'generate_skill_recommendations', 
    'batch_process_recommendations'
]