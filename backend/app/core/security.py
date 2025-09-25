"""
Advanced JWT Authentication and Security Module
Implements secure authentication with refresh tokens, rate limiting, and advanced security features.
"""

from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis
import hashlib
import secrets
import logging
from functools import wraps
from collections import defaultdict
import time

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Security
security = HTTPBearer(auto_error=False)

# Redis for token blacklist and rate limiting
redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)

# Rate limiting storage
rate_limit_storage = defaultdict(list)


class SecurityConfig:
    """Advanced security configuration."""
    
    # Password requirements
    MIN_PASSWORD_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL_CHARS = True
    
    # JWT settings
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    REFRESH_TOKEN_EXPIRE_DAYS = 30
    
    # Rate limiting
    LOGIN_ATTEMPTS_LIMIT = 5
    LOGIN_LOCKOUT_MINUTES = 15
    API_CALLS_PER_MINUTE = 60
    
    # Session security
    MAX_ACTIVE_SESSIONS = 5


class AuthenticationError(HTTPException):
    """Custom authentication error."""
    
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class RateLimitError(HTTPException):
    """Custom rate limit error."""
    
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
        )


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password against security requirements.
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if len(password) < SecurityConfig.MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {SecurityConfig.MIN_PASSWORD_LENGTH} characters long"
    
    if SecurityConfig.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if SecurityConfig.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if SecurityConfig.REQUIRE_NUMBERS and not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    
    if SecurityConfig.REQUIRE_SPECIAL_CHARS and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False, "Password must contain at least one special character"
    
    return True, ""


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data to encode
        expires_delta: Token expiration time
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=SecurityConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        user_id: User identifier
        
    Returns:
        Encoded JWT refresh token
    """
    expire = datetime.utcnow() + timedelta(days=SecurityConfig.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
        "jti": secrets.token_urlsafe(32)  # Unique token ID
    }
    
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token to decode
        
    Returns:
        Decoded token payload
        
    Raises:
        AuthenticationError: If token is invalid
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise AuthenticationError("Invalid token")


async def is_token_blacklisted(token: str) -> bool:
    """Check if a token is blacklisted."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    try:
        return bool(redis_client.get(f"blacklist:{token_hash}"))
    except Exception as e:
        logger.error(f"Redis error checking blacklist: {e}")
        return False


async def blacklist_token(token: str, expire_time: Optional[int] = None):
    """Add a token to the blacklist."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    try:
        if expire_time:
            redis_client.setex(f"blacklist:{token_hash}", expire_time, "1")
        else:
            redis_client.set(f"blacklist:{token_hash}", "1")
    except Exception as e:
        logger.error(f"Redis error blacklisting token: {e}")


def rate_limit(max_calls: int = SecurityConfig.API_CALLS_PER_MINUTE, window_minutes: int = 1):
    """
    Rate limiting decorator.
    
    Args:
        max_calls: Maximum calls allowed in the time window
        window_minutes: Time window in minutes
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from args/kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                return await func(*args, **kwargs)
            
            # Get client IP
            client_ip = request.client.host
            current_time = time.time()
            window_start = current_time - (window_minutes * 60)
            
            # Clean old entries
            rate_limit_storage[client_ip] = [
                timestamp for timestamp in rate_limit_storage[client_ip] 
                if timestamp > window_start
            ]
            
            # Check rate limit
            if len(rate_limit_storage[client_ip]) >= max_calls:
                raise RateLimitError(f"Rate limit exceeded: {max_calls} calls per {window_minutes} minute(s)")
            
            # Add current request
            rate_limit_storage[client_ip].append(current_time)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get the current authenticated user.
    
    Args:
        credentials: HTTP Bearer credentials
        db: Database session
        
    Returns:
        Current user
        
    Raises:
        AuthenticationError: If authentication fails
    """
    if not credentials:
        raise AuthenticationError("Missing authentication credentials")
    
    token = credentials.credentials
    
    # Check if token is blacklisted
    if await is_token_blacklisted(token):
        raise AuthenticationError("Token has been revoked")
    
    # Decode token
    try:
        payload = decode_token(token)
    except AuthenticationError:
        raise
    
    # Validate token type
    if payload.get("type") != "access":
        raise AuthenticationError("Invalid token type")
    
    # Get user ID
    user_id: str = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Invalid token payload")
    
    # Get user from database
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise AuthenticationError("User not found")
        
        if not user.is_active:
            raise AuthenticationError("User account is disabled")
        
        return user
        
    except Exception as e:
        logger.error(f"Database error in get_current_user: {e}")
        raise AuthenticationError("Authentication failed")


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get current active user (additional verification layer).
    
    Args:
        current_user: Current user from get_current_user
        
    Returns:
        Active user
        
    Raises:
        AuthenticationError: If user is not active
    """
    if not current_user.is_active:
        raise AuthenticationError("User account is not active")
    
    return current_user


class AuthService:
    """Advanced authentication service."""
    
    @staticmethod
    async def authenticate_user(email: str, password: str, db: AsyncSession) -> Optional[User]:
        """
        Authenticate a user with email and password.
        
        Args:
            email: User email
            password: User password
            db: Database session
            
        Returns:
            User if authentication successful, None otherwise
        """
        try:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            if not user or not verify_password(password, user.hashed_password):
                return None
            
            return user
            
        except Exception as e:
            logger.error(f"Authentication error for {email}: {e}")
            return None
    
    @staticmethod
    async def create_user_tokens(user: User) -> dict:
        """
        Create access and refresh tokens for a user.
        
        Args:
            user: User to create tokens for
            
        Returns:
            Dictionary with access and refresh tokens
        """
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(str(user.id))
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": SecurityConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    @staticmethod
    async def revoke_token(token: str):
        """
        Revoke a token by adding it to blacklist.
        
        Args:
            token: Token to revoke
        """
        try:
            payload = decode_token(token)
            exp = payload.get("exp")
            
            if exp:
                # Calculate TTL for blacklist entry
                current_time = datetime.utcnow().timestamp()
                ttl = max(0, int(exp - current_time))
                await blacklist_token(token, ttl)
                
        except Exception as e:
            logger.error(f"Error revoking token: {e}")


# Export main components
__all__ = [
    "AuthenticationError",
    "RateLimitError",
    "SecurityConfig",
    "validate_password_strength",
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "get_current_user",
    "get_current_active_user",
    "rate_limit",
    "AuthService"
]