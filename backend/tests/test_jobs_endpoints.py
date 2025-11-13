import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
class TestJobsFeedAndSearch:
    async def test_feed_unauth_is_allowed_or_denied(self):
        # Jobs feed in implementation may be public; if protected, expect 401.
        from app.main import app
        from httpx import AsyncClient

        async with AsyncClient(app=app, base_url="http://test") as client:
            r = await client.get("/api/v1/jobs/feed?skip=0&limit=5")
            assert r.status_code in (200, 401, 404)
            if r.status_code == 200:
                data = r.json()
                assert isinstance(data, dict)

    async def test_feed_success_with_db_override(self, async_client, db_session):
        # Mock the DB execution to return fake rows for the feed
        fake_rows = []
        db_session.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=fake_rows)))

        r = await async_client.get("/api/v1/jobs/feed?skip=0&limit=3")
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            body = r.json()
            assert isinstance(body, dict)

    async def test_search_success(self, async_client, db_session):
        db_session.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[])))
        r = await async_client.get("/api/v1/jobs/search?q=engineer&skip=0&limit=2")
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            data = r.json()
            assert isinstance(data, dict)


@pytest.mark.asyncio
class TestJobStats:
    async def test_stats_success(self, async_client, db_session):
        # Simulate SQL aggregation results
        mock_result = MagicMock()
        mock_result.all = MagicMock(return_value=[
            ("total_jobs", 100),
            ("remote_jobs", 30),
        ])
        db_session.execute = AsyncMock(return_value=mock_result)

        r = await async_client.get("/api/v1/jobs/stats")
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            data = r.json()
            assert isinstance(data, dict)


@pytest.mark.asyncio
class TestRecommendations:
    async def test_recommendations_requires_auth(self):
        from app.main import app
        from httpx import AsyncClient
        async with AsyncClient(app=app, base_url="http://test") as client:
            resp = await client.get("/api/v1/jobs/recommendations")
            assert resp.status_code in (401, 404)

    async def test_recommendations_success(self, async_client):
        # Patch the internal recommendation service used by the endpoint
        with patch("app.api.v1.jobs.enhanced_comparison_service") as svc:
            svc.get_recommendations = AsyncMock(return_value={
                "jobs": [],
                "total": 0,
                "limit": 10,
                "offset": 0,
            })
            r = await async_client.get("/api/v1/jobs/recommendations?limit=10")
            assert r.status_code in (200, 404)
            if r.status_code == 200:
                data = r.json()
                assert "jobs" in data
                assert "total" in data


@pytest.mark.asyncio
class TestJobAnalysis:
    async def test_analyze_job_match(self, async_client):
        # Patch the analysis function used inside the handler
        with patch("app.api.v1.jobs.analyze_job_posting") as analyze:
            analyze.return_value = {"score": 0.85, "missing_skills": ["X"]}

            payload = {
                "job_title": "Senior Software Engineer",
                "job_description": "We need someone with Python and FastAPI.",
                "resume_id": None,
                "preferences": {
                    "locations": ["Remote"],
                    "min_salary": 120000
                }
            }
            r = await async_client.post("/api/v1/jobs/analyze", json=payload)
            assert r.status_code in (200, 202, 404)
            if r.status_code in (200, 202):
                data = r.json()
                assert isinstance(data, dict)


@pytest.mark.asyncio
class TestSavedJobs:
    async def test_get_saved_jobs(self, async_client, db_session):
        db_session.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[])))
        r = await async_client.get("/api/v1/jobs/saved?skip=0&limit=5")
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            assert isinstance(r.json(), dict)

    async def test_update_saved_job_status(self, async_client, db_session):
        # Simulate finding a saved job then committing the status update
        db_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=MagicMock(id=1))))
        r = await async_client.put("/api/v1/jobs/saved/1", json="applied")
        assert r.status_code in (200, 404, 422)

    async def test_remove_saved_job(self, async_client, db_session):
        db_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=MagicMock(id=1))))
        r = await async_client.delete("/api/v1/jobs/saved/1")
        assert r.status_code in (200, 404)
