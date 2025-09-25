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
from datetime import date

from app.core.database import get_db
from app.core.security import get_current_user, rate_limit
from app.models.user import User
from app.models.genie_wish import GenieWish, DailyWishCount
from app.celery.tasks.genie_processing import generate_wish_recommendations

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class WishRequest(BaseModel):
    wish_type: str = Field(..., description="Type of wish: 'improvement', 'career_advice', 'skill_gap', 'interview_prep'")
    wish_text: str = Field(..., min_length=10, max_length=500, description="Detailed wish description")
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
        
        # Create genie wish record
        genie_wish = GenieWish(
            user_id=current_user.id,
            wish_type=wish_request.wish_type,
            wish_text=wish_request.wish_text,
            context_data=wish_request.context_data or {},
            processing_status="processing"
        )
        
        db.add(genie_wish)
        await db.commit()
        await db.refresh(genie_wish)
        
        # Update daily count
        await _update_daily_count(current_user, db)
        
        # Queue background processing
        task = generate_wish_recommendations.delay(str(genie_wish.id))
        logger.info(f"Queued wish processing task: {task.id} for wish: {genie_wish.id}")
        
        # Create response
        response = GenieWishResponse(
            id=str(genie_wish.id),
            wish_type=genie_wish.wish_type,
            wish_text=genie_wish.wish_text,
            context_data=genie_wish.context_data,
            is_processed=genie_wish.is_processed,
            processing_status=genie_wish.processing_status,
            processing_error=genie_wish.processing_error,
            created_at=genie_wish.created_at.isoformat(),
            processed_at=genie_wish.processed_at.isoformat() if genie_wish.processed_at else None
        )
        
        logger.info(f"Genie wish created successfully: {genie_wish.id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Genie wish creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create genie wish"
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
            wish_response = GenieWishResponse(
                id=str(wish.id),
                wish_type=wish.wish_type,
                wish_text=wish.wish_text,
                context_data=wish.context_data,
                is_processed=wish.is_processed,
                processing_status=wish.processing_status,
                processing_error=wish.processing_error,
                created_at=wish.created_at.isoformat(),
                processed_at=wish.processed_at.isoformat() if wish.processed_at else None
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
        
        # Create detailed response
        response = GenieWishDetailResponse(
            id=str(wish.id),
            wish_type=wish.wish_type,
            wish_text=wish.wish_text,
            context_data=wish.context_data,
            is_processed=wish.is_processed,
            processing_status=wish.processing_status,
            processing_error=wish.processing_error,
            created_at=wish.created_at.isoformat(),
            processed_at=wish.processed_at.isoformat() if wish.processed_at else None,
            ai_response=wish.ai_response,
            recommendations=wish.recommendations,
            action_items=wish.action_items,
            resources=wish.resources,
            confidence_score=wish.confidence_score
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
        
        # Determine daily limit based on user tier
        daily_limit = 50 if current_user.is_premium else 5
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
    
    # Determine limit based on user tier
    daily_limit = 50 if user.is_premium else 5
    
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