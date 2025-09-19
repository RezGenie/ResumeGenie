from fastapi import APIRouter
from app.api.endpoints import auth, resumes, jobs, wishes

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["resumes"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(wishes.router, prefix="/wishes", tags=["daily wishes"])