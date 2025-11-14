"""
Enhanced Caching Service
Provides intelligent caching for comparison results and analytics.
"""

import json
import hashlib
import logging
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta
import redis
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheKey(BaseModel):
    """Cache key structure for type safety."""
    prefix: str
    identifier: str
    version: str = "v1"
    
    def generate(self) -> str:
        """Generate cache key string."""
        return f"{self.prefix}:{self.version}:{self.identifier}"


class EnhancedCacheService:
    """Enhanced caching service with intelligent invalidation."""
    
    # Cache TTL configurations (in seconds)
    CACHE_TTL = {
        "comparison_result": 3600 * 24,      # 24 hours
        "skill_analysis": 3600 * 12,         # 12 hours
        "analytics_overview": 3600 * 2,       # 2 hours
        "user_recommendations": 3600 * 6,     # 6 hours
        "market_trends": 3600 * 24 * 7,      # 1 week
        "company_data": 3600 * 24 * 30       # 30 days
    }
    
    # Cache key prefixes
    PREFIXES = {
        "comparison": "comp",
        "analytics": "analytics",
        "skill_analysis": "skills",
        "recommendations": "recs",
        "market_data": "market",
        "user_data": "user"
    }
    
    def __init__(self):
        """Initialize Redis connection."""
        try:
            # Use redis_url from settings which supports both host:port and full URL formats
            self.redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            logger.info("Redis cache service initialized successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed, using in-memory cache: {e}")
            self.redis_client = None
            self._memory_cache = {}
    
    async def get_comparison_cache(
        self, 
        resume_id: str, 
        job_hash: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached comparison result.
        
        Args:
            resume_id: Resume identifier
            job_hash: Hash of job description for caching
            
        Returns:
            Cached comparison result or None
        """
        try:
            cache_key = CacheKey(
                prefix=self.PREFIXES["comparison"],
                identifier=f"{resume_id}:{job_hash}"
            ).generate()
            
            cached_data = await self._get_from_cache(cache_key)
            if cached_data:
                logger.info(f"Cache hit for comparison: {cache_key}")
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.warning(f"Cache retrieval error: {e}")
            return None
    
    async def set_comparison_cache(
        self,
        resume_id: str,
        job_hash: str,
        comparison_result: Dict[str, Any]
    ) -> bool:
        """
        Cache comparison result.
        
        Args:
            resume_id: Resume identifier
            job_hash: Hash of job description
            comparison_result: Comparison result to cache
            
        Returns:
            Success status
        """
        try:
            cache_key = CacheKey(
                prefix=self.PREFIXES["comparison"],
                identifier=f"{resume_id}:{job_hash}"
            ).generate()
            
            # Add cache metadata
            comparison_result["_cache_metadata"] = {
                "cached_at": datetime.utcnow().isoformat(),
                "cache_key": cache_key,
                "ttl": self.CACHE_TTL["comparison_result"]
            }
            
            success = await self._set_to_cache(
                cache_key, 
                json.dumps(comparison_result, default=str),
                ttl=self.CACHE_TTL["comparison_result"]
            )
            
            if success:
                logger.info(f"Cached comparison result: {cache_key}")
            
            return success
            
        except Exception as e:
            logger.warning(f"Cache storage error: {e}")
            return False
    
    async def get_analytics_cache(
        self, 
        user_id: str, 
        analytics_type: str,
        time_range: int = 30
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached analytics data.
        
        Args:
            user_id: User identifier
            analytics_type: Type of analytics (overview, trends, skills)
            time_range: Time range in days
            
        Returns:
            Cached analytics or None
        """
        try:
            cache_key = CacheKey(
                prefix=self.PREFIXES["analytics"],
                identifier=f"{user_id}:{analytics_type}:{time_range}"
            ).generate()
            
            cached_data = await self._get_from_cache(cache_key)
            if cached_data:
                logger.info(f"Cache hit for analytics: {cache_key}")
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.warning(f"Analytics cache retrieval error: {e}")
            return None
    
    async def set_analytics_cache(
        self,
        user_id: str,
        analytics_type: str,
        analytics_data: Dict[str, Any],
        time_range: int = 30
    ) -> bool:
        """
        Cache analytics data.
        
        Args:
            user_id: User identifier
            analytics_type: Type of analytics
            analytics_data: Analytics data to cache
            time_range: Time range in days
            
        Returns:
            Success status
        """
        try:
            cache_key = CacheKey(
                prefix=self.PREFIXES["analytics"],
                identifier=f"{user_id}:{analytics_type}:{time_range}"
            ).generate()
            
            # Add cache metadata
            analytics_data["_cache_metadata"] = {
                "cached_at": datetime.utcnow().isoformat(),
                "cache_key": cache_key,
                "analytics_type": analytics_type,
                "time_range": time_range
            }
            
            success = await self._set_to_cache(
                cache_key,
                json.dumps(analytics_data, default=str),
                ttl=self.CACHE_TTL["analytics_overview"]
            )
            
            if success:
                logger.info(f"Cached analytics data: {cache_key}")
            
            return success
            
        except Exception as e:
            logger.warning(f"Analytics cache storage error: {e}")
            return False
    
    async def invalidate_user_cache(self, user_id: str) -> bool:
        """
        Invalidate all cache entries for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Success status
        """
        try:
            # Pattern to match all user-related cache keys
            patterns = [
                f"{self.PREFIXES['comparison']}:v1:{user_id}:*",
                f"{self.PREFIXES['analytics']}:v1:{user_id}:*",
                f"{self.PREFIXES['recommendations']}:v1:{user_id}:*"
            ]
            
            deleted_count = 0
            for pattern in patterns:
                keys = await self._get_keys_by_pattern(pattern)
                if keys:
                    for key in keys:
                        if await self._delete_from_cache(key):
                            deleted_count += 1
            
            logger.info(f"Invalidated {deleted_count} cache entries for user: {user_id}")
            return True
            
        except Exception as e:
            logger.warning(f"Cache invalidation error: {e}")
            return False
    
    async def get_skill_cache(
        self, 
        skill_set_hash: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached skill analysis.
        
        Args:
            skill_set_hash: Hash of the skill set for caching
            
        Returns:
            Cached skill analysis or None
        """
        try:
            cache_key = CacheKey(
                prefix=self.PREFIXES["skill_analysis"],
                identifier=skill_set_hash
            ).generate()
            
            cached_data = await self._get_from_cache(cache_key)
            if cached_data:
                logger.info(f"Cache hit for skill analysis: {cache_key}")
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.warning(f"Skill cache retrieval error: {e}")
            return None
    
    async def set_skill_cache(
        self,
        skill_set_hash: str,
        skill_analysis: Dict[str, Any]
    ) -> bool:
        """
        Cache skill analysis.
        
        Args:
            skill_set_hash: Hash of the skill set
            skill_analysis: Skill analysis to cache
            
        Returns:
            Success status
        """
        try:
            cache_key = CacheKey(
                prefix=self.PREFIXES["skill_analysis"],
                identifier=skill_set_hash
            ).generate()
            
            success = await self._set_to_cache(
                cache_key,
                json.dumps(skill_analysis, default=str),
                ttl=self.CACHE_TTL["skill_analysis"]
            )
            
            if success:
                logger.info(f"Cached skill analysis: {cache_key}")
            
            return success
            
        except Exception as e:
            logger.warning(f"Skill cache storage error: {e}")
            return False
    
    def generate_job_hash(self, job_description: str, company_name: str = "") -> str:
        """
        Generate a hash for job content for caching purposes.
        
        Args:
            job_description: Job description text
            company_name: Company name
            
        Returns:
            SHA256 hash of the job content
        """
        content = f"{job_description}:{company_name}".lower().strip()
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def generate_skill_hash(self, skills: List[str]) -> str:
        """
        Generate a hash for skill set for caching purposes.
        
        Args:
            skills: List of skills
            
        Returns:
            SHA256 hash of the skill set
        """
        skill_content = ":".join(sorted([s.lower().strip() for s in skills]))
        return hashlib.sha256(skill_content.encode()).hexdigest()[:16]
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics and health information.
        
        Returns:
            Cache statistics
        """
        try:
            if self.redis_client:
                info = self.redis_client.info()
                return {
                    "cache_type": "redis",
                    "status": "connected",
                    "memory_usage": info.get("used_memory_human", "unknown"),
                    "connected_clients": info.get("connected_clients", 0),
                    "total_commands": info.get("total_commands_processed", 0),
                    "hit_rate": "Not available in basic Redis info"
                }
            else:
                return {
                    "cache_type": "memory",
                    "status": "fallback",
                    "entries": len(self._memory_cache),
                    "warning": "Using in-memory cache fallback"
                }
                
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {
                "cache_type": "unknown",
                "status": "error",
                "error": str(e)
            }
    
    async def _get_from_cache(self, key: str) -> Optional[str]:
        """Internal method to get data from cache."""
        try:
            if self.redis_client:
                return self.redis_client.get(key)
            else:
                # Fallback to memory cache
                entry = self._memory_cache.get(key)
                if entry and entry["expires_at"] > datetime.utcnow():
                    return entry["data"]
                elif entry:
                    # Expired entry
                    del self._memory_cache[key]
                return None
                
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None
    
    async def _set_to_cache(self, key: str, value: str, ttl: int) -> bool:
        """Internal method to set data in cache."""
        try:
            if self.redis_client:
                return self.redis_client.setex(key, ttl, value)
            else:
                # Fallback to memory cache
                self._memory_cache[key] = {
                    "data": value,
                    "expires_at": datetime.utcnow() + timedelta(seconds=ttl)
                }
                return True
                
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False
    
    async def _delete_from_cache(self, key: str) -> bool:
        """Internal method to delete data from cache."""
        try:
            if self.redis_client:
                return bool(self.redis_client.delete(key))
            else:
                # Fallback to memory cache
                if key in self._memory_cache:
                    del self._memory_cache[key]
                    return True
                return False
                
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")
            return False
    
    async def _get_keys_by_pattern(self, pattern: str) -> List[str]:
        """Internal method to get keys by pattern."""
        try:
            if self.redis_client:
                return self.redis_client.keys(pattern)
            else:
                # Fallback: simple pattern matching for memory cache
                matching_keys = []
                pattern_without_wildcards = pattern.replace("*", "")
                for key in self._memory_cache.keys():
                    if key.startswith(pattern_without_wildcards):
                        matching_keys.append(key)
                return matching_keys
                
        except Exception as e:
            logger.warning(f"Cache pattern search error: {e}")
            return []


# Initialize the cache service
enhanced_cache_service = EnhancedCacheService()