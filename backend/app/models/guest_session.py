"""
Guest Session Model
Tracks guest sessions and their daily upload limits.
"""

from sqlalchemy import Column, String, DateTime, Integer, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class GuestSession(Base):
    """Track guest sessions for daily upload limits."""
    __tablename__ = "guest_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    ip_address = Column(String(45))  # Support IPv6
    user_agent = Column(String(500))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<GuestSession(session_id={self.session_id})>"


class GuestDailyUpload(Base):
    """Track daily upload counts for guest sessions."""
    __tablename__ = "guest_daily_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(String(255), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    upload_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<GuestDailyUpload(session_id={self.session_id}, date={self.date}, count={self.upload_count})>"


class GuestDailyWish(Base):
    """Track daily wish counts for guest sessions."""
    __tablename__ = "guest_daily_wishes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(String(255), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    wish_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<GuestDailyWish(session_id={self.session_id}, date={self.date}, count={self.wish_count})>"