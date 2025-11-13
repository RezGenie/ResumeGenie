def test_openapi_schema(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    schema = r.json()
    assert isinstance(schema, dict)
    assert schema.get("openapi", "").startswith("3.")
    assert "info" in schema and isinstance(schema["info"], dict)
    # Keep expectations flexible to avoid coupling to exact metadata
    info = schema["info"]
    assert isinstance(info.get("title", ""), str)
    assert isinstance(info.get("version", ""), str)


def test_docs_swagger(client):
    r = client.get("/docs")
    # May be 200 (served) or 307/308 (redirect to /docs/)
    assert r.status_code in (200, 307, 308)


def test_docs_redoc(client):
    r = client.get("/redoc")
    # Some setups disable ReDoc; accept 200 or 404
    assert r.status_code in (200, 404)
