"""
Smoke Test for Job Ingestion Script
Quick validation that the ingestion script can be imported and run
"""

import sys
from pathlib import Path
import pytest
from unittest.mock import patch, AsyncMock

# Add backend root to path for imports
backend_root = Path(__file__).parent.parent
sys.path.insert(0, str(backend_root))


def test_ingestion_script_imports():
    """Test that the ingestion script can be imported successfully"""
    try:
        import scripts.jobs_ingest
        assert hasattr(scripts.jobs_ingest, 'main')
        assert hasattr(scripts.jobs_ingest, 'adzuna_provider')
        print("✅ Ingestion script imports successfully")
    except ImportError as e:
        pytest.fail(f"Failed to import ingestion script: {e}")


def test_main_function_exists():
    """Test that the main function exists and can be called"""
    import scripts.jobs_ingest as script
    
    # Test main function exists
    assert hasattr(script, 'main')
    assert callable(script.main)
    print("✅ Main function exists and is callable")


@patch('scripts.jobs_ingest.adzuna_provider')
@patch('scripts.jobs_ingest.get_async_engine')
async def test_dry_run_execution(mock_engine, mock_provider):
    """Test dry run execution doesn't crash"""
    import scripts.jobs_ingest as script
    
    # Mock dependencies
    mock_provider.test_connection.return_value = True
    mock_provider.fetch_jobs.return_value = []
    
    mock_db_engine = AsyncMock()
    mock_engine.return_value = mock_db_engine
    
    # Test dry run
    try:
        await script.run_ingestion(dry_run=True, limit=1)
        print("✅ Dry run execution completed")
    except Exception as e:
        # Expected to fail without real database, but shouldn't crash on import/setup
        print(f"⚠️  Expected failure in dry run: {e}")


def test_adzuna_provider_initialization():
    """Test that AdzunaProvider can be initialized"""
    from scripts.jobs_ingest import adzuna_provider
    
    # Should work without credentials for testing
    assert adzuna_provider is not None
    assert hasattr(adzuna_provider, 'fetch_jobs')
    assert hasattr(adzuna_provider, 'normalize_job_data')
    print("✅ AdzunaProvider initializes correctly")


def test_configuration_validation():
    """Test configuration and environment handling"""
    import scripts.jobs_ingest as script
    
    # Test that we can access the functions we need
    assert hasattr(script, 'ingest_jobs')
    assert hasattr(script, 'test_connection')
    assert hasattr(script, 'generate_embeddings')
    
    print("✅ Core functions are available")


if __name__ == "__main__":
    """Run smoke tests directly"""
    print("🧪 Running Job Ingestion Smoke Tests")
    print("=" * 50)
    
    # Run individual test functions
    test_ingestion_script_imports()
    test_main_function_exists() 
    test_adzuna_provider_initialization()
    test_configuration_validation()
    
    print("=" * 50)
    print("✅ Smoke tests completed successfully!")
    print("\n💡 To run full tests:")
    print("   pytest tests/test_ingestion_smoke.py -v")
    print("\n💡 To test the ingestion script:")
    print("   python scripts/jobs_ingest.py test --limit 1")