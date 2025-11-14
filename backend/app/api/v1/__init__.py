"""
Main API Router
Combines all API endpoint routers for the application.
"""

from fastapi import APIRouter

from app.api.v1 import auth, resumes, jobs, job_analytics, genie, reports, subscriptions

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

api_router.include_router(
    resumes.router,
    prefix="/resumes",
    tags=["Resume Management"]
)

api_router.include_router(
    jobs.router,
    prefix="/jobs",
    tags=["Job Analysis"]
)

api_router.include_router(
    job_analytics.router,
    prefix="/jobs",
    tags=["Job Analytics"]
)

api_router.include_router(
    genie.router,
    prefix="/genie",
    tags=["AI Genie Wishes"]
)

api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["Reports & Analytics"]
)

api_router.include_router(
    subscriptions.router,
    prefix="/subscriptions",
    tags=["Subscriptions"]
)


@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "RezGenie API",
        "version": "1.0.0"
    }