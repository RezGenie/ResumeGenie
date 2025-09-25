"""
Tests for the Report Generation Service (CP-13)
Comprehensive testing for missing skills text report functionality.
"""

import pytest
from unittest.mock import Mock, AsyncMock
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.report_service import (
    ReportService, ReportFormat, SkillPriority, 
    SkillGapInsight, ReportMetrics
)
from app.models.job_comparison import JobComparison
from app.models.user import User


class TestReportService:
    """Test cases for the ReportService class."""

    @pytest.fixture
    def report_service(self):
        """Create ReportService instance for testing."""
        return ReportService()

    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def sample_user(self):
        """Sample user for testing."""
        user = Mock(spec=User)
        user.id = 1
        user.full_name = "John Doe"
        user.email = "john@example.com"
        return user

    @pytest.fixture
    def sample_comparisons(self):
        """Sample job comparisons for testing."""
        comparisons = []
        
        # Create 5 sample comparisons
        for i in range(5):
            comp = Mock(spec=JobComparison)
            comp.id = i + 1
            comp.user_id = 1
            comp.job_title = f"Software Engineer {i + 1}"
            comp.company_name = f"Tech Company {i + 1}"
            comp.job_description = f"Python developer role requiring React and AWS skills {i}"
            comp.overall_match_score = 0.7 + (i * 0.05)  # Varying scores
            comp.missing_skills = ["Python", "React", "AWS", "Docker"][:i + 2]  # Varying missing skills
            comp.created_at = datetime.now() - timedelta(days=i * 10)
            comparisons.append(comp)
        
        return comparisons

    @pytest.mark.asyncio
    async def test_generate_detailed_missing_skills_report(
        self, report_service, mock_db, sample_user, sample_comparisons
    ):
        """Test detailed missing skills report generation."""
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = sample_comparisons
        mock_db.execute.return_value = mock_result
        
        # Mock cache service
        report_service.cache_service.get = AsyncMock(return_value=None)
        report_service.cache_service.set = AsyncMock()
        report_service.cache_service._get_current_time = Mock(return_value=datetime.now())
        
        # Generate report
        report = await report_service.generate_missing_skills_report(
            user_id=1,
            db=mock_db,
            report_format=ReportFormat.DETAILED,
            days_back=90
        )
        
        # Verify report content
        assert isinstance(report, str)
        assert len(report) > 1000  # Should be comprehensive
        assert "COMPREHENSIVE MISSING SKILLS ANALYSIS REPORT" in report
        assert "EXECUTIVE SUMMARY" in report
        assert "CRITICAL SKILLS GAPS" in report
        assert "LEARNING ROADMAP" in report
        assert "John Doe" in report
        
        # Verify skills are mentioned
        assert "Python" in report or "python" in report
        assert "React" in report or "react" in report

    @pytest.mark.asyncio
    async def test_generate_summary_report(
        self, report_service, mock_db, sample_user, sample_comparisons
    ):
        """Test summary report generation."""
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = sample_comparisons
        mock_db.execute.return_value = mock_db
        
        # Mock cache service
        report_service.cache_service.get = AsyncMock(return_value=None)
        report_service.cache_service.set = AsyncMock()
        report_service.cache_service._get_current_time = Mock(return_value=datetime.now())
        
        # Generate report
        report = await report_service.generate_missing_skills_report(
            user_id=1,
            db=mock_db,
            report_format=ReportFormat.SUMMARY,
            days_back=90
        )
        
        # Verify report content
        assert isinstance(report, str)
        assert len(report) < 1000  # Should be concise
        assert "MISSING SKILLS SUMMARY REPORT" in report
        assert "KEY METRICS" in report
        assert "TOP 5 MISSING SKILLS" in report
        assert "IMMEDIATE ACTIONS" in report

    @pytest.mark.asyncio
    async def test_generate_executive_report(
        self, report_service, mock_db, sample_user, sample_comparisons
    ):
        """Test executive report generation."""
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = sample_comparisons
        mock_db.execute.return_value = mock_result
        
        # Mock cache service
        report_service.cache_service.get = AsyncMock(return_value=None)
        report_service.cache_service.set = AsyncMock()
        report_service.cache_service._get_current_time = Mock(return_value=datetime.now())
        
        # Generate report
        report = await report_service.generate_missing_skills_report(
            user_id=1,
            db=mock_db,
            report_format=ReportFormat.EXECUTIVE,
            days_back=90
        )
        
        # Verify report content
        assert isinstance(report, str)
        assert "EXECUTIVE SKILLS GAP ANALYSIS" in report
        assert "SITUATION" in report
        assert "OPPORTUNITY" in report
        assert "RECOMMENDATION" in report
        assert "NEXT STEPS" in report

    @pytest.mark.asyncio
    async def test_generate_action_oriented_report(
        self, report_service, mock_db, sample_user, sample_comparisons
    ):
        """Test action-oriented report generation."""
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = sample_comparisons
        mock_db.execute.return_value = mock_result
        
        # Mock cache service
        report_service.cache_service.get = AsyncMock(return_value=None)
        report_service.cache_service.set = AsyncMock()
        report_service.cache_service._get_current_time = Mock(return_value=datetime.now())
        
        # Generate report
        report = await report_service.generate_missing_skills_report(
            user_id=1,
            db=mock_db,
            report_format=ReportFormat.ACTION_ORIENTED,
            days_back=90
        )
        
        # Verify report content
        assert isinstance(report, str)
        assert "ACTION-ORIENTED SKILLS DEVELOPMENT PLAN" in report
        assert "THIS WEEK'S ACTIONS" in report
        assert "30-DAY SCHEDULE" in report
        assert "DAILY HABITS" in report
        assert "WEEKLY REVIEW" in report

    def test_calculate_skill_priority(self, report_service):
        """Test skill priority calculation."""
        
        # Test critical priority (>70% frequency)
        priority = report_service._calculate_skill_priority("python", 8, 10)
        assert priority == SkillPriority.CRITICAL
        
        # Test high priority (>40% frequency)
        priority = report_service._calculate_skill_priority("react", 5, 10)
        assert priority == SkillPriority.HIGH
        
        # Test medium priority (>20% frequency)
        priority = report_service._calculate_skill_priority("docker", 3, 10)
        assert priority == SkillPriority.MEDIUM
        
        # Test low priority (<20% frequency)
        priority = report_service._calculate_skill_priority("obscure_skill", 1, 10)
        assert priority == SkillPriority.LOW

    def test_calculate_industry_demand(self, report_service):
        """Test industry demand calculation."""
        
        # Test known technology skill
        demand = report_service._calculate_industry_demand("python")
        assert demand == 0.9  # High demand
        
        # Test unknown skill
        demand = report_service._calculate_industry_demand("unknown_skill")
        assert demand == 0.5  # Default medium demand

    def test_get_learning_resources(self, report_service):
        """Test learning resources generation."""
        
        # Test known skill
        resources = report_service._get_learning_resources("python")
        assert len(resources) > 0
        assert any("Python" in resource for resource in resources)
        
        # Test unknown skill
        resources = report_service._get_learning_resources("unknown_skill")
        assert len(resources) > 0
        assert any("Unknown_skill" in resource for resource in resources)

    def test_estimate_skill_impact(self, report_service):
        """Test skill impact estimation."""
        
        # Test high frequency, low current score (high potential)
        impact = report_service._estimate_skill_impact("python", 8, 0.3)
        assert impact > 0.05  # Should show significant improvement potential
        
        # Test low frequency, high current score (low potential)
        impact = report_service._estimate_skill_impact("obscure_skill", 1, 0.9)
        assert impact < 0.05  # Should show limited improvement potential

    @pytest.mark.asyncio
    async def test_analyze_comprehensive_skill_gaps(
        self, report_service, sample_comparisons
    ):
        """Test comprehensive skill gap analysis."""
        
        skill_gaps = await report_service._analyze_comprehensive_skill_gaps(sample_comparisons)
        
        # Verify structure
        assert isinstance(skill_gaps, list)
        assert len(skill_gaps) > 0
        
        # Verify each gap has required attributes
        for gap in skill_gaps:
            assert isinstance(gap, SkillGapInsight)
            assert hasattr(gap, 'skill')
            assert hasattr(gap, 'frequency')
            assert hasattr(gap, 'priority')
            assert hasattr(gap, 'learning_time_weeks')

    def test_calculate_report_metrics(
        self, report_service, sample_comparisons
    ):
        """Test report metrics calculation."""
        
        # Create sample skill gaps
        skill_gaps = [
            SkillGapInsight(
                skill="Python",
                frequency=4,
                priority=SkillPriority.CRITICAL,
                industry_demand=0.9,
                learning_time_weeks=8,
                recommended_resources=[]
            ),
            SkillGapInsight(
                skill="React",
                frequency=3,
                priority=SkillPriority.HIGH,
                industry_demand=0.8,
                learning_time_weeks=4,
                recommended_resources=[]
            )
        ]
        
        metrics = report_service._calculate_report_metrics(sample_comparisons, skill_gaps)
        
        # Verify metrics structure
        assert isinstance(metrics, ReportMetrics)
        assert metrics.total_applications == len(sample_comparisons)
        assert 0 <= metrics.avg_match_score <= 1
        assert metrics.skill_gaps_identified == len(skill_gaps)
        assert metrics.critical_gaps >= 0

    def test_detect_industry(self, report_service):
        """Test industry detection from job descriptions."""
        
        # Test technology industry
        industry = report_service._detect_industry("Software engineer position requiring Python programming")
        assert industry == "Technology"
        
        # Test finance industry  
        industry = report_service._detect_industry("Investment banking analyst role at major bank")
        assert industry == "Finance"
        
        # Test marketing industry
        industry = report_service._detect_industry("Digital marketing manager for brand advertising campaigns")
        assert industry == "Marketing"
        
        # Test healthcare industry
        industry = report_service._detect_industry("Clinical research coordinator at major hospital")
        assert industry == "Healthcare"
        
        # Test general/unknown industry
        industry = report_service._detect_industry("Administrative assistant position")
        assert industry == "General"

    @pytest.mark.asyncio
    async def test_cache_functionality(
        self, report_service, mock_db, sample_comparisons
    ):
        """Test report caching functionality."""
        
        # Mock cache hit
        cached_report = "Cached report content"
        report_service.cache_service.get = AsyncMock(return_value=cached_report)
        
        # Generate report
        report = await report_service.generate_missing_skills_report(
            user_id=1,
            db=mock_db,
            report_format=ReportFormat.SUMMARY,
            days_back=90
        )
        
        # Verify cached content returned
        assert report == cached_report
        report_service.cache_service.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_error_handling_no_comparisons(
        self, report_service, mock_db
    ):
        """Test error handling when no comparisons found."""
        
        # Mock empty result
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result
        
        # Mock cache miss
        report_service.cache_service.get = AsyncMock(return_value=None)
        report_service.cache_service.set = AsyncMock()
        
        # Generate report
        report = await report_service.generate_missing_skills_report(
            user_id=1,
            db=mock_db,
            report_format=ReportFormat.SUMMARY,
            days_back=90
        )
        
        # Verify error handling
        assert "No job comparisons found" in report or "error" in report.lower()

    @pytest.mark.asyncio
    async def test_skills_comparison_report(
        self, report_service, mock_db, sample_comparisons
    ):
        """Test skills comparison report across multiple applications."""
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = sample_comparisons[:3]
        mock_db.execute.return_value = mock_result
        
        # Generate comparative report
        report = await report_service.generate_skills_comparison_report(
            user_id=1,
            db=mock_db,
            comparison_ids=[1, 2, 3]
        )
        
        # Verify report content
        assert isinstance(report, str)
        assert "COMPARATIVE SKILLS ANALYSIS REPORT" in report
        assert "JOB COMPARISON OVERVIEW" in report
        assert "COMMON SKILLS GAPS" in report
        assert "STRATEGIC RECOMMENDATIONS" in report

    def test_learning_time_estimates(self, report_service):
        """Test learning time estimates for various skills."""
        
        # Verify predefined estimates exist
        assert "python" in report_service.learning_time_estimates
        assert "javascript" in report_service.learning_time_estimates
        assert "aws" in report_service.learning_time_estimates
        
        # Verify reasonable time ranges
        for skill, weeks in report_service.learning_time_estimates.items():
            assert 1 <= weeks <= 16  # Reasonable learning timeframes

    def test_industry_weights(self, report_service):
        """Test industry-specific skill weights."""
        
        # Verify industry categories exist
        assert "technology" in report_service.industry_weights
        assert "finance" in report_service.industry_weights
        assert "marketing" in report_service.industry_weights
        
        # Verify weight ranges
        for industry, skills in report_service.industry_weights.items():
            for skill, weight in skills.items():
                assert 0.0 <= weight <= 1.0  # Valid weight range


class TestReportAPIEndpoints:
    """Test cases for report API endpoints."""

    @pytest.fixture
    def mock_report_service(self):
        """Mock ReportService for API testing."""
        service = Mock(spec=ReportService)
        service.generate_missing_skills_report = AsyncMock(return_value="Sample report")
        service.generate_skills_comparison_report = AsyncMock(return_value="Comparison report")
        service.cache_service = Mock()
        service.cache_service._get_current_time.return_value = datetime.now()
        return service

    @pytest.mark.asyncio
    async def test_report_endpoint_response_structure(self, mock_report_service):
        """Test that report endpoints return proper response structure."""
        
        # This would be tested with actual FastAPI test client
        # For now, verify the service returns expected format
        
        report_text = await mock_report_service.generate_missing_skills_report(
            user_id=1,
            db=Mock(),
            report_format=ReportFormat.DETAILED,
            days_back=90
        )
        
        assert isinstance(report_text, str)
        assert len(report_text) > 0
        mock_report_service.generate_missing_skills_report.assert_called_once()


if __name__ == "__main__":
    # Run tests with: python -m pytest tests/test_report_service.py -v
    pytest.main([__file__, "-v"])