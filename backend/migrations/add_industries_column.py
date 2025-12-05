"""add industries to user preferences

Revision ID: add_industries_column
Revises: 
Create Date: 2025-12-05 13:36:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_industries_column'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add industries column to user_preferences table
    op.add_column('user_preferences', 
        sa.Column('industries', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]')
    )


def downgrade():
    # Remove industries column
    op.drop_column('user_preferences', 'industries')
