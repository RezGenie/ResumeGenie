import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_root_ok():
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"].lower().startswith("welcome")
    assert "version" in data
    assert "health" in data


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "services" in data
    assert "timestamp" in data
