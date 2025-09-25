-- Initialize RezGenie database with pgvector extension
-- This script runs automatically when PostgreSQL container starts

-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE rezgenie'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rezgenie');

-- Connect to rezgenie database
\c rezgenie;

-- Create pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create uuid extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create pg_trgm extension for text similarity searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Set up initial schemas and indexes
-- Note: Detailed table creation will be handled by Alembic migrations

-- Create indexes for better performance on vector operations
-- These will be created by migrations but we prepare the database

-- Display installed extensions
SELECT * FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp', 'pg_trgm');