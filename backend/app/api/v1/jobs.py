"""
Job Comparison API Endpoints
Handles job posting analysis, resume-job matching, and comparison results.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, Field, HttpUrl
import logging

from app.core.database import get_db
from app.core.security import get_current_user, rate_limit
from app.models.user import User
from app.models.resume import Resume
from app.models.job_comparison import JobComparison
from app.celery.tasks.job_analysis import analyze_job_posting
from app.services.enhanced_comparison_service import enhanced_comparison_service

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class JobPostingCreate(BaseModel):
    job_title: str = Field(..., min_length=1, max_length=200, description="Job title")
    company_name: str = Field(..., min_length=1, max_length=200, description="Company name")
    job_description: str = Field(..., min_length=10, max_length=10000, description="Job description text")
    job_url: Optional[HttpUrl] = Field(None, description="URL to the job posting")
    location: Optional[str] = Field(None, max_length=200, description="Job location")
    salary_range: Optional[str] = Field(None, max_length=100, description="Salary range if available")
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_title": "Senior Software Engineer",
                "company_name": "TechCorp Inc.",
                "job_description": "We are seeking a Senior Software Engineer to join our dynamic team...",
                "job_url": "https://techcorp.com/careers/senior-software-engineer",
                "location": "San Francisco, CA",
                "salary_range": "$120,000 - $150,000"
            }
        }


class JobComparisonResponse(BaseModel):
    id: str
    resume_id: str
    job_title: str
    company_name: str
    location: Optional[str]
    salary_range: Optional[str]
    job_url: Optional[str]
    overall_match_score: Optional[float]
    skills_match_score: Optional[float]
    experience_match_score: Optional[float]
    education_match_score: Optional[float]
    is_processed: bool
    processing_status: str
    processing_error: Optional[str]
    created_at: str
    processed_at: Optional[str]
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "resume_id": "456e7890-e12b-34c5-d678-901234567890",
                "job_title": "Senior Software Engineer",
                "company_name": "TechCorp Inc.",
                "location": "San Francisco, CA",
                "salary_range": "$120,000 - $150,000",
                "job_url": "https://techcorp.com/careers/senior-software-engineer",
                "overall_match_score": 0.85,
                "skills_match_score": 0.88,
                "experience_match_score": 0.82,
                "education_match_score": 0.75,
                "is_processed": True,
                "processing_status": "completed",
                "processing_error": None,
                "created_at": "2024-01-15T10:30:00Z",
                "processed_at": "2024-01-15T10:31:30Z"
            }
        }


class JobComparisonDetailResponse(JobComparisonResponse):
    job_description: str
    analysis_result: Optional[Dict[str, Any]]
    ai_recommendations: Optional[List[str]]
    missing_skills: Optional[List[str]]
    matching_skills: Optional[List[str]]
    improvement_suggestions: Optional[List[str]]


class ComparisonAnalysisRequest(BaseModel):
    resume_id: str = Field(..., description="UUID of the resume to compare against")
    job_posting: JobPostingCreate
    
    class Config:
        json_schema_extra = {
            "example": {
                "resume_id": "456e7890-e12b-34c5-d678-901234567890",
                "job_posting": {
                    "job_title": "Senior Software Engineer",
                    "company_name": "TechCorp Inc.",
                    "job_description": "We are seeking a Senior Software Engineer...",
                    "job_url": "https://techcorp.com/careers/senior-software-engineer",
                    "location": "San Francisco, CA",
                    "salary_range": "$120,000 - $150,000"
                }
            }
        }


@router.post("/analyze", response_model=JobComparisonResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(max_calls=20, window_minutes=60)  # 20 analyses per hour
async def analyze_job_match(
    request: Request,
    analysis_request: ComparisonAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze how well a resume matches a job posting.
    
    - **resume_id**: UUID of the resume to analyze
    - **job_posting**: Job posting details for comparison
    
    The analysis will be processed asynchronously and include:
    - Overall match score
    - Skills compatibility
    - Experience alignment
    - Education requirements
    - AI-powered recommendations
    """
    try:
        logger.info(f"Job analysis initiated by user: {current_user.email}")
        
        # Verify resume exists and belongs to user
        resume = await db.get(Resume, analysis_request.resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
        
        if resume.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        if not resume.is_processed or not resume.embedding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume must be processed before analysis"
            )
        
        # Create job comparison record
        job_comparison = JobComparison(
            user_id=current_user.id,
            resume_id=resume.id,
            job_title=analysis_request.job_posting.job_title,
            company_name=analysis_request.job_posting.company_name,
            job_description=analysis_request.job_posting.job_description,
            job_url=str(analysis_request.job_posting.job_url) if analysis_request.job_posting.job_url else None,
            location=analysis_request.job_posting.location,
            salary_range=analysis_request.job_posting.salary_range,
            processing_status="processing"
        )
        
        db.add(job_comparison)
        await db.commit()
        await db.refresh(job_comparison)
        
        # Queue background analysis task
        task = analyze_job_posting.delay(str(job_comparison.id))
        logger.info(f"Queued job analysis task: {task.id} for comparison: {job_comparison.id}")
        
        # Create response
        response = JobComparisonResponse(
            id=str(job_comparison.id),
            resume_id=str(job_comparison.resume_id),
            job_title=job_comparison.job_title,
            company_name=job_comparison.company_name,
            location=job_comparison.location,
            salary_range=job_comparison.salary_range,
            job_url=job_comparison.job_url,
            overall_match_score=job_comparison.overall_match_score,
            skills_match_score=job_comparison.skills_match_score,
            experience_match_score=job_comparison.experience_match_score,
            education_match_score=job_comparison.education_match_score,
            is_processed=job_comparison.is_processed,
            processing_status=job_comparison.processing_status,
            processing_error=job_comparison.processing_error,
            created_at=job_comparison.created_at.isoformat(),
            processed_at=job_comparison.processed_at.isoformat() if job_comparison.processed_at else None
        )
        
        logger.info(f"Job analysis created successfully: {job_comparison.id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Job analysis failed"
        )


