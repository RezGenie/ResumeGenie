"""add name to users

Revision ID: add_name_to_users
Revises: add_company_name_and_position_title_to_genie_wishes
Create Date: 2025-12-05 14:42:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_name_to_users'
down_revision = 'add_missing_initial_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add name column to users table
    op.add_column('users', sa.Column('name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # Remove name column from users table
    op.drop_column('users', 'name')
