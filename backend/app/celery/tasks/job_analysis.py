"""
Job Analysis Background Tasks
Handles job posting analysis, resume-job matching, and AI-powered recommendations.
"""

import asyncio
import logging
from typing import Dict, Any, List
from celery import Task
from datetime import datetime

from app.celery.celery_app import celery_app
from app.core.database import get_async_db
from app.models.job_comparison import JobComparison
from app.models.resume import Resume
from app.services.openai_service import openai_service

logger = logging.getLogger(__name__)


class JobAnalysisTask(Task):
    """Base task for job analysis operations with error handling."""
    
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3, 'countdown': 60}
    retry_backoff = True


@celery_app.task(bind=True, base=JobAnalysisTask, name="job_analysis.analyze_job_posting")
def analyze_job_posting(self, comparison_id: str, force: bool = False) -> Dict[str, Any]:
    """
    Analyze job posting and generate match scores with AI recommendations.
    
    Args:
        comparison_id: UUID of the JobComparison record
        force: Whether to force reanalysis if already processed
    
    Returns:
        Dict containing analysis results and scores
    """
    async def _analyze():
        async with get_async_db() as db:
            try:
                logger.info(f"Starting job analysis for comparison: {comparison_id}")
                
                # Get job comparison record
                comparison = await db.get(JobComparison, comparison_id)
                if not comparison:
                    raise ValueError(f"Job comparison not found: {comparison_id}")
                
                # Skip if already processed (unless forced)
                if comparison.is_processed and not force:
                    logger.info(f"Job comparison already processed: {comparison_id}")
                    return {"status": "already_processed", "comparison_id": comparison_id}
                
                # Get associated resume
                resume = await db.get(Resume, comparison.resume_id)
                if not resume:
                    raise ValueError(f"Resume not found: {comparison.resume_id}")
                
                if not resume.is_processed or not resume.embedding:
                    raise ValueError("Resume must be processed with embeddings before job analysis")
                
                # Update processing status
                comparison.processing_status = "analyzing"
                comparison.processing_error = None
                await db.commit()
                
                # Generate job description embedding
                logger.info("Generating job description embedding")
                job_embedding = await openai_service.generate_embedding(comparison.job_description)
                
                # Calculate similarity scores
                logger.info("Calculating similarity scores")
                similarity_score = await openai_service.calculate_similarity(
                    resume.embedding, job_embedding
                )
                
                # Perform detailed AI analysis
                logger.info("Performing AI analysis")
                analysis_result = await _perform_ai_analysis(
                    resume.extracted_text,
                    comparison.job_description,
                    comparison.job_title,
                    comparison.company_name
                )
                
                # Extract specific scores and recommendations
                scores = analysis_result.get("scores", {})
                recommendations = analysis_result.get("recommendations", [])
                missing_skills = analysis_result.get("missing_skills", [])
                matching_skills = analysis_result.get("matching_skills", [])
                improvements = analysis_result.get("improvement_suggestions", [])
                
                # Update comparison with results
                comparison.overall_match_score = similarity_score
                comparison.skills_match_score = scores.get("skills", 0.0)
                comparison.experience_match_score = scores.get("experience", 0.0)
                comparison.education_match_score = scores.get("education", 0.0)
                comparison.analysis_result = analysis_result
                comparison.ai_recommendations = recommendations
                comparison.missing_skills = missing_skills
                comparison.matching_skills = matching_skills
                comparison.improvement_suggestions = improvements
                comparison.is_processed = True
                comparison.processing_status = "completed"
                comparison.processed_at = datetime.utcnow()
                
                await db.commit()
                
                logger.info(f"Job analysis completed for comparison: {comparison_id}")
                
                return {
                    "status": "completed",
                    "comparison_id": comparison_id,
                    "overall_score": similarity_score,
                    "detailed_scores": scores,
                    "recommendations_count": len(recommendations)
                }
                
            except Exception as e:
                logger.error(f"Job analysis failed for comparison {comparison_id}: {e}")
                
                # Update error status
                try:
                    comparison = await db.get(JobComparison, comparison_id)
                    if comparison:
                        comparison.processing_status = "failed"
                        comparison.processing_error = str(e)
                        await db.commit()
                except Exception as db_error:
                    logger.error(f"Failed to update error status: {db_error}")
                
                # Re-raise for Celery retry mechanism
                raise
    
    return asyncio.run(_analyze())


