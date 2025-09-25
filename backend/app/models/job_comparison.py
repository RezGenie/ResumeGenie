from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
import uuid
from app.core.database import Base


class JobComparison(Base):
    __tablename__ = "job_comparisons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    
    # Job description data
    job_title = Column(String(255))
    company_name = Column(String(255))
    job_description = Column(Text, nullable=False)
    job_embedding = Column(Vector(1536))  # OpenAI text-embedding-3-small dimension
    
    # Analysis results
    similarity_score = Column(Float, nullable=False)  # 0.0 to 1.0
    matched_skills = Column(JSON)  # List of matched skills
    missing_skills = Column(JSON)  # List of missing skills
    recommendations = Column(JSON)  # Analysis recommendations
    
    # Status tracking
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="job_comparisons")
    resume = relationship("Resume", back_populates="job_comparisons")

    def __repr__(self):
        return f"<JobComparison(job_title={self.job_title}, similarity={self.similarity_score})>"