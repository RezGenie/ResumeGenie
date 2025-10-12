"""
Genie Wishes API Endpoints
Handles AI-powered resume improvement suggestions and wishes management.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from pydantic import BaseModel, Field
import logging
from datetime import date, datetime
import json

from app.core.database import get_db
from app.core.security import get_current_user, rate_limit
from app.models.user import User
from app.models.genie_wish import GenieWish, DailyWishCount
from app.models.resume import Resume
from app.services.openai_service import openai_service

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class WishRequest(BaseModel):
    wish_type: str = Field(..., description="Type of wish: 'improvement', 'career_advice', 'skill_gap', 'interview_prep'")
    # Allow longer inputs (full job postings). Keep a sane cap to avoid abuse.
    wish_text: str = Field(
        ..., min_length=10, max_length=10000,
        description="Detailed wish description or full job posting (up to 10k characters)"
    )
    context_data: Optional[Dict[str, Any]] = Field(None, description="Additional context (resume_id, job_title, etc.)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "wish_type": "improvement", 
                "wish_text": "I want to improve my Python skills section to better match senior developer roles",
                "context_data": {
                    "resume_id": "123e4567-e89b-12d3-a456-426614174000",
                    "target_role": "Senior Python Developer"
                }
            }
        }


class GenieWishResponse(BaseModel):
    id: str
    wish_type: str
    wish_text: str
    context_data: Optional[Dict[str, Any]]
    is_processed: bool
    processing_status: str
    processing_error: Optional[str]
    created_at: str
    processed_at: Optional[str]
    
    class Config:
        from_attributes = True


class GenieWishDetailResponse(GenieWishResponse):
    ai_response: Optional[str]
    recommendations: Optional[List[str]]
    action_items: Optional[List[str]]
    resources: Optional[List[Dict[str, str]]]
    confidence_score: Optional[float]


class DailyUsageResponse(BaseModel):
    date: str
    wishes_used: int
    wishes_remaining: int
    daily_limit: int
    reset_time: str


@router.post("/", response_model=GenieWishResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(max_calls=50, window_minutes=60)  # 50 wishes per hour
async def create_wish(
    request: Request,
    wish_request: WishRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new genie wish for AI-powered recommendations.
    
    - **wish_type**: Type of assistance needed
    - **wish_text**: Detailed description of what you want help with
    - **context_data**: Optional additional context
    
    Daily limits apply based on user tier:
    - Free tier: 5 wishes per day
    - Premium tier: 50 wishes per day
    """
    try:
        logger.info(f"Genie wish creation initiated by user: {current_user.email}")
        
        # Check daily limits
        await _check_daily_limits(current_user, db)
        
        # Validate wish type
        valid_wish_types = ["improvement", "career_advice", "skill_gap", "interview_prep"]
        if wish_request.wish_type not in valid_wish_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid wish type. Must be one of: {', '.join(valid_wish_types)}"
            )
        
        # Create initial wish record (processing)
        genie_wish = GenieWish(
            user_id=current_user.id,
            wish_type=wish_request.wish_type,
            request_text=wish_request.wish_text,
            status="processing",
        )
        db.add(genie_wish)
        await db.commit()
        await db.refresh(genie_wish)

        # Generate AI response synchronously (no Celery dependency)
        resume_context = ""
        try:
            ctx = wish_request.context_data or {}
            resume_id = ctx.get("resume_id") if isinstance(ctx, dict) else None
            if resume_id:
                resume = await db.get(Resume, resume_id)
                if resume and resume.extracted_text:
                    resume_context = f"\n\nRESUME CONTEXT:\n{resume.extracted_text[:2000]}"
        except Exception as e:
            logger.warning(f"Wish context processing warning: {e}")

        # Craft prompts
        system_prompt = (
            "You are an expert career coach and resume specialist. Provide actionable, specific recommendations."
        )
        user_prompt = f"""
REQUEST: {wish_request.wish_text}
{resume_context}

Provide JSON with keys: 
- response: Brief analysis summary
- recommendations: List of specific actionable recommendations (sentences)
- action_items: List of specific skills that should be added or emphasized (short skill names like "Python", "Leadership", "Excel VBA", "Communication", "AWS", "Project Management")
- resources: List of objects with title, url, description
- confidence_score: Number between 0-1

Focus on making action_items a clean list of specific skill names (both technical and soft skills) that would improve the resume's match to this job posting.
"""

        # Call OpenAI
        ai_raw = await openai_service.get_chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=1200,
        )

        try:
            ai_struct = json.loads(ai_raw)
        except json.JSONDecodeError:
            logger.warning("AI response not JSON, wrapping into structure")
            ai_struct = {
                "response": ai_raw[:500],
                "recommendations": [],
                "action_items": [],
                "resources": [],
                "confidence_score": 0.8,
            }

        # Persist results into response_text and mark completed
        genie_wish.response_text = json.dumps(ai_struct)
        genie_wish.status = "completed"
        genie_wish.completed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(genie_wish)

        # Update daily count
        await _update_daily_count(current_user, db)

        response = GenieWishResponse(
            id=str(genie_wish.id),
            wish_type=genie_wish.wish_type,
            wish_text=wish_request.wish_text,
            context_data=wish_request.context_data,
            is_processed=True,
            processing_status=genie_wish.status,
            processing_error=None,
            created_at=genie_wish.created_at.isoformat(),
            processed_at=genie_wish.completed_at.isoformat() if genie_wish.completed_at else None,
        )

        logger.info(f"Genie wish processed successfully: {genie_wish.id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Genie wish creation error: {e}")
        # Mark wish as failed if it was created already
        try:
            if 'genie_wish' in locals() and getattr(genie_wish, 'id', None):
                genie_wish.status = "failed"
                genie_wish.error_message = str(e)
                await db.commit()
        except Exception as inner:
            logger.warning(f"Failed to update wish error state: {inner}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI service unavailable or model access denied. Please try again later or contact support."
        )


