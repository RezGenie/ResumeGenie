def test_x_process_time_header_present_and_numeric(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "X-Process-Time" in r.headers
    # Should be parseable as float seconds
    float(r.headers["X-Process-Time"])  # raises if invalid
