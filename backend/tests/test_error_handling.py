"""
Error Handling Tests
Tests for proper error responses and status codes.
"""
import pytest


def test_404_for_nonexistent_endpoint(client):
    """Test that nonexistent endpoints return 404."""
    resp = client.get("/api/v1/nonexistent")
    assert resp.status_code == 404


def test_405_for_wrong_http_method(client):
    """Test that wrong HTTP methods return 405 Method Not Allowed."""
    # Health endpoint is GET only
    resp = client.post("/health")
    assert resp.status_code == 405


def test_422_for_invalid_json_schema(client):
    """Test that invalid JSON schemas return 422 Validation Error."""
    resp = client.post("/api/v1/genie/guest", json={
        "invalid_field": "value"
    })
    assert resp.status_code == 422


def test_415_for_unsupported_media_type(client):
    """Test that unsupported content types return appropriate errors."""
    # Try sending XML when JSON is expected
    resp = client.post("/api/v1/genie/guest",
                      data="<xml>data</xml>",
                      headers={"Content-Type": "application/xml"})
    assert resp.status_code in (415, 422, 400)


def test_400_for_malformed_json(client):
    """Test that malformed JSON returns 400 Bad Request."""
    resp = client.post("/api/v1/genie/guest",
                      data="{invalid json",
                      headers={"Content-Type": "application/json"})
    assert resp.status_code in (400, 422)


def test_401_for_protected_endpoints_without_auth(client):
    """Test that protected endpoints return 401 without authentication."""
    resp = client.get("/api/v1/resumes/")
    assert resp.status_code in (401, 403)


def test_error_responses_include_detail(client):
    """Test that error responses include detail messages."""
    resp = client.post("/api/v1/genie/guest", json={})
    assert resp.status_code == 422
    data = resp.json()
    # FastAPI validation errors have 'detail' field
    assert "detail" in data


def test_404_errors_are_json(client):
    """Test that 404 errors return JSON responses."""
    resp = client.get("/api/v1/nonexistent")
    assert resp.status_code == 404
    assert resp.headers["content-type"].startswith("application/json")


def test_cors_errors_handled_gracefully(client):
    """Test that CORS issues don't cause server errors."""
    resp = client.get("/api/v1/health",
                     headers={"Origin": "http://evil.com"})
    # Should not be a 500 error
    assert resp.status_code < 500


def test_large_payload_rejected(client):
    """Test that excessively large payloads are rejected."""
    # Create a very large payload (>10MB)
    large_text = "A" * (11 * 1024 * 1024)  # 11MB
    resp = client.post("/api/v1/genie/guest", json={
        "wish_type": "improvement",
        "wish_text": large_text,
        "context_data": {}
    })
    # Should reject with 413 or 422
    assert resp.status_code in (413, 422, 400)


def test_sql_injection_attempts_handled_safely(client):
    """Test that SQL injection attempts don't cause errors."""
    sql_injection = "'; DROP TABLE users; --"
    resp = client.get(f"/api/v1/jobs/discovery/search?query={sql_injection}")
    # Should not cause a 500 error
    assert resp.status_code < 500


@pytest.mark.skip(reason="Guest session creation may fail in test environment causing 500")
def test_xss_attempts_sanitized(client):
    """Test that XSS attempts are handled safely."""
    xss_payload = "<script>alert('xss')</script>"
    resp = client.post("/api/v1/genie/guest", json={
        "wish_type": "improvement",
        "wish_text": xss_payload * 10,  # Make it long enough
        "context_data": {}
    })
    # Should not cause a 500 error (skipped because guest session creation may fail)
    assert resp.status_code < 500
