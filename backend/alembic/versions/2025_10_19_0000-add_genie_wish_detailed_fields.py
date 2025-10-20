"""Add detailed fields to genie_wishes table

Revision ID: add_genie_wish_detailed_fields
Revises: add_guest_daily_wishes
Create Date: 2025-10-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_genie_wish_detailed_fields'
down_revision = 'add_guest_daily_wishes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to genie_wishes table
    op.add_column('genie_wishes', sa.Column('ai_response', sa.Text(), nullable=True))
    op.add_column('genie_wishes', sa.Column('recommendations', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('genie_wishes', sa.Column('action_items', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('genie_wishes', sa.Column('resources', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('genie_wishes', sa.Column('confidence_score', sa.Float(), nullable=True))
    op.add_column('genie_wishes', sa.Column('job_match_score', sa.Float(), nullable=True))
    op.add_column('genie_wishes', sa.Column('is_processed', sa.Boolean(), nullable=True))
    op.add_column('genie_wishes', sa.Column('processing_status', sa.String(length=50), nullable=True))
    op.add_column('genie_wishes', sa.Column('processing_error', sa.Text(), nullable=True))
    op.add_column('genie_wishes', sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True))
    
    # Set default values for existing records
    op.execute("UPDATE genie_wishes SET is_processed = false WHERE is_processed IS NULL")
    op.execute("UPDATE genie_wishes SET processing_status = status WHERE processing_status IS NULL")


def downgrade() -> None:
    # Remove the new columns
    op.drop_column('genie_wishes', 'processed_at')
    op.drop_column('genie_wishes', 'processing_error')
    op.drop_column('genie_wishes', 'processing_status')
    op.drop_column('genie_wishes', 'is_processed')
    op.drop_column('genie_wishes', 'job_match_score')
    op.drop_column('genie_wishes', 'confidence_score')
    op.drop_column('genie_wishes', 'resources')
    op.drop_column('genie_wishes', 'action_items')
    op.drop_column('genie_wishes', 'recommendations')
    op.drop_column('genie_wishes', 'ai_response')