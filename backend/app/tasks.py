from celery import current_app as celery_app
from app.core.database import AsyncSessionLocal
from app.models.models import User
from app.services.genie_service import GenieService
from sqlalchemy import select
import asyncio
import os
from datetime import datetime, timedelta


@celery_app.task
def generate_daily_insights():
    """Generate daily insights for all users"""
    return asyncio.run(_generate_daily_insights_async())


async def _generate_daily_insights_async():
    """Async version of daily insights generation"""
    async with AsyncSessionLocal() as db:
        # Get all active users
        result = await db.execute(select(User).where(User.is_active == True))
        users = result.scalars().all()
        
        genie_service = GenieService()
        
        for user in users:
            try:
                # Generate a random daily insight
                insight_types = ['ats_tip', 'skills_advice']
                import random
                insight_type = random.choice(insight_types)
                
                await genie_service.generate_wish(insight_type, user)
                print(f"Generated daily insight for user {user.email}")
                
            except Exception as e:
                print(f"Error generating insight for user {user.email}: {e}")
        
        return f"Generated insights for {len(users)} users"


@celery_app.task  
def cleanup_old_files():
    """Clean up old uploaded files"""
    return asyncio.run(_cleanup_old_files_async())


async def _cleanup_old_files_async():
    """Async version of file cleanup"""
    from app.core.config import settings
    
    upload_path = settings.UPLOAD_PATH
    if not os.path.exists(upload_path):
        return "Upload directory does not exist"
    
    # Delete files older than 30 days
    cutoff_date = datetime.now() - timedelta(days=30)
    deleted_count = 0
    
    for filename in os.listdir(upload_path):
        file_path = os.path.join(upload_path, filename)
        
        try:
            file_modified = datetime.fromtimestamp(os.path.getmtime(file_path))
            
            if file_modified < cutoff_date:
                os.remove(file_path)
                deleted_count += 1
                print(f"Deleted old file: {filename}")
                
        except Exception as e:
            print(f"Error processing file {filename}: {e}")
    
    return f"Deleted {deleted_count} old files"


@celery_app.task
def process_resume_background(resume_id: str):
    """Process resume in background for better performance"""
    return asyncio.run(_process_resume_background_async(resume_id))


async def _process_resume_background_async(resume_id: str):
    """Async version of background resume processing"""
    from app.models.models import Resume
    from app.services.resume_parser import ResumeParser
    from app.services.embeddings import EmbeddingService
    import uuid
    
    async with AsyncSessionLocal() as db:
        try:
            # Get resume
            result = await db.execute(select(Resume).where(Resume.id == uuid.UUID(resume_id)))
            resume = result.scalar_one_or_none()
            
            if not resume:
                return f"Resume {resume_id} not found"
            
            # Re-parse with more advanced processing
            parser = ResumeParser()
            parsed_content = parser.parse_file(resume.file_path)
            
            # Generate embeddings
            embedding_service = EmbeddingService()
            embedding = await embedding_service.generate_embedding(parsed_content['content'])
            
            # Update resume
            resume.embedding = embedding
            resume.parsed_data = parsed_content['data']
            
            await db.commit()
            
            return f"Successfully processed resume {resume_id}"
            
        except Exception as e:
            return f"Error processing resume {resume_id}: {e}"