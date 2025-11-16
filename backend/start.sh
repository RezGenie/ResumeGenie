#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head || {
    echo "WARNING: Migration failed, but continuing anyway (tables may already exist)..."
    echo "Trying to stamp the database to current head..."
    alembic stamp head || echo "Stamp also failed, but continuing..."
}

echo "Fixing missing columns (if needed)..."
python fix_embedding_column.py || echo "Column fix script failed, continuing anyway..."

echo "Checking for jobs and running initial ingestion if needed..."
python auto_ingest_jobs.py || echo "Auto-ingestion script failed, continuing anyway..."

echo "Starting application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
