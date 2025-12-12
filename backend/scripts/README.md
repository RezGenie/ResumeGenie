# Backend Scripts

Operational scripts for managing RezGenie backend - job ingestion, database maintenance, and diagnostics.

## Job Management

### `diagnose_job_ingestion.py`
Comprehensive diagnostics for job ingestion system.
```bash
python scripts/diagnose_job_ingestion.py
```

### `test_adzuna_connection.py`
Test Adzuna API credentials and connectivity.
```bash
python scripts/test_adzuna_connection.py
```

### `jobs_ingest.py`
Manual job ingestion with full control.
```bash
# Default ingestion
python scripts/jobs_ingest.py

# Custom queries
python scripts/jobs_ingest.py --queries "software developer" "nurse" --pages 5

# Generate embeddings
python scripts/jobs_ingest.py --generate-embeddings --batch-size 100
```

### `auto_ingest_jobs.py`
Automatic ingestion on startup (runs if jobs are stale).
```bash
python scripts/auto_ingest_jobs.py
```

### `cleanup_jobs_database.py`
Remove outdated and invalid jobs.
```bash
# Preview changes
python scripts/cleanup_jobs_database.py --dry-run

# Clean jobs older than 30 days
python scripts/cleanup_jobs_database.py --days 30
```

### `validate_job_quality.py`
Validate all jobs and generate quality report.
```bash
python scripts/validate_job_quality.py
```

## Other Scripts

### `check_stripe_config.py`
Verify Stripe payment configuration.

### `fix_embedding_column.py`
Fix embedding column issues (one-time migration).

### `add_industries_column.py`
Add industries column to database (one-time migration).

### `backfill_user_preferences.py`
Backfill user preferences from resumes.

### `reextract_prefs.py`
Re-extract preferences from existing resumes.

### `check_prefs.py` / `debug_prefs.py`
Debug user preference extraction.

## Configuration

Set in `.env`:
```bash
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
ADZUNA_COUNTRY=ca
JOB_CLEANUP_DAYS=30
```

## Automated Tasks

Celery handles periodic tasks:
- Job ingestion: Every 4 hours
- Embedding generation: Every 2 hours
- Database cleanup: Daily at 3 AM

## Quick Start

```bash
# 1. Test API
python scripts/test_adzuna_connection.py

# 2. Run diagnostics
python scripts/diagnose_job_ingestion.py

# 3. Ingest jobs
python scripts/jobs_ingest.py --pages 5

# 4. Validate quality
python scripts/validate_job_quality.py
```
