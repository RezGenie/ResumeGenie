"""add_company_name_and_position_title_to_genie_wishes

Revision ID: add_company_position_to_wishes
Revises: add_jobs_preferences_v2
Create Date: 2025-11-08 21:32:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'add_company_position_to_wishes'
down_revision = 'add_jobs_preferences_v2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Get database connection to check existing columns
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('genie_wishes')]
    
    # Add company_name column only if it doesn't exist
    if 'company_name' not in columns:
        op.add_column('genie_wishes', sa.Column('company_name', sa.String(length=255), nullable=True))
    
    # Add position_title column only if it doesn't exist
    if 'position_title' not in columns:
        op.add_column('genie_wishes', sa.Column('position_title', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # Get database connection to check existing columns
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('genie_wishes')]
    
    # Remove the columns if they exist
    if 'position_title' in columns:
        op.drop_column('genie_wishes', 'position_title')
    
    if 'company_name' in columns:
        op.drop_column('genie_wishes', 'company_name')
