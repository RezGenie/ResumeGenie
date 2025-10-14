"""Add guest daily wishes table

Revision ID: add_guest_daily_wishes
Revises: 84c22249fee2
Create Date: 2025-10-14 03:32:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_guest_daily_wishes'
down_revision = '84c22249fee2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create guest_daily_wishes table
    op.create_table('guest_daily_wishes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', sa.String(length=255), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('wish_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_guest_daily_wishes_id'), 'guest_daily_wishes', ['id'], unique=False)
    op.create_index(op.f('ix_guest_daily_wishes_session_id'), 'guest_daily_wishes', ['session_id'], unique=False)
    op.create_index(op.f('ix_guest_daily_wishes_date'), 'guest_daily_wishes', ['date'], unique=False)


def downgrade() -> None:
    # Drop guest_daily_wishes table
    op.drop_index(op.f('ix_guest_daily_wishes_date'), table_name='guest_daily_wishes')
    op.drop_index(op.f('ix_guest_daily_wishes_session_id'), table_name='guest_daily_wishes')
    op.drop_index(op.f('ix_guest_daily_wishes_id'), table_name='guest_daily_wishes')
    op.drop_table('guest_daily_wishes')