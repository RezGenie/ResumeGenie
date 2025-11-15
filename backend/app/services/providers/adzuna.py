"""
Adzuna Job Provider Service
Handles job data fetching, normalization, and storage from Adzuna API
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from dateutil import parser as date_parser

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.core.database import get_db
from app.models.job import Job
from app.services.openai_service import OpenAIService

logger = logging.getLogger(__name__)


class AdzunaProvider:
    """Adzuna API client for job data ingestion"""
    
    def __init__(self):
        self.base_url = settings.adzuna_base_url
        self.app_id = settings.adzuna_app_id
        self.app_key = settings.adzuna_app_key
        self.country = settings.adzuna_country
        self.openai_service = OpenAIService()
        
        # Seed queries for Canadian tech jobs
        self.seed_queries = [
            "software engineer",
            "full stack developer", 
            "frontend developer",
            "data analyst",
            "product designer"
        ]

    async def fetch_jobs(
        self, 
        what: str, 
        where: str = "", 
        page: int = 1, 
        results_per_page: int = 50
    ) -> Dict[str, Any]:
        """
        Fetch jobs from Adzuna API
        
        Args:
            what: Search query (job title/skills)
            where: Location filter
            page: Page number (1-indexed)
            results_per_page: Results per page (max 50)
            
        Returns:
            API response with jobs data
        """
        if not self.app_id or not self.app_key:
            raise ValueError("Adzuna API credentials not configured")
            
        # Build API URL
        url = f"{self.base_url}/{self.country}/search/{page}"
        
        params = {
            "app_id": self.app_id,
            "app_key": self.app_key,
            "what": what,
            "results_per_page": min(results_per_page, 50),
            "sort_by": "date",  # Get freshest jobs first
            "full_time": 1,     # Focus on full-time positions
        }
        
        if where:
            params["where"] = where
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Adzuna API error {e.response.status_code}: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Failed to fetch jobs from Adzuna: {e}")
            raise

    def normalize_job_data(self, raw_job: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize Adzuna job data to our schema
        
        Args:
            raw_job: Raw job data from Adzuna API
            
        Returns:
            Normalized job data dict
        """
        try:
            # Parse salary data
            salary_min, salary_max, currency = self._parse_salary(raw_job)
            
            # Extract and clean location
            location = self._extract_location(raw_job)
            
            # Determine if remote
            remote = self._is_remote_job(raw_job)
            
            # Extract tags/skills
            tags = self._extract_tags(raw_job)
            
            # Parse posted date
            posted_at = self._parse_date(raw_job.get("created"))
            
            return {
                "provider": "adzuna",
                "provider_job_id": str(raw_job["id"]),
                "title": raw_job.get("title", "").strip(),
                "company": raw_job.get("company", {}).get("display_name", "").strip(),
                "location": location,
                "remote": remote,
                "salary_min": salary_min,
                "salary_max": salary_max, 
                "currency": currency,
                "posted_at": posted_at,
                "redirect_url": raw_job.get("redirect_url", ""),
                "tags": tags,
                "snippet": self._clean_snippet(raw_job.get("description", "")),
            }
            
        except Exception as e:
            logger.error(f"Error normalizing job data: {e}")
            logger.error(f"Raw job data: {raw_job}")
            raise

    def _parse_salary(self, raw_job: Dict[str, Any]) -> tuple[Optional[float], Optional[float], str]:
        """Parse salary information from job data"""
        salary_min = raw_job.get("salary_min")
        salary_max = raw_job.get("salary_max")
        
        # Convert to float if present
        if salary_min is not None:
            try:
                salary_min = float(salary_min)
            except (ValueError, TypeError):
                salary_min = None
                
        if salary_max is not None:
            try:
                salary_max = float(salary_max)
            except (ValueError, TypeError):
                salary_max = None
                
        # Currency - default to CAD for Canada
        currency = "CAD"
        
        return salary_min, salary_max, currency

    def _extract_location(self, raw_job: Dict[str, Any]) -> str:
        """Extract and normalize location"""
        location_data = raw_job.get("location", {})
        
        if isinstance(location_data, dict):
            # Try display_name first, fall back to area
            location = location_data.get("display_name") or location_data.get("area", [])
            if isinstance(location, list) and location:
                location = location[0]
        else:
            location = str(location_data) if location_data else ""
            
        return location.strip() if location else ""

    def _is_remote_job(self, raw_job: Dict[str, Any]) -> bool:
        """Determine if job allows remote work"""
        # Check title and description for remote indicators
        title = raw_job.get("title", "").lower()
        description = raw_job.get("description", "").lower()
        
        remote_keywords = ["remote", "work from home", "wfh", "telecommute", "distributed"]
        
        text_to_check = f"{title} {description}"
        return any(keyword in text_to_check for keyword in remote_keywords)

    def _extract_tags(self, raw_job: Dict[str, Any]) -> List[str]:
        """Extract skills/tags from job data"""
        tags = []
        
        # Get category if available
        category = raw_job.get("category", {})
        if isinstance(category, dict):
            cat_label = category.get("label", "")
            if cat_label:
                tags.append(cat_label)
                
        # Could add more sophisticated skill extraction here
        # For now, just use the category
        
        return tags

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string to datetime object"""
        if not date_str:
            return None
            
        try:
            # Adzuna uses ISO format dates
            return date_parser.parse(date_str).replace(tzinfo=timezone.utc)
        except Exception as e:
            logger.warning(f"Failed to parse date '{date_str}': {e}")
            return None

    def _clean_snippet(self, description: str) -> str:
        """Clean and truncate job description for snippet"""
        if not description:
            return ""
            
        # Remove HTML tags if present
        import re
        clean_desc = re.sub(r'<[^>]+>', '', description)
        
        # Limit to 500 characters for snippet
        if len(clean_desc) > 500:
            clean_desc = clean_desc[:497] + "..."
            
        return clean_desc.strip()

    async def upsert_jobs(self, jobs_data: List[Dict[str, Any]], db: AsyncSession) -> int:
        """
        Upsert normalized job data into database
        
        Args:
            jobs_data: List of normalized job data dicts
            db: Database session
            
        Returns:
            Number of jobs processed
        """
        if not jobs_data:
            return 0
            
        processed_count = 0
        
        for job_data in jobs_data:
            try:
                # Check if job already exists
                stmt = select(Job).where(
                    and_(
                        Job.provider == job_data["provider"],
                        Job.provider_job_id == job_data["provider_job_id"]
                    )
                )
                
                result = await db.execute(stmt)
                existing_job = result.scalar_one_or_none()
                
                if existing_job:
                    # Update existing job
                    for key, value in job_data.items():
                        if key not in ["provider", "provider_job_id"]:  # Don't update keys
                            setattr(existing_job, key, value)
                    existing_job.updated_at = datetime.now(timezone.utc)
                else:
                    # Create new job
                    new_job = Job(**job_data)
                    db.add(new_job)
                
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Error upserting job {job_data.get('provider_job_id')}: {e}")
                continue
                
        try:
            await db.commit()
            logger.info(f"Successfully processed {processed_count} jobs")
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to commit job data: {e}")
            raise
            
        return processed_count

    async def generate_embeddings(self, db: AsyncSession, batch_size: int = 10) -> int:
        """
        Generate embeddings for jobs without them
        
        Args:
            db: Database session
            batch_size: Number of jobs to process at once
            
        Returns:
            Number of jobs processed
        """
        # Find jobs without embeddings
        stmt = select(Job).where(Job.job_embedding.is_(None)).limit(batch_size)
        result = await db.execute(stmt)
        jobs_without_embeddings = result.scalars().all()
        
        if not jobs_without_embeddings:
            return 0
            
        processed_count = 0
        
        for job in jobs_without_embeddings:
            try:
                # Create text for embedding (title + company + snippet)
                embedding_text = f"{job.title} at {job.company}. {job.snippet or ''}"
                
                # Generate embedding
                embedding_result = await self.openai_service.generate_embedding(embedding_text)
                
                # Update job with embedding
                job.job_embedding = embedding_result.embedding
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Failed to generate embedding for job {job.id}: {e}")
                continue
        
        try:
            await db.commit()
            logger.info(f"Generated embeddings for {processed_count} jobs")
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to save embeddings: {e}")
            raise
            
        return processed_count

    async def ingest_all_seed_queries(self, pages_per_query: int = 3) -> Dict[str, int]:
        """
        Ingest jobs for all seed queries
        
        Args:
            pages_per_query: Number of pages to fetch per seed query
            
        Returns:
            Dictionary with stats per query
        """
        results = {}
        
        async for db in get_db():
            try:
                for query in self.seed_queries:
                    logger.info(f"Processing seed query: {query}")
                    query_jobs = []
                    
                    # Fetch multiple pages for this query
                    for page in range(1, pages_per_query + 1):
                        try:
                            logger.info(f"Fetching page {page} for query '{query}'")
                            response = await self.fetch_jobs(what=query, page=page)
                            raw_jobs = response.get("results", [])
                            
                            if not raw_jobs:
                                logger.info(f"No more results for query '{query}' at page {page}")
                                break
                                
                            # Normalize jobs
                            for raw_job in raw_jobs:
                                try:
                                    normalized = self.normalize_job_data(raw_job)
                                    query_jobs.append(normalized)
                                except Exception as e:
                                    logger.error(f"Failed to normalize job: {e}")
                                    continue
                                    
                            # Rate limiting - be nice to Adzuna API
                            await asyncio.sleep(1)
                            
                        except Exception as e:
                            logger.error(f"Failed to fetch page {page} for query '{query}': {e}")
                            continue
                    
                    # Upsert jobs for this query
                    if query_jobs:
                        processed = await self.upsert_jobs(query_jobs, db)
                        results[query] = processed
                        logger.info(f"Processed {processed} jobs for query '{query}'")
                    else:
                        results[query] = 0
                        
                # Generate embeddings for new jobs
                await self.generate_embeddings(db)
                
                break  # Exit the db context manager
                
            except Exception as e:
                logger.error(f"Error in ingest_all_seed_queries: {e}")
                raise
        
        total_jobs = sum(results.values())
        logger.info(f"Ingestion complete. Total jobs processed: {total_jobs}")
        
        return results

    async def ingest_and_save(
        self,
        db: AsyncSession,
        what: str,
        where: str = "",
        page: int = 1
    ) -> int:
        """
        Fetch jobs from Adzuna and save to database in one call
        
        Args:
            db: Database session
            what: Search query
            where: Location filter
            page: Page number
            
        Returns:
            Number of jobs saved
        """
        try:
            # Fetch jobs from Adzuna
            response = await self.fetch_jobs(what=what, where=where, page=page)
            raw_jobs = response.get("results", [])
            
            if not raw_jobs:
                return 0
            
            # Normalize jobs
            normalized_jobs = []
            for raw_job in raw_jobs:
                try:
                    normalized = self.normalize_job_data(raw_job)
                    normalized_jobs.append(normalized)
                except Exception as e:
                    logger.error(f"Failed to normalize job: {e}")
                    continue
            
            # Save to database
            if normalized_jobs:
                saved_count = await self.upsert_jobs(normalized_jobs, db)
                return saved_count
            
            return 0
            
        except Exception as e:
            logger.error(f"Error in ingest_and_save: {e}")
            return 0


# Global instance
adzuna_provider = AdzunaProvider()