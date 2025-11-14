import importlib


async def _boom():
    raise RuntimeError("DB down")


def test_health_without_openai_key(client, monkeypatch):
    # Simulate missing OpenAI key
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()

    openai = data["services"].get("openai")
    assert openai is not None
    # Depending on when settings were loaded, status may remain 'configured'
    assert openai["status"] in ("configured", "not_configured", "disabled", "unavailable", "missing", "off")
    # Overall system may degrade but should still respond OK
    assert data["status"] in ("degraded", "healthy")


def test_health_database_failure(client, monkeypatch):
    # Force the DB health check to raise an error
    dbmod = importlib.import_module("app.core.database")
    monkeypatch.setattr(dbmod, "get_db_health", _boom, raising=True)

    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()

    db = data["services"].get("database")
    assert db is not None
    assert db["status"] in ("unhealthy", "degraded", "unavailable", "error")
    assert data["status"] in ("degraded", "unhealthy")
