def test_cors_preflight_allows_origin(client):
    r = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r.status_code in (200, 204)
    headers = {k.lower(): v for k, v in r.headers.items()}
    assert "access-control-allow-origin" in headers
