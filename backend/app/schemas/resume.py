from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid


class ResumeUpload(BaseModel):
    filename: str


class ResumeResponse(BaseModel):
    id: uuid.UUID
    filename: str
    content: str
    parsed_data: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class JobDescriptionCreate(BaseModel):
    title: str
    company: str
    content: str
    requirements: Optional[str] = None


class JobDescriptionResponse(BaseModel):
    id: uuid.UUID
    title: str
    company: str
    content: str
    requirements: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class JobApplicationAnalysis(BaseModel):
    resume_id: uuid.UUID
    job_description_id: uuid.UUID


class JobApplicationResponse(BaseModel):
    id: uuid.UUID
    fit_score: Optional[float] = None
    missing_skills: Optional[List[str]] = None
    matching_skills: Optional[List[str]] = None
    ai_feedback: Optional[str] = None
    status: str
    created_at: datetime
    resume: ResumeResponse
    job_description: JobDescriptionResponse

    class Config:
        from_attributes = True


class DailyWishResponse(BaseModel):
    id: uuid.UUID
    wish_type: str
    content: str
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class DailyWishRequest(BaseModel):
    wish_type: str  # ats_tip, fit_summary, skills_advice