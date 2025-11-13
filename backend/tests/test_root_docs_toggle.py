import importlib


def test_root_docs_message_changes_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEBUG", "false")

    cfg = importlib.import_module("app.core.config")
    if getattr(cfg.get_settings, "cache_clear", None):
        cfg.get_settings.cache_clear()  # type: ignore[attr-defined]
    importlib.reload(cfg)

    main = importlib.reload(importlib.import_module("main"))

    from fastapi.testclient import TestClient
    with TestClient(main.app) as c:
        r = c.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["docs"] == "Documentation not available in production"
