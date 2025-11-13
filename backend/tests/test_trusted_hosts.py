import importlib


def test_invalid_host_rejected_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")

    cfg = importlib.import_module("app.core.config")
    if getattr(cfg.get_settings, "cache_clear", None):
        cfg.get_settings.cache_clear()  # type: ignore[attr-defined]
    importlib.reload(cfg)

    main = importlib.reload(importlib.import_module("main"))

    from fastapi.testclient import TestClient
    with TestClient(main.app) as c:
        r = c.get("/", headers={"Host": "evil.com"})
        assert r.status_code in (400, 421)