@router.get("/", response_model=List[JobComparisonResponse])
async def list_job_comparisons(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    resume_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """
    List job comparisons with optional filtering by resume.
    
    - **resume_id**: Optional resume UUID to filter comparisons
    - **skip**: Number of comparisons to skip (default: 0)
    - **limit**: Maximum number of comparisons to return (default: 20, max: 100)
    """
    try:
        # Validate limit
        limit = min(limit, 100)
        
        # Build query
        query = select(JobComparison).where(JobComparison.user_id == current_user.id)
        
        if resume_id:
            query = query.where(JobComparison.resume_id == resume_id)
        
        query = query.order_by(desc(JobComparison.created_at)).offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        comparisons = result.scalars().all()
        
        # Create response list
        comparison_list = []
        for comparison in comparisons:
            comparison_response = JobComparisonResponse(
                id=str(comparison.id),
                resume_id=str(comparison.resume_id),
                job_title=comparison.job_title,
                company_name=comparison.company_name,
                location=comparison.location,
                salary_range=comparison.salary_range,
                job_url=comparison.job_url,
                overall_match_score=comparison.overall_match_score,
                skills_match_score=comparison.skills_match_score,
                experience_match_score=comparison.experience_match_score,
                education_match_score=comparison.education_match_score,
                is_processed=comparison.is_processed,
                processing_status=comparison.processing_status,
                processing_error=comparison.processing_error,
                created_at=comparison.created_at.isoformat(),
                processed_at=comparison.processed_at.isoformat() if comparison.processed_at else None
            )
            comparison_list.append(comparison_response)
        
        return comparison_list
        
    except Exception as e:
        logger.error(f"List job comparisons error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve job comparisons"
        )


@router.get("/{comparison_id}", response_model=JobComparisonDetailResponse)
async def get_job_comparison(
    comparison_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific job comparison.
    
    - **comparison_id**: UUID of the job comparison
    
    Returns detailed analysis results including AI recommendations and skill gaps.
    """
    try:
        # Get comparison
        comparison = await db.get(JobComparison, comparison_id)
        
        if not comparison:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job comparison not found"
            )
        
        # Check ownership
        if comparison.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Create detailed response
        response = JobComparisonDetailResponse(
            id=str(comparison.id),
            resume_id=str(comparison.resume_id),
            job_title=comparison.job_title,
            company_name=comparison.company_name,
            location=comparison.location,
            salary_range=comparison.salary_range,
            job_url=comparison.job_url,
            job_description=comparison.job_description,
            overall_match_score=comparison.overall_match_score,
            skills_match_score=comparison.skills_match_score,
            experience_match_score=comparison.experience_match_score,
            education_match_score=comparison.education_match_score,
            is_processed=comparison.is_processed,
            processing_status=comparison.processing_status,
            processing_error=comparison.processing_error,
            created_at=comparison.created_at.isoformat(),
            processed_at=comparison.processed_at.isoformat() if comparison.processed_at else None,
            analysis_result=comparison.analysis_result,
            ai_recommendations=comparison.ai_recommendations,
            missing_skills=comparison.missing_skills,
            matching_skills=comparison.matching_skills,
            improvement_suggestions=comparison.improvement_suggestions
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get job comparison error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve job comparison"
        )


@router.delete("/{comparison_id}", status_code=status.HTTP_200_OK)
async def delete_job_comparison(
    comparison_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a job comparison.
    
    - **comparison_id**: UUID of the job comparison
    
    This action cannot be undone.
    """
    try:
        # Get comparison
        comparison = await db.get(JobComparison, comparison_id)
        
        if not comparison:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job comparison not found"
            )
        
        # Check ownership
        if comparison.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Delete comparison record
        await db.delete(comparison)
        await db.commit()
        
        logger.info(f"Job comparison deleted: {comparison_id} by user: {current_user.email}")
        
        return {"message": "Job comparison deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete job comparison error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete job comparison"
        )


@router.post("/{comparison_id}/reanalyze", response_model=JobComparisonResponse)
async def reanalyze_job_comparison(
    comparison_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reanalyze a job comparison.
    
    - **comparison_id**: UUID of the job comparison
    
    Useful if initial analysis failed or you want to regenerate with updated AI models.
    """
    try:
        # Get comparison
        comparison = await db.get(JobComparison, comparison_id)
        
        if not comparison:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job comparison not found"
            )
        
        # Check ownership
        if comparison.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Reset processing status
        comparison.processing_status = "processing"
        comparison.processing_error = None
        comparison.is_processed = False
        comparison.analysis_result = None
        comparison.ai_recommendations = None
        comparison.missing_skills = None
        comparison.matching_skills = None
        comparison.improvement_suggestions = None
        
        await db.commit()
        
        # Queue reanalysis task
        task = analyze_job_posting.delay(comparison_id, force=True)
        
        logger.info(f"Queued job reanalysis: {task.id} for comparison: {comparison_id}")
        
        # Create response
        response = JobComparisonResponse(
            id=str(comparison.id),
            resume_id=str(comparison.resume_id),
            job_title=comparison.job_title,
            company_name=comparison.company_name,
            location=comparison.location,
            salary_range=comparison.salary_range,
            job_url=comparison.job_url,
            overall_match_score=comparison.overall_match_score,
            skills_match_score=comparison.skills_match_score,
            experience_match_score=comparison.experience_match_score,
            education_match_score=comparison.education_match_score,
            is_processed=comparison.is_processed,
            processing_status=comparison.processing_status,
            processing_error=comparison.processing_error,
            created_at=comparison.created_at.isoformat(),
            processed_at=comparison.processed_at.isoformat() if comparison.processed_at else None
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reanalyze job comparison error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue reanalysis"
        )


@router.post("/analyze-enhanced", status_code=status.HTTP_200_OK)
@rate_limit(max_calls=10, window_minutes=60)  # Limited due to computational intensity
async def analyze_job_enhanced(
    request: Request,
    analysis_request: ComparisonAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Perform enhanced job-resume comparison with advanced algorithms.
    
    - **resume_id**: UUID of the resume to analyze
    - **job_posting**: Job posting details for comparison
    
    This enhanced analysis includes:
    - Advanced skill matching with synonyms and fuzzy logic
    - Industry-specific scoring algorithms
    - Role level alignment analysis
    - ATS compatibility scoring
    - Context-aware recommendations
    - Detailed analytics and insights
    """
    try:
        logger.info(f"Enhanced job analysis initiated by user: {current_user.email}")
        
        # Verify resume exists and belongs to user
        resume = await db.get(Resume, analysis_request.resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
        
        if resume.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        if not resume.is_processed or not resume.extracted_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume must be processed before analysis"
            )
        
        # Create job comparison record
        job_comparison = JobComparison(
            user_id=current_user.id,
            resume_id=resume.id,
            job_title=analysis_request.job_posting.job_title,
            company_name=analysis_request.job_posting.company_name,
            job_description=analysis_request.job_posting.job_description,
            job_url=str(analysis_request.job_posting.job_url) if analysis_request.job_posting.job_url else None,
            location=analysis_request.job_posting.location,
            salary_range=analysis_request.job_posting.salary_range,
            processing_status="processing"
        )
        
        db.add(job_comparison)
        await db.commit()
        await db.refresh(job_comparison)
        
        # Perform enhanced comparison
        enhanced_results = await enhanced_comparison_service.perform_enhanced_comparison(
            resume=resume,
            job_comparison=job_comparison,
            db=db
        )
        
        # Update job comparison with enhanced results
        job_comparison.overall_match_score = enhanced_results["enhanced_metrics"]["overall_score"]
        job_comparison.skills_match_score = enhanced_results["enhanced_metrics"]["skill_coverage"]
        job_comparison.experience_match_score = enhanced_results["enhanced_metrics"]["experience_alignment"]
        job_comparison.education_match_score = enhanced_results["enhanced_metrics"]["education_match"]
        job_comparison.is_processed = True
        job_comparison.processing_status = "completed"
        
        # Store enhanced analysis results
        job_comparison.analysis_results = enhanced_results
        
        await db.commit()
        await db.refresh(job_comparison)
        
        logger.info(f"Enhanced analysis completed for comparison: {job_comparison.id}")
        
        # Return comprehensive results
        return {
            "comparison_id": str(job_comparison.id),
            "resume_id": str(job_comparison.resume_id),
            "job_details": {
                "title": job_comparison.job_title,
                "company": job_comparison.company_name,
                "location": job_comparison.location,
                "salary_range": job_comparison.salary_range,
                "url": job_comparison.job_url
            },
            "enhanced_analysis": enhanced_results,
            "quick_summary": {
                "overall_score": enhanced_results["enhanced_metrics"]["overall_score"],
                "match_level": "excellent" if enhanced_results["enhanced_metrics"]["overall_score"] > 0.8 
                             else "good" if enhanced_results["enhanced_metrics"]["overall_score"] > 0.6 
                             else "fair" if enhanced_results["enhanced_metrics"]["overall_score"] > 0.4 
                             else "poor",
                "top_strengths": enhanced_results["skill_analysis"]["exact_matches"][:3],
                "key_gaps": enhanced_results["skill_analysis"]["missing_critical"][:3],
                "recommendation_count": len(enhanced_results["enhanced_recommendations"])
            },
            "created_at": job_comparison.created_at.isoformat(),
            "processed_at": job_comparison.processed_at.isoformat() if job_comparison.processed_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhanced job analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enhanced analysis failed: {str(e)}"
        )