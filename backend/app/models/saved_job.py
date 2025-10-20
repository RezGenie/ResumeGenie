"""
Saved Jobs Model - User's Job Collection Management
Manages saved/liked jobs with status tracking
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    
    # Status tracking
    status = Column(String(20), default="saved", nullable=False, index=True)  # "saved", "applied", "archived"
    
    # Timestamps
    saved_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="saved_jobs")
    job = relationship("Job", back_populates="saved_jobs")
    
    # Constraints and indexes
    __table_args__ = (
        # Unique constraint: one save per user per job
        Index('ix_saved_jobs_user_job_unique', 'user_id', 'job_id', unique=True),
        # Status filtering
        Index('ix_saved_jobs_user_status', 'user_id', 'status'),
        # Timeline queries
        Index('ix_saved_jobs_saved_at_desc', 'saved_at'),
    )

    def __repr__(self):
        return f"<SavedJob(user_id={self.user_id}, job_id={self.job_id}, status={self.status})>"