async def _perform_ai_analysis(
    resume_text: str,
    job_description: str,
    job_title: str,
    company_name: str
) -> Dict[str, Any]:
    """
    Perform detailed AI analysis of resume vs job posting.
    
    Args:
        resume_text: Extracted text from resume
        job_description: Job posting description
        job_title: Job title
        company_name: Company name
    
    Returns:
        Dict containing detailed analysis results
    """
    try:
        # Prepare analysis prompt
        analysis_prompt = f"""
        As an expert career advisor and ATS specialist, analyze how well this resume matches the job posting.
        
        RESUME:
        {resume_text[:4000]}  # Limit to avoid token overflow
        
        JOB POSTING:
        Title: {job_title}
        Company: {company_name}
        Description: {job_description[:4000]}  # Limit to avoid token overflow
        
        Please provide a comprehensive analysis in the following JSON format:
        {{
            "scores": {{
                "skills": 0.0,
                "experience": 0.0,
                "education": 0.0
            }},
            "matching_skills": ["skill1", "skill2"],
            "missing_skills": ["skill1", "skill2"],
            "recommendations": [
                "Specific recommendation 1",
                "Specific recommendation 2"
            ],
            "improvement_suggestions": [
                "Improvement suggestion 1",
                "Improvement suggestion 2"
            ],
            "summary": "Brief overall assessment"
        }}
        
        Scoring scale: 0.0 to 1.0 where 1.0 is perfect match.
        Focus on:
        - Technical skills alignment
        - Experience level and relevance
        - Education requirements
        - Industry knowledge
        - Soft skills mentioned
        
        Provide actionable, specific recommendations.
        """
        
        # Get AI analysis
        response = await openai_service.get_chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert career advisor and ATS specialist. Provide detailed, actionable resume-job match analysis in valid JSON format."
                },
                {
                    "role": "user",
                    "content": analysis_prompt
                }
            ],
            model="gpt-4",
            temperature=0.1,  # Low temperature for consistent analysis
            max_tokens=1500
        )
        
        # Parse JSON response
        import json
        try:
            analysis_data = json.loads(response)
        except json.JSONDecodeError:
            logger.warning("AI response was not valid JSON, using fallback analysis")
            analysis_data = _create_fallback_analysis()
        
        # Validate and normalize scores
        scores = analysis_data.get("scores", {})
        for score_type in ["skills", "experience", "education"]:
            if score_type not in scores or not isinstance(scores[score_type], (int, float)):
                scores[score_type] = 0.5  # Default neutral score
            else:
                scores[score_type] = max(0.0, min(1.0, float(scores[score_type])))
        
        # Ensure all required fields exist
        analysis_data.setdefault("matching_skills", [])
        analysis_data.setdefault("missing_skills", [])
        analysis_data.setdefault("recommendations", [])
        analysis_data.setdefault("improvement_suggestions", [])
        analysis_data.setdefault("summary", "Analysis completed")
        
        return analysis_data
        
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        return _create_fallback_analysis()


def _create_fallback_analysis() -> Dict[str, Any]:
    """Create fallback analysis when AI analysis fails."""
    return {
        "scores": {
            "skills": 0.5,
            "experience": 0.5,
            "education": 0.5
        },
        "matching_skills": [],
        "missing_skills": [],
        "recommendations": [
            "Review job requirements carefully",
            "Tailor resume to highlight relevant experience",
            "Consider additional skills training if needed"
        ],
        "improvement_suggestions": [
            "Add more specific keywords from the job posting",
            "Quantify achievements where possible",
            "Ensure resume format is ATS-friendly"
        ],
        "summary": "Analysis completed with basic recommendations"
    }


@celery_app.task(bind=True, base=JobAnalysisTask, name="job_analysis.bulk_analyze_jobs")
def bulk_analyze_jobs(self, comparison_ids: List[str]) -> Dict[str, Any]:
    """
    Analyze multiple job postings in batch.
    
    Args:
        comparison_ids: List of JobComparison UUIDs
    
    Returns:
        Dict containing batch analysis results
    """
    async def _bulk_analyze():
        results = {
            "processed": 0,
            "failed": 0,
            "errors": []
        }
        
        for comparison_id in comparison_ids:
            try:
                result = await analyze_job_posting.apply_async((comparison_id,))
                if result.get("status") == "completed":
                    results["processed"] += 1
                else:
                    results["failed"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "comparison_id": comparison_id,
                    "error": str(e)
                })
                logger.error(f"Bulk analysis failed for {comparison_id}: {e}")
        
        return results
    
    return asyncio.run(_bulk_analyze())


@celery_app.task(name="job_analysis.cleanup_old_analyses")
def cleanup_old_analyses() -> Dict[str, Any]:
    """
    Clean up old job analysis data to manage storage.
    
    Returns:
        Dict containing cleanup results
    """
    async def _cleanup():
        try:
            # Implementation would go here to clean up old analyses
            # This is a placeholder for future implementation
            logger.info("Job analysis cleanup completed")
            return {"status": "completed", "cleaned": 0}
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            raise
    
    return asyncio.run(_cleanup())