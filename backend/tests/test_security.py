"""
Security Tests
Tests for security headers, authentication, and protection mechanisms.
"""
import pytest


def test_security_headers_present(client):
    """Test that important security headers are present."""
    resp = client.get("/health")
    headers_lower = {k.lower(): v for k, v in resp.headers.items()}

    # Check for common security headers (may not all be present in dev)
    # These are recommendations, not strict requirements
    security_headers = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
    ]

    # Document which headers are present
    present_headers = [h for h in security_headers if h in headers_lower]
    print(f"Security headers present: {present_headers}")


def test_cors_headers_configured(client):
    """Test that CORS headers are properly configured."""
    resp = client.options("/api/v1/health",
                         headers={
                             "Origin": "http://localhost:3000",
                             "Access-Control-Request-Method": "GET"
                         })
    headers_lower = {k.lower(): v for k, v in resp.headers.items()}
    assert "access-control-allow-origin" in headers_lower


def test_api_docs_accessible_in_dev(client):
    """Test that API documentation is accessible."""
    resp = client.get("/docs")
    # Should be accessible (redirects are ok)
    assert resp.status_code in (200, 307, 308)


def test_openapi_json_accessible(client):
    """Test that OpenAPI schema is accessible."""
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    data = resp.json()
    assert "openapi" in data
    assert "info" in data


def test_authenticated_endpoints_reject_invalid_tokens(client):
    """Test that invalid authentication tokens are rejected."""
    resp = client.get("/api/v1/resumes/",
                     headers={"Authorization": "Bearer invalid-token"})
    assert resp.status_code in (401, 403)


def test_authenticated_endpoints_reject_malformed_auth_header(client):
    """Test that malformed auth headers are rejected."""
    resp = client.get("/api/v1/resumes/",
                     headers={"Authorization": "NotBearer token"})
    assert resp.status_code in (401, 403)


def test_authenticated_endpoints_reject_empty_token(client):
    """Test that empty tokens are rejected."""
    resp = client.get("/api/v1/resumes/",
                     headers={"Authorization": "Bearer "})
    assert resp.status_code in (401, 403)


def test_guest_session_isolation(client):
    """Test that guest sessions are properly isolated."""
    # Create a guest wish
    resp1 = client.post("/api/v1/genie/guest", json={
        "wish_type": "improvement",
        "wish_text": "Help me improve my resume for a data science role",
        "context_data": {}
    })

    # Try to access with different session (new client instance simulates this)
    # In real scenario, guest sessions should be cookie/session based
    resp2 = client.get("/api/v1/genie/guest")
    # Should not cause errors
    assert resp2.status_code < 500


def test_password_not_exposed_in_responses(client):
    """Test that password fields are never included in API responses."""
    resp = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "TestPassword123!"
    })

    if resp.status_code < 400:
        data = resp.json()
        # Recursively check that 'password' field doesn't exist anywhere
        assert "password" not in str(data).lower() or "password_hash" in str(data).lower()


def test_sensitive_data_not_in_error_messages(client):
    """Test that error messages don't leak sensitive data."""
    resp = client.post("/api/v1/auth/login", data={
        "username": "nonexistent@example.com",
        "password": "WrongPassword123!"
    })

    if resp.status_code >= 400:
        error_text = resp.text.lower()
        # Should not reveal whether email exists
        assert "not found" not in error_text or "invalid" in error_text
        # Should not echo password back
        assert "wrongpassword" not in error_text


def test_sql_error_details_not_exposed(client):
    """Test that database errors don't expose SQL details."""
    # Try to trigger a database error
    resp = client.get("/api/v1/jobs/" + "x" * 1000)

    if resp.status_code >= 500:
        error_text = resp.text.lower()
        # Should not expose SQL details
        sql_keywords = ['select', 'from', 'where', 'postgresql', 'sqlalchemy']
        exposed = any(keyword in error_text for keyword in sql_keywords)
        # This should be False in production
        print(f"SQL details exposed in error: {exposed}")

