from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
import uuid

from app.core.database import get_db
from app.models.models import User, JobDescription, JobApplication, Resume
from app.schemas.resume import (
    JobDescriptionCreate, 
    JobDescriptionResponse, 
    JobApplicationAnalysis,
    JobApplicationResponse
)
from app.api.endpoints.auth import get_current_user
from app.services.job_analyzer import JobAnalyzer
from app.services.embeddings import EmbeddingService

router = APIRouter()


@router.post("/descriptions", response_model=JobDescriptionResponse)
async def create_job_description(
    job_data: JobDescriptionCreate,
    db: AsyncSession = Depends(get_db)
):
    # Generate embeddings for job description
    embedding_service = EmbeddingService()
    full_content = f"{job_data.title} {job_data.company} {job_data.content} {job_data.requirements or ''}"
    embedding = await embedding_service.generate_embedding(full_content)
    
    job_description = JobDescription(
        title=job_data.title,
        company=job_data.company,
        content=job_data.content,
        requirements=job_data.requirements,
        embedding=embedding
    )
    
    db.add(job_description)
    await db.commit()
    await db.refresh(job_description)
    
    return job_description


@router.get("/descriptions", response_model=List[JobDescriptionResponse])
async def get_job_descriptions(
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(JobDescription).offset(skip).limit(limit)
    )
    jobs = result.scalars().all()
    return jobs


@router.post("/analyze", response_model=JobApplicationResponse)
async def analyze_job_fit(
    analysis_data: JobApplicationAnalysis,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get resume
    resume_result = await db.execute(
        select(Resume).where(
            Resume.id == analysis_data.resume_id,
            Resume.user_id == current_user.id
        )
    )
    resume = resume_result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Get job description
    job_result = await db.execute(
        select(JobDescription).where(JobDescription.id == analysis_data.job_description_id)
    )
    job_description = job_result.scalar_one_or_none()
    
    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    # Analyze job fit
    analyzer = JobAnalyzer()
    analysis = await analyzer.analyze_fit(resume, job_description)
    
    # Create job application record
    job_application = JobApplication(
        user_id=current_user.id,
        resume_id=resume.id,
        job_description_id=job_description.id,
        fit_score=analysis['fit_score'],
        missing_skills=analysis['missing_skills'],
        matching_skills=analysis['matching_skills'],
        ai_feedback=analysis['ai_feedback']
    )
    
    db.add(job_application)
    await db.commit()
    await db.refresh(job_application)
    
    # Load relationships for response
    result = await db.execute(
        select(JobApplication)
        .where(JobApplication.id == job_application.id)
        .options(
            selectinload(JobApplication.resume),
            selectinload(JobApplication.job_description)
        )
    )
    job_application_with_relations = result.scalar_one()
    
    return job_application_with_relations


@router.get("/applications", response_model=List[JobApplicationResponse])
async def get_user_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(JobApplication)
        .where(JobApplication.user_id == current_user.id)
        .options(
            selectinload(JobApplication.resume),
            selectinload(JobApplication.job_description)
        )
    )
    applications = result.scalars().all()
    return applications