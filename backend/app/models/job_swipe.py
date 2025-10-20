"""
Job Swipe Model - Analytics and Learning Data
Tracks all user interactions with job postings for ML/analytics
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class JobSwipe(Base):
    __tablename__ = "job_swipes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    
    # Swipe data
    action = Column(String(10), nullable=False)  # "like" or "pass"
    device = Column(String(20))  # "mobile", "desktop", "tablet"
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="job_swipes")
    job = relationship("Job", back_populates="job_swipes")
    
    # Indexes for analytics queries
    __table_args__ = (
        # User activity timeline
        Index('ix_job_swipes_user_created', 'user_id', 'created_at'),
        # Job popularity analysis  
        Index('ix_job_swipes_job_action', 'job_id', 'action'),
        # Composite for preventing duplicate swipes (though UI should handle this)
        Index('ix_job_swipes_user_job', 'user_id', 'job_id'),
    )

    def __repr__(self):
        return f"<JobSwipe(user_id={self.user_id}, job_id={self.job_id}, action={self.action})>"