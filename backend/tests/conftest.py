import asyncio
import pytest
from typing import AsyncIterator
from httpx import AsyncClient
from unittest.mock import MagicMock

from backend.main import app
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user


class DummyUser:
    def __init__(self, user_id: str = "user-123", email: str = "user@test.com"):
        self.id = user_id
        self.email = email
        self.is_active = True


class DummyAsyncSession:
    """A minimal async session-like mock with methods your endpoints may call."""

    async def execute(self, *args, **kwargs):
        mock_result = MagicMock()
        # Provide common chained call shapes to avoid AttributeError in tests
        mock_result.scalar_one_or_none = MagicMock(return_value=None)
        mock_result.scalars = MagicMock(return_value=[])
        mock_result.all = MagicMock(return_value=[])
        return mock_result

    async def get(self, *args, **kwargs):
        return None

    async def commit(self):
        return None

    async def rollback(self):
        return None

    async def close(self):
        return None


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture()
async def db_session() -> AsyncIterator[DummyAsyncSession]:
    session = DummyAsyncSession()
    try:
        yield session
    finally:
        await session.close()


@pytest.fixture()
def auth_user() -> DummyUser:
    return DummyUser()


@pytest.fixture()
async def async_client(db_session, auth_user):
    # Override dependencies with light-weight fakes
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: auth_user

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    # Clean up overrides
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)
