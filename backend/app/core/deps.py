from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime, date
import hashlib
import uuid

from app.core.config import settings
from app.core.database import get_db as get_database_session
from app.models.user import User
from app.models.guest_session import GuestSession, GuestDailyUpload

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
    
    # TODO: Implement user lookup from database
    # For now, return a mock user
    from app.models.user import User
    return User(id=int(user_id), email="user@example.com")

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
            
        # TODO: Implement user lookup from database
        # For now, return a mock user
        from app.models.user import User
        return User(id=int(user_id), email="user@example.com")
    except JWTError:
        return None


def generate_guest_session_id(request: Request) -> str:
    """Generate a unique session ID for guest users based on IP and User-Agent."""
    ip = getattr(request.client, "host", "unknown") if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    unique_string = f"{ip}:{user_agent}:{uuid.uuid4()}"
    return hashlib.sha256(unique_string.encode()).hexdigest()


async def get_or_create_guest_session(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> str:
    """Get or create guest session ID for tracking uploads."""
    # First try to get session from header
    session_id = request.headers.get("X-Guest-Session-ID")
    
    if not session_id:
        # Generate new session ID
        session_id = generate_guest_session_id(request)
        
        # Create guest session record
        guest_session = GuestSession(
            session_id=session_id,
            ip_address=getattr(request.client, "host", None) if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        db.add(guest_session)
        await db.commit()
    
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
    
    # Get or create daily upload record
    result = await db.execute(
        select(GuestDailyUpload).where(
            GuestDailyUpload.session_id == session_id,
            GuestDailyUpload.date == today
        )
    )
    daily_upload = result.scalar_one_or_none()
    
    if not daily_upload:
        # Create new daily record
        daily_upload = GuestDailyUpload(
            session_id=session_id,
            date=today,
            upload_count=0
        )
        db.add(daily_upload)
        await db.commit()
        return True, 0
    
    can_upload = daily_upload.upload_count < max_uploads
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
        await db.commit()