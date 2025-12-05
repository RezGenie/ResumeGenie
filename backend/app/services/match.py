"""
Job Matching Service
Advanced recommendation scoring that leverages embeddings and user preferences
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.models.job import Job
from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.models.job_swipe import JobSwipe
from app.models.saved_job import SavedJob
from app.models.job_comparison import JobComparison

logger = logging.getLogger(__name__)


@dataclass
class JobScore:
    """Job recommendation score with detailed breakdown"""
    job_id: int
    total_score: float
    title_match: float
    skill_overlap: float
    location_fit: float
    salary_fit: float
    recency_boost: float
    company_pref: float
    embedding_similarity: float
    reasons: List[str]


class MatchingService:
    """
    Advanced job matching using multiple signals:
    - Title/role matching (40%)
    - Skill overlap (25%) 
    - Location preference (10%)
    - Salary alignment (10%)
    - Recency boost (10%)
    - Company preference (5%)
    - Embedding similarity bonus
    """
    
    # Scoring weights
    TITLE_WEIGHT = 0.40
    SKILL_WEIGHT = 0.25
    LOCATION_WEIGHT = 0.10
    SALARY_WEIGHT = 0.10
    RECENCY_WEIGHT = 0.10
    COMPANY_WEIGHT = 0.05
    
    # Embedding similarity bonus (additive)
    EMBEDDING_BONUS_WEIGHT = 0.15

    async def get_recommendations(
        self,
        user_id: str,
        db: AsyncSession,
        limit: int = 20,
        exclude_seen: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get personalized job recommendations for a user
        
        Args:
            user_id: User UUID
            db: Database session
            limit: Maximum recommendations to return
            exclude_seen: Whether to exclude already seen/swiped jobs
            
        Returns:
            List of job recommendations with scores and reasons
        """
        # Get user and preferences
        user_stmt = select(User).options(
            selectinload(User.preferences)
        ).where(User.id == user_id)
        
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        preferences = user.preferences
        if not preferences:
            # Create default preferences if none exist
            preferences = await self._create_default_preferences(user_id, db)
        
        # Get jobs to consider (not blocked companies, fresh, etc.)
        candidates = await self._get_job_candidates(user_id, db, exclude_seen, preferences)
        
        if not candidates:
            logger.info(f"No job candidates found for user {user_id}")
            return []
        
        # Score all candidates
        scored_jobs = await self._score_jobs(candidates, preferences, user_id, db)
        
        # Sort by score and limit
        scored_jobs.sort(key=lambda x: x.total_score, reverse=True)
        top_jobs = scored_jobs[:limit]
        
        # Convert to response format
        recommendations = []
        for scored_job in top_jobs:
            job = next(job for job in candidates if job.id == scored_job.job_id)
            recommendations.append({
                "job_id": job.id,
                "provider": job.provider,
                "provider_job_id": job.provider_job_id,
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "remote": job.remote,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "currency": job.currency,
                "snippet": job.snippet,
                "tags": job.tags or [],
                "posted_at": job.posted_at,
                "redirect_url": job.redirect_url,
                "score": round(scored_job.total_score, 3),
                "why": scored_job.reasons,
                "source": "Adzuna"
            })
        
        logger.info(f"Generated {len(recommendations)} recommendations for user {user_id}")
        return recommendations

    async def _get_job_candidates(
        self,
        user_id: str,
        db: AsyncSession,
        exclude_seen: bool,
        preferences: UserPreferences
    ) -> List[Job]:
        """Get candidate jobs for recommendation"""
        
        # Base query for fresh jobs (last 30 days)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        
        query = select(Job).where(
            and_(
                Job.posted_at >= cutoff_date,
                Job.title.is_not(None),
                Job.company.is_not(None),
                Job.redirect_url.is_not(None)
            )
        )
        
        # Apply hard filters from preferences
        if preferences.blocked_companies:
            query = query.where(
                ~Job.company.in_(preferences.blocked_companies)
            )
        
        # Location filter
        if preferences.location_pref and not preferences.remote_ok:
            # Strict location matching if remote not OK
            query = query.where(
                Job.location.ilike(f"%{preferences.location_pref}%")
            )
        elif preferences.location_pref and preferences.remote_ok:
            # Location OR remote jobs
            query = query.where(
                or_(
                    Job.location.ilike(f"%{preferences.location_pref}%"),
                    Job.remote.is_(True)
                )
            )
        elif preferences.remote_ok:
            # Remote jobs preferred if location not specified
            pass  # No additional filter
        
        # Salary filter (minimum requirement)
        if preferences.salary_min:
            query = query.where(
                or_(
                    Job.salary_min.is_(None),  # No salary info (don't exclude)
                    Job.salary_min >= preferences.salary_min,
                    Job.salary_max >= preferences.salary_min
                )
            )
        
        # Exclude seen jobs if requested
        if exclude_seen:
            # Get swiped job IDs
            swipe_subquery = select(JobSwipe.job_id).where(
                JobSwipe.user_id == user_id
            )
            
            # Get saved job IDs
            saved_subquery = select(SavedJob.job_id).where(
                SavedJob.user_id == user_id
            )
            
            query = query.where(
                and_(
                    Job.id.not_in(swipe_subquery),
                    Job.id.not_in(saved_subquery)
                )
            )
        
        # Order by recency and limit to manageable number
        query = query.order_by(Job.posted_at.desc()).limit(1000)
        
        result = await db.execute(query)
        candidates = result.scalars().all()
        
        logger.info(f"Found {len(candidates)} job candidates for scoring")
        return candidates

    async def _score_jobs(
        self,
        jobs: List[Job],
        preferences: UserPreferences,
        user_id: str,
        db: AsyncSession
    ) -> List[JobScore]:
        """Score jobs based on user preferences and multiple signals"""
        
        scored_jobs = []
        
        # Get user's embedding history for similarity matching
        user_embeddings = await self._get_user_embedding_profile(user_id, db)
        
        for job in jobs:
            try:
                score = await self._calculate_job_score(job, preferences, user_embeddings)
                scored_jobs.append(score)
            except Exception as e:
                logger.error(f"Error scoring job {job.id}: {e}")
                continue
        
        return scored_jobs

    async def _calculate_job_score(
        self,
        job: Job,
        preferences: UserPreferences,
        user_embeddings: Optional[List[List[float]]]
    ) -> JobScore:
        """Calculate comprehensive score for a single job"""
        
        reasons = []
        
        # 1. Title Match (40%)
        title_score = self._score_title_match(job.title, preferences.target_titles or [])
        if title_score > 0.7:
            reasons.append(f"Strong title match: {job.title}")
        elif title_score > 0.4:
            reasons.append(f"Relevant role: {job.title}")
        
        # 2. Skill Overlap (25%) 
        skill_score = self._score_skill_overlap(job.tags or [], preferences.skills or [])
        if skill_score > 0.6:
            matching_skills = self._get_matching_skills(job.tags or [], preferences.skills or [])
            if matching_skills:
                reasons.append(f"Matching skills: {', '.join(matching_skills[:3])}")
        
        # 3. Location Fit (10%)
        location_score = self._score_location_fit(job, preferences)
        if job.remote:
            reasons.append("Remote work available")
        elif preferences.location_pref and job.location:
            if preferences.location_pref.lower() in job.location.lower():
                reasons.append(f"Located in {preferences.location_pref}")
        
        # 4. Salary Fit (10%)
        salary_score = self._score_salary_fit(job, preferences)
        if salary_score > 0.8:
            if job.salary_min and job.salary_max:
                reasons.append(f"Competitive salary: ${job.salary_min:,.0f}-${job.salary_max:,.0f}")
            elif job.salary_min:
                reasons.append(f"Good salary: ${job.salary_min:,.0f}+")
        
        # 5. Recency Boost (10%)
        recency_score = self._score_recency(job.posted_at)
        if recency_score > 0.8:
            days_ago = (datetime.now(timezone.utc) - job.posted_at).days
            reasons.append(f"Recently posted ({days_ago} days ago)")
        
        # 6. Company Preference (5%)
        company_score = self._score_company_preference(job.company, preferences)
        if company_score > 0.8:
            reasons.append(f"Preferred company: {job.company}")
        
        # 7. Embedding Similarity Bonus
        embedding_score = 0.0
        if user_embeddings and job.job_embedding:
            embedding_score = await self._calculate_embedding_similarity(job.job_embedding, user_embeddings)
            if embedding_score > 0.8:
                reasons.append("High similarity to your profile")
        
        # Calculate weighted total score
        total_score = (
            title_score * self.TITLE_WEIGHT +
            skill_score * self.SKILL_WEIGHT +
            location_score * self.LOCATION_WEIGHT +
            salary_score * self.SALARY_WEIGHT +
            recency_score * self.RECENCY_WEIGHT +
            company_score * self.COMPANY_WEIGHT +
            embedding_score * self.EMBEDDING_BONUS_WEIGHT
        )
        
        # Add source attribution
        reasons.append("Source: Adzuna")
        
        return JobScore(
            job_id=job.id,
            total_score=total_score,
            title_match=title_score,
            skill_overlap=skill_score,
            location_fit=location_score,
            salary_fit=salary_score,
            recency_boost=recency_score,
            company_pref=company_score,
            embedding_similarity=embedding_score,
            reasons=reasons[:5]  # Limit to top 5 reasons
        )

    def _score_title_match(self, job_title: str, target_titles: List[str]) -> float:
        """Score how well job title matches user's target titles"""
        if not target_titles or not job_title:
            return 0.5  # Neutral score
        
        job_title_lower = job_title.lower()
        max_score = 0.0
        
        for target in target_titles:
            target_lower = target.lower()
            
            # Exact match
            if target_lower == job_title_lower:
                max_score = max(max_score, 1.0)
            # Contains match
            elif target_lower in job_title_lower or job_title_lower in target_lower:
                max_score = max(max_score, 0.8)
            # Keyword overlap
            else:
                target_words = set(target_lower.split())
                job_words = set(job_title_lower.split())
                overlap = len(target_words.intersection(job_words))
                if overlap > 0:
                    overlap_score = overlap / max(len(target_words), len(job_words))
                    max_score = max(max_score, overlap_score * 0.6)
        
        return max_score

    def _score_skill_overlap(self, job_tags: List[str], user_skills: List[str]) -> float:
        """Score overlap between job requirements and user skills"""
        if not user_skills or not job_tags:
            return 0.3  # Neutral score when no data
        
        job_skills_lower = {tag.lower() for tag in job_tags}
        user_skills_lower = {skill.lower() for skill in user_skills}
        
        intersection = job_skills_lower.intersection(user_skills_lower)
        
        if not intersection:
            return 0.2  # Low score for no match
        
        # Score based on percentage of user skills that match
        return min(len(intersection) / len(user_skills_lower), 1.0)

    def _get_matching_skills(self, job_tags: List[str], user_skills: List[str]) -> List[str]:
        """Get list of matching skills between job and user"""
        job_skills_lower = {tag.lower(): tag for tag in job_tags}
        user_skills_lower = {skill.lower() for skill in user_skills}
        
        matches = []
        for skill_lower in user_skills_lower:
            if skill_lower in job_skills_lower:
                matches.append(job_skills_lower[skill_lower])
        
        return matches

    def _score_location_fit(self, job: Job, preferences: UserPreferences) -> float:
        """Score location match with user preferences"""
        # Remote jobs score high if user wants remote
        if job.remote and preferences.remote_ok:
            return 1.0
        
        # No location preference
        if not preferences.location_pref:
            return 0.7 if job.remote else 0.5
        
        # Location match
        if job.location and preferences.location_pref:
            if preferences.location_pref.lower() in job.location.lower():
                return 1.0
            else:
                return 0.3  # Wrong location
        
        # No job location info
        return 0.5

    def _score_salary_fit(self, job: Job, preferences: UserPreferences) -> float:
        """Score salary alignment with user preferences"""
        if not preferences.salary_min:
            return 0.7  # Neutral when no preference
        
        # No salary info available
        if not job.salary_min and not job.salary_max:
            return 0.5
        
        # Check if salary meets minimum requirement
        job_salary = job.salary_max or job.salary_min
        if job_salary and job_salary >= preferences.salary_min:
            # Bonus for significantly exceeding minimum
            if job_salary >= preferences.salary_min * 1.2:
                return 1.0
            else:
                return 0.8
        
        return 0.2  # Below minimum

    def _score_recency(self, posted_at: Optional[datetime]) -> float:
        """Score based on how recently the job was posted"""
        if not posted_at:
            return 0.3  # Old/unknown posting date
        
        days_old = (datetime.now(timezone.utc) - posted_at).days
        
        if days_old <= 1:
            return 1.0  # Brand new
        elif days_old <= 3:
            return 0.9  # Very recent
        elif days_old <= 7:
            return 0.7  # Recent
        elif days_old <= 14:
            return 0.5  # Somewhat recent
        else:
            return 0.3  # Older posting

    def _score_company_preference(self, company: str, preferences: UserPreferences) -> float:
        """Score based on company preferences"""
        if not company:
            return 0.5
        
        company_lower = company.lower()
        
        # Preferred companies
        if preferences.preferred_companies:
            for pref_company in preferences.preferred_companies:
                if pref_company.lower() in company_lower:
                    return 1.0
        
        # Blocked companies (should be filtered out, but double-check)
        if preferences.blocked_companies:
            for blocked_company in preferences.blocked_companies:
                if blocked_company.lower() in company_lower:
                    return 0.0
        
        return 0.7  # Neutral for unknown companies

    async def _calculate_embedding_similarity(
        self,
        job_embedding: List[float],
        user_embeddings: List[List[float]]
    ) -> float:
        """Calculate cosine similarity between job and user embedding profiles"""
        if not user_embeddings or not job_embedding:
            return 0.0
        
        try:
            import numpy as np
            
            job_vec = np.array(job_embedding)
            
            similarities = []
            for user_embedding in user_embeddings:
                user_vec = np.array(user_embedding)
                
                # Cosine similarity
                dot_product = np.dot(job_vec, user_vec)
                norm_product = np.linalg.norm(job_vec) * np.linalg.norm(user_vec)
                
                if norm_product > 0:
                    similarity = dot_product / norm_product
                    similarities.append(similarity)
            
            # Return maximum similarity score
            return max(similarities) if similarities else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating embedding similarity: {e}")
            return 0.0

    async def _get_user_embedding_profile(self, user_id: str, db: AsyncSession) -> Optional[List[List[float]]]:
        """Get user's embedding profile from job comparisons and saved jobs"""
        try:
            # Get embeddings from user's job comparisons (resume matches)
            job_comp_stmt = select(JobComparison.job_embedding).where(
                and_(
                    JobComparison.user_id == user_id,
                    JobComparison.job_embedding.is_not(None),
                    JobComparison.similarity_score > 0.7  # Only high-similarity matches
                )
            ).limit(10)  # Recent high-scoring comparisons
            
            result = await db.execute(job_comp_stmt)
            embeddings = [row[0] for row in result.fetchall() if row[0]]
            
            return embeddings if embeddings else None
            
        except Exception as e:
            logger.error(f"Error getting user embedding profile: {e}")
            return None

    async def _create_default_preferences(self, user_id: str, db: AsyncSession) -> UserPreferences:
        """Create default preferences for user"""
        preferences = UserPreferences(
            user_id=user_id,
            skills=[],
            target_titles=[],
            location_pref="",
            remote_ok=True,
            salary_min=None,
            blocked_companies=[],
            preferred_companies=[]
        )
        
        db.add(preferences)
        await db.commit()
        await db.refresh(preferences)
        
        return preferences


# Global service instance
matching_service = MatchingService()