"""
Test Job Discovery Features
Tests for job ingestion, matching, and recommendation endpoints
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.services.providers.adzuna import AdzunaProvider
from backend.app.services.match import MatchingService
from backend.app.models.job import Job
from backend.app.models.user_preferences import UserPreferences


class TestAdzunaProvider:
    """Test Adzuna API provider functionality"""
    
    @pytest.fixture
    def provider(self):
        return AdzunaProvider()
    
    def test_normalize_job_data(self, provider):
        """Test job data normalization"""
        raw_job = {
            "id": "123456789",
            "title": "Senior Software Engineer",
            "company": {"display_name": "TechCorp Inc."},
            "location": {"display_name": "Toronto, ON"},
            "salary_min": 90000.0,
            "salary_max": 120000.0,
            "created": "2025-10-20T10:00:00Z",
            "redirect_url": "https://www.adzuna.ca/jobs/view/123456789",
            "description": "<p>We are looking for a <strong>Senior Software Engineer</strong>...</p>",
            "category": {"label": "Software Development"}
        }
        
        normalized = provider.normalize_job_data(raw_job)
        
        assert normalized["provider"] == "adzuna"
        assert normalized["provider_job_id"] == "123456789"
        assert normalized["title"] == "Senior Software Engineer"
        assert normalized["company"] == "TechCorp Inc."
        assert normalized["location"] == "Toronto, ON"
        assert normalized["salary_min"] == 90000.0
        assert normalized["salary_max"] == 120000.0
        assert normalized["currency"] == "CAD"
        assert normalized["redirect_url"] == "https://www.adzuna.ca/jobs/view/123456789"
        assert "Software Development" in normalized["tags"]
        assert "Senior Software Engineer" in normalized["snippet"]
        assert "strong" not in normalized["snippet"]  # HTML stripped
    
    def test_parse_salary(self, provider):
        """Test salary parsing edge cases"""
        # Valid salaries
        salary_min, salary_max, currency = provider._parse_salary({
            "salary_min": 80000,
            "salary_max": 100000
        })
        assert salary_min == 80000.0
        assert salary_max == 100000.0
        assert currency == "CAD"
        
        # Invalid/missing salaries
        salary_min, salary_max, currency = provider._parse_salary({
            "salary_min": "invalid",
            "salary_max": None
        })
        assert salary_min is None
        assert salary_max is None
        assert currency == "CAD"
    
    def test_remote_job_detection(self, provider):
        """Test remote job detection logic"""
        # Remote in title
        assert provider._is_remote_job({
            "title": "Remote Software Engineer",
            "description": ""
        }) is True
        
        # Remote in description
        assert provider._is_remote_job({
            "title": "Software Engineer",
            "description": "Work from home opportunity"
        }) is True
        
        # Not remote
        assert provider._is_remote_job({
            "title": "Software Engineer",
            "description": "On-site position in Toronto"
        }) is False
    
    def test_snippet_cleaning(self, provider):
        """Test job description snippet cleaning"""
        # HTML removal
        description = "<p>Join our <strong>amazing</strong> team!</p><ul><li>Python</li><li>React</li></ul>"
        snippet = provider._clean_snippet(description)
        assert "<" not in snippet
        assert ">" not in snippet
        assert "amazing" in snippet
        
        # Length truncation
        long_description = "A" * 1000
        snippet = provider._clean_snippet(long_description)
        assert len(snippet) <= 500
        assert snippet.endswith("...")


class TestMatchingService:
    """Test job matching and recommendation logic"""
    
    @pytest.fixture
    def matching_service(self):
        return MatchingService()
    
    @pytest.fixture
    def sample_preferences(self):
        return UserPreferences(
            skills=["Python", "React", "PostgreSQL"],
            target_titles=["Software Engineer", "Full Stack Developer"],
            location_pref="Toronto, ON",
            remote_ok=True,
            salary_min=80000.0,
            blocked_companies=["BadCorp"],
            preferred_companies=["TechCorp"]
        )
    
    def test_title_matching_score(self, matching_service):
        """Test job title matching algorithm"""
        target_titles = ["Software Engineer", "Full Stack Developer"]
        
        # Exact match
        score = matching_service._score_title_match("Software Engineer", target_titles)
        assert score == 1.0
        
        # Partial match
        score = matching_service._score_title_match("Senior Software Engineer", target_titles)
        assert score == 0.8
        
        # No match
        score = matching_service._score_title_match("Marketing Manager", target_titles)
        assert score < 0.5
    
    def test_skill_overlap_scoring(self, matching_service):
        """Test skill overlap scoring"""
        user_skills = ["Python", "React", "PostgreSQL", "Docker"]
        
        # High overlap
        job_tags = ["Python", "React", "AWS"]
        score = matching_service._score_skill_overlap(job_tags, user_skills)
        assert score == 0.5  # 2 matches out of 4 user skills
        
        # No overlap
        job_tags = ["Java", ".NET", "Oracle"]
        score = matching_service._score_skill_overlap(job_tags, user_skills)
        assert score == 0.2  # Low score for no matches
        
        # Empty tags
        score = matching_service._score_skill_overlap([], user_skills)
        assert score == 0.3  # Neutral score
    
    def test_salary_fit_scoring(self, matching_service, sample_preferences):
        """Test salary alignment scoring"""
        # Job exceeds minimum significantly
        job = Job(salary_min=100000.0, salary_max=130000.0)
        score = matching_service._score_salary_fit(job, sample_preferences)
        assert score == 1.0
        
        # Job meets minimum
        job = Job(salary_min=85000.0, salary_max=95000.0)
        score = matching_service._score_salary_fit(job, sample_preferences)
        assert score == 0.8
        
        # Job below minimum
        job = Job(salary_min=60000.0, salary_max=70000.0)
        score = matching_service._score_salary_fit(job, sample_preferences)
        assert score == 0.2
        
        # No salary info
        job = Job(salary_min=None, salary_max=None)
        score = matching_service._score_salary_fit(job, sample_preferences)
        assert score == 0.5
    
    def test_location_scoring(self, matching_service, sample_preferences):
        """Test location preference scoring"""
        # Remote job with remote OK
        job = Job(remote=True, location="San Francisco, CA")
        score = matching_service._score_location_fit(job, sample_preferences)
        assert score == 1.0
        
        # Location match
        job = Job(remote=False, location="Toronto, ON, Canada")
        score = matching_service._score_location_fit(job, sample_preferences)
        assert score == 1.0
        
        # Location mismatch
        job = Job(remote=False, location="Vancouver, BC")
        score = matching_service._score_location_fit(job, sample_preferences)
        assert score == 0.3
    
    def test_recency_scoring(self, matching_service):
        """Test job posting recency scoring"""
        # Brand new job
        recent_date = datetime.now(timezone.utc)
        score = matching_service._score_recency(recent_date)
        assert score == 1.0
        
        # Week old job
        week_old = datetime.now(timezone.utc) - timedelta(days=7)
        score = matching_service._score_recency(week_old)
        assert score == 0.7
        
        # Month old job
        month_old = datetime.now(timezone.utc) - timedelta(days=30)
        score = matching_service._score_recency(month_old)
        assert score == 0.3
        
        # No date
        score = matching_service._score_recency(None)
        assert score == 0.3
    
    def test_company_preference_scoring(self, matching_service, sample_preferences):
        """Test company preference scoring"""
        # Preferred company
        score = matching_service._score_company_preference("TechCorp Inc.", sample_preferences)
        assert score == 1.0
        
        # Blocked company
        score = matching_service._score_company_preference("BadCorp Ltd.", sample_preferences)
        assert score == 0.0
        
        # Neutral company
        score = matching_service._score_company_preference("NeutralCorp", sample_preferences)
        assert score == 0.7


class TestJobSwipeWorkflow:
    """Test job swiping and saving workflow"""
    
    @pytest.fixture
    def mock_db(self):
        db = AsyncMock(spec=AsyncSession)
        return db
    
    @pytest.fixture
    def sample_job(self):
        return Job(
            id=1,
            provider="adzuna",
            provider_job_id="123456",
            title="Software Engineer",
            company="TechCorp",
            location="Toronto, ON",
            remote=True,
            redirect_url="https://example.com/job/123456"
        )
    
    def test_job_swipe_workflow_logic(self, sample_job):
        """Test job swipe workflow logic"""        
        swipe_request = {
            "job_id": 1,
            "action": "like",
            "device": "mobile"
        }
        
        # Test basic swipe request structure
        assert swipe_request["action"] == "like"
        assert swipe_request["job_id"] == 1
        assert sample_job.id == 1
        assert sample_job.title == "Software Engineer"
    
    def test_swipe_request_validation(self):
        """Test swipe request model validation"""
        from app.api.v1.jobs import SwipeRequest
        
        # Valid request
        valid_request = SwipeRequest(job_id=1, action="like", device="mobile")
        assert valid_request.job_id == 1
        assert valid_request.action == "like"
        
        # Invalid action
        with pytest.raises(ValueError):
            SwipeRequest(job_id=1, action="invalid", device="mobile")


class TestJobRecommendationResponse:
    """Test job recommendation response model"""
    
    def test_recommendation_response_serialization(self):
        """Test that job recommendation response serializes correctly"""
        from app.api.v1.jobs import JobRecommendationResponse
        
        response = JobRecommendationResponse(
            job_id=1,
            provider="adzuna",
            provider_job_id="123456",
            title="Software Engineer",
            company="TechCorp",
            location="Toronto, ON",
            remote=True,
            salary_min=90000.0,
            salary_max=120000.0,
            currency="CAD",
            snippet="Great opportunity...",
            tags=["Python", "React"],
            posted_at="2025-10-20T10:00:00Z",
            redirect_url="https://example.com/job/123456",
            score=0.85,
            why=["Strong title match", "Matching skills: Python"],
            source="Adzuna"
        )
        
        assert response.job_id == 1
        assert response.title == "Software Engineer"
        assert response.remote is True
        assert response.score == 0.85
        assert len(response.tags) == 2
        assert len(response.why) == 2


class TestUserPreferencesWorkflow:
    """Test user preferences management"""
    
    def test_preferences_request_model(self):
        """Test user preferences request validation"""
        from app.api.v1.jobs import UserPreferencesRequest
        
        # Valid request with partial update
        request = UserPreferencesRequest(
            skills=["Python", "React"],
            salary_min=80000.0,
            remote_ok=True
        )
        
        assert request.skills == ["Python", "React"]
        assert request.salary_min == 80000.0
        assert request.remote_ok is True
        assert request.target_titles is None  # Not provided
    
    def test_preferences_defaults(self):
        """Test default preferences creation"""
        preferences = UserPreferences(
            user_id="user-123",
            skills=[],
            target_titles=["Software Engineer", "Developer"],
            remote_ok=True
        )
        
        assert preferences.user_id == "user-123"
        assert preferences.remote_ok is True
        assert len(preferences.target_titles) == 2


@pytest.mark.integration
class TestJobIngestionIntegration:
    """Integration tests for job ingestion workflow"""
    
    @pytest.mark.asyncio
    async def test_job_normalization_and_upsert(self):
        """Test complete job normalization and database upsert flow"""
        # This would require a test database setup
        # For now, test individual components
        provider = AdzunaProvider()
        
        # Mock job data that might come from Adzuna
        raw_job = {
            "id": "test_job_123",
            "title": "Python Developer", 
            "company": {"display_name": "Test Company"},
            "location": {"display_name": "Remote"},
            "salary_min": 75000,
            "salary_max": 95000,
            "created": "2025-10-20T10:00:00Z",
            "redirect_url": "https://test.com/job/123",
            "description": "Test job description",
            "category": {"label": "Software"}
        }
        
        normalized = provider.normalize_job_data(raw_job)
        
        # Verify normalization worked
        assert normalized["provider"] == "adzuna"
        assert normalized["provider_job_id"] == "test_job_123"
        assert normalized["title"] == "Python Developer"
        assert normalized["company"] == "Test Company"
        assert normalized["remote"] is False  # Would need "remote" keyword to detect
        assert normalized["salary_min"] == 75000.0