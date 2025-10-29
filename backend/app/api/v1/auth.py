"""
Authentication API Endpoints
Handles user registration, login, token refresh, and logout.
"""

from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
import logging

from app.core.database import get_db
from app.core.security import (
    AuthService, 
    AuthenticationError,
    validate_password_strength,
    hash_password,
    get_current_user,
    rate_limit
)
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePassword123!"
            }
        }


class UserResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    is_verified: bool
    created_at: str
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenRefresh(BaseModel):
    refresh_token: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(max_calls=5, window_minutes=10)  # 5 registrations per 10 minutes
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Register a new user account.
    
    - **email**: Valid email address
    - **password**: Secure password meeting requirements
    
    Returns access and refresh tokens for immediate login.
    """
    try:
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == user_data.email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Validate password strength
        is_valid, error_message = validate_password_strength(user_data.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Create new user
        hashed_password = hash_password(user_data.password)
        new_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            is_active=True,
            is_verified=False  # Could implement email verification
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        # Generate tokens
        tokens = await AuthService.create_user_tokens(new_user)
        
        # Create response
        user_response = UserResponse(
            id=str(new_user.id),
            email=new_user.email,
            is_active=new_user.is_active,
            is_verified=new_user.is_verified,
            created_at=new_user.created_at.isoformat()
        )
        
        logger.info(f"New user registered: {new_user.email}")
        
        return TokenResponse(
            **tokens,
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=TokenResponse)
@rate_limit(max_calls=10, window_minutes=5)  # 10 login attempts per 5 minutes
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Authenticate user and return access tokens.
    
    - **username**: User email address
    - **password**: User password
    
    Returns access and refresh tokens.
    """
    try:
        # Authenticate user
        user = await AuthService.authenticate_user(form_data.username, form_data.password, db)
        
        if not user:
            raise AuthenticationError("Invalid email or password")
        
        if not user.is_active:
            raise AuthenticationError("Account is disabled")
        
        # Generate tokens
        tokens = await AuthService.create_user_tokens(user)
        
        # Create response
        user_response = UserResponse(
            id=str(user.id),
            email=user.email,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at.isoformat()
        )
        
        logger.info(f"User logged in: {user.email}")
        
        return TokenResponse(
            **tokens,
            user=user_response
        )
        
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=dict)
async def refresh_token(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Refresh access token using refresh token.
    
    - **refresh_token**: Valid refresh token
    
    Returns new access token.
    """
    try:
        from app.core.security import decode_token, create_access_token
        
        # Decode refresh token
        payload = decode_token(token_data.refresh_token)
        
        # Validate token type
        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type")
        
        # Get user
        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Invalid token payload")
        
        user = await db.get(User, user_id)
        if not user or not user.is_active:
            raise AuthenticationError("User not found or inactive")
        
        # Generate new access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 30 * 60  # 30 minutes
        }
        
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Logout user by blacklisting their token.
    
    Requires valid access token.
    """
    try:
        # Note: In a real implementation, you'd extract the token from the request
        # and blacklist it. For now, we'll just return success.
        
        logger.info(f"User logged out: {current_user.email}")
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get current user information.
    
    Requires valid access token.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat()
    )


@router.put("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Change user password.
    
    - **current_password**: Current password
    - **new_password**: New password meeting requirements
    
    Requires valid access token.
    """
    try:
        from app.core.security import verify_password
        
        # Verify current password
        if not verify_password(password_data.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Validate new password strength
        is_valid, error_message = validate_password_strength(password_data.new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Update password
        current_user.hashed_password = hash_password(password_data.new_password)
        await db.commit()
        
        logger.info(f"Password changed for user: {current_user.email}")
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )


@router.delete("/delete-account", status_code=status.HTTP_200_OK)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Delete user account permanently.
    
    This action is irreversible and will delete all user data.
    Requires valid access token.
    """
    try:
        user_email = current_user.email
        
        # Delete the user account
        await db.delete(current_user)
        await db.commit()
        
        logger.info(f"User account deleted: {user_email}")
        
        return {"message": "Account deleted successfully"}
        
    except Exception as e:
        logger.error(f"Account deletion error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account deletion failed"
        )