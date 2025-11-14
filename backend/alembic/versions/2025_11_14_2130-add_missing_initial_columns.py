"""Add missing initial columns

Revision ID: add_missing_initial_columns
Revises: add_comprehensive_scoring
Create Date: 2025-11-14 21:30:00.000000

This migration adds columns that should have been in the initial migration but were missing.
Uses IF NOT EXISTS to avoid errors if columns already exist.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_missing_initial_columns'
down_revision = 'add_comprehensive_scoring'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to resumes table (with IF NOT EXISTS)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending';
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_error TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    # Add missing columns to genie_wishes table (with IF NOT EXISTS)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE genie_wishes ADD COLUMN IF NOT EXISTS response_text TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE genie_wishes ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE genie_wishes ADD COLUMN IF NOT EXISTS position_title VARCHAR(255);
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE genie_wishes ADD COLUMN IF NOT EXISTS error_message TEXT;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE genie_wishes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)
    
    # Update existing records to have sensible defaults
    op.execute("""
        UPDATE resumes 
        SET original_filename = filename 
        WHERE original_filename IS NULL;
    """)
    
    op.execute("""
        UPDATE resumes 
        SET mime_type = 'application/pdf' 
        WHERE mime_type IS NULL AND filename LIKE '%.pdf';
    """)
    
    op.execute("""
        UPDATE resumes 
        SET mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        WHERE mime_type IS NULL AND filename LIKE '%.docx';
    """)


def downgrade() -> None:
    # Only drop columns if they exist (graceful downgrade)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE genie_wishes DROP COLUMN IF EXISTS completed_at;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE genie_wishes DROP COLUMN IF EXISTS error_message;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE genie_wishes DROP COLUMN IF EXISTS position_title;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE genie_wishes DROP COLUMN IF EXISTS company_name;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE genie_wishes DROP COLUMN IF EXISTS response_text;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes DROP COLUMN IF EXISTS processed_at;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes DROP COLUMN IF EXISTS processing_error;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes DROP COLUMN IF EXISTS processing_status;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes DROP COLUMN IF EXISTS is_processed;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes DROP COLUMN IF EXISTS mime_type;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE resumes DROP COLUMN IF EXISTS original_filename;
        EXCEPTION WHEN undefined_column THEN NULL;
        END $$;
    """)
