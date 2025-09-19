from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from datetime import date, datetime

from app.core.database import get_db
from app.models.models import User, DailyWish, WishUsage
from app.schemas.resume import DailyWishResponse, DailyWishRequest
from app.api.endpoints.auth import get_current_user
from app.services.genie_service import GenieService
from app.core.config import settings

router = APIRouter()


@router.post("/", response_model=DailyWishResponse)
async def request_daily_wish(
    wish_request: DailyWishRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today = date.today()
    
    # Check daily limit
    usage_result = await db.execute(
        select(WishUsage).where(
            and_(
                WishUsage.user_id == current_user.id,
                WishUsage.date == today
            )
        )
    )
    usage = usage_result.scalar_one_or_none()
    
    if usage and usage.wishes_used >= settings.DAILY_WISHES_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily wish limit of {settings.DAILY_WISHES_LIMIT} reached"
        )
    
    # Validate wish type
    valid_types = ['ats_tip', 'fit_summary', 'skills_advice']
    if wish_request.wish_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid wish type. Must be one of: {valid_types}"
        )
    
    # Generate wish content
    genie_service = GenieService()
    wish_content = await genie_service.generate_wish(wish_request.wish_type, current_user)
    
    # Create daily wish record
    daily_wish = DailyWish(
        user_id=current_user.id,
        wish_type=wish_request.wish_type,
        content=wish_content,
        date=today
    )
    
    db.add(daily_wish)
    
    # Update usage counter
    if usage:
        usage.wishes_used += 1
    else:
        usage = WishUsage(
            user_id=current_user.id,
            date=today,
            wishes_used=1
        )
        db.add(usage)
    
    await db.commit()
    await db.refresh(daily_wish)
    
    return daily_wish


@router.get("/", response_model=List[DailyWishResponse])
async def get_user_wishes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DailyWish)
        .where(DailyWish.user_id == current_user.id)
        .order_by(DailyWish.created_at.desc())
        .limit(30)  # Last 30 wishes
    )
    wishes = result.scalars().all()
    return wishes


@router.get("/today", response_model=List[DailyWishResponse])
async def get_today_wishes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today = date.today()
    result = await db.execute(
        select(DailyWish).where(
            and_(
                DailyWish.user_id == current_user.id,
                DailyWish.date == today
            )
        )
    )
    wishes = result.scalars().all()
    return wishes


@router.get("/usage")
async def get_daily_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today = date.today()
    result = await db.execute(
        select(WishUsage).where(
            and_(
                WishUsage.user_id == current_user.id,
                WishUsage.date == today
            )
        )
    )
    usage = result.scalar_one_or_none()
    
    wishes_used = usage.wishes_used if usage else 0
    remaining = max(0, settings.DAILY_WISHES_LIMIT - wishes_used)
    
    return {
        "wishes_used": wishes_used,
        "daily_limit": settings.DAILY_WISHES_LIMIT,
        "remaining": remaining,
        "date": today
    }