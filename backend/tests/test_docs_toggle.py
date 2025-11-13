import importlib

# python
import sys
import importlib.util
from pathlib import Path

print("cwd:", Path.cwd())
print("sys.path:", sys.path[:5])  # show first few entries
print("find_spec:", importlib.util.find_spec("app.core.config"))

# python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # adjust depth as needed
cfg = importlib.import_module("app.core.config")
def test_docs_hidden_in_production(monkeypatch):
    # Force production and disable debug so docs are hidden
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEBUG", "false")

    cfg = importlib.import_module("app.core.config")
    if getattr(cfg.get_settings, "cache_clear", None):
        cfg.get_settings.cache_clear()  # type: ignore[attr-defined]
    importlib.reload(cfg)

    main = importlib.reload(importlib.import_module("main"))

    from fastapi.testclient import TestClient
    with TestClient(main.app) as c:
        assert c.get("/docs").status_code == 404
        assert c.get("/redoc").status_code == 404