@router.get("/", response_model=List[GenieWishResponse])
async def list_wishes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    wish_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """
    List user's genie wishes with optional filtering.
    
    - **wish_type**: Optional filter by wish type
    - **skip**: Number of wishes to skip (default: 0)
    - **limit**: Maximum number of wishes to return (default: 20, max: 100)
    """
    try:
        # Validate limit
        limit = min(limit, 100)
        
        # Build query
        query = select(GenieWish).where(GenieWish.user_id == current_user.id)
        
        if wish_type:
            query = query.where(GenieWish.wish_type == wish_type)
        
        query = query.order_by(desc(GenieWish.created_at)).offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        wishes = result.scalars().all()
        
        # Create response list
        wish_list = []
        for wish in wishes:
            # Parse stored AI results for consistency (optional)
            is_done = (wish.status or "") == "completed"
            wish_response = GenieWishResponse(
                id=str(wish.id),
                wish_type=wish.wish_type,
                wish_text=wish.request_text or "",
                context_data=None,
                is_processed=is_done,
                processing_status=wish.status or "pending",
                processing_error=wish.error_message,
                created_at=wish.created_at.isoformat(),
                processed_at=wish.completed_at.isoformat() if wish.completed_at else None
            )
            wish_list.append(wish_response)
        
        return wish_list
        
    except Exception as e:
        logger.error(f"List wishes error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve wishes"
        )


