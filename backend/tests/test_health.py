def test_health_endpoint_success(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()

    # High-level keys
    assert data["status"] in ("healthy", "degraded")
    assert isinstance(data["timestamp"], (int, float))
    assert "services" in data and isinstance(data["services"], dict)

    # DB health is mocked in conftest to return test payload
    db = data["services"].get("database")
    assert db is not None
    assert db["status"] == "healthy"
    assert "details" in db
    assert db["details"]["connection"] == "ok"
    assert db["details"]["type"] in ("postgresql", "test")

    # OpenAI should be reported configured because we set OPENAI_API_KEY in conftest
    openai = data["services"].get("openai")
    assert openai is not None
    assert openai["status"] == "configured"

    # If DB is healthy and OpenAI configured, overall should be healthy
    assert data["status"] == "healthy"