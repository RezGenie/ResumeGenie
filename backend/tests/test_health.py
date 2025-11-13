import pytest
from fastapi.testclient import TestClient

import importlib
try:
    app_module = importlib.import_module("backend.main")
except ImportError:
    # When running inside the backend Docker image where /app is the backend dir
    app_module = importlib.import_module("main")
app = getattr(app_module, "app")


@pytest.fixture
def client():
    # Disable startup/shutdown events (e.g., DB init) during unit tests
    try:
        app.router.on_startup.clear()
        app.router.on_shutdown.clear()
    except Exception:
        pass
    with TestClient(app) as c:
        yield c


def test_root_endpoint(client):
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    # Basic structure checks
    assert data.get("message") == "Welcome to RezGenie API"
    assert data.get("version") == "1.0.0"
    assert "health" in data


def test_health_endpoint_with_mocked_db(monkeypatch, client):
    # Mock the async get_db_health to avoid real DB connection during tests
    async def fake_get_db_health():
        return {"connection": "ok", "type": "postgresql"}

    # Apply monkeypatch in a way that works both locally and in Docker
    import importlib
    try:
        db_module = importlib.import_module("backend.app.core.database")
    except ImportError:
        db_module = importlib.import_module("app.core.database")
    monkeypatch.setattr(db_module, "get_db_health", fake_get_db_health, raising=True)

    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()

    # The overall status may be 'degraded' if OPENAI_API_KEY isn't set; accept both
    assert data.get("status") in {"healthy", "degraded"}
    assert "timestamp" in data
    assert "services" in data

    services = data["services"]
    assert "database" in services
    assert services["database"]["status"] == "healthy"

    # OpenAI config may or may not be present; ensure the key exists and status is one of the expected values
    assert "openai" in services
    assert services["openai"]["status"] in {"configured", "not_configured", "error"}


def test_api_v1_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload.get("status") == "healthy"
    assert payload.get("service") == "RezGenie API"
    assert payload.get("version") == "1.0.0"
