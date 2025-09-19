-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS resume_embeddings_idx ON resumes USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS job_embeddings_idx ON job_descriptions USING ivfflat (embedding vector_cosine_ops);