@router.get("/{wish_id}", response_model=GenieWishDetailResponse)
async def get_wish(
    wish_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific genie wish.
    
    - **wish_id**: UUID of the genie wish
    
    Returns detailed wish information including AI recommendations.
    """
    try:
        # Get wish
        wish = await db.get(GenieWish, wish_id)
        
        if not wish:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Genie wish not found"
            )
        
        # Check ownership
        if wish.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Parse stored AI results
        ai_response = {}
        try:
            ai_response = json.loads(wish.response_text or "{}")
        except json.JSONDecodeError:
            ai_response = {}

        # Create detailed response (map model fields)
        response = GenieWishDetailResponse(
            id=str(wish.id),
            wish_type=wish.wish_type,
            wish_text=wish.request_text or "",
            context_data=None,
            is_processed=wish.status == "completed",
            processing_status=wish.status or "pending",
            processing_error=wish.error_message,
            created_at=wish.created_at.isoformat(),
            processed_at=wish.completed_at.isoformat() if wish.completed_at else None,
            ai_response=ai_response.get("response"),
            recommendations=ai_response.get("recommendations"),
            action_items=ai_response.get("action_items"),
            resources=ai_response.get("resources"),
            confidence_score=ai_response.get("confidence_score"),
        )
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get wish error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve wish"
        )


@router.get("/usage/daily", response_model=DailyUsageResponse)
async def get_daily_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current daily usage statistics for genie wishes.
    
    Returns information about wishes used today and remaining quota.
    """
    try:
        today = date.today()
        
        # Get or create daily count record
        result = await db.execute(
            select(DailyWishCount).where(
                and_(
                    DailyWishCount.user_id == current_user.id,
                    DailyWishCount.date == today
                )
            )
        )
        
        daily_count = result.scalar_one_or_none()
        
        if not daily_count:
            daily_count = DailyWishCount(
                user_id=current_user.id,
                date=today,
                wish_count=0
            )
        
        # Determine daily limit based on user tier (fallback to non-premium)
        daily_limit = 50 if getattr(current_user, "is_premium", False) else 10
        wishes_used = daily_count.wish_count
        wishes_remaining = max(0, daily_limit - wishes_used)
        
        # Calculate reset time (next midnight UTC)
        from datetime import datetime, timezone, timedelta
        tomorrow = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        
        response = DailyUsageResponse(
            date=today.isoformat(),
            wishes_used=wishes_used,
            wishes_remaining=wishes_remaining,
            daily_limit=daily_limit,
            reset_time=tomorrow.isoformat()
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Get daily usage error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage statistics"
        )


@router.delete("/{wish_id}", status_code=status.HTTP_200_OK)
async def delete_wish(
    wish_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a genie wish.
    
    - **wish_id**: UUID of the genie wish
    
    This action cannot be undone.
    """
    try:
        # Get wish
        wish = await db.get(GenieWish, wish_id)
        
        if not wish:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Genie wish not found"
            )
        
        # Check ownership
        if wish.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Delete wish record
        await db.delete(wish)
        await db.commit()
        
        logger.info(f"Genie wish deleted: {wish_id} by user: {current_user.email}")
        
        return {"message": "Genie wish deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete wish error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete wish"
        )


async def _check_daily_limits(user: User, db: AsyncSession) -> None:
    """Check if user has exceeded daily wish limits."""
    today = date.today()
    
    # Get today's count
    result = await db.execute(
        select(DailyWishCount).where(
            and_(
                DailyWishCount.user_id == user.id,
                DailyWishCount.date == today
            )
        )
    )
    
    daily_count = result.scalar_one_or_none()
    current_count = daily_count.wish_count if daily_count else 0
    
    # Determine limit based on user tier (fallback to non-premium)
    daily_limit = 50 if getattr(user, "is_premium", False) else 10
    
    if current_count >= daily_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily wish limit exceeded ({daily_limit} wishes per day)"
        )


async def _update_daily_count(user: User, db: AsyncSession) -> None:
    """Update daily wish count for user."""
    today = date.today()
    
    # Get or create daily count record
    result = await db.execute(
        select(DailyWishCount).where(
            and_(
                DailyWishCount.user_id == user.id,
                DailyWishCount.date == today
            )
        )
    )
    
    daily_count = result.scalar_one_or_none()
    
    if daily_count:
        daily_count.wish_count += 1
    else:
        daily_count = DailyWishCount(
            user_id=user.id,
            date=today,
            wish_count=1
        )
        db.add(daily_count)
    
    await db.commit()