"""
Job Comparison API Endpoints
Handles job posting analysis, resume-job matching, and comparison results.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, func, or_
from pydantic import BaseModel, Field, HttpUrl
import logging

from app.core.database import get_db
from app.core.security import get_current_user, rate_limit
from app.models.user import User
from app.models.resume import Resume
from app.models.job_comparison import JobComparison
from app.models.job import Job
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


# Job Discovery Models
class JobDiscoveryResponse(BaseModel):
    """Job discovery response model"""
    id: int
    provider: str
    provider_job_id: str
    title: str
    company: str
    location: str
    remote: bool
    salary_min: Optional[float]
    salary_max: Optional[float]
    currency: str
    snippet: str
    tags: List[str]
    redirect_url: str
    posted_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class JobStatsResponse(BaseModel):
    """Job statistics response model"""
    total_jobs: int
    jobs_with_embeddings: int
    jobs_by_provider: Dict[str, int]
    recent_jobs_count: int

    class Config:
        from_attributes = True


# Job Discovery Endpoints (Public - No Auth Required)
@router.get("/discovery", response_model=List[JobDiscoveryResponse])
async def get_jobs_feed(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of jobs to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of jobs to return"),
    remote_only: Optional[bool] = Query(None, description="Filter remote jobs only"),
    location: Optional[str] = Query(None, description="Filter by location")
):
    """
    Get paginated jobs feed for discovery (public endpoint).
    
    - **skip**: Number of jobs to skip for pagination
    - **limit**: Number of jobs to return (1-100, default: 20)
    - **remote_only**: Optional filter for remote jobs only
    - **location**: Optional location filter
    
    Returns latest jobs from all providers.
    """
    try:
        logger.info(f"Fetching jobs feed: skip={skip}, limit={limit}")
        
        # Build query
        query = select(Job).order_by(desc(Job.posted_at))
        
        if remote_only:
            query = query.where(Job.remote.is_(True))
        
        if location:
            query = query.where(Job.location.ilike(f"%{location}%"))
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        jobs = result.scalars().all()
        
        return jobs
        
    except Exception as e:
        logger.error(f"Error fetching jobs feed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch jobs feed"
        )


@router.get("/discovery/stats", response_model=JobStatsResponse)
async def get_jobs_stats(db: AsyncSession = Depends(get_db)):
    """
    Get job statistics (public endpoint).
    
    Returns counts and statistics about available jobs.
    """
    try:
        logger.info("Fetching job statistics")
        
        # Total jobs count
        total_jobs_result = await db.execute(select(func.count(Job.id)))
        total_jobs = total_jobs_result.scalar()
        
        # Jobs with embeddings count
        embedded_jobs_result = await db.execute(
            select(func.count(Job.id)).where(Job.job_embedding.isnot(None))
        )
        jobs_with_embeddings = embedded_jobs_result.scalar()
        
        # Jobs by provider
        provider_stats_result = await db.execute(
            select(Job.provider, func.count(Job.id)).group_by(Job.provider)
        )
        jobs_by_provider = {provider: count for provider, count in provider_stats_result.all()}
        
        # Recent jobs (last 7 days)
        from datetime import timedelta
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent_jobs_result = await db.execute(
            select(func.count(Job.id)).where(Job.posted_at >= seven_days_ago)
        )
        recent_jobs_count = recent_jobs_result.scalar()
        
        return JobStatsResponse(
            total_jobs=total_jobs,
            jobs_with_embeddings=jobs_with_embeddings,
            jobs_by_provider=jobs_by_provider,
            recent_jobs_count=recent_jobs_count
        )
        
    except Exception as e:
        logger.error(f"Error fetching job statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch job statistics"
        )


@router.get("/discovery/search", response_model=List[JobDiscoveryResponse])
async def search_jobs(
    db: AsyncSession = Depends(get_db),
    q: str = Query(..., description="Search query"),
    skip: int = Query(0, ge=0, description="Number of jobs to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of jobs to return"),
    remote_only: Optional[bool] = Query(None, description="Filter remote jobs only"),
    location: Optional[str] = Query(None, description="Filter by location")
):
    """
    Search jobs by query (public endpoint).
    
    - **q**: Search query (title, company, or description)
    - **skip**: Number of jobs to skip for pagination
    - **limit**: Number of jobs to return (1-100, default: 20)
    - **remote_only**: Optional filter for remote jobs only
    - **location**: Optional location filter
    
    Returns jobs matching the search query.
    """
    try:
        logger.info(f"Searching jobs with query: {q}")
        
        # Build search query
        query = select(Job).where(
            or_(
                Job.title.ilike(f"%{q}%"),
                Job.company.ilike(f"%{q}%"),
                Job.snippet.ilike(f"%{q}%")
            )
        ).order_by(desc(Job.posted_at))
        
        if remote_only:
            query = query.where(Job.remote.is_(True))
        
        if location:
            query = query.where(Job.location.ilike(f"%{location}%"))
        
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        jobs = result.scalars().all()
        
        return jobs
        
    except Exception as e:
        logger.error(f"Error searching jobs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search jobs"
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


# ============================================
# JOB DISCOVERY & RECOMMENDATION ENDPOINTS
# ============================================

# New Pydantic models for job discovery
class JobRecommendationResponse(BaseModel):
    """Job recommendation with scoring details"""
    job_id: int
    provider: str
    provider_job_id: str
    title: str
    company: str
    location: Optional[str]
    remote: bool
    salary_min: Optional[float]
    salary_max: Optional[float]
    currency: str
    snippet: Optional[str]
    tags: List[str]
    posted_at: Optional[str]
    redirect_url: str
    score: float
    why: List[str]
    source: str

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "job_id": 1234,
                "provider": "adzuna",
                "provider_job_id": "123456789",
                "title": "Senior Software Engineer",
                "company": "TechCorp Inc.",
                "location": "Toronto, ON",
                "remote": True,
                "salary_min": 90000.0,
                "salary_max": 120000.0,
                "currency": "CAD",
                "snippet": "We are looking for a Senior Software Engineer to join our team...",
                "tags": ["Python", "React", "AWS"],
                "posted_at": "2025-10-20T10:00:00Z",
                "redirect_url": "https://www.adzuna.ca/jobs/view/123456789",
                "score": 0.85,
                "why": ["Strong title match: Senior Software Engineer", "Matching skills: Python, React"],
                "source": "Adzuna"
            }
        }


class SwipeRequest(BaseModel):
    """Job swipe action request"""
    job_id: int
    action: str = Field(..., pattern="^(like|pass)$", description="Swipe action: 'like' or 'pass'")
    device: Optional[str] = Field(None, description="Device type: 'mobile', 'desktop', 'tablet'")

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": 1234,
                "action": "like",
                "device": "mobile"
            }
        }


class SavedJobResponse(BaseModel):
    """Saved job response model"""
    job_id: int
    status: str
    saved_at: str
    updated_at: str
    job: JobRecommendationResponse

    class Config:
        from_attributes = True


class UserPreferencesRequest(BaseModel):
    """User preferences update request"""
    skills: Optional[List[str]] = None
    target_titles: Optional[List[str]] = None
    location_pref: Optional[str] = None
    remote_ok: Optional[bool] = None
    salary_min: Optional[float] = None
    blocked_companies: Optional[List[str]] = None
    preferred_companies: Optional[List[str]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "skills": ["Python", "React", "PostgreSQL"],
                "target_titles": ["Software Engineer", "Full Stack Developer"],
                "location_pref": "Toronto, ON",
                "remote_ok": True,
                "salary_min": 80000.0,
                "blocked_companies": ["BadCorp"],
                "preferred_companies": ["GoodCorp", "TechCorp"]
            }
        }


@router.get("/recommendations", response_model=List[JobRecommendationResponse])
async def get_job_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=50, description="Number of recommendations to return")
):
    """
    Get personalized job recommendations based on user preferences and profile.
    
    - **limit**: Maximum number of recommendations to return (1-50, default: 20)
    
    Recommendations are scored using multiple factors:
    - Title/role matching (40%)
    - Skill overlap (25%)
    - Location preference (10%) 
    - Salary alignment (10%)
    - Recency boost (10%)
    - Company preference (5%)
    - Embedding similarity bonus
    
    Returns jobs from Adzuna with proper attribution.
    """
    try:
        from app.services.match import matching_service
        
        logger.info(f"Fetching job recommendations for user: {current_user.email}")
        
        # Get personalized recommendations
        recommendations = await matching_service.get_recommendations(
            user_id=current_user.id,
            db=db,
            limit=limit,
            exclude_seen=True
        )
        
        # Convert to response format
        response_recommendations = []
        for rec in recommendations:
            response_rec = JobRecommendationResponse(
                job_id=rec["job_id"],
                provider=rec["provider"],
                provider_job_id=rec["provider_job_id"],
                title=rec["title"],
                company=rec["company"],
                location=rec["location"],
                remote=rec["remote"],
                salary_min=rec["salary_min"],
                salary_max=rec["salary_max"],
                currency=rec["currency"],
                snippet=rec["snippet"],
                tags=rec["tags"],
                posted_at=rec["posted_at"].isoformat() if rec["posted_at"] else None,
                redirect_url=rec["redirect_url"],
                score=rec["score"],
                why=rec["why"],
                source=rec["source"]
            )
            response_recommendations.append(response_rec)
        
        logger.info(f"Returning {len(response_recommendations)} recommendations for user: {current_user.email}")
        return response_recommendations
        
    except Exception as e:
        logger.error(f"Error fetching job recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch job recommendations"
        )


@router.post("/swipe", status_code=status.HTTP_200_OK)
async def swipe_job(
    swipe_request: SwipeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Record a swipe action on a job (like or pass).
    
    - **job_id**: ID of the job being swiped
    - **action**: Either "like" or "pass"
    - **device**: Optional device type for analytics
    
    On "like", the job is automatically saved to the user's saved jobs.
    All swipes are recorded for analytics and learning.
    """
    try:
        from app.models.job import Job
        from app.models.job_swipe import JobSwipe
        from app.models.saved_job import SavedJob
        
        logger.info(f"Processing swipe {swipe_request.action} on job {swipe_request.job_id} by user: {current_user.email}")
        
        # Verify job exists
        job = await db.get(Job, swipe_request.job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # Check if user already swiped this job
        existing_swipe = await db.execute(
            select(JobSwipe).where(
                and_(
                    JobSwipe.user_id == current_user.id,
                    JobSwipe.job_id == swipe_request.job_id
                )
            )
        )
        
        if existing_swipe.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job already swiped"
            )
        
        # Record swipe for analytics
        job_swipe = JobSwipe(
            user_id=current_user.id,
            job_id=swipe_request.job_id,
            action=swipe_request.action,
            device=swipe_request.device or "unknown"
        )
        
        db.add(job_swipe)
        
        # If it's a like, also save the job
        saved_job_id = None
        if swipe_request.action == "like":
            # Check if already saved
            existing_save = await db.execute(
                select(SavedJob).where(
                    and_(
                        SavedJob.user_id == current_user.id,
                        SavedJob.job_id == swipe_request.job_id
                    )
                )
            )
            
            if not existing_save.scalar_one_or_none():
                saved_job = SavedJob(
                    user_id=current_user.id,
                    job_id=swipe_request.job_id,
                    status="saved"
                )
                db.add(saved_job)
                await db.flush()
                saved_job_id = saved_job.id
        
        await db.commit()
        
        response = {
            "message": f"Job {swipe_request.action} recorded successfully",
            "job_id": swipe_request.job_id,
            "action": swipe_request.action
        }
        
        if saved_job_id:
            response["saved_job_id"] = saved_job_id
            response["message"] += " and saved to your jobs"
        
        logger.info(f"Swipe processed successfully for user: {current_user.email}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing swipe: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process swipe"
        )


