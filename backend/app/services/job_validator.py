"""
Job Validation Service
Validates job quality, completeness, and inclusivity
"""
import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class JobValidator:
    """Service for validating job data quality"""
    
    # Minimum requirements
    MIN_TITLE_LENGTH = 3
    MAX_TITLE_LENGTH = 200
    MIN_COMPANY_LENGTH = 2
    MIN_SNIPPET_LENGTH = 50
    MAX_SNIPPET_LENGTH = 2000
    
    # Suspicious patterns (spam, scams, discriminatory language)
    SUSPICIOUS_PATTERNS = [
        r'\$\$\$',  # Multiple dollar signs (often spam)
        r'work from home.*easy money',
        r'get rich quick',
        r'no experience.*high pay',
        r'guaranteed income',
        r'mlm|multi-level marketing',
        r'pyramid scheme',
    ]
    
    # Discriminatory language patterns
    DISCRIMINATORY_PATTERNS = [
        r'\byoung\b.*\bonly\b',
        r'\bold\b.*\bnot\b',
        r'\bmale\b.*\bonly\b',
        r'\bfemale\b.*\bonly\b',
        r'\bnative speaker\b.*\bonly\b',
        r'\bno.*disabled',
        r'\bno.*minorities',
    ]
    
    # Positive inclusivity indicators
    INCLUSIVE_KEYWORDS = [
        'equal opportunity',
        'diverse',
        'inclusive',
        'all backgrounds',
        'accessibility',
        'accommodations',
        'eeo',
        'affirmative action',
    ]
    
    def validate_job(self, job_data: Dict) -> Tuple[bool, List[str], Dict]:
        """
        Validate a job posting
        
        Args:
            job_data: Dictionary with job fields
            
        Returns:
            Tuple of (is_valid, errors, warnings)
        """
        errors = []
        warnings = {}
        
        # Required fields
        if not job_data.get('title'):
            errors.append("Missing job title")
        elif len(job_data['title']) < self.MIN_TITLE_LENGTH:
            errors.append(f"Title too short (min {self.MIN_TITLE_LENGTH} chars)")
        elif len(job_data['title']) > self.MAX_TITLE_LENGTH:
            errors.append(f"Title too long (max {self.MAX_TITLE_LENGTH} chars)")
        
        if not job_data.get('company'):
            errors.append("Missing company name")
        elif len(job_data['company']) < self.MIN_COMPANY_LENGTH:
            errors.append(f"Company name too short (min {self.MIN_COMPANY_LENGTH} chars)")
        
        if not job_data.get('snippet'):
            errors.append("Missing job description")
        elif len(job_data['snippet']) < self.MIN_SNIPPET_LENGTH:
            warnings['snippet_length'] = f"Description is short ({len(job_data['snippet'])} chars, recommended {self.MIN_SNIPPET_LENGTH}+)"
        elif len(job_data['snippet']) > self.MAX_SNIPPET_LENGTH:
            warnings['snippet_length'] = f"Description is very long ({len(job_data['snippet'])} chars)"
        
        if not job_data.get('redirect_url'):
            errors.append("Missing job URL")
        
        if not job_data.get('provider_job_id'):
            errors.append("Missing provider job ID")
        
        # Check for suspicious content
        text_to_check = f"{job_data.get('title', '')} {job_data.get('snippet', '')}".lower()
        
        for pattern in self.SUSPICIOUS_PATTERNS:
            if re.search(pattern, text_to_check, re.IGNORECASE):
                warnings['suspicious_content'] = f"Potentially suspicious content detected: {pattern}"
                break
        
        # Check for discriminatory language
        for pattern in self.DISCRIMINATORY_PATTERNS:
            if re.search(pattern, text_to_check, re.IGNORECASE):
                errors.append(f"Potentially discriminatory language detected: {pattern}")
                break
        
        # Check for inclusive language (positive indicator)
        has_inclusive = any(keyword in text_to_check for keyword in self.INCLUSIVE_KEYWORDS)
        if has_inclusive:
            warnings['inclusive'] = "Job posting includes inclusive language"
        
        # Validate salary if present
        if job_data.get('salary_min') and job_data.get('salary_max'):
            if job_data['salary_min'] > job_data['salary_max']:
                errors.append("Salary min is greater than salary max")
            elif job_data['salary_min'] < 0 or job_data['salary_max'] < 0:
                errors.append("Negative salary values")
            elif job_data['salary_max'] > 1000000:  # Sanity check
                warnings['salary'] = "Unusually high salary (>$1M)"
        
        # Validate posted date
        if job_data.get('posted_at'):
            posted_at = job_data['posted_at']
            if isinstance(posted_at, str):
                try:
                    from dateutil import parser
                    posted_at = parser.parse(posted_at)
                except:
                    errors.append("Invalid posted_at date format")
            
            if isinstance(posted_at, datetime):
                # Check if date is in the future
                if posted_at > datetime.now(timezone.utc):
                    warnings['posted_date'] = "Posted date is in the future"
                # Check if date is very old
                from datetime import timedelta
                if posted_at < datetime.now(timezone.utc) - timedelta(days=90):
                    warnings['posted_date'] = "Job posting is very old (>90 days)"
        
        is_valid = len(errors) == 0
        
        return is_valid, errors, warnings
    
    def calculate_quality_score(self, job_data: Dict) -> float:
        """
        Calculate a quality score for a job (0-100)
        
        Args:
            job_data: Dictionary with job fields
            
        Returns:
            Quality score (0-100)
        """
        score = 100.0
        
        # Deduct points for missing optional fields
        if not job_data.get('location'):
            score -= 5
        
        if not job_data.get('salary_min') or not job_data.get('salary_max'):
            score -= 10
        
        if not job_data.get('tags') or len(job_data.get('tags', [])) == 0:
            score -= 5
        
        # Deduct points for short description
        snippet_len = len(job_data.get('snippet', ''))
        if snippet_len < self.MIN_SNIPPET_LENGTH:
            score -= 20
        elif snippet_len < 100:
            score -= 10
        
        # Bonus points for inclusive language
        text_to_check = f"{job_data.get('title', '')} {job_data.get('snippet', '')}".lower()
        has_inclusive = any(keyword in text_to_check for keyword in self.INCLUSIVE_KEYWORDS)
        if has_inclusive:
            score += 10
        
        # Bonus for remote option
        if job_data.get('remote'):
            score += 5
        
        # Deduct for suspicious content
        for pattern in self.SUSPICIOUS_PATTERNS:
            if re.search(pattern, text_to_check, re.IGNORECASE):
                score -= 30
                break
        
        # Ensure score is in valid range
        score = max(0.0, min(100.0, score))
        
        return score
    
    def is_inclusive_job(self, job_data: Dict) -> bool:
        """
        Check if job posting demonstrates inclusive practices
        
        Args:
            job_data: Dictionary with job fields
            
        Returns:
            True if job appears inclusive
        """
        text_to_check = f"{job_data.get('title', '')} {job_data.get('snippet', '')}".lower()
        
        # Check for discriminatory language (disqualifies)
        for pattern in self.DISCRIMINATORY_PATTERNS:
            if re.search(pattern, text_to_check, re.IGNORECASE):
                return False
        
        # Check for inclusive keywords
        has_inclusive = any(keyword in text_to_check for keyword in self.INCLUSIVE_KEYWORDS)
        
        # Remote jobs are generally more inclusive
        is_remote = job_data.get('remote', False)
        
        return has_inclusive or is_remote


# Global instance
job_validator = JobValidator()
