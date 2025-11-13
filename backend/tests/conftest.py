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

# Preload local 'app' package and 'app.core' so importlib.reload in tests works reliably
import importlib, importlib.util as _util
import sys as _sys

# Ensure 'app' package points to our local backend/app
_app_pkg_init = BACKEND_ROOT / 'app' / '__init__.py'
if _app_pkg_init.exists():
    _spec = _util.spec_from_file_location(
        'app', _app_pkg_init, submodule_search_locations=[str(BACKEND_ROOT / 'app')]
    )
    _app_mod = _util.module_from_spec(_spec)
    assert _spec and _spec.loader
    _spec.loader.exec_module(_app_mod)  # type: ignore[attr-defined]
    _sys.modules['app'] = _app_mod

# Also ensure 'app.core' is present as a package namespace
_core_init = BACKEND_ROOT / 'app' / 'core' / '__init__.py'
if _core_init.exists():
    _core_spec = _util.spec_from_file_location(
        'app.core', _core_init, submodule_search_locations=[str(BACKEND_ROOT / 'app' / 'core')]
    )
    _core_mod = _util.module_from_spec(_core_spec)
    assert _core_spec and _core_spec.loader
    _core_spec.loader.exec_module(_core_mod)  # type: ignore[attr-defined]
    _sys.modules['app.core'] = _core_mod


@pytest.fixture(autouse=True)
def _ensure_app_core_importable():
    """Ensure 'app' and 'app.core' are present in sys.modules so importlib.reload works."""
    import sys as __sys
    try:
        import app  # noqa: F401
    except Exception:
        # Preload via spec if direct import fails
        pass
    try:
        import app.core  # noqa: F401
    except Exception:
        pass


@pytest.fixture()
def client(monkeypatch):
    """Provide a FastAPI TestClient with startup/shutdown DB hooks disabled.
    This avoids requiring a live database for simple endpoint tests.
    """
    # Ensure our local 'app' package is loaded (avoid conflicts with any site-packages 'app')
    import importlib, importlib.util, sys as _sys
    from pathlib import Path as _Path

    _app_pkg_init = BACKEND_ROOT / 'app' / '__init__.py'
    if _app_pkg_init.exists() and 'app' not in _sys.modules:
        _spec = importlib.util.spec_from_file_location(
            'app', _app_pkg_init, submodule_search_locations=[str(BACKEND_ROOT / 'app')]
        )
        _app_mod = importlib.util.module_from_spec(_spec)
        assert _spec and _spec.loader
        _spec.loader.exec_module(_app_mod)  # type: ignore[attr-defined]
        _sys.modules['app'] = _app_mod

    # Make sure app.core is importable before working with config
    try:
        import app.core  # noqa: F401
    except Exception:
        _core_init = BACKEND_ROOT / 'app' / 'core' / '__init__.py'
        if _core_init.exists() and 'app.core' not in _sys.modules:
            _core_spec = importlib.util.spec_from_file_location(
                'app.core', _core_init, submodule_search_locations=[str(BACKEND_ROOT / 'app' / 'core')]
            )
            _core_mod = importlib.util.module_from_spec(_core_spec)
            assert _core_spec and _core_spec.loader
            _core_spec.loader.exec_module(_core_mod)  # type: ignore[attr-defined]
            _sys.modules['app.core'] = _core_mod

    # Refresh settings to respect any environment mutations in prior tests
    cfg = importlib.import_module("app.core.config")
    if getattr(cfg.get_settings, "cache_clear", None):
        cfg.get_settings.cache_clear()  # type: ignore[attr-defined]
    importlib.reload(cfg)

    # Now import or reload the application entrypoint
    if 'main' in _sys.modules:
        main = importlib.reload(importlib.import_module("main"))
    else:
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

    with TestClient(main.app, raise_server_exceptions=False) as test_client:
        yield test_client
