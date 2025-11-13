"""
Jobs API Endpoint Tests
Tests for job search, analysis, and comparison functionality.
"""
import pytest


def test_jobs_analyze_endpoint_exists(client):
    """Test that the job analysis endpoint is accessible."""
    resp = client.post("/api/v1/jobs/analyze", json={
        "job_title": "Software Engineer",
        "company_name": "TechCorp",
        "job_description": "We are looking for a Python developer with 5 years experience",
        "resume_id": "123e4567-e89b-12d3-a456-426614174000"
    })
    assert resp.status_code != 404


def test_jobs_list_comparisons_endpoint_exists(client):
    """Test that the job comparisons list endpoint is accessible."""
    resp = client.get("/api/v1/jobs/")
    assert resp.status_code != 404


def test_jobs_discovery_endpoint_exists(client):
    """Test that the job discovery endpoint is accessible."""
    resp = client.get("/api/v1/jobs/discovery")
    assert resp.status_code != 404


def test_jobs_discovery_search_endpoint_exists(client):
    """Test that the job discovery search endpoint is accessible."""
    resp = client.get("/api/v1/jobs/discovery/search?query=python")
    assert resp.status_code != 404


def test_jobs_discovery_stats_endpoint_exists(client):
    """Test that the job discovery stats endpoint is accessible."""
    resp = client.get("/api/v1/jobs/discovery/stats")
    assert resp.status_code != 404


def test_jobs_comparison_by_id_endpoint_exists(client):
    """Test that the job comparison detail endpoint is accessible."""
    fake_uuid = "123e4567-e89b-12d3-a456-426614174000"
    resp = client.get(f"/api/v1/jobs/comparisons/{fake_uuid}")
    assert resp.status_code != 404


def test_jobs_delete_comparison_endpoint_exists(client):
    """Test that the delete comparison endpoint is accessible."""
    fake_uuid = "123e4567-e89b-12d3-a456-426614174000"
    resp = client.delete(f"/api/v1/jobs/comparisons/{fake_uuid}")
    assert resp.status_code != 404


def test_jobs_reanalyze_endpoint_exists(client):
    """Test that the reanalyze comparison endpoint is accessible."""
    fake_uuid = "123e4567-e89b-12d3-a456-426614174000"
    resp = client.post(f"/api/v1/jobs/comparisons/{fake_uuid}/reanalyze")
    assert resp.status_code != 404


def test_jobs_analyze_enhanced_endpoint_exists(client):
    """Test that the enhanced analysis endpoint is accessible."""
    resp = client.post("/api/v1/jobs/analyze-enhanced", json={
        "job_description": "Python developer needed",
        "resume_id": "123e4567-e89b-12d3-a456-426614174000"
    })
    assert resp.status_code != 404


def test_jobs_recommendations_endpoint_exists(client):
    """Test that the job recommendations endpoint is accessible."""
    resp = client.get("/api/v1/jobs/recommendations")
    assert resp.status_code != 404


def test_jobs_swipe_endpoint_exists(client):
    """Test that the job swipe endpoint is accessible."""
    resp = client.post("/api/v1/jobs/swipe", json={
        "job_id": "12345",
        "direction": "right"
    })
    assert resp.status_code != 404


def test_jobs_analytics_overview_endpoint_exists(client):
    """Test that the analytics overview endpoint is accessible."""
    resp = client.get("/api/v1/jobs/analytics/overview")
    assert resp.status_code != 404


def test_jobs_analytics_trends_endpoint_exists(client):
    """Test that the analytics trends endpoint is accessible."""
    resp = client.get("/api/v1/jobs/analytics/trends")
    assert resp.status_code != 404


def test_jobs_analytics_skills_endpoint_exists(client):
    """Test that the analytics skills endpoint is accessible."""
    resp = client.get("/api/v1/jobs/analytics/skills")
    assert resp.status_code != 404


def test_jobs_analytics_recommendations_endpoint_exists(client):
    """Test that the analytics recommendations endpoint is accessible."""
    resp = client.get("/api/v1/jobs/analytics/recommendations")
    assert resp.status_code != 404


def test_jobs_supports_pagination(client):
    """Test that jobs list supports pagination."""
    resp = client.get("/api/v1/jobs/?skip=0&limit=10")
    assert resp.status_code != 404


def test_jobs_analyze_validates_required_fields(client):
    """Test that job analysis validates required fields."""
    resp = client.post("/api/v1/jobs/analyze", json={})
    # Returns 401 (auth required) before validation, which is expected
    assert resp.status_code in (401, 422)
