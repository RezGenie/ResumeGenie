def test_api_router_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()

    assert data == {
        "status": "healthy",
        "service": "RezGenie API",
        "version": "1.0.0",
    }
