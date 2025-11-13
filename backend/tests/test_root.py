def test_root_endpoint(client):
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()

    # Expected keys
    for key in ("message", "version", "docs", "health"):
        assert key in data

    assert data["message"].lower().startswith("welcome to rezgenie api")
    assert data["version"] == "1.0.0"
    assert data["health"] == "/health"
