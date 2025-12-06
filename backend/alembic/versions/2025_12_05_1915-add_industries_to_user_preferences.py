"""add industries to user_preferences

Revision ID: add_industries_to_user_preferences
Revises: add_name_to_users
Create Date: 2025-12-05 19:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_industries_to_user_preferences'
down_revision = 'add_name_to_users'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add industries column to user_preferences table
    op.add_column('user_preferences', sa.Column('industries', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    # Remove industries column from user_preferences table
    op.drop_column('user_preferences', 'industries')
