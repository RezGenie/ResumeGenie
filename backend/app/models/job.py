"""
Job Model - External Job Postings from Providers (Adzuna, etc.)
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Provider information
    provider = Column(String(50), nullable=False, index=True)  # "adzuna", "indeed", etc.
    provider_job_id = Column(String(255), nullable=False)  # External ID from provider
    
    # Job details
    title = Column(String(500), nullable=False, index=True)
    company = Column(String(255), nullable=False, index=True)
    location = Column(String(255), index=True)
    remote = Column(Boolean, default=False, index=True)
    
    # Salary information
    salary_min = Column(Float, nullable=True, index=True)
    salary_max = Column(Float, nullable=True, index=True) 
    currency = Column(String(3), default="CAD")  # ISO currency code
    
    # Content
    snippet = Column(Text)  # Short description/excerpt
    tags = Column(JSONB, default=list)  # Skills, tech stack, etc.
    
    # URLs and meta
    redirect_url = Column(Text, nullable=False)  # Link to original posting
    posted_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Embedding for semantic matching (reusing existing pattern)
    job_embedding = Column(Vector(1536))  # OpenAI text-embedding-3-small dimension
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    job_swipes = relationship("JobSwipe", back_populates="job", cascade="all, delete-orphan")
    saved_jobs = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        # Unique constraint on provider + provider_job_id 
        Index('ix_jobs_provider_job_id', 'provider', 'provider_job_id', unique=True),
        # GIN index for JSONB tags
        Index('ix_jobs_tags_gin', 'tags', postgresql_using='gin'),
        # Composite index for filtering
        Index('ix_jobs_location_remote', 'location', 'remote'),
        Index('ix_jobs_salary_range', 'salary_min', 'salary_max'),
        # Posted date for freshness
        Index('ix_jobs_posted_at_desc', 'posted_at', postgresql_using='btree'),
    )

    def __repr__(self):
        return f"<Job(title={self.title}, company={self.company}, provider={self.provider})>"