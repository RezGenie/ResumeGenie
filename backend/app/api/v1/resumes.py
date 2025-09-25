"""
Resume Management API Endpoints
Handles resume upload, processing, retrieval, and analysis.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
import logging

from app.core.database import get_db
from app.core.security import get_current_user, rate_limit
from app.models.user import User
from app.models.resume import Resume
from app.services.file_service import file_service, FileValidationError, FileStorageError
from app.celery.tasks.resume_processing import process_resume_embeddings

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class ResumeResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    is_processed: bool
    processing_status: str
    processing_error: Optional[str]
    created_at: str
    processed_at: Optional[str]
    word_count: Optional[int]
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "filename": "user123/resume.pdf",
                "original_filename": "my_resume.pdf",
                "file_size": 524288,
                "mime_type": "application/pdf",
                "is_processed": True,
                "processing_status": "completed",
                "processing_error": None,
                "created_at": "2024-01-15T10:30:00Z",
                "processed_at": "2024-01-15T10:31:00Z",
                "word_count": 450
            }
        }


class ResumeDetailResponse(ResumeResponse):
    extracted_text: Optional[str]
    has_embedding: bool


class ProcessingStatusResponse(BaseModel):
    resume_id: str
    status: str
    progress: Optional[dict]
    error: Optional[str]


@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(max_calls=10, window_minutes=60)  # 10 uploads per hour
async def upload_resume(
    request: Request,
    file: UploadFile = File(..., description="Resume file (PDF or DOCX, max 10MB)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and process a resume file.
    
    - **file**: Resume file in PDF or DOCX format (max 10MB)
    
    The file will be processed asynchronously for text extraction and embedding generation.
    """
    try:
        logger.info(f"Resume upload initiated by user: {current_user.email}")
        
        # Process the resume file
        resume = await file_service.process_resume_file(file, current_user, db)
        
        # Queue background task for embedding generation
        task = process_resume_embeddings.delay(str(resume.id))
        logger.info(f"Queued embedding generation task: {task.id} for resume: {resume.id}")
        
        # Create response
        response = ResumeResponse(
            id=str(resume.id),
            filename=resume.filename,
            original_filename=resume.original_filename,
            file_size=resume.file_size,
            mime_type=resume.mime_type,
            is_processed=resume.is_processed,
            processing_status=resume.processing_status,
            processing_error=resume.processing_error,
            created_at=resume.created_at.isoformat(),
            processed_at=resume.processed_at.isoformat() if resume.processed_at else None,
            word_count=len(resume.extracted_text.split()) if resume.extracted_text else None
        )
        
        logger.info(f"Resume uploaded successfully: {resume.id}")
        return response
        
    except FileValidationError as e:
        logger.warning(f"File validation error: {e.detail}")
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    
    except FileStorageError as e:
        logger.error(f"File storage error: {e.detail}")
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    
    except Exception as e:
        logger.error(f"Resume upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Resume upload failed"
        )


@router.get("/", response_model=List[ResumeResponse])
async def list_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20
):
    """
    List user's resumes with pagination.
    
    - **skip**: Number of resumes to skip (default: 0)
    - **limit**: Maximum number of resumes to return (default: 20, max: 100)
    """
    try:
        # Validate limit
        limit = min(limit, 100)
        
        # Query user's resumes
        result = await db.execute(
            select(Resume)
            .where(Resume.user_id == current_user.id)
            .order_by(desc(Resume.created_at))
            .offset(skip)
            .limit(limit)
        )
        
        resumes = result.scalars().all()
        
        # Create response list
        resume_list = []
        for resume in resumes:
            resume_response = ResumeResponse(
                id=str(resume.id),
                filename=resume.filename,
                original_filename=resume.original_filename,
                file_size=resume.file_size,
                mime_type=resume.mime_type,
                is_processed=resume.is_processed,
                processing_status=resume.processing_status,
                processing_error=resume.processing_error,
                created_at=resume.created_at.isoformat(),
                processed_at=resume.processed_at.isoformat() if resume.processed_at else None,
                word_count=len(resume.extracted_text.split()) if resume.extracted_text else None
            )
            resume_list.append(resume_response)
        
        return resume_list
        
    except Exception as e:
        logger.error(f"List resumes error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve resumes"
        )


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
async def get_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific resume.
    
    - **resume_id**: UUID of the resume
    
    Returns detailed resume information including extracted text.
    """
    try:
        # Get resume
        resume = await db.get(Resume, resume_id)
        
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
        
        # Check ownership
        if resume.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Create detailed response
        response = ResumeDetailResponse(
            id=str(resume.id),
            filename=resume.filename,
            original_filename=resume.original_filename,
            file_size=resume.file_size,
            mime_type=resume.mime_type,
            is_processed=resume.is_processed,
            processing_status=resume.processing_status,
            processing_error=resume.processing_error,
            created_at=resume.created_at.isoformat(),
            processed_at=resume.processed_at.isoformat() if resume.processed_at else None,
            word_count=len(resume.extracted_text.split()) if resume.extracted_text else None,
            extracted_text=resume.extracted_text,
            has_embedding=resume.embedding is not None
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get resume error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve resume"
        )


@router.get("/{resume_id}/download")
async def download_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get download URL for a resume file.
    
    - **resume_id**: UUID of the resume
    
    Returns a presigned URL for downloading the original file.
    """
    try:
        # Get resume
        resume = await db.get(Resume, resume_id)
        
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
        
        # Check ownership
        if resume.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Generate download URL
        download_url = await file_service.get_resume_file_url(resume, expires_in_hours=1)
        
        return {
            "download_url": download_url,
            "filename": resume.original_filename,
            "expires_in": 3600  # 1 hour
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download resume error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL"
        )


@router.delete("/{resume_id}", status_code=status.HTTP_200_OK)
async def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a resume and its associated file.
    
    - **resume_id**: UUID of the resume
    
    This action cannot be undone.
    """
    try:
        # Get resume
        resume = await db.get(Resume, resume_id)
        
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
        
        # Check ownership
        if resume.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Delete file from storage
        try:
            await file_service.delete_file_from_storage(resume.file_path)
        except Exception as e:
            logger.warning(f"Failed to delete file from storage: {e}")
        
        # Delete resume record
        await db.delete(resume)
        await db.commit()
        
        logger.info(f"Resume deleted: {resume_id} by user: {current_user.email}")
        
        return {"message": "Resume deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete resume error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete resume"
        )


@router.post("/{resume_id}/reprocess", response_model=ProcessingStatusResponse)
async def reprocess_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reprocess a resume for text extraction and embedding generation.
    
    - **resume_id**: UUID of the resume
    
    Useful if initial processing failed or you want to regenerate embeddings.
    """
    try:
        # Get resume
        resume = await db.get(Resume, resume_id)
        
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
        
        # Check ownership
        if resume.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Queue reprocessing task
        from app.celery.tasks.resume_processing import reprocess_resume as reprocess_task
        task = reprocess_task.delay(resume_id, force=True)
        
        logger.info(f"Queued resume reprocessing: {task.id} for resume: {resume_id}")
        
        return ProcessingStatusResponse(
            resume_id=resume_id,
            status="queued",
            progress={"task_id": task.id},
            error=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reprocess resume error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue reprocessing"
        )