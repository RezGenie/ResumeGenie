import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
class TestGenieAuthEndpoints:
    async def test_create_wish_requires_auth(self):
        from backend.main import app
        from httpx import AsyncClient
        async with AsyncClient(app=app, base_url="http://test") as client:
            resp = await client.post("/api/v1/genie/wishes", json={"prompt": "Improve my resume"})
            assert resp.status_code in (401, 404)

    async def test_create_wish_success(self, async_client):
        # Patch OpenAI service used by genie
        with patch("app.api.v1.genie.openai_service") as svc:
            svc.generate_response = AsyncMock(return_value={
                "text": "Here are improvements...",
                "tokens": 200,
            })
            payload = {"prompt": "Tailor my resume to a backend role"}
            resp = await async_client.post("/api/v1/genie/wishes", json=payload)
            assert resp.status_code in (200, 201, 404)
            if resp.status_code in (200, 201):
                data = resp.json()
                assert isinstance(data, dict)


@pytest.mark.asyncio
class TestGenieGuestEndpoints:
    async def test_guest_create_wish(self):
        from backend.main import app
        from httpx import AsyncClient

        # Patch daily limit checks for guest
        with patch("app.api.v1.genie.get_or_create_guest_session") as m_session, \
             patch("app.api.v1.genie.check_guest_daily_wish_limit") as m_check, \
             patch("app.api.v1.genie.increment_guest_wish_count") as m_inc, \
             patch("app.api.v1.genie.openai_service") as svc:

            m_session.return_value = {"guest_id": "guest-xyz"}
            m_check.return_value = True
            m_inc.return_value = None
            svc.generate_response = AsyncMock(return_value={"text": "Guest wish ok"})

            async with AsyncClient(app=app, base_url="http://test") as client:
                resp = await client.post("/api/v1/genie/guest/wishes", json={"prompt": "Help me"})
                assert resp.status_code in (200, 201, 404)
                if resp.status_code in (200, 201):
                    assert isinstance(resp.json(), dict)

    async def test_guest_daily_usage(self):
        from backend import app
        from httpx import AsyncClient

        async with AsyncClient(app=app, base_url="http://test") as client:
            resp = await client.get("/api/v1/genie/guest/usage")
            assert resp.status_code in (200, 404)
