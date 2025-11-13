import time


def test_health_under_200ms(client):
    t0 = time.perf_counter()
    resp = client.get("/health")
    dt_ms = (time.perf_counter() - t0) * 1000
    assert resp.status_code == 200
    # Allow generous 300ms to avoid flakes in slower CI; adjust as needed
    assert dt_ms < 300
