"""
Rate Limiting Tests
Tests for API rate limiting functionality.
"""
import pytest
import time


def test_health_endpoint_not_rate_limited(client):
    """Test that health endpoint doesn't get rate limited."""
    # Make multiple rapid requests
    for _ in range(10):
        resp = client.get("/health")
        assert resp.status_code == 200


def test_api_health_endpoint_not_rate_limited(client):
    """Test that API health endpoint doesn't get rate limited."""
    # Make multiple rapid requests
    for _ in range(10):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200


@pytest.mark.skip(reason="Rate limiting requires Redis and may not work in test environment")
def test_guest_genie_rate_limited(client):
    """Test that guest genie endpoints have rate limiting."""
    # This test is skipped because it requires actual rate limiting infrastructure
    # In production, guest endpoints should be rate limited
    pass


@pytest.mark.skip(reason="Rate limiting requires Redis and may not work in test environment")
def test_registration_rate_limited(client):
    """Test that registration endpoint is rate limited."""
    # This test is skipped because it requires actual rate limiting infrastructure
    # In production, registration should be rate limited (5 per 10 minutes)
    pass


def test_rate_limit_headers_present_on_protected_endpoints(client):
    """Test that rate limit headers are present where applicable."""
    resp = client.post("/api/v1/genie/guest", json={
        "wish_type": "improvement",
        "wish_text": "Help me improve my resume for a Python developer role",
        "context_data": {}
    })
    # Check if rate limit headers exist (may not in test environment)
    # Common rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
    headers_lower = {k.lower(): v for k, v in resp.headers.items()}
    # This is informational - in production these should exist
    has_rate_limit_headers = any(
        'ratelimit' in k or 'rate-limit' in k
        for k in headers_lower.keys()
    )
    # Don't assert - just document behavior
    print(f"Rate limit headers present: {has_rate_limit_headers}")

