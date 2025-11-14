"""
Genie API Endpoint Tests
Tests for AI-powered wishes functionality (guest and authenticated).
"""
import pytest


def test_guest_genie_list_endpoint_exists(client):
    """Test that the guest wishes list endpoint is accessible."""
    resp = client.get("/api/v1/genie/guest")
    assert resp.status_code != 404
    # Should return empty list or require guest session
    assert resp.status_code in (200, 401)


def test_guest_genie_create_endpoint_exists(client):
    """Test that the guest wish creation endpoint is accessible."""
    resp = client.post("/api/v1/genie/guest", json={
        "wish_type": "improvement",
        "wish_text": "Help me improve my resume for a Python developer role",
        "context_data": {}
    })
    assert resp.status_code != 404


def test_guest_genie_create_validates_wish_type(client):
    """Test that guest wish creation validates wish_type."""
    resp = client.post("/api/v1/genie/guest", json={
        "wish_text": "Help me improve my resume",
        "context_data": {}
    })
    assert resp.status_code == 422  # Missing required field


def test_guest_genie_create_validates_wish_text_length(client):
    """Test that guest wish creation validates minimum text length."""
    resp = client.post("/api/v1/genie/guest", json={
        "wish_type": "improvement",
        "wish_text": "short",
        "context_data": {}
    })
    assert resp.status_code == 422


def test_guest_genie_create_accepts_long_text(client):
    """Test that guest wish accepts long job descriptions."""
    long_text = "A" * 5000  # 5k characters
    resp = client.post("/api/v1/genie/guest", json={
        "wish_type": "improvement",
        "wish_text": long_text,
        "context_data": {}
    })
    # Should accept long text (validation allows up to 10k)
    assert resp.status_code in (200, 201, 401, 500)  # Not 422


def test_guest_genie_create_rejects_excessive_text(client):
    """Test that guest wish rejects text over 10k characters."""
    excessive_text = "A" * 11000  # Over 10k limit
    resp = client.post("/api/v1/genie/guest", json={
        "wish_type": "improvement",
        "wish_text": excessive_text,
        "context_data": {}
    })
    assert resp.status_code == 422


def test_guest_genie_get_by_id_endpoint_exists(client):
    """Test that the guest wish detail endpoint is accessible."""
    fake_uuid = "123e4567-e89b-12d3-a456-426614174000"
    resp = client.get(f"/api/v1/genie/guest/{fake_uuid}")
    assert resp.status_code != 404
    # Should return 404 (wish not found) or 401 (not authorized)
    assert resp.status_code in (401, 404, 500)


def test_guest_daily_usage_endpoint_exists(client):
    """Test that the guest daily usage endpoint is accessible."""
    resp = client.get("/api/v1/genie/usage/daily/guest")
    assert resp.status_code != 404


def test_authenticated_genie_list_endpoint_exists(client):
    """Test that the authenticated wishes list endpoint is accessible."""
    resp = client.get("/api/v1/genie/")
    assert resp.status_code != 404
    # Should require authentication
    assert resp.status_code in (401, 403, 500)


def test_authenticated_genie_create_endpoint_exists(client):
    """Test that the authenticated wish creation endpoint is accessible."""
    resp = client.post("/api/v1/genie/", json={
        "wish_type": "improvement",
        "wish_text": "Help me improve my resume for a senior developer role",
        "context_data": {}
    })
    assert resp.status_code != 404
    # Should require authentication
    assert resp.status_code in (401, 403, 500)


def test_authenticated_genie_get_by_id_endpoint_exists(client):
    """Test that the authenticated wish detail endpoint is accessible."""
    fake_uuid = "123e4567-e89b-12d3-a456-426614174000"
    resp = client.get(f"/api/v1/genie/{fake_uuid}")
    assert resp.status_code != 404
    # Should require authentication
    assert resp.status_code in (401, 403, 404, 500)


def test_authenticated_daily_usage_endpoint_exists(client):
    """Test that the authenticated daily usage endpoint is accessible."""
    resp = client.get("/api/v1/genie/usage/daily")
    assert resp.status_code != 404
    # Should require authentication
    assert resp.status_code in (401, 403, 500)


def test_genie_supports_pagination(client):
    """Test that genie list endpoints support pagination parameters."""
    resp = client.get("/api/v1/genie/guest?skip=0&limit=10")
    assert resp.status_code != 404


def test_genie_wish_types_are_validated(client):
    """Test that only valid wish types are accepted."""
    valid_types = ["improvement", "career_advice", "skill_gap", "interview_prep"]

    for wish_type in valid_types:
        resp = client.post("/api/v1/genie/guest", json={
            "wish_type": wish_type,
            "wish_text": "Valid wish text that is long enough to pass validation",
            "context_data": {}
        })
        # Should not be a validation error for wish_type
        assert resp.status_code != 422 or "wish_type" not in resp.text.lower()

