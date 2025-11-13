import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure we run in test environment for predictable behavior
os.environ.setdefault("ENVIRONMENT", "test")
# Configure OpenAI API key so /health reports configured
os.environ.setdefault("OPENAI_API_KEY", "test-key")

# Make sure the backend root (containing main.py) is importable even in IDE/static analyzers
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture()
def client(monkeypatch):
    """Provide a FastAPI TestClient with startup/shutdown DB hooks disabled.
    This avoids requiring a live database for simple endpoint tests.
    """
    # Ensure our local 'app' package is loaded (avoid conflicts with any site-packages 'app')
    import importlib, importlib.util, sys as _sys
    from pathlib import Path as _Path
    _sys.modules.pop('app', None)
    _sys.modules.pop('app.core', None)

    _app_pkg_init = BACKEND_ROOT / 'app' / '__init__.py'
    if _app_pkg_init.exists():
        _spec = importlib.util.spec_from_file_location(
            'app', _app_pkg_init, submodule_search_locations=[str(BACKEND_ROOT / 'app')]
        )
        _app_mod = importlib.util.module_from_spec(_spec)
        assert _spec and _spec.loader
        _spec.loader.exec_module(_app_mod)  # type: ignore[attr-defined]
        _sys.modules['app'] = _app_mod

    # Now import the application entrypoint
    main = importlib.import_module("main")

    # Stub async init/close DB to no-ops so TestClient startup/shutdown is fast
    async def _noop():
        return None

    async def _fake_db_health():
        return {"connection": "ok", "type": "test"}

    # Patch the async functions used by startup/shutdown events and health check
    import importlib as _importlib
    dbmod = _importlib.import_module("app.core.database")
    monkeypatch.setattr(dbmod, "init_db", _noop, raising=True)
    monkeypatch.setattr(dbmod, "close_db", _noop, raising=True)
    monkeypatch.setattr(dbmod, "get_db_health", _fake_db_health, raising=True)

    with TestClient(main.app) as test_client:
        yield test_client
