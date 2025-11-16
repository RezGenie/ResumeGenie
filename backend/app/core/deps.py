from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import date
from uuid import UUID
import hashlib
import logging

from app.core.config import settings
from app.core.database import get_db as get_database_session
from app.models.user import User
from app.models.guest_session import GuestSession, GuestDailyUpload

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

# Re-export database dependency
get_db = get_database_session

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            credentials.credentials, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Look up user from database
    result = await db.execute(
        select(User).where(User.id == UUID(user_id))
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user.
    """
    # TODO: Add user active status check
    return current_user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current authenticated user from JWT token (optional - returns None if no token).
    """
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(
            credentials.credentials, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
            
        # Look up user from database
        result = await db.execute(
            select(User).where(User.id == UUID(user_id))
        )
        user = result.scalar_one_or_none()
        return user
    except JWTError:
        return None


def generate_guest_session_id(request: Request) -> str:
    """Generate a consistent session ID for guest users based on IP and User-Agent."""
    ip = getattr(request.client, "host", "unknown") if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    # Use only IP and User-Agent for consistent session tracking (remove random UUID)
    unique_string = f"{ip}:{user_agent}"
    return hashlib.sha256(unique_string.encode()).hexdigest()


async def get_or_create_guest_session(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> str:
    """Get or create guest session ID for tracking uploads."""
    # First try to get session from header
    session_id = request.headers.get("X-Guest-Session-ID")
    
    if not session_id:
        # Generate session ID based on IP + User-Agent
        session_id = generate_guest_session_id(request)
    
    # Check if session already exists in database
    result = await db.execute(
        select(GuestSession).where(GuestSession.session_id == session_id)
    )
    existing_session = result.scalar_one_or_none()
    
    if not existing_session:
        # Create new guest session record
        guest_session = GuestSession(
            session_id=session_id,
            ip_address=getattr(request.client, "host", None) if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        db.add(guest_session)
        await db.flush()  # Use flush instead of commit - let FastAPI manage the transaction

    return session_id


async def check_guest_daily_limit(
    session_id: str,
    db: AsyncSession,
    max_uploads: int = 3
) -> tuple[bool, int]:
    """
    Check if guest has exceeded daily upload limit.
    Returns (can_upload, current_count).
    """
    today = date.today()
    logger.info(f"Checking upload limit for session {session_id[:8]} on {today}")
    
    # Get or create daily upload record
    result = await db.execute(
        select(GuestDailyUpload).where(
            GuestDailyUpload.session_id == session_id,
            GuestDailyUpload.date == today
        )
    )
    daily_upload = result.scalar_one_or_none()
    logger.info(f"Found existing upload record: {daily_upload is not None}")
    
    if not daily_upload:
        # Create new daily record
        daily_upload = GuestDailyUpload(
            session_id=session_id,
            date=today,
            upload_count=0
        )
        db.add(daily_upload)
        await db.flush()  # Use flush instead of commit
        logger.info(f"Created new upload record for session {session_id[:8]}")
        return True, 0
    
    can_upload = daily_upload.upload_count < max_uploads
    logger.info(f"Upload check result: can_upload={can_upload}, count={daily_upload.upload_count}/{max_uploads}")
    return can_upload, daily_upload.upload_count


async def increment_guest_upload_count(
    session_id: str,
    db: AsyncSession
) -> None:
    """Increment guest daily upload count."""
    today = date.today()
    
    result = await db.execute(
        select(GuestDailyUpload).where(
            GuestDailyUpload.session_id == session_id,
            GuestDailyUpload.date == today
        )
    )
    daily_upload = result.scalar_one_or_none()
    
    if daily_upload:
        daily_upload.upload_count += 1
        await db.flush()  # Use flush instead of commit


async def check_guest_daily_wish_limit(
    session_id: str,
    db: AsyncSession,
    max_wishes: int = 3
) -> tuple[bool, int]:
    """
    Check if guest has exceeded daily wish limit.
    Returns (can_make_wish, current_count).
    """
    today = date.today()
    
    # Get or create daily wish record
    from app.models.guest_session import GuestDailyWish
    
    result = await db.execute(
        select(GuestDailyWish).where(
            GuestDailyWish.session_id == session_id,
            GuestDailyWish.date == today
        )
    )
    daily_wish = result.scalar_one_or_none()
    
    if not daily_wish:
        # Create new daily record
        daily_wish = GuestDailyWish(
            session_id=session_id,
            date=today,
            wish_count=0
        )
        db.add(daily_wish)
        await db.flush()  # Flush to make record available within this transaction
        return True, 0
    
    can_make_wish = daily_wish.wish_count < max_wishes
    return can_make_wish, daily_wish.wish_count


async def increment_guest_wish_count(
    session_id: str,
    db: AsyncSession
) -> None:
    """Increment guest daily wish count."""
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
        daily_wish.wish_count += 1
    else:
        # Create new daily wish record starting at 1
        daily_wish = GuestDailyWish(
            session_id=session_id,
            date=today,
            wish_count=1
        )
        db.add(daily_wish)
    
    # Don't commit here - let the calling function handle the transaction