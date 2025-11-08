"""add_company_name_and_position_title_to_genie_wishes

Revision ID: add_company_position_to_wishes
Revises: add_jobs_preferences_v2
Create Date: 2025-11-08 21:32:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_company_position_to_wishes'
down_revision = 'add_jobs_preferences_v2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add company_name and position_title columns to genie_wishes table
    op.add_column('genie_wishes', sa.Column('company_name', sa.String(length=255), nullable=True))
    op.add_column('genie_wishes', sa.Column('position_title', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # Remove the columns if rolling back
    op.drop_column('genie_wishes', 'position_title')
    op.drop_column('genie_wishes', 'company_name')
