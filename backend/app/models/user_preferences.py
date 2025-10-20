"""
User Preferences Model - Job Search Preferences and Settings
"""

from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    # Job search preferences
    skills = Column(JSONB, default=list)  # ["Python", "React", "AWS"]
    target_titles = Column(JSONB, default=list)  # ["Software Engineer", "Full Stack Developer"]
    
    # Location preferences
    location_pref = Column(String(255))  # "Toronto, ON" or "Remote" 
    remote_ok = Column(Boolean, default=True)
    
    # Salary preferences
    salary_min = Column(Float, nullable=True)  # Minimum acceptable salary
    
    # Company preferences
    blocked_companies = Column(JSONB, default=list)  # Companies to exclude
    preferred_companies = Column(JSONB, default=list)  # Companies to prioritize
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="preferences")

    def __repr__(self):
        return f"<UserPreferences(user_id={self.user_id}, skills_count={len(self.skills or [])})>"