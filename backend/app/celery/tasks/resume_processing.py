"""
Resume Processing Background Tasks
Handles asynchronous resume text extraction, preprocessing, and storage.
"""

import logging
from typing import Dict, Any
from celery import current_task
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from app.celery.celery_app import celery_app
from app.core.config import settings
from app.models.resume import Resume
from app.services.file_service import file_service
from app.services.openai_service import openai_service

logger = logging.getLogger(__name__)

# Create async engine for background tasks
engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


@celery_app.task(bind=True, name="resume_processing.process_resume_embeddings")
def process_resume_embeddings(self, resume_id: str) -> Dict[str, Any]:
    """
    Generate embeddings for a processed resume.
    
    Args:
        resume_id: UUID of the resume to process
        
    Returns:
        Dictionary with processing results
    """
    import asyncio
    return asyncio.run(_async_process_resume_embeddings(self, resume_id))


async def _async_process_resume_embeddings(task, resume_id: str) -> Dict[str, Any]:
    """Async implementation of resume embeddings processing."""
    async with AsyncSessionLocal() as db:
        try:
            # Update task state
            task.update_state(state="PROCESSING", meta={"stage": "fetching_resume"})
            
            # Get resume from database
            resume = await db.get(Resume, resume_id)
            if not resume:
                raise ValueError(f"Resume not found: {resume_id}")
            
            if not resume.extracted_text:
                raise ValueError("Resume has no extracted text to process")
            
            # Update processing status
            resume.processing_status = "generating_embeddings"
            await db.commit()
            
            task.update_state(state="PROCESSING", meta={"stage": "generating_embeddings"})
            
            # Generate embeddings
            logger.info(f"Generating embeddings for resume {resume_id}")
            embedding_result = await openai_service.generate_embedding(resume.extracted_text)
            
            # Update resume with embeddings
            resume.embedding = embedding_result.embedding
            resume.processing_status = "completed"
            resume.is_processed = True
            resume.processed_at = datetime.utcnow()
            
            await db.commit()
            
            result = {
                "resume_id": resume_id,
                "status": "completed",
                "embedding_tokens": embedding_result.token_count,
                "processing_time": embedding_result.processing_time,
                "text_length": len(resume.extracted_text)
            }
            
            logger.info(f"Resume embeddings generated successfully: {resume_id}")
            return result
            
        except Exception as e:
            # Update resume with error status
            try:
                resume = await db.get(Resume, resume_id)
                if resume:
                    resume.processing_status = "failed"
                    resume.processing_error = str(e)
                    await db.commit()
            except:
                pass
            
            logger.error(f"Resume embeddings processing failed for {resume_id}: {e}")
            raise


@celery_app.task(bind=True, name="resume_processing.reprocess_resume")
def reprocess_resume(self, resume_id: str, force: bool = False) -> Dict[str, Any]:
    """
    Reprocess a resume (text extraction and embeddings).
    
    Args:
        resume_id: UUID of the resume to reprocess
        force: Force reprocessing even if already processed
        
    Returns:
        Dictionary with processing results
    """
    import asyncio
    return asyncio.run(_async_reprocess_resume(self, resume_id, force))


async def _async_reprocess_resume(task, resume_id: str, force: bool) -> Dict[str, Any]:
    """Async implementation of resume reprocessing."""
    async with AsyncSessionLocal() as db:
        try:
            task.update_state(state="PROCESSING", meta={"stage": "validating_resume"})
            
            # Get resume from database
            resume = await db.get(Resume, resume_id)
            if not resume:
                raise ValueError(f"Resume not found: {resume_id}")
            
            if resume.is_processed and not force:
                return {
                    "resume_id": resume_id,
                    "status": "skipped",
                    "message": "Resume already processed. Use force=True to reprocess."
                }
            
            # Reset processing status
            resume.processing_status = "reprocessing"
            resume.processing_error = None
            await db.commit()
            
            task.update_state(state="PROCESSING", meta={"stage": "extracting_text"})
            
            # Re-extract text if needed (this would require access to the original file)
            # For now, we'll just regenerate embeddings if text exists
            if not resume.extracted_text:
                raise ValueError("No extracted text available for reprocessing")
            
            task.update_state(state="PROCESSING", meta={"stage": "generating_embeddings"})
            
            # Generate new embeddings
            embedding_result = await openai_service.generate_embedding(resume.extracted_text)
            
            # Update resume
            resume.embedding = embedding_result.embedding
            resume.processing_status = "completed"
            resume.is_processed = True
            resume.processed_at = datetime.utcnow()
            
            await db.commit()
            
            result = {
                "resume_id": resume_id,
                "status": "reprocessed",
                "embedding_tokens": embedding_result.token_count,
                "processing_time": embedding_result.processing_time
            }
            
            logger.info(f"Resume reprocessed successfully: {resume_id}")
            return result
            
        except Exception as e:
            # Update resume with error status
            try:
                resume = await db.get(Resume, resume_id)
                if resume:
                    resume.processing_status = "failed"
                    resume.processing_error = str(e)
                    await db.commit()
            except:
                pass
            
            logger.error(f"Resume reprocessing failed for {resume_id}: {e}")
            raise


@celery_app.task(bind=True, name="resume_processing.cleanup_failed_resumes")
def cleanup_failed_resumes(self, max_age_hours: int = 24) -> Dict[str, Any]:
    """
    Clean up failed resume processing attempts.
    
    Args:
        max_age_hours: Maximum age of failed attempts to clean up
        
    Returns:
        Dictionary with cleanup results
    """
    import asyncio
    return asyncio.run(_async_cleanup_failed_resumes(self, max_age_hours))


async def _async_cleanup_failed_resumes(task, max_age_hours: int) -> Dict[str, Any]:
    """Async implementation of failed resume cleanup."""
    from sqlalchemy import select, and_
    from datetime import datetime, timedelta
    
    async with AsyncSessionLocal() as db:
        try:
            task.update_state(state="PROCESSING", meta={"stage": "finding_failed_resumes"})
            
            # Find failed resumes older than max_age_hours
            cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
            
            result = await db.execute(
                select(Resume).where(
                    and_(
                        Resume.processing_status == "failed",
                        Resume.created_at < cutoff_time
                    )
                )
            )
            
            failed_resumes = result.scalars().all()
            
            task.update_state(
                state="PROCESSING", 
                meta={"stage": "cleaning_up", "found_count": len(failed_resumes)}
            )
            
            cleaned_count = 0
            for resume in failed_resumes:
                try:
                    # Delete file from storage
                    await file_service.delete_file_from_storage(resume.file_path)
                    
                    # Delete resume record
                    await db.delete(resume)
                    cleaned_count += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to cleanup resume {resume.id}: {e}")
                    continue
            
            await db.commit()
            
            result = {
                "status": "completed",
                "found_count": len(failed_resumes),
                "cleaned_count": cleaned_count,
                "max_age_hours": max_age_hours
            }
            
            logger.info(f"Cleaned up {cleaned_count}/{len(failed_resumes)} failed resumes")
            return result
            
        except Exception as e:
            logger.error(f"Failed resume cleanup error: {e}")
            raise