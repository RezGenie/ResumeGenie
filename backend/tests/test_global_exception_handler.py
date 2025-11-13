from fastapi import APIRouter

router = APIRouter()


@router.get("/boom")
def boom():
    raise RuntimeError("kaboom")


def test_global_exception_handler_returns_500_with_json(client):
    # Mount a route that raises
    app = client.app
    app.include_router(router)

    r = client.get("/boom")
    assert r.status_code == 500
    data = r.json()
    assert "detail" in data and isinstance(data["detail"], str)
    assert "message" in data and isinstance(data["message"], str)
