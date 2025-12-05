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
import uuid
import secrets

from app.core.database import get_db
from app.core.security import get_current_user, rate_limit, hash_password
from app.core.deps import get_or_create_guest_session, check_guest_daily_wish_limit, increment_guest_wish_count
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


@router.options("/upload")
async def upload_resume_options():
    """Handle CORS preflight for authenticated upload."""
    return {"detail": "OK"}

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
        
        # Queue background task for embedding generation (non-blocking)
        try:
            task = process_resume_embeddings.delay(str(resume.id))
            logger.info(f"Queued embedding generation task: {task.id} for resume: {resume.id}")
        except Exception as e:
            # Don't fail the upload if the queue is temporarily unavailable
            logger.warning(f"Failed to queue embedding generation for resume {resume.id}: {e}")
        
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


@router.options("/upload/guest")
async def upload_resume_guest_options():
    """Handle CORS preflight for guest upload."""
    return {"detail": "OK"}

@router.post("/upload/guest", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(max_calls=3, window_minutes=1440)  # 3 uploads per day for guests
async def upload_resume_guest(
    request: Request,
    file: UploadFile = File(..., description="Resume file (PDF or DOCX, max 10MB)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and process a resume file as a guest user.
    
    - **file**: Resume file in PDF or DOCX format (max 10MB)
    - **X-Guest-Session-ID**: Optional header with guest session ID
    
    Guest users are limited to 3 uploads per day.
    The file will be processed asynchronously for text extraction.
    """
    try:
        # Get or create guest session
        session_id = await get_or_create_guest_session(request, db)
        logger.info(f"Guest session ID: {session_id}")
        
        # Check daily wish limit instead of separate upload limit
        try:
            can_upload, current_count = await check_guest_daily_wish_limit(session_id, db, max_wishes=3)
            logger.info(f"Wish check for upload: can_upload={can_upload}, current_count={current_count}")
            
            if not can_upload:
                logger.warning(f"Wish limit exceeded for session {session_id[:8]}: {current_count}/3")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Daily wish limit exceeded. You can make up to 3 wishes per day as a guest. Current count: {current_count}/3"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking wish limit: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error checking wish limit: {str(e)}"
            )
        
        logger.info(f"Guest resume upload initiated. Session: {session_id[:8]}...")
        
        # Check if guest user already exists for this session
        guest_email = f"guest_{session_id[:8]}@temporary.com"
        
        result = await db.execute(select(User).where(User.email == guest_email))
        guest_user = result.scalar_one_or_none()
        
        if not guest_user:
            # Create a new temporary guest user for file processing
            guest_user_id = uuid.uuid4()
            # Use a random password to satisfy NOT NULL constraint and hash it
            temp_password = secrets.token_urlsafe(16)
            guest_user = User(
                id=guest_user_id,
                email=guest_email,
                hashed_password=hash_password(temp_password)
            )
            
            # Add guest user to database session (required for foreign key constraint)
            db.add(guest_user)
            await db.flush()  # Flush to get the ID without committing
        
        # Process the resume file
        resume = await file_service.process_resume_file(file, guest_user, db)
        
        # Increment guest wish count (upload counts as a wish)
        await increment_guest_wish_count(session_id, db)
        
        # Queue background task for embedding generation (optional for guests, non-blocking)
        try:
            task = process_resume_embeddings.delay(str(resume.id))
            logger.info(f"Queued embedding generation task: {task.id} for guest resume: {resume.id}")
        except Exception as e:
            logger.warning(f"Failed to queue embedding generation for guest resume {resume.id}: {e}")
        
        # Create response with guest session ID
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
        
        logger.info(f"Guest resume uploaded successfully: {resume.id}")
        return response
        
    except FileValidationError as e:
        logger.warning(f"Guest file validation error: {e.detail}")
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    
    except FileStorageError as e:
        logger.error(f"Guest file storage error: {e.detail}")
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    
    except HTTPException as e:
        logger.error(f"Guest resume upload HTTPException: {e.detail}")
        raise e
    
    except Exception as e:
        logger.error(f"Guest resume upload error: {e}", exc_info=True)
        
        # Rollback the database session to clean up any partial changes
        try:
            await db.rollback()
        except Exception as rollback_error:
            logger.warning(f"Error during rollback: {rollback_error}")
        
        # Provide more specific error messages based on the exception type
        error_detail = "Resume upload failed"
        if "database" in str(e).lower() or "connection" in str(e).lower():
            error_detail = "Database connection error. Please try again later."
        elif "minio" in str(e).lower() or "s3" in str(e).lower():
            error_detail = "File storage error. Please try again later."
        elif "timeout" in str(e).lower():
            error_detail = "Upload timeout. Please try with a smaller file."
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
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
        logger.info(f"Delete resume request: {resume_id} by user: {current_user.email}")
        
        # Get resume
        resume = await db.get(Resume, resume_id)
        
        if not resume:
            logger.warning(f"Resume not found: {resume_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
        
        # Check ownership
        if resume.user_id != current_user.id:
            logger.warning(f"Access denied for resume {resume_id} by user {current_user.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Delete file from storage (non-blocking - continue even if file not found)
        file_deleted = False
        try:
            logger.info(f"Attempting to delete file from storage: {resume.file_path}")
            await file_service.delete_file_from_storage(resume.file_path)
            file_deleted = True
            logger.info(f"File deleted from storage: {resume.file_path}")
        except FileNotFoundError as e:
            logger.warning(f"File not found in storage (already deleted?): {resume.file_path} - {e}")
            file_deleted = True  # Consider it success if file doesn't exist
        except Exception as e:
            logger.error(f"Failed to delete file from storage: {resume.file_path} - {e}", exc_info=True)
            # Continue with database deletion even if file deletion fails
        
        # Delete resume record from database
        try:
            await db.delete(resume)
            await db.commit()
            logger.info(f"Resume record deleted from database: {resume_id}")
        except Exception as e:
            logger.error(f"Failed to delete resume from database: {e}", exc_info=True)
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete resume record: {str(e)}"
            )
        
        logger.info(f"Resume deleted successfully: {resume_id} by user: {current_user.email}")
        
        return {
            "message": "Resume deleted successfully",
            "file_deleted": file_deleted
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete resume error for {resume_id}: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete resume: {str(e)}"
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