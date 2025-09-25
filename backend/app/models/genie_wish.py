from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class GenieWish(Base):
    __tablename__ = "genie_wishes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Wish details
    wish_type = Column(String(50), nullable=False)  # skills, ats, formatting, general
    request_text = Column(Text)
    response_text = Column(Text)
    
    # Status tracking
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="genie_wishes")

    def __repr__(self):
        return f"<GenieWish(type={self.wish_type}, status={self.status})>"


class DailyWishCount(Base):
    __tablename__ = "daily_wish_counts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    wish_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="daily_wish_counts")

    def __repr__(self):
        return f"<DailyWishCount(user_id={self.user_id}, date={self.date}, count={self.wish_count})>"