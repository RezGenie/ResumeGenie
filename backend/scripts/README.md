# RezGenie Backend Scripts

This directory contains operational scripts for managing the RezGenie backend.

## Job Ingestion Script (`jobs_ingest.py`)

Script for manually ingesting job data from external providers (currently Adzuna).

### Prerequisites

1. Set up Adzuna API credentials:

   ```bash
   export ADZUNA_APP_ID="your_app_id"
   export ADZUNA_APP_KEY="your_app_key"
   ```

2. Ensure database is running and migrations are applied.

### Usage Examples

```bash
# Test API connection
python scripts/jobs_ingest.py --test-connection

# Default ingestion (3 pages per seed query)
python scripts/jobs_ingest.py

# Dry run to see what would be ingested
python scripts/jobs_ingest.py --dry-run

# Custom search queries
python scripts/jobs_ingest.py --queries "python developer" "data scientist" "product manager"

# Fetch more pages per query
python scripts/jobs_ingest.py --pages 5

# Generate embeddings for existing jobs
python scripts/jobs_ingest.py --generate-embeddings

# Verbose output for debugging
python scripts/jobs_ingest.py --verbose
```

### Options

- `--queries`: Custom search queries (overrides default seed queries)
- `--pages`: Number of pages to fetch per query (default: 3)
- `--dry-run`: Fetch and normalize data without saving to database
- `--generate-embeddings`: Generate embeddings for jobs without them
- `--test-connection`: Test API connection and configuration
- `--batch-size`: Batch size for embedding generation (default: 50)
- `--verbose`: Enable detailed logging

### Seed Queries

Default seed queries for Canadian tech jobs:

- "software engineer"
- "full stack developer"
- "frontend developer"
- "data analyst"
- "product designer"

### Logging

The script logs to both console and `job_ingestion.log` file.

### Error Handling

- API rate limiting with 1-second delays between requests
- Automatic retries on transient failures
- Graceful handling of malformed job data
- Detailed error logging for debugging

### Scheduling

For production use, consider scheduling this script to run every 6 hours:

```bash
# Add to crontab for automated ingestion
0 */6 * * * cd /path/to/rezgenie/backend && python scripts/jobs_ingest.py >> /var/log/job_ingestion.log 2>&1
```

Alternatively, use the Celery periodic task which is automatically configured.