@router.get("/me/saved-jobs", response_model=List[SavedJobResponse])
async def get_saved_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, pattern="^(saved|applied|archived)$", description="Filter by job status"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return")
):
    """
    Get user's saved jobs with optional status filtering.
    
    - **status**: Optional status filter ('saved', 'applied', 'archived')
    - **skip**: Number of items to skip for pagination
    - **limit**: Number of items to return (1-100, default: 20)
    
    Returns saved jobs with full job details and save metadata.
    """
    try:
        from app.models.saved_job import SavedJob
        from app.models.job import Job
        
        logger.info(f"Fetching saved jobs for user: {current_user.email}")
        
        # Build query with join
        query = select(SavedJob, Job).join(Job, SavedJob.job_id == Job.id).where(
            SavedJob.user_id == current_user.id
        )
        
        if status_filter:
            query = query.where(SavedJob.status == status_filter)
        
        query = query.order_by(SavedJob.saved_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        saved_job_rows = result.all()
        
        # Build response
        saved_jobs = []
        for saved_job, job in saved_job_rows:
            job_rec = JobRecommendationResponse(
                job_id=job.id,
                provider=job.provider,
                provider_job_id=job.provider_job_id,
                title=job.title,
                company=job.company,
                location=job.location,
                remote=job.remote,
                salary_min=job.salary_min,
                salary_max=job.salary_max,
                currency=job.currency,
                snippet=job.snippet,
                tags=job.tags or [],
                posted_at=job.posted_at.isoformat() if job.posted_at else None,
                redirect_url=job.redirect_url,
                score=0.0,  # No score needed for saved jobs
                why=["Previously liked"],
                source=f"Source: {job.provider.title()}"
            )
            
            saved_job_response = SavedJobResponse(
                job_id=job.id,
                status=saved_job.status,
                saved_at=saved_job.saved_at.isoformat(),
                updated_at=saved_job.updated_at.isoformat(),
                job=job_rec
            )
            saved_jobs.append(saved_job_response)
        
        logger.info(f"Returning {len(saved_jobs)} saved jobs for user: {current_user.email}")
        return saved_jobs
        
    except Exception as e:
        logger.error(f"Error fetching saved jobs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch saved jobs"
        )


@router.put("/me/saved-jobs/{job_id}/status")
async def update_saved_job_status(
    job_id: int,
    new_status: str = Body(..., pattern="^(saved|applied|archived)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update the status of a saved job.
    
    - **job_id**: ID of the saved job
    - **new_status**: New status ('saved', 'applied', 'archived')
    
    Allows users to track their application progress.
    """
    try:
        from app.models.saved_job import SavedJob
        
        # Find the saved job
        result = await db.execute(
            select(SavedJob).where(
                and_(
                    SavedJob.user_id == current_user.id,
                    SavedJob.job_id == job_id
                )
            )
        )
        
        saved_job = result.scalar_one_or_none()
        if not saved_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved job not found"
            )
        
        # Update status
        old_status = saved_job.status
        saved_job.status = new_status
        saved_job.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        logger.info(f"Updated saved job {job_id} status from {old_status} to {new_status} for user: {current_user.email}")
        
        return {
            "message": "Saved job status updated successfully",
            "job_id": job_id,
            "old_status": old_status,
            "new_status": new_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating saved job status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update saved job status"
        )


@router.delete("/me/saved-jobs/{job_id}")
async def remove_saved_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a job from saved jobs.
    
    - **job_id**: ID of the job to remove
    
    This action cannot be undone.
    """
    try:
        from app.models.saved_job import SavedJob
        
        # Find and delete the saved job
        result = await db.execute(
            select(SavedJob).where(
                and_(
                    SavedJob.user_id == current_user.id,
                    SavedJob.job_id == job_id
                )
            )
        )
        
        saved_job = result.scalar_one_or_none()
        if not saved_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved job not found"
            )
        
        await db.delete(saved_job)
        await db.commit()
        
        logger.info(f"Removed saved job {job_id} for user: {current_user.email}")
        
        return {
            "message": "Job removed from saved jobs successfully",
            "job_id": job_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing saved job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove saved job"
        )


@router.get("/me/preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's job search preferences.
    
    Returns the user's preferences for job recommendations including
    skills, target titles, location, salary, and company preferences.
    """
    try:
        from app.models.user_preferences import UserPreferences
        
        # Get user preferences
        result = await db.execute(
            select(UserPreferences).where(UserPreferences.user_id == current_user.id)
        )
        
        preferences = result.scalar_one_or_none()
        
        if not preferences:
            # Create default preferences
            preferences = UserPreferences(
                user_id=current_user.id,
                skills=[],
                target_titles=["Software Engineer", "Developer"],
                location_pref="",
                remote_ok=True,
                salary_min=None,
                blocked_companies=[],
                preferred_companies=[]
            )
            
            db.add(preferences)
            await db.commit()
            await db.refresh(preferences)
        
        return {
            "skills": preferences.skills or [],
            "target_titles": preferences.target_titles or [],
            "location_pref": preferences.location_pref,
            "remote_ok": preferences.remote_ok,
            "salary_min": preferences.salary_min,
            "blocked_companies": preferences.blocked_companies or [],
            "preferred_companies": preferences.preferred_companies or [],
            "created_at": preferences.created_at.isoformat(),
            "updated_at": preferences.updated_at.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching user preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user preferences"
        )


@router.put("/me/preferences")
async def update_user_preferences(
    preferences_update: UserPreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user's job search preferences.
    
    - **skills**: List of skills/technologies
    - **target_titles**: List of target job titles
    - **location_pref**: Preferred location
    - **remote_ok**: Whether remote work is acceptable
    - **salary_min**: Minimum acceptable salary
    - **blocked_companies**: Companies to exclude from recommendations
    - **preferred_companies**: Companies to prioritize in recommendations
    
    Only provided fields will be updated; others remain unchanged.
    """
    try:
        from app.models.user_preferences import UserPreferences
        
        # Get existing preferences
        result = await db.execute(
            select(UserPreferences).where(UserPreferences.user_id == current_user.id)
        )
        
        preferences = result.scalar_one_or_none()
        
        if not preferences:
            # Create new preferences
            preferences = UserPreferences(user_id=current_user.id)
            db.add(preferences)
        
        # Update provided fields
        update_data = preferences_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(preferences, field, value)
        
        preferences.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(preferences)
        
        logger.info(f"Updated preferences for user: {current_user.email}")
        
        return {
            "message": "Preferences updated successfully",
            "preferences": {
                "skills": preferences.skills or [],
                "target_titles": preferences.target_titles or [],
                "location_pref": preferences.location_pref,
                "remote_ok": preferences.remote_ok,
                "salary_min": preferences.salary_min,
                "blocked_companies": preferences.blocked_companies or [],
                "preferred_companies": preferences.preferred_companies or [],
                "updated_at": preferences.updated_at.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error updating user preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user preferences"
        )