"""
Genie Wishes API Endpoints
Handles AI-powered resume improvement suggestions and wishes management.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, text
from pydantic import BaseModel, Field
import logging
from datetime import date, datetime
import json

from app.core.database import get_db
from app.core.security import get_current_user, rate_limit, hash_password
from app.core.deps import get_or_create_guest_session, check_guest_daily_wish_limit, increment_guest_wish_count, generate_guest_session_id
from app.models.user import User
from app.models.genie_wish import GenieWish, DailyWishCount
from app.models.resume import Resume
from app.services.openai_service import openai_service
from app.services.interview_questions_service import generate_interview_questions

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
    job_match_score: Optional[float]
    overall_score: Optional[float]
    score_breakdown: Optional[Dict[str, Any]]
    company_name: Optional[str]
    position_title: Optional[str]


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
        # Extract company_name and position_title from context_data if provided
        ctx = wish_request.context_data or {}
        company_name = ctx.get("company_name") if isinstance(ctx, dict) else None
        position_title = ctx.get("position_title") if isinstance(ctx, dict) else None
        
        genie_wish = GenieWish(
            user_id=current_user.id,
            wish_type=wish_request.wish_type,
            request_text=wish_request.wish_text,
            company_name=company_name,
            position_title=position_title,
            status="processing",
        )
        db.add(genie_wish)
        await db.commit()
        await db.refresh(genie_wish)

        # Generate AI response synchronously (no Celery dependency)
        resume_context = ""
        resume_text_only = ""
        try:
            # First check if resume_text is provided directly (for local resumes)
            if isinstance(ctx, dict) and ctx.get("resume_text"):
                resume_text_only = ctx.get("resume_text")[:4000]
                resume_context = f"\n\nRESUME CONTEXT:\n{ctx.get('resume_text')[:2000]}"
                logger.info(f"Resume text provided directly: {len(resume_text_only)} characters")
            else:
                # Otherwise try to get from resume_id (for backend resumes)
                resume_id = ctx.get("resume_id") if isinstance(ctx, dict) else None
                logger.info(f"Extracting resume context for resume_id: {resume_id}")
                if resume_id:
                    resume = await db.get(Resume, resume_id)
                    if resume and resume.extracted_text:
                        resume_text_only = resume.extracted_text[:4000]  # Get more text for scoring
                        resume_context = f"\n\nRESUME CONTEXT:\n{resume.extracted_text[:2000]}"
                        logger.info(f"Resume text extracted from DB: {len(resume_text_only)} characters")
                    else:
                        logger.warning(f"Resume {resume_id} not found or has no extracted text")
                else:
                    logger.warning("No resume_id or resume_text provided in context_data")
        except Exception as e:
            logger.warning(f"Wish context processing warning: {e}")

        # Craft prompts
        system_prompt = (
            "You are RezGenie, a mystical career genie with centuries of wisdom about resumes and careers! 🧞‍♂️ "
            "You speak with the magical authority of someone who has guided countless professionals to their dream jobs. "
            "You're friendly but wise, enthusiastic but professional. Start your analysis with a magical overview "
            "that sets the stage, then provide your detailed insights. Use phrases like 'I divine that...', "
            "'The career stars align to show...', 'My magical analysis reveals...', but keep it professional and helpful."
        )
        user_prompt = f"""
REQUEST: {wish_request.wish_text}
{resume_context}

Provide JSON with keys: 
- response: Brief analysis summary
- recommendations: List of specific actionable recommendations (sentences)
- action_items: List of specific skills that should be added or emphasized (short skill names like "Python", "Leadership", "Excel VBA", "Communication", "AWS", "Project Management")
- resources: List of objects with title, url, description
- confidence_score: Number between 0-1 (overall analysis confidence)
- job_match_score: Number between 0-1 (how well the resume matches the job requirements if job description provided, or resume quality score if general analysis)

