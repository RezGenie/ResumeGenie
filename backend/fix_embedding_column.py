#!/usr/bin/env python3
"""
Emergency script to add missing embedding column to production database.
Run this directly on Render using: python fix_embedding_column.py
"""
import asyncio
import sys
from sqlalchemy import text
from app.core.database import engine

async def fix_embedding_column():
    """Add embedding column if it doesn't exist."""
    async with engine.begin() as conn:
        # Check if column exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='resumes' AND column_name='embedding';
        """))
        
        exists = result.fetchone() is not None
        
        if exists:
            print("✅ embedding column already exists")
            return
        
        print("Adding embedding column...")
        
        # Ensure pgvector extension exists
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        print("✅ pgvector extension enabled")
        
        # Add the column
        await conn.execute(text("ALTER TABLE resumes ADD COLUMN embedding VECTOR(1536);"))
        print("✅ embedding column added successfully")
        
        # Verify it was added
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name='resumes' AND column_name='embedding';
        """))
        
        column = result.fetchone()
        if column:
            print(f"✅ Verified: {column[0]} column exists with type {column[1]}")
        else:
            print("❌ ERROR: Column was not created!")
            sys.exit(1)

if __name__ == "__main__":
    print("🔧 Fixing embedding column in production database...")
    asyncio.run(fix_embedding_column())
    print("✅ All done!")
