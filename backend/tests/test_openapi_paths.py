def test_openapi_contains_core_paths(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    paths = r.json().get("paths", {})
    assert "/health" in paths
    assert "/api/v1/health" in paths
