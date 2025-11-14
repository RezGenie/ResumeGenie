def test_404_unknown_route(client):
    r = client.get("/nope")
    assert r.status_code == 404


def test_method_not_allowed_on_health(client):
    # If POST isn't supported on /health, FastAPI should return 405.
    # Some setups may not mount /health; then it's 404.
    r = client.post("/health", json={})
    assert r.status_code in (405, 404)
