import importlib
from fastapi.testclient import TestClient


async def _marker(calls, name):
    calls.append(name)


def test_startup_and_shutdown_call_db_hooks(monkeypatch):
    # Import main and patch DB hooks before TestClient context triggers events
    main = importlib.import_module("main")

    calls = []

    async def fake_init_db():
        await _marker(calls, "init")

    async def fake_close_db():
        await _marker(calls, "close")

    dbmod = importlib.import_module("app.core.database")
    monkeypatch.setattr(dbmod, "init_db", fake_init_db, raising=True)
    monkeypatch.setattr(dbmod, "close_db", fake_close_db, raising=True)

    with TestClient(main.app) as c:
        r = c.get("/")
        assert r.status_code == 200

    # After exiting context, shutdown should have run
    assert "init" in calls
    assert "close" in calls
