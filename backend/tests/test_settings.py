import importlib


def _fresh_settings():
    cfg = importlib.import_module("app.core.config")
    if getattr(cfg.get_settings, "cache_clear", None):
        cfg.get_settings.cache_clear()  # type: ignore[attr-defined]
    importlib.reload(cfg)
    return cfg.get_settings()


def test_database_url_validator_converts_to_async(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@host:5432/dbname")
    s = _fresh_settings()
    assert s.database_url.startswith("postgresql+asyncpg://")


def test_storage_provider_properties_change_with_environment(monkeypatch):
    # Development/default -> MinIO values
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.setenv("MINIO_ENDPOINT", "minio:9000")
    monkeypatch.setenv("MINIO_ACCESS_KEY", "ak_minio")
    monkeypatch.setenv("MINIO_SECRET_KEY", "sk_minio")
    s = _fresh_settings()
    assert s.storage_endpoint == "minio:9000"
    assert s.storage_access_key == "ak_minio"
    assert s.storage_secret_key == "sk_minio"
    assert s.storage_bucket_name == s.minio_bucket_name
    assert s.storage_secure == s.minio_secure

    # Production -> R2 values
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("R2_ENDPOINT", "https://r2.example.com")
    monkeypatch.setenv("R2_ACCESS_KEY", "ak_r2")
    monkeypatch.setenv("R2_SECRET_KEY", "sk_r2")
    s = _fresh_settings()
    assert s.is_production is True
    assert s.storage_endpoint == "https://r2.example.com"
    assert s.storage_access_key == "ak_r2"
    assert s.storage_secret_key == "sk_r2"
    assert s.storage_bucket_name == s.r2_bucket_name
    assert s.storage_secure is True


def test_adzuna_int_parsing(monkeypatch):
    monkeypatch.setenv("ADZUNA_RATE_LIMIT", "15")
    monkeypatch.setenv("ADZUNA_MAX_PAGES", "7")
    s = _fresh_settings()
    assert s.adzuna_rate_limit_int == 15
    assert s.adzuna_max_pages_int == 7

    # Invalid or empty -> defaults 10 and 5
    monkeypatch.setenv("ADZUNA_RATE_LIMIT", "not-a-number")
    monkeypatch.setenv("ADZUNA_MAX_PAGES", "")
    s = _fresh_settings()
    assert s.adzuna_rate_limit_int == 10
    assert s.adzuna_max_pages_int == 5
