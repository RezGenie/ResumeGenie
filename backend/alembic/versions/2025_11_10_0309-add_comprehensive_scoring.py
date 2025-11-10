"""add comprehensive scoring

Revision ID: 2025_11_10_0309
Revises: 2025_11_08_2132
Create Date: 2025-11-10 03:09:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2025_11_10_0309'
down_revision = '2025_11_08_2132'
branch_labels = None
depends_on = None


def upgrade():
    # Add overall_score column
    op.add_column('genie_wishes', sa.Column('overall_score', sa.Float(), nullable=True))
    
    # Add score_breakdown column
    op.add_column('genie_wishes', sa.Column('score_breakdown', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    
    # Backfill existing wishes with default overall_score of 75
    op.execute("""
        UPDATE genie_wishes 
        SET overall_score = 75.0,
            score_breakdown = '{"style_formatting": 75, "grammar_spelling": 75, "job_match": 75, "ats_compatibility": 75, "content_quality": 75}'::jsonb
        WHERE overall_score IS NULL AND is_processed = true
    """)


def downgrade():
    # Remove the columns
    op.drop_column('genie_wishes', 'score_breakdown')
    op.drop_column('genie_wishes', 'overall_score')
