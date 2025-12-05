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
            
            # Auto-create user preferences from resume for job matching
            task.update_state(state="PROCESSING", meta={"stage": "creating_preferences"})
            try:
                await _create_user_preferences_from_resume(resume, db)
                logger.info(f"Created user preferences from resume {resume_id}")
            except Exception as pref_error:
                # Don't fail the whole task if preference creation fails
                logger.warning(f"Failed to create preferences from resume {resume_id}: {pref_error}")
            
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


async def _create_user_preferences_from_resume(resume: Resume, db: AsyncSession) -> None:
    """
    Auto-create or update user preferences from resume content.
    Extracts skills, job titles, and other preferences using AI.
    """
    from sqlalchemy import select
    from app.models.user_preferences import UserPreferences
    import json
    import re
    
    # Check if user already has preferences
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == resume.user_id)
    )
    existing_prefs = result.scalar_one_or_none()
    
    # Use AI to extract skills and job titles from resume
    extraction_prompt = f"""Analyze this resume and extract:
1. Technical skills and tools (list up to 15 most important)
2. Job titles/roles the person has held or is qualified for (list up to 5)
3. Preferred location (if mentioned, otherwise return null)

Resume text:
{resume.extracted_text[:3000]}

Return ONLY a JSON object with this exact format:
{{
    "skills": ["skill1", "skill2", ...],
    "target_titles": ["title1", "title2", ...],
    "location": "location or null"
}}"""
    
    try:
        # Call OpenAI to extract preferences
        response = await openai_service.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a resume analyzer. Return only valid JSON."},
                {"role": "user", "content": extraction_prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        extracted_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        extracted_text = re.sub(r'```json\s*|\s*```', '', extracted_text)
        
        # Parse JSON response
        extracted_data = json.loads(extracted_text)
        
        skills = extracted_data.get("skills", [])[:15]  # Limit to 15 skills
        target_titles = extracted_data.get("target_titles", [])[:5]  # Limit to 5 titles
        location = extracted_data.get("location")
        
        if existing_prefs:
            # Update existing preferences (merge skills, don't overwrite)
            existing_skills = set(existing_prefs.skills or [])
            new_skills = list(existing_skills.union(set(skills)))[:20]  # Max 20 skills
            
            existing_prefs.skills = new_skills
            
            # Only update titles if none exist
            if not existing_prefs.target_titles:
                existing_prefs.target_titles = target_titles
                
            # Update location only if not set
            if not existing_prefs.location_pref and location and location.lower() != "null":
                existing_prefs.location_pref = location
                
            logger.info(f"Updated preferences for user {resume.user_id}")
        else:
            # Create new preferences
            new_prefs = UserPreferences(
                user_id=resume.user_id,
                skills=skills,
                target_titles=target_titles,
                location_pref=location if location and location.lower() != "null" else None,
                remote_ok=True  # Default to remote-friendly
            )
            db.add(new_prefs)
            logger.info(f"Created new preferences for user {resume.user_id}")
        
        await db.commit()
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response for preference extraction: {e}")
        # Fallback: create basic preferences with no extracted data
        if not existing_prefs:
            new_prefs = UserPreferences(
                user_id=resume.user_id,
                skills=[],
                target_titles=[],
                remote_ok=True
            )
            db.add(new_prefs)
            await db.commit()
    except Exception as e:
        logger.error(f"Error creating user preferences from resume: {e}")
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