Focus on making action_items a clean list of specific skill names that would improve the resume's match to this job posting.
"""

        # Call OpenAI with smart fallback
        try:
            ai_raw = await openai_service.get_chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=1200,
            )
            
        except Exception as openai_error:
            logger.error(f"OpenAI service error: {openai_error}")
            
            # Check if it's a quota issue - provide smart fallback
            if "insufficient_quota" in str(openai_error).lower() or "exceeded your current quota" in str(openai_error).lower():
                logger.info("OpenAI quota exceeded, providing intelligent fallback response")
                
                # Generate intelligent fallback response with genie personality
                ai_raw = """{
                    "response": "🧞‍♂️ My mystical analysis reveals that while our primary divination channels are experiencing high demand, I can still provide you with wise career guidance! The career stars align to show this appears to be a role requiring strong skills and professional experience. Fear not, for my backup wisdom is still quite powerful!",
                    "recommendations": [
                        "I divine that you should tailor your resume to include keywords from the job posting - this magical technique increases your visibility to hiring managers",
                        "The career stars align to show that quantifying your achievements with specific metrics and numbers creates powerful impact on recruiters",
                        "My magical analysis reveals you should highlight relevant skills prominently in a dedicated section for maximum effect",
                        "I divine that including skills that match the role requirements will demonstrate your cultural fit",
                        "The mystical career patterns show that your experience section should demonstrate clear progression and growth over time",
                        "My wisdom suggests you should customize your professional summary to mirror the job's key requirements",
                        "The career stars reveal that using action verbs and power words will make your accomplishments shine brighter"
                    ],
                    "action_items": ["Python", "JavaScript", "SQL", "Leadership", "Communication", "Project Management", "Problem Solving", "Team Collaboration", "Data Analysis", "Critical Thinking"],
                    "resources": [
                        {
                            "title": "Resume Keywords Mastery Guide",
                            "url": "https://www.indeed.com/career-advice/resumes-cover-letters/resume-keywords",
                            "description": "Learn the ancient art of optimizing your resume with powerful keywords that recruiters seek"
                        },
                        {
                            "title": "Quantifying Achievements Like a Pro",
                            "url": "https://www.glassdoor.com/blog/quantify-accomplishments-resume/",
                            "description": "Discover how to transform your experiences into impressive, measurable achievements"
                        }
                    ],
                    "confidence_score": 0.78,
                    "job_match_score": 0.75
                }"""
            else:
                # For other errors, mark as failed
                genie_wish.status = "failed"
                genie_wish.error_message = f"AI service error: {str(openai_error)}"
                await db.commit()
                
                # Provide user-friendly error message
                if "rate_limit" in str(openai_error).lower():
                    detail = "AI service is currently busy. Please try again in a few minutes."
                else:
                    detail = "AI service temporarily unavailable. Please try again later."
                
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=detail
                )

        # Parse AI response - handle markdown code blocks
        try:
            # Strip markdown code blocks if present
            cleaned_response = ai_raw.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]  # Remove ```json
            elif cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]  # Remove ```
            
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]  # Remove trailing ```
            
            cleaned_response = cleaned_response.strip()
            ai_struct = json.loads(cleaned_response)
            logger.info(f"Successfully parsed AI response with {len(ai_struct.get('recommendations', []))} recommendations")
        except json.JSONDecodeError as e:
            logger.warning(f"AI response not valid JSON: {e}. Raw response: {ai_raw[:200]}...")
            ai_struct = {
                "response": ai_raw[:500],
                "recommendations": [],
                "action_items": [],
                "resources": [],
                "confidence_score": 0.8,
                "job_match_score": 0.7,
            }

        # Store results in both response_text (for backward compatibility) and new detailed fields
        try:
            # Log what we're about to save
            logger.info(f"Saving wish data: recommendations={len(ai_struct.get('recommendations', []))}, action_items={len(ai_struct.get('action_items', []))}")
            logger.info(f"AI struct keys: {ai_struct.keys()}")
            
            genie_wish.response_text = json.dumps(ai_struct)
            genie_wish.ai_response = ai_struct.get("response", "")
            genie_wish.recommendations = ai_struct.get("recommendations", [])
            genie_wish.action_items = ai_struct.get("action_items", [])
            genie_wish.resources = ai_struct.get("resources", [])
            genie_wish.confidence_score = ai_struct.get("confidence_score", 0.8)
            genie_wish.job_match_score = ai_struct.get("job_match_score", 0.7)
            
            # Generate comprehensive score
            try:
                logger.info(f"Generating comprehensive resume score... Resume text length: {len(resume_text_only)}")
                comprehensive_score_data = await openai_service.generate_comprehensive_score(
                    resume_text=resume_text_only if resume_text_only else "No resume provided",
                    job_description=wish_request.wish_text,  # The wish text is the job description
                    similarity_score=genie_wish.job_match_score
                )
                genie_wish.overall_score = comprehensive_score_data["overall_score"]
                genie_wish.score_breakdown = comprehensive_score_data["score_breakdown"]
                logger.info(f"Comprehensive score generated: {genie_wish.overall_score}")
            except Exception as score_error:
                logger.warning(f"Failed to generate comprehensive score: {score_error}. Using defaults.")
                genie_wish.overall_score = 75.0
                genie_wish.score_breakdown = {
                    "style_formatting": {"score": 75, "feedback": "Unable to evaluate", "weight": 0.20},
                    "grammar_spelling": {"score": 75, "feedback": "Unable to evaluate", "weight": 0.20},
                    "job_match": {"score": 75, "feedback": "Unable to evaluate", "weight": 0.30},
                    "ats_compatibility": {"score": 75, "feedback": "Unable to evaluate", "weight": 0.15},
                    "content_quality": {"score": 75, "feedback": "Unable to evaluate", "weight": 0.15}
                }
            
            genie_wish.is_processed = True
            genie_wish.processing_status = "completed"
            genie_wish.processed_at = datetime.utcnow()
            genie_wish.status = "completed"
            genie_wish.completed_at = datetime.utcnow()
            
            # Log what was actually set
            logger.info(f"Set on object: recommendations={len(genie_wish.recommendations or [])}, action_items={len(genie_wish.action_items or [])}")
        except Exception as field_error:
            logger.error(f"Error assigning genie wish fields: {field_error}")
            raise
        
        # Commit the changes - SQLAlchemy handles JSON serialization automatically
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


@router.get("/", response_model=List[GenieWishDetailResponse])
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
    
    For completed wishes, includes full AI analysis details.
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
        
        # Create response list with full details for completed wishes
        wish_list = []
        for wish in wishes:
            # Parse stored AI results - use new fields first, fallback to response_text
            ai_response_text = wish.ai_response
            recommendations = wish.recommendations
            action_items = wish.action_items
            resources = wish.resources
            confidence_score = wish.confidence_score
            job_match_score = wish.job_match_score
            
            # Parse JSON fields if they come as strings
            if isinstance(recommendations, str):
                try:
                    recommendations = json.loads(recommendations)
                except (json.JSONDecodeError, TypeError):
                    recommendations = []
            
            if isinstance(action_items, str):
                try:
                    action_items = json.loads(action_items)
                except (json.JSONDecodeError, TypeError):
                    action_items = []
            
            if isinstance(resources, str):
                try:
                    resources = json.loads(resources)
                except (json.JSONDecodeError, TypeError):
                    resources = []
            
            # Fallback to parsing response_text if new fields are empty
            if not ai_response_text and wish.response_text:
                try:
                    parsed_response = json.loads(wish.response_text)
                    ai_response_text = ai_response_text or parsed_response.get("response", "")
                    recommendations = recommendations or parsed_response.get("recommendations", [])
                    action_items = action_items or parsed_response.get("action_items", [])
                    resources = resources or parsed_response.get("resources", [])
                    confidence_score = confidence_score or parsed_response.get("confidence_score", 0.8)
                    job_match_score = job_match_score or parsed_response.get("job_match_score", 0.7)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse response_text for wish {wish.id}")
            
            is_done = (wish.status or "") == "completed"
            wish_response = GenieWishDetailResponse(
                id=str(wish.id),
                wish_type=wish.wish_type,
                wish_text=wish.request_text or "",
                context_data=None,
                is_processed=is_done,
                processing_status=wish.status or "pending",
                processing_error=wish.error_message,
                created_at=wish.created_at.isoformat(),
                processed_at=wish.completed_at.isoformat() if wish.completed_at else None,
                ai_response=ai_response_text if is_done else None,
                recommendations=recommendations if is_done else None,
                action_items=action_items if is_done else None,
                resources=resources if is_done else None,
                confidence_score=confidence_score if is_done else None,
                job_match_score=job_match_score if is_done else None,
                overall_score=wish.overall_score if is_done else None,
                score_breakdown=wish.score_breakdown if is_done else None,
                company_name=wish.company_name,
                position_title=wish.position_title,
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
        
        # Parse stored AI results - use new fields first, fallback to response_text
        ai_response_text = wish.ai_response
        recommendations = wish.recommendations
        action_items = wish.action_items
        resources = wish.resources
        confidence_score = wish.confidence_score
        job_match_score = wish.job_match_score
        
        # Parse JSON fields if they come as strings (shouldn't happen with proper JSONB, but handle it)
        if isinstance(recommendations, str):
            try:
                recommendations = json.loads(recommendations)
            except (json.JSONDecodeError, TypeError):
                recommendations = []
        
        if isinstance(action_items, str):
            try:
                action_items = json.loads(action_items)
            except (json.JSONDecodeError, TypeError):
                action_items = []
        
        if isinstance(resources, str):
            try:
                resources = json.loads(resources)
            except (json.JSONDecodeError, TypeError):
                resources = []
        
        logger.info(f"Retrieved wish data: ai_response={len(ai_response_text or '')}, recommendations={len(recommendations or [])}, action_items={len(action_items or [])}, confidence_score={confidence_score}, job_match_score={job_match_score}")
        
        # Fallback to parsing response_text if new fields are empty
        if not ai_response_text and wish.response_text:
            try:
                parsed_response = json.loads(wish.response_text)
                ai_response_text = ai_response_text or parsed_response.get("response", "")
                recommendations = recommendations or parsed_response.get("recommendations", [])
                action_items = action_items or parsed_response.get("action_items", [])
                resources = resources or parsed_response.get("resources", [])
                confidence_score = confidence_score or parsed_response.get("confidence_score", 0.8)
                job_match_score = job_match_score or parsed_response.get("job_match_score", 0.7)
                logger.info(f"Fallback to response_text: ai_response={len(ai_response_text or '')}, recommendations={len(recommendations or [])}, action_items={len(action_items or [])}")
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse response_text for wish {wish_id}")

        # Create detailed response (map model fields)
        response = GenieWishDetailResponse(
            id=str(wish.id),
            wish_type=wish.wish_type,
            wish_text=wish.request_text or "",
            context_data=None,
            is_processed=wish.is_processed or wish.status == "completed",
            processing_status=wish.processing_status or wish.status or "pending",
            processing_error=wish.processing_error or wish.error_message,
            created_at=wish.created_at.isoformat(),
            processed_at=wish.processed_at.isoformat() if wish.processed_at else (wish.completed_at.isoformat() if wish.completed_at else None),
            ai_response=ai_response_text,
            recommendations=recommendations,
            action_items=action_items,
            resources=resources,
            confidence_score=confidence_score,
            job_match_score=job_match_score,
            overall_score=wish.overall_score,
            score_breakdown=wish.score_breakdown,
            company_name=wish.company_name,
            position_title=wish.position_title,
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
        
        # Determine daily limit based on user tier and role
        if current_user.role == "admin":
            daily_limit = -1  # Unlimited for admins
        elif getattr(current_user, "is_premium", False):
            daily_limit = -1  # Unlimited for premium users (for now)
        else:
            daily_limit = 10  # Regular members get 10 wishes per day
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
    
    # Determine limit based on user tier and role
    if user.role == "admin":
        daily_limit = -1  # Unlimited for admins
    elif getattr(user, "is_premium", False):
        daily_limit = -1  # Unlimited for premium users (for now)
    else:
        daily_limit = 10  # Regular members get 10 wishes per day
    
    if daily_limit != -1 and current_count >= daily_limit:
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


# GUEST ENDPOINTS

@router.get("/guest", response_model=List[GenieWishDetailResponse])
async def list_guest_wishes(
    request: Request,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20
):
    """
    List genie wishes for guest users.
    Only returns wishes created by the same guest session.
    
    - **skip**: Number of wishes to skip (default: 0)
    - **limit**: Maximum number of wishes to return (default: 20, max: 100)
    """
    try:
        # Validate limit
        limit = min(limit, 100)
        
        # Get guest session ID from request
        session_id = await get_or_create_guest_session(request, db)
        
        # Get guest user for this session
        guest_email = f"guest_{session_id[:8]}@temporary.com"
        result = await db.execute(select(User).where(User.email == guest_email))
        guest_user = result.scalar_one_or_none()
        
        if not guest_user:
            # No guest user means no wishes yet
            return []
        
        # Build query to get wishes for this guest user
        query = select(GenieWish).where(GenieWish.user_id == guest_user.id)
        query = query.order_by(desc(GenieWish.created_at)).offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        wishes = result.scalars().all()
        
        # Create response list with full details
        wish_list = []
        for wish in wishes:
            # Parse stored AI results - use new fields first, fallback to response_text
            ai_response_text = wish.ai_response
            recommendations = wish.recommendations
            action_items = wish.action_items
            resources = wish.resources
            confidence_score = wish.confidence_score
            job_match_score = wish.job_match_score
            
            # Parse JSON fields if they come as strings
            if isinstance(recommendations, str):
                try:
                    recommendations = json.loads(recommendations)
                except (json.JSONDecodeError, TypeError):
                    recommendations = []
            
            if isinstance(action_items, str):
                try:
                    action_items = json.loads(action_items)
                except (json.JSONDecodeError, TypeError):
                    action_items = []
            
            if isinstance(resources, str):
                try:
                    resources = json.loads(resources)
                except (json.JSONDecodeError, TypeError):
                    resources = []
            
            # Fallback to parsing response_text if new fields are empty
            if not ai_response_text and wish.response_text:
                try:
                    parsed_response = json.loads(wish.response_text)
                    ai_response_text = ai_response_text or parsed_response.get("response", "")
                    recommendations = recommendations or parsed_response.get("recommendations", [])
                    action_items = action_items or parsed_response.get("action_items", [])
                    resources = resources or parsed_response.get("resources", [])
                    confidence_score = confidence_score or parsed_response.get("confidence_score", 0.8)
                    job_match_score = job_match_score or parsed_response.get("job_match_score", 0.7)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse response_text for guest wish {wish.id}")
            
            wish_list.append(
                GenieWishDetailResponse(
                    id=str(wish.id),
                    wish_type=wish.wish_type,
                    wish_text=wish.request_text or "",
                    context_data=None,
                    is_processed=wish.is_processed or wish.status == "completed",
                    processing_status=wish.processing_status or wish.status or "pending",
                    processing_error=wish.processing_error or wish.error_message,
                    created_at=wish.created_at.isoformat(),
                    processed_at=wish.processed_at.isoformat() if wish.processed_at else (wish.completed_at.isoformat() if wish.completed_at else None),
                    ai_response=ai_response_text,
                    recommendations=recommendations,
                    action_items=action_items,
                    resources=resources,
                    confidence_score=confidence_score,
                    job_match_score=job_match_score,
                    overall_score=wish.overall_score,
                    score_breakdown=wish.score_breakdown,
                    company_name=None,
                    position_title=None,
                )
            )
        
        return wish_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List guest wishes error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve wishes"
        )


@router.post("/guest", response_model=GenieWishDetailResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(max_calls=3, window_minutes=1440)  # 3 wishes per day for guests
async def create_guest_wish(
    wish_request: WishRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new AI-powered wish as a guest user.
    
    Guest users are limited to 3 wishes per day.
    Returns full details including AI analysis results since guest wishes are processed synchronously.
    """
    try:
        # Get or create guest session
        session_id = await get_or_create_guest_session(request, db)
        
        # Check daily limit for guest wishes
        can_make_wish, current_count = await check_guest_daily_wish_limit(session_id, db, max_wishes=3)
        
        if not can_make_wish:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Whoa there! ✋ You've used all your magic wishes for today ({current_count}/3). Come back tomorrow for more AI-powered insights! 🧞‍♂️✨"
            )
        
        logger.info(f"Guest wish creation initiated. Session: {session_id[:8]}...")
        
        # Check if guest user already exists for this session
        import uuid
        guest_email = f"guest_{session_id[:8]}@temporary.com"
        
        result = await db.execute(select(User).where(User.email == guest_email))
        guest_user = result.scalar_one_or_none()
        
        if not guest_user:
            # Create a new temporary guest user for wish processing
            import secrets
            guest_user_id = uuid.uuid4()
            temp_password = secrets.token_urlsafe(16)
            guest_user = User(
                id=guest_user_id,
                email=guest_email,
                hashed_password=hash_password(temp_password),
                role="user"  # Guest users have basic user role
            )
            
            # Add guest user to database session (required for foreign key constraint)
            db.add(guest_user)
            await db.flush()  # Flush to get the ID without committing
        
        # Increment guest daily wish count
        await increment_guest_wish_count(session_id, db)
        
        # Create initial wish record (processing)
        genie_wish = GenieWish(
            user_id=guest_user.id,
            wish_type=wish_request.wish_type,
            request_text=wish_request.wish_text,
            status="processing",
        )
        db.add(genie_wish)
        await db.flush()  # Get ID without committing yet
        
        # Generate AI response (same logic as regular endpoint)
        resume_context = ""
        try:
            ctx = wish_request.context_data or {}
            resume_id = ctx.get("resume_id") if isinstance(ctx, dict) else None
            if resume_id:
                resume = await db.get(Resume, resume_id)
                if resume and resume.extracted_text:
                    resume_context = f"\n\nRESUME CONTEXT:\n{resume.extracted_text[:2000]}"
        except Exception as e:
            logger.warning(f"Guest wish context processing warning: {e}")

        # Craft prompts
        system_prompt = (
            "You are RezGenie, a mystical career genie with centuries of wisdom about resumes and careers! 🧞‍♂️ "
            "You speak with the magical authority of someone who has guided countless professionals to their dream jobs. "
            "You're friendly but wise, enthusiastic but professional. Start your analysis with a magical overview "
            "that sets the stage, then provide your detailed insights. Use phrases like 'I divine that...', "
            "'The career stars align to show...', 'My magical analysis reveals...', but keep it professional and helpful."
        )
        user_prompt = f"""
REQUEST: {wish_request.wish_text}
{resume_context}

Provide JSON with keys: 
- response: Brief analysis summary
- recommendations: List of specific actionable recommendations (sentences)
- action_items: List of specific skills that should be added or emphasized (short skill names like "Python", "Leadership", "Excel VBA", "Communication", "AWS", "Project Management")
- resources: List of objects with title, url, description
- confidence_score: Number between 0-1 (overall analysis confidence)
- job_match_score: Number between 0-1 (how well the resume matches the job requirements if job description provided, or resume quality score if general analysis)

Focus on making action_items a clean list of specific skill names that would improve the resume's match to this job posting.
"""

        # Call OpenAI with improved error handling and intelligent fallback
        try:
            logger.info(f"Guest: About to call OpenAI API for session {session_id[:8]}")
            
            ai_raw = await openai_service.get_chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=1200,
            )
            
            logger.info(f"Guest: OpenAI API call successful, response length: {len(ai_raw)}")
        except Exception as openai_error:
            logger.error(f"OpenAI service error for guest: {openai_error}")
            
            # Check if it's a quota issue - provide smart fallback
            if "insufficient_quota" in str(openai_error).lower() or "exceeded your current quota" in str(openai_error).lower():
                logger.info("OpenAI quota exceeded for guest, providing intelligent fallback response")
                
                # Generate intelligent fallback response
                ai_raw = """{
                    "response": "Due to high demand, our AI service is temporarily using a backup analysis system. Based on your job description, this appears to be a role requiring strong skills and professional experience.",
                    "recommendations": [
                        "Tailor your resume to include keywords from the job posting",
                        "Quantify your achievements with specific metrics and numbers",
                        "Highlight relevant skills prominently in a dedicated section",
                        "Include skills that match the role requirements",
                        "Ensure your experience section demonstrates progression and growth"
                    ],
                    "action_items": ["Python", "JavaScript", "SQL", "Leadership", "Communication", "Project Management", "Problem Solving", "Team Collaboration"],
                    "resources": [
                        {
                            "title": "Resume Keywords Guide",
                            "url": "https://www.indeed.com/career-advice/resumes-cover-letters/resume-keywords",
                            "description": "Learn how to optimize your resume with relevant keywords"
                        }
                    ],
                    "confidence_score": 0.75,
                    "job_match_score": 0.72
                }"""
                
            else:
                # For other errors, mark wish as failed and rollback
                await db.rollback()
                
                # Provide user-friendly error message based on error type
                if "api_key" in str(openai_error).lower():
                    detail = "AI service configuration error. Please contact support."
                elif "rate_limit" in str(openai_error).lower():
                    detail = "AI service is currently busy. Please try again in a few minutes."
                elif "model" in str(openai_error).lower():
                    detail = "AI model temporarily unavailable. Please try again later."
                else:
                    detail = "AI service temporarily unavailable. Please try again later."
                
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=detail
                )

        # Parse AI response - handle markdown code blocks
        try:
            # Strip markdown code blocks if present
            cleaned_response = ai_raw.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]  # Remove ```json
            elif cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]  # Remove ```
            
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]  # Remove trailing ```
            
            cleaned_response = cleaned_response.strip()
            ai_struct = json.loads(cleaned_response)
            logger.info(f"Guest: Successfully parsed AI response with {len(ai_struct.get('recommendations', []))} recommendations")
        except json.JSONDecodeError as e:
            logger.warning(f"Guest: AI response not valid JSON: {e}. Raw response: {ai_raw[:200]}...")
            ai_struct = {
                "response": ai_raw[:500],
                "recommendations": [],
                "action_items": [],
                "resources": [],
                "confidence_score": 0.8,
                "job_match_score": 0.7,
            }

        # Persist results and mark completed - store in both formats
        try:
            # Log what we're about to save
            logger.info(f"Guest: Saving wish data: recommendations={len(ai_struct.get('recommendations', []))}, action_items={len(ai_struct.get('action_items', []))}")
            logger.info(f"Guest: AI struct keys: {ai_struct.keys()}")
            
            genie_wish.response_text = json.dumps(ai_struct)
            genie_wish.ai_response = ai_struct.get("response", "")
            genie_wish.recommendations = ai_struct.get("recommendations", [])
            genie_wish.action_items = ai_struct.get("action_items", [])
            genie_wish.resources = ai_struct.get("resources", [])
            genie_wish.confidence_score = ai_struct.get("confidence_score", 0.8)
            genie_wish.job_match_score = ai_struct.get("job_match_score", 0.7)
            
            # Generate comprehensive score for guests too
            try:
                logger.info("Guest: Generating comprehensive resume score...")
                comprehensive_score_data = await openai_service.generate_comprehensive_score(
                    resume_text=resume_context if resume_context else wish_request.wish_text,
                    job_description=wish_request.wish_text if resume_context else None,
                    similarity_score=genie_wish.job_match_score
                )
                genie_wish.overall_score = comprehensive_score_data["overall_score"]
                genie_wish.score_breakdown = comprehensive_score_data["score_breakdown"]
                logger.info(f"Guest: Comprehensive score generated: {genie_wish.overall_score}")
            except Exception as score_error:
                logger.warning(f"Guest: Failed to generate comprehensive score: {score_error}. Using defaults.")
                genie_wish.overall_score = 75.0
                genie_wish.score_breakdown = {
                    "style_formatting": {"score": 75, "feedback": "Unable to evaluate", "weight": 0.20},
                    "grammar_spelling": {"score": 75, "feedback": "Unable to evaluate", "weight": 0.20},
                    "job_match": {"score": 75, "feedback": "Unable to evaluate", "weight": 0.30},
                    "ats_compatibility": {"score": 75, "feedback": "Unable to evaluate", "weight": 0.15},
                    "content_quality": {"score": 75, "feedback": "Unable to evaluate", "weight": 0.15}
                }
            
            genie_wish.is_processed = True
            genie_wish.processing_status = "completed"
            genie_wish.processed_at = datetime.utcnow()
            genie_wish.status = "completed"
            genie_wish.completed_at = datetime.utcnow()
            
            # Log what was actually set
            logger.info(f"Guest: Set on object: recommendations={len(genie_wish.recommendations or [])}, action_items={len(genie_wish.action_items or [])}")
        except Exception as field_error:
            logger.error(f"Error assigning guest genie wish fields: {field_error}")
            raise
        
        # Commit the changes - SQLAlchemy handles JSON serialization automatically
        await db.commit()
        await db.refresh(genie_wish)
        
        logger.info(f"Guest: Data committed successfully for guest wish ID: {genie_wish.id}")
        
        logger.info(f"Guest wish created successfully. Session: {session_id[:8]}, Wish ID: {genie_wish.id}")
        
        # Return full details for guest wishes since they're processed synchronously
        return GenieWishDetailResponse(
            id=str(genie_wish.id),
            wish_type=genie_wish.wish_type,
            wish_text=wish_request.wish_text,
            context_data=wish_request.context_data,
            is_processed=True,
            processing_status=genie_wish.status,
            processing_error=None,
            created_at=genie_wish.created_at.isoformat(),
            processed_at=genie_wish.completed_at.isoformat() if genie_wish.completed_at else None,
            ai_response=genie_wish.ai_response,
            recommendations=genie_wish.recommendations,
            action_items=genie_wish.action_items,
            resources=genie_wish.resources,
            confidence_score=genie_wish.confidence_score,
            job_match_score=genie_wish.job_match_score,
            overall_score=genie_wish.overall_score,
            score_breakdown=genie_wish.score_breakdown,
            company_name=wish_request.context_data.get("company_name") if wish_request.context_data else None,
            position_title=wish_request.context_data.get("position_title") if wish_request.context_data else None,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create guest wish: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process your wish. Please try again."
        )


