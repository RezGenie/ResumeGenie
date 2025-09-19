from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
import json
import os

from app.core.database import get_db
from app.models.models import User, Resume
from app.schemas.resume import ResumeResponse
from app.api.endpoints.auth import get_current_user
from app.services.resume_parser import ResumeParser
from app.services.embeddings import EmbeddingService
from app.core.config import settings

router = APIRouter()


@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate file type
    if not file.filename.lower().endswith(('.pdf', '.docx', '.doc')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and Word documents are supported"
        )
    
    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large"
        )
    
    # Save file
    os.makedirs(settings.UPLOAD_PATH, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_PATH, f"{uuid.uuid4()}_{file.filename}")
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Parse resume
    parser = ResumeParser()
    parsed_content = parser.parse_file(file_path)
    
    # Generate embeddings
    embedding_service = EmbeddingService()
    embedding = await embedding_service.generate_embedding(parsed_content['content'])
    
    # Save to database
    resume = Resume(
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        content=parsed_content['content'],
        parsed_data=json.dumps(parsed_content['data']),
        embedding=embedding
    )
    
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    
    return resume


@router.get("/", response_model=List[ResumeResponse])
async def get_user_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id)
    )
    resumes = result.scalars().all()
    return resumes


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    return resume


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Delete file
    if os.path.exists(resume.file_path):
        os.remove(resume.file_path)
    
    await db.delete(resume)
    await db.commit()
    
    return {"message": "Resume deleted successfully"}