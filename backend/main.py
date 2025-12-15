from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import os
import json

from app.core.config import settings
from app.core import database as db
from app.api.v1 import api_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="RezGenie API",
    description="AI-powered resume optimization platform",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Configure CORS origins from environment variable or defaults
backend_cors_origins = os.getenv("BACKEND_CORS_ORIGINS")

if backend_cors_origins:
    # Parse JSON array from environment variable
    import json
    try:
        cors_origins = json.loads(backend_cors_origins)
    except json.JSONDecodeError:
        # Fallback if not valid JSON
        cors_origins = [backend_cors_origins]
elif settings.environment == "production":
    # Production default: Netlify frontend domain
    cors_origins = [
        "https://rezgenie.netlify.app",
    ]
else:
    # Development: Allow localhost
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
    ]

# Log CORS configuration
logger.info(f"CORS origins configured: {cors_origins}")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware for production
if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "rezgenie-api.onrender.com",  # Update with your Render domain
            "localhost",
            "localhost:8000",  # For local testing
            "127.0.0.1",
            "testserver",  # Allow TestClient host in tests
        ]
    )


# Add timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": "An unexpected error occurred" if settings.environment == "production" else str(exc)
        }
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    from app.core.database import get_db_health

    
    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {}
    }
    
    # Check database
    try:
        db_health = await get_db_health()
        health_status["services"]["database"] = {"status": "healthy", "details": db_health}
    except Exception as e:
        health_status["services"]["database"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"
    
    # Check OpenAI service
    try:
        if settings.openai_api_key:
            health_status["services"]["openai"] = {"status": "configured"}
        else:
            health_status["services"]["openai"] = {"status": "not_configured", "warning": "API key not set"}
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["openai"] = {"status": "error", "error": str(e)}
        health_status["status"] = "degraded"
    
    return health_status


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to RezGenie API",
        "version": "1.0.0",
        "docs": "/docs" if settings.debug else "Documentation not available in production",
        "health": "/health"
    }


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database and other services on startup."""
    logger.info("Starting RezGenie API...")
    try:
        await db.init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    logger.info("Shutting down RezGenie API...")
    try:
        await db.close_db()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


# Include API routers
app.include_router(api_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level
    )