@router.get("/usage/daily/guest")
async def get_guest_daily_usage(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Get daily wish usage for guest users.
    """
    try:
        # Get guest session ID from request (create if not exists)
        session_id = await get_or_create_guest_session(request, db)
        
        # Get current usage count
        _, current_count = await check_guest_daily_wish_limit(session_id, db, max_wishes=3)
        
        return {
            "wishes_used": current_count,
            "daily_limit": 3  # Guest users have 3 wishes per day
        }
        
    except Exception as e:
        logger.error(f"Failed to get guest daily usage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage information"
        )


@router.delete("/usage/daily/guest/reset", status_code=status.HTTP_200_OK)
async def reset_guest_daily_usage(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset daily wish usage for guest users (Development/Testing only).
    
    This endpoint is for testing purposes to reset guest daily limits.
    """
    try:
        # Get guest session ID from request
        session_id = await get_or_create_guest_session(request, db)
        
        # Delete today's guest wish records for this session
        today = date.today()
        from app.models.guest_session import GuestDailyWish
        
        result = await db.execute(
            select(GuestDailyWish).where(
                GuestDailyWish.session_id == session_id,
                GuestDailyWish.date == today
            )
        )
        daily_wish = result.scalar_one_or_none()
        
        if daily_wish:
            from sqlalchemy import delete
            await db.execute(
                delete(GuestDailyWish).where(
                    GuestDailyWish.session_id == session_id,
                    GuestDailyWish.date == today
                )
            )
            await db.commit()
            logger.info(f"Reset guest daily usage for session: {session_id[:8]}...")
            
        return {
            "message": "Guest daily usage reset successfully",
            "session_id": session_id[:8] + "...",
            "reset_date": today.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to reset guest daily usage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset usage information"
        )


@router.get("/guest/{wish_id}", response_model=GenieWishDetailResponse)
async def get_guest_wish(
    wish_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific genie wish for guest users.
    Only allows access to wishes created by the same guest session.
    """
    try:
        # Get guest session ID from request
        session_id = await get_or_create_guest_session(request, db)
        
        # Get wish and verify it belongs to this guest session
        wish = await db.get(GenieWish, wish_id)
        if not wish:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wish not found"
            )
        
        # Verify the wish belongs to this guest session's user
        guest_email = f"guest_{session_id[:8]}@temporary.com"
        result = await db.execute(select(User).where(User.email == guest_email))
        guest_user = result.scalar_one_or_none()
        
        if not guest_user or wish.user_id != guest_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wish not found"
            )
        
        # Parse stored AI results - use new fields first, fallback to response_text
        ai_response_text = wish.ai_response
        recommendations = wish.recommendations
        action_items = wish.action_items
        resources = wish.resources
        confidence_score = wish.confidence_score
        job_match_score = wish.job_match_score
        
        # Parse JSON fields if they come as strings (shouldn't happen with proper JSONB, but handle it)
        if isinstance(recommendations, str):
            try:
                recommendations = json.loads(recommendations)
            except (json.JSONDecodeError, TypeError):
                recommendations = []
        
        if isinstance(action_items, str):
            try:
                action_items = json.loads(action_items)
            except (json.JSONDecodeError, TypeError):
                action_items = []
        
        if isinstance(resources, str):
            try:
                resources = json.loads(resources)
            except (json.JSONDecodeError, TypeError):
                resources = []
        
        # Fallback to parsing response_text if new fields are empty
        if not ai_response_text and wish.response_text:
            try:
                parsed_response = json.loads(wish.response_text)
                ai_response_text = ai_response_text or parsed_response.get("response", "")
                recommendations = recommendations or parsed_response.get("recommendations", [])
                action_items = action_items or parsed_response.get("action_items", [])
                resources = resources or parsed_response.get("resources", [])
                confidence_score = confidence_score or parsed_response.get("confidence_score", 0.8)
                job_match_score = job_match_score or parsed_response.get("job_match_score", 0.7)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse response_text for guest wish {wish_id}")
        
        return GenieWishDetailResponse(
            id=str(wish.id),
            wish_type=wish.wish_type,
            wish_text=wish.request_text or "",
            context_data=None,
            is_processed=wish.is_processed or wish.status == "completed",
            processing_status=wish.processing_status or wish.status or "pending",
            processing_error=wish.processing_error or wish.error_message,
            created_at=wish.created_at.isoformat(),
            processed_at=wish.processed_at.isoformat() if wish.processed_at else (wish.completed_at.isoformat() if wish.completed_at else None),
            ai_response=ai_response_text,
            recommendations=recommendations,
            action_items=action_items,
            resources=resources,
            confidence_score=confidence_score,
            job_match_score=job_match_score,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get guest wish error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve wish"
        )


# Interview Questions Models
class InterviewQuestionsRequest(BaseModel):
    resume_id: Optional[str] = Field(None, description="Resume ID to base questions on")
    resume_text: Optional[str] = Field(None, description="Resume text directly")
    job_description: str = Field(..., description="Job description to tailor questions")
    num_questions: int = Field(5, ge=1, le=10, description="Number of questions to generate")
    difficulty_levels: Optional[List[str]] = Field(
        ["easy", "medium", "hard"],
        description="Mix of difficulty levels"
    )


class InterviewQuestion(BaseModel):
    question: str
    difficulty: str
    category: str
    sampleResponse: str
    followUp: Optional[str] = None


class InterviewQuestionsResponse(BaseModel):
    success: bool
    questions: List[InterviewQuestion]
    totalQuestions: int
    generatedAt: Optional[str] = None
    error: Optional[str] = None


@router.post("/interview-questions", response_model=InterviewQuestionsResponse)
@rate_limit(max_calls=20, window_minutes=60)  # 20 requests per hour
async def generate_interview_questions_endpoint(
    request: Request,
    questions_request: InterviewQuestionsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate interview questions based on resume and job description.
    
    - **resume_id**: ID of saved resume (optional, use resume_text instead if not saved)
    - **resume_text**: Direct resume text (optional if resume_id provided)
    - **job_description**: Job posting/description to tailor questions
    - **num_questions**: Number of questions to generate (1-10)
    - **difficulty_levels**: Mix of difficulty levels (easy, medium, hard)
    """
    try:
        # Get resume text
        resume_text = questions_request.resume_text
        
        if not resume_text and questions_request.resume_id:
            # Try to fetch from database
            resume = await db.get(Resume, questions_request.resume_id)
            if resume and resume.extracted_text:
                resume_text = resume.extracted_text
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Resume not found or has no extracted text"
                )
        
        if not resume_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either resume_id or resume_text must be provided"
            )
        
        # Generate questions
        logger.info(f"Generating {questions_request.num_questions} interview questions for user {current_user.email}")
        
        result = await generate_interview_questions(
            resume_text=resume_text,
            job_description=questions_request.job_description,
            num_questions=questions_request.num_questions,
            difficulty_levels=questions_request.difficulty_levels,
        )
        
        if not result["success"]:
            logger.error(f"Failed to generate questions: {result.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to generate interview questions"
            )
        
        return InterviewQuestionsResponse(
            success=True,
            questions=[
                InterviewQuestion(
                    question=q.get("question", ""),
                    difficulty=q.get("difficulty", "medium"),
                    category=q.get("category", "general"),
                    sampleResponse=q.get("sampleResponse", ""),
                    followUp=q.get("followUp"),
                )
                for q in result.get("questions", [])
            ],
            totalQuestions=result.get("totalQuestions", 0),
            generatedAt=result.get("generatedAt"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating interview questions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate interview questions"
        )


@router.post("/interview-questions/guest", response_model=InterviewQuestionsResponse)
@rate_limit(max_calls=10, window_minutes=60)  # 10 requests per hour for guests
async def generate_interview_questions_guest(
    request: Request,
    questions_request: InterviewQuestionsRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate interview questions for guest users (higher rate limit).
    Requires resume_text directly (no resume_id lookup).
    """
    try:
        if not questions_request.resume_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="resume_text is required for guest users"
            )
        
        # Generate questions
        logger.info("Generating interview questions for guest user")
        
        result = await generate_interview_questions(
            resume_text=questions_request.resume_text,
            job_description=questions_request.job_description,
            num_questions=questions_request.num_questions,
            difficulty_levels=questions_request.difficulty_levels,
        )
        
        if not result["success"]:
            logger.error(f"Failed to generate questions: {result.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to generate interview questions"
            )
        
        return InterviewQuestionsResponse(
            success=True,
            questions=[
                InterviewQuestion(
                    question=q.get("question", ""),
                    difficulty=q.get("difficulty", "medium"),
                    category=q.get("category", "general"),
                    sampleResponse=q.get("sampleResponse", ""),
                    followUp=q.get("followUp"),
                )
                for q in result.get("questions", [])
            ],
            totalQuestions=result.get("totalQuestions", 0),
            generatedAt=result.get("generatedAt"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating interview questions for guest: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate interview questions"
        )


# ==================== COVER LETTER ENDPOINTS ====================

class CoverLetterRequest(BaseModel):
    job_description: str = Field(..., description="Job posting or description")
    company_name: Optional[str] = Field(None, description="Optional company name")
    position_title: Optional[str] = Field(None, description="Optional position title")
    resume_text: Optional[str] = Field(None, description="Resume text (required for guest users)")

    class Config:
        json_schema_extra = {
            "example": {
                "job_description": "We are looking for a Senior Python Developer...",
                "company_name": "TechCorp",
                "position_title": "Senior Python Developer",
                "resume_text": "John Doe\nSoftware Engineer with 5 years of experience..."
            }
        }


class CoverLetterResponse(BaseModel):
    success: bool
    cover_letter: str
    company_name: str
    position_title: str
    generated_at: str


@router.post("/cover-letter", response_model=CoverLetterResponse)
@rate_limit(max_calls=20, window_minutes=60)  # 20 cover letters per hour
async def generate_cover_letter(
    request: Request,
    cl_request: CoverLetterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a professional cover letter for the authenticated user.
    
    Requires a valid resume to be uploaded first.
    """
    try:
        logger.info(f"Cover letter generation requested by user: {current_user.email}")
        
        # Get user's most recent resume
        stmt = select(Resume).where(
            Resume.user_id == current_user.id
        ).order_by(
            desc(Resume.created_at)
        ).limit(1)
        
        result = await db.execute(stmt)
        resume = result.scalar_one_or_none()
        
        if not resume or not resume.extracted_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No resume found. Please upload a resume first."
            )
        
        logger.info(f"Using resume: {resume.id}, extracted_text length: {len(resume.extracted_text)}")
        
        # Generate cover letter
        cover_letter_data = await openai_service.generate_cover_letter(
            resume_text=resume.extracted_text,
            job_description=cl_request.job_description,
            company_name=cl_request.company_name,
            position_title=cl_request.position_title
        )
        
        return CoverLetterResponse(
            success=True,
            cover_letter=cover_letter_data["cover_letter"],
            company_name=cover_letter_data["company_name"],
            position_title=cover_letter_data["position_title"],
            generated_at=cover_letter_data["generated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating cover letter: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate cover letter"
        )


@router.post("/guest/cover-letter", response_model=CoverLetterResponse)
@rate_limit(max_calls=10, window_minutes=60)  # 10 cover letters per hour for guests
async def generate_cover_letter_guest(
    request: Request,
    cl_request: CoverLetterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a professional cover letter for guest users.
    
    Requires resume_text to be provided directly in the request.
    """
    try:
        # Get guest session ID from request
        session_id = await get_or_create_guest_session(request, db)
        logger.info(f"Cover letter generation requested by guest session: {session_id}")

        # Log what was received in the request
        logger.info(f"Guest cover letter request - has resume_text: {bool(cl_request.resume_text)}, "
                   f"has job_description: {bool(cl_request.job_description)}, "
                   f"company_name: {cl_request.company_name}, position_title: {cl_request.position_title}")

        # Check if resume_text is provided directly in the request
        if not cl_request.resume_text:
            logger.warning(f"Guest cover letter request missing resume_text")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="resume_text is required for guest users. Please provide your resume text in the request."
            )
        
        logger.info(f"Guest: Using resume_text from request, length: {len(cl_request.resume_text)}")

        # Generate cover letter
        cover_letter_data = await openai_service.generate_cover_letter(
            resume_text=cl_request.resume_text,
            job_description=cl_request.job_description,
            company_name=cl_request.company_name,
            position_title=cl_request.position_title
        )
        
        return CoverLetterResponse(
            success=True,
            cover_letter=cover_letter_data["cover_letter"],
            company_name=cover_letter_data["company_name"],
            position_title=cover_letter_data["position_title"],
            generated_at=cover_letter_data["generated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating cover letter for guest: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate cover letter"